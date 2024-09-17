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

import { NetworkInterfaceInfo, networkInterfaces } from 'os'
import  Bonjour from 'bonjour-service'

type Nullable<T> = T | null

export class HttpInterface {

  private app: any
  private uuid: string
  private timeout: number
  private serverAddress?: string
  private serverInfo?: any
  private token?: string

  /********************************************************************
   * Create a new HttpInterface instance by specifying the UUID of the
   * service required of the interface and a timeout that should be
   * used when making Bonjour requests of service availability.
   * 
   * @param uuid - identifier of the required interface service.
   * @param timeout - used to control Bonjour's network interrogation.
   */
  constructor(uuid: string, timeout: number = 5) {
    this.uuid = uuid
    this.timeout = timeout
    this.app = null
    this.serverAddress = undefined
    this.serverInfo = undefined
    this.token = undefined
  }

  linkSK(app: any) {
    this.app = app
  }

  /********************************************************************
   * Return the host's Version 4 IP address or undefined if no address
   * is configured. The localhost address and link-local addresses are
   * ignored.
   * 
   * @return the host IP address.
   */
  getHostIpAddress(): string {
    if (this.serverAddress !== undefined) return(this.serverAddress);

    const ifaces: NodeJS.Dict<NetworkInterfaceInfo[]> = networkInterfaces();
    for (let key in ifaces) {
      ifaces[key]?.forEach((address) => {
        const familyV4Value = typeof address.family === 'string' ? 'IPv4' : 4
        if ((address.family === familyV4Value) && (!address.internal) && (!address.address.startsWith('169.254.'))) {
          if (this.app) this.app.debug(`returning host IP address '${address.address}'`)
          return(this.serverAddress = address.address);
        }
      })
    }
    throw new Error("address not found");
  }

  /********************************************************************
   * Return the V4 IP address of the server on the local network which
   * provides the service identified by the UUID specified in this
   * instance.
   * 
   * A search is made initially for https services, falling back into
   * a search for http services after the timeout configured in this
   * instance.
   * 
   * @return the IP address of the first discovered service provider.
   */
  async getServerAddress(): Promise<string> {
    if (this.serverAddress !== undefined) return(this.serverAddress);

    const bonjour = new Bonjour();

    return(await new Promise((resolve, reject) => {
      bonjour.find({ type: 'https' }, (service: any) => {
        if (service.txt.self === this.uuid) {
          var v4Addresses = service.addresses.filter((address: any) => isV4Address(address))
          if (v4Addresses.length > 0) this.serverAddress = "https://" + v4Addresses[0] + ":" + service.port
        }
      })
  
      setTimeout(
        () => {                                  // wait for 5 seconds, then...
          if (this.serverAddress !== undefined) {
            if (this.app) this.app.debug(`returning server address '${this.serverAddress}'`)
            resolve(this.serverAddress);
          } else {
            bonjour.find({ type: "http" }, (service: any) => {
              if (service.txt.self === this.uuid) {
                var v4Addresses = service.addresses.filter((a: string) => isV4Address(a));
                if (v4Addresses.length > 0) this.serverAddress = "http://" + v4Addresses[0] + ":" + service.port;
              }
            });
            setTimeout(() => { bonjour.destroy(); resolve(this.serverAddress); }, (this.timeout * 1000));    
          }
        },
        (this.timeout * 1000)
      );
    }).then(() => {
      if (this.serverAddress !== undefined) {
        if (this.app) this.app.debug(`returning server address '${this.serverAddress}'`)
        return(this.serverAddress);
      } else throw new Error("couldn't get server address");
    }));

    function isV4Address(address: string): boolean {
      var matches: Nullable<string[]> = address.match(/^(\d+).\d+.\d+.\d+$/)
      return((matches !== null) && (matches[0] != '127'));
    }

    function isPrivateAddress(address: string): boolean {
      var parts: number[] = address.split('.').map((n: string) => parseInt(n))
      if (parts.length != 4) throw new Error("invalid IP address");
      if ((parts[0] == 192) && (parts[1] == 168)) return(true);
      if ((parts[0] == 172) && (parts[1] >= 16) && (parts[1] <= 31)) return(true);
      if (parts[0] == 10) return(true);
      return(false);
    }
  }

  /********************************************************************
   * Get a RegExp object that can be used to filter IP addresses to
   * ensure that they fall within the same private subnet as
   * <ipAddress> or throw an exception. 
   */
  getPrivateAddressRegExp(ipAddress: string): RegExp {
    var parts: number[] = ipAddress.split('.').map(n => parseInt(n))
    if (parts.length != 4) throw new Error("invalid IP address")
    if ((parts[0] == 192) && (parts[1] == 168)) return(new RegExp('^192\\.168\\.\\d+\\.\\d+$'))
    if ((parts[0] == 172) && (parts[1] >= 16) && (parts[1] <= 31)) return(new RegExp('^172\\.16\\.(16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31)\\.\\d+\\.\\d+$'))
    if (parts[0] == 10) return(new RegExp('^10\\.\\d+\\.\\d+\\.\\d+$'))
    throw new Error(`IP address ${ipAddress} is public`)
  }
  
  async getServerInfo(): Promise<any> {
    if (this.serverAddress !== undefined) {
      if (this.serverInfo !== undefined) {
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
          if (this.serverInfo !== undefined) {
            return(this.serverInfo);
          } else throw new Error("couldn't get server info");
        }));
      }
    } else throw new Error("call getServerAdderess() before using this function");
  }

  async getAuthenticationToken(username: string, password: string): Promise<string> {
    if (this.serverInfo !== undefined) {
      if (this.token !== undefined) {
        return(this.token);
      } else {
        const serverInfo: any = this.getServerInfo();
        return(await new Promise((resolve, reject) => {
          fetch(`${this.serverAddress}/signalk/${Object.keys(this.serverInfo.endpoints)[0]}/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: username, password: password })}).then((response) => {
            if (response.status == 200) {
              response.json().then((json) => {
                resolve(this.token = json.token);
              })
            }
          })
        }).then(() => {
          if (this.token !== undefined) {
            return(this.token);
          } else throw new Error("couldn't get authentication token");
        }));
      }
    } else throw new Error("call getServerInfo() before using this function");
  }
}
