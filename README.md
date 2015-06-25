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

License
-------

MIT

Release History
---------------

* 0.1.0 Initial release
