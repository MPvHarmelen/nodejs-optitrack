Buffer.prototype.readUIntLE = function(start, end) {
    return this.slice(start, end).readUInt32LE(0, true);
}

Buffer.prototype.readIntLE = function(start, end) {
    return this.slice(start, end).readInt32LE(0, true);
}

Buffer.prototype.readCString = function(offset) {
    var start = offset;
    while (offset < this.length && this[offset] != '0') {
        offset ++;
    }
    return this.slice(start, offset).toString();
}

var NAT_FRAMEOFDATA = 7;

/**
 * Read a sequence of markers from the head of the data.
 * Return a list of coordinate triples and the rest of the data.
 *
 * @param  {buffer}   data      data to be read
 * @param  {integer}  offset    offset to start reading data from
 *
 * @return {obj}                object containing markers and new offset
 */
var _unpack_markers = function (data, offset){
    var nmarkers = data.readInt8(offset);
    offset += 4;
    var markers = [];
    for (var i=0; i < nmarkers; i++) {
        var x = data.readFloatLE(offset);
        var y = data.readFloatLE(offset += 4);
        var z = data.readFloatLE(offset += 4);
        offset += 4;
        markers.push([x,y,z])
    }
    return {markers: markers, offset: offset}
}

/**
 * Read a sequence of rigid bodies from the head of the data.
 * Return a list of RigidBody tuples and the rest of the data.
 *
 * @param  {buffer}   data      data to be read
 * @param  {integer}  offset    offset to start reading data from
 *
 * @return {obj}                object containing bodies and new offset
 */
var _unpack_rigid_bodies = function (data, offset) {
    var nbodies = data.readInt8(offset);
    offset += 4;
    var rbodies = [];
    for (i=0; i < nbodies; i++) {
        rbid = data.readInt8(offset);
        var x = data.readFloatLE(offset += 4);
        var y = data.readFloatLE(offset += 4);
        var z = data.readFloatLE(offset += 4);
        var qx = data.readFloatLE(offset += 4);
        var qy = data.readFloatLE(offset += 4);
        var qz = data.readFloatLE(offset += 4);
        var qw = data.readFloatLE(offset += 4);
        offset += 4;
        var res = _unpack_markers(data, offset);
        var markers = res.markers;
        offset = res.offset;

        var nmarkers = markers.length;
        var mrk_ids = []
        for (ii=0; ii < nmarkers; ii++) {
            mrk_ids.push(data.readInt8(offset));
            offset += 4;
        }

        var mrk_sizes = [];
        for (ii=0; ii < nmarkers; ii++) {
            mrk_sizes.push(data.readFloatLE(offset));
            offset += 4;
        }

        var mrk_mean_error = data.readFloatLE(offset);
        offset += 4;

        var tracking_valid = data.readIntLE(offset, offset += 2) & 0x01 == 1;
        var rb = {
            id: rbid,
            position: [x,y,z],
            orientation: [qx,qy,qz,qw],
            markers: markers,
            mrk_ids: mrk_ids,
            mrk_sizes: mrk_sizes,
            mrk_mean_error: mrk_mean_error,
            tracking_valid: tracking_valid
        };
        rbodies.push(rb);
    }
    return {bodies: rbodies, offset: offset}
}

var _unpack_skeletons = function (data, offset) {
    // not tested
    nskels = data.readInt8(offset);
    offset += 4;
    skels = [];
    for (i=0; i < nskels; i++) {
        skelid = data.readInt8(offset);
        offset += 4;
        var res = _unpack_rigid_bodies(data, version);
        offset = res.offset;
        skels.push({id: id, bodies: res.bodies});
    }
    return {skeletons: skels, offset: offset};
}

var _unpack_labeled_markers = function(data, offset) {
    var nmarkers = data.readInt8(offset);
    offset += 4;
    var lmarkers = [];
    for (i=0; i < nmarkers; i++) {
        var id = data.readInt8(offset);
        var x = data.readFloatLE(offset += 4);
        var y = data.readFloatLE(offset += 4);
        var z = data.readFloatLE(offset += 4);
        var size = data.readFloatLE(offset += 4);
        offset += 4;
        var params = data.readIntLE(offset, offset += 2);
        var occluded = params & 0x01 == 1
        var pc_solved = params & 0x02 == 2
        var model_solved = params & 0x04 == 4
        lmarkers.push({
            id: id,
            position: [x, y, z],
            size: size,
            occluded: occluded,
            pc_solved: pc_solved,
            model_solved: model_solved
        });
    }
    return {lmarkers: lmarkers, offset: offset};
}


var _unpack_frameofdata = function (data, offset) {
    frameno = data.readInt8(offset);
    offset += 4;

    // identified marker sets
    nsets = data.readInt8(offset);
    offset += 4;
    sets = {}
    if (nsets) {
        for (var i=0; i < nsets; i++) {
            setname = data.readCString(offset);
            offset += setname.length + 1;
            var res = _unpack_markers(data, offset);
            offset = res.offset;
            sets[setname] = res.markers;
        }
    }

    // other (unidentified) markers
    res = _unpack_markers(data, offset);
    var markers = res.markers;
    offset = res.offset;
    res = _unpack_rigid_bodies(data, offset);
    var bodies = res.bodies;
    offset = res.offset;
    res = _unpack_skeletons(data, offset);
    var skeletons = res.skeletons;
    offset = res.offset;
    res = _unpack_labeled_markers(data, offset);
    var lmarkers = res.lmarkers;
    offset = res.offset;

    // Sergey Astanin warned about padding, but I'm just ignoring it.
    var latency = data.readFloatLE(offset);
    var timecode = data.readUInt8(offset += 4);
    var timecode_sub = data.readUInt8(offset += 4);
    var timestamp = data.readDoubleLE(offset += 4);
    var params = data.readIntLE(offset += 8, offset += 2);
    var is_recording = params & 0x01 == 1
    var tracked_models_changed = params & 0x02 == 2
    var eod = data.readInt8(offset);
    offset += 4;
    if (eod != 0)
        throw new Error("End-of-data marker is not 0 but " + eod);
    fod = {
        frameno: frameno,
        sets: sets,
        other_markers: markers,
        rigid_bodies: bodies,
        skeletons: skels,
        labeled_markers: lmarkers,
        latency: latency,
        timecode: [timecode, timecode_sub],
        timestamp: timestamp,
        is_recording: is_recording,
        tracked_models_changed: tracked_models_changed
    }
    return fod;
}

/**
 * Unpack raw NatNet packet data
 * Assumes NatNet version is at least 2.7.0.0
 *
 * @param  {buffer} data    data sent by Motive through udp
 *
 * @return {obj}            object with unpacked data
 */
var unpack = function(data) {
    if (!data || data.length < 4)
        return;

    offset = 0;
    var msgtype = data.readUIntLE(offset, offset += 2);
    var nbytes = data.readUIntLE(offset, offset += 2);

    if (msgtype == NAT_FRAMEOFDATA) {
        // frame, data = _unpack_frameofdata(res.data, offset);
        return _unpack_frameofdata(data, offset);
    }
}

module.exports = {unpack: unpack};
