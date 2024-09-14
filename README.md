# signalk-libhttpinterface
Support library for local and remote HTTP interfaces.

Provides a mechanism for recovering data about the HTTP interface on
the local host and, more usefully, the HTTP interface on a network
host providing a particular service published over Bonjour.

This allows, the recovery of service host IP address, detailed service
host information and remote access token.

```myHttpInterface = new HttpInterface(serviceUuid)```
