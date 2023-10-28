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

const bonjour = require('bonjour')();

module.exports = class HttpInterface {

  constructor(uuid, timeout=5) {
    this.uuid = uuid;
    this.timeout = timeout;
    this.serverAddress = null;
    this.serverInfo = null;
    this.token = null;
  }

  async getServerAddress() {
    if (this.serverAddress !== null) {
      return(this.serverAddress);
    } else {
      return(await new Promise((resolve, reject) => {
        bonjour.find({ type: 'https' }, (service) => {
          if (service.txt.self === this.uuid) this.serverAddress = "https://" + service.addresses[0] + ":" + service.port;
        });
  
        setTimeout(() => {                                  // wait for 5 seconds, then...
          if (this.serverAddress != null) {
            resolve(this.serverAddress);
          } else {
            bonjour.find({ type: "http" }, (service) => {
              if (service.txt.self === this.uuid) this.serverAddress = "http://" + service.addresses[0] + ":" + service.port;
            });
            setTimeout(() => {                              // wait for 5 seconds, then...
              bonjour.destroy();
              resolve(this.serverAddress);                            // destroy bonjour instance
            }, this.timeout * 1000);    
          }
        }, (this.timeout * 1000));
      }).then(() => {
        if (this.serverAddress) {
          return(this.serverAddress);
        } else throw new Error("couldn't get server address");
      }));
    }
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
