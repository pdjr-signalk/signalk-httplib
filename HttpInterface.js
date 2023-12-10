"use strict;"

/**********************************************************************
 * Copyright 2022 Paul Reeve <preeve@pdjr.eu>
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you
 * may not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
 * implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

const { networkInterfaces } = require('os');
const bonjour = require('bonjour')();

module.exports = class HttpInterface {

  constructor(uuid, timeout=5) {
    this.uuid = uuid;
    this.timeout = timeout;
    this.serverAddress = null;
    this.serverInfo = null;
    this.token = null;
  }

  /********************************************************************
   * Return the host's Version 4 IP address, disregarding the localhost
   * address or throw and exception if the address cannot be retrieved.
   */
  getHostIpAddress = function() {
    if (!this.serverAddress) {
      const nets = networkInterfaces();
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
          if ((net.family === familyV4Value) && (!net.internal)) this.serverAddress = net.address;
        }
      }
    }
    return(this.serverAddress);
  }

  async getServerAddress() {
    if (this.serverAddress !== null) {
      return(this.serverAddress);
    } else {
      return(await new Promise((resolve, reject) => {
        bonjour.find({ type: 'https' }, (service) => {
          if (service.txt.self === this.uuid) {
            var v4Addresses = service.addresses.filter(a => isV4Address(a));
            if (v4Addresses.length > 0) this.serverAddress = "https://" + v4Addresses[0] + ":" + service.port;
          }
        });
  
        setTimeout(
          () => {                                  // wait for 5 seconds, then...
            if (this.serverAddress != null) {
              resolve(this.serverAddress);
            } else {
              bonjour.find({ type: "http" }, (service) => {
                console.log(JSON.stringify(service, null, 2));
                if (service.txt.self === this.uuid) {
                  var v4Addresses = service.addresses.filter(a => isV4Address(a));
                  if (v4Addresses.length > 0) this.serverAddress = "http://" + v4Addresses[0] + ":" + service.port;
                }
              });
              setTimeout(() => { bonjour.destroy(); resolve(this.serverAddress); }, (this.timeout * 1000));    
            }
          },
          (this.timeout * 1000)
        );
      }).then(() => {
        if (this.serverAddress) {
          return(this.serverAddress);
        } else throw new Error("couldn't get server address");
      }));
    }

    function isV4Address(address) {
      var matches;
      console.log(JSON.stringify(address));
      return((matches = address.match(/^(\d+).\d+.\d+.\d+$/)) && (matches[0] != '127'));
    }
  }

  isPrivateAddress = function(address) {
    var parts = ipAddress.split('.').map(n => parseInt(n));
    if (parts.length != 4) throw new Error("invalid IP address");
    if ((parts[0] == 192) && (parts[1] == 168)) return(true);
    if ((parts[0] == 172) && (parts[1] >= 16) && (parts[1] <= 31)) return(true);
    if (parts[0] == 10) return(true);
    return(false);
  }

  /********************************************************************
   * Get a RegExp object that can be used to filter IP addresses to
   * ensure that they fall within the same private subnet as
   * <ipAddress> or throw an exception. 
   */
  getPrivateAddressRegExp = function(ipAddress) {
    var parts = ipAddress.split('.').map(n => parseInt(n));
    if (parts.length != 4) throw new Error("invalid IP address");
    if ((parts[0] == 192) && (parts[1] == 168)) return(new RegExp('^192\\.168\\.\\d+\\.\\d+$'));
    if ((parts[0] == 172) && (parts[1] >= 16) && (parts[1] <= 31)) return(new RegExp('^172\\.16\\.(16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31)\\.\\d+\\.\\d+$'));
    if (parts[0] == 10) return(new RegExp('^10\\.\\d+\\.\\d+\\.\\d+$'));
    throw new Error("IP address is public");
  }
  
  async getServerInfo() {
    if (this.serverAddress) {
      if (this.serverInfo !== null) {
        return(this.serverInfo);
      } else {
        return(await new Promise((resolve, reject) => {
          fetch(`${this.serverAddress}/signalk`, { method: 'GET' }).then((response) => {
            if (response.status == 200) {
              response.json().then((json) => {
                resolve(this.serverInfo = json);
              })
            }
          })
        }).then(() => {
          if (this.serverInfo) {
            return(this.serverInfo);
          } else throw new Error("couldn't get server info");
        }));
      }
    } else throw new Error("call getServerAdderess() before using this function");
  }

  async getAuthenticationToken(username, password) {
    if (this.serverInfo) {
      if (this.token !== null) {
        return(this.token);
      } else {
        const serverInfo = this.getServerInfo();
        return(await new Promise((resolve, reject) => {
          fetch(`${this.serverAddress}/signalk/${Object.keys(this.serverInfo.endpoints)[0]}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: username, password: password })}).then((response) => {
            if (response.status == 200) {
              response.json().then((json) => {
                resolve(this.token = json.token);
              })
            }
          })
        }).then(() => {
          if (this.token) {
            return(this.token);
          } else throw new Error("couldn't get authentication token");
        }));
      }
    } else throw new Error("call getServerInfo() before using this function");
  }
  
}
