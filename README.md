OptiRX for node
===============

A pure Javascript library to receive motion capture data from OptiTrack
Streaming Engine, transcribed from Sergey Astanin's python library [optirx](https://pypi.python.org/pypi/optirx).

OptiTrack is a line of motion capture products by NaturalPoint. Their
software can broadcast motion capture data via a documented binary
protocol. It is supposed to be used together with the proprietary
NatNet SDK, which, unfortunately, is not available for javascript.
OptiRX for node and it's documentation is based on Sergey Astanin python library
[optirx](https://pypi.python.org/pypi/optirx), which in turn is based on the
direct depacketization example from the SDK. Both Python and Javascript packages
do not use NatNet SDK.

Install
-------

```bash
    npm install optirx
```

Compatibility
-------------

Motive 1.7.x (NatNet 2.7.0.0).

Usage
-----

Assuming the raw data of Motive can be accessed (through udp multicast), the
following code unpacks a data buffer:

```javascript
    optirx = require('optirx');
    unpackedData = optirx.unpack(dataBuffer);
```

To communicate with the Optitrack server through udp multicast we used [dgram](https://nodejs.org/api/dgram.html):

```js
// Change the following two to what your Optitrack multicast server says
var MULTICAST_INTERFACE = '239.255.42.99';
var SERVER_PORT = 1511;

// Packages
var dgram = require('dgram');
var optirx = require('optirx');  // This package!

var api = dgram.createSocket('udp4');

api.on('listening', function () {
    var address = api.address();
    console.log('UDP Client listening on ' + address.address + ":" + address.port);
    api.setBroadcast(true)  // To be honest I don't know any more what this is for
    api.setMulticastTTL(128);  // Neither do I know what this does :(
    api.addMembership(MULTICAST_INTERFACE);  // I guess this tells dgram where to connect to
});

// What to do when a message is received
api.on('message', function listener(raw_data, remote) {
    var data = optirx.unpack(raw_data);  // Unpacking the data, like in the README.
    // Do something interesting with the unpacked data
    ...
})

// We also had the following event listeners, FYI
api.on('error', function() { console.log('Connection error!'.red) });
api.on('end', function(data) { console.log('No more data!'.red); });
api.on('event', function(event) { console.log(event.name.yellow); });
api.on('disconnect', function(event) { process.exit(); });
```

To connect, run:
```js
api.bind(SERVER_PORT);
```

To disconnect, run:
```js
api.disconnect();
```

License
-------

MIT

Release History
---------------

* 0.1.0 Initial release
