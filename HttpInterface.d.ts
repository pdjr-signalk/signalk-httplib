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
export declare class HttpInterface {
    private uuid;
    private timeout;
    private serverAddress?;
    private serverInfo?;
    private token?;
    /********************************************************************
     * Create a new HttpInterface instance by specifying the UUID of the
     * service required of the interface and a timeout that should be
     * used when making Bonjour requests of service availability.
     *
     * @param uuid - identifier of the required interface service.
     * @param timeout - used to control Bonjour's network interrogation.
     */
    constructor(uuid: string, timeout?: number);
    /********************************************************************
     * Return the host's Version 4 IP address or undefined if no address
     * is configured. The localhost address and link-local addresses are
     * ignored.
     *
     * @return the host IP address.
     */
    getHostIpAddress(): string;
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
    getServerAddress(): Promise<string>;
    /********************************************************************
     * Get a RegExp object that can be used to filter IP addresses to
     * ensure that they fall within the same private subnet as
     * <ipAddress> or throw an exception.
     */
    getPrivateAddressRegExp(ipAddress: string): RegExp;
    getServerInfo(): Promise<any>;
    getAuthenticationToken(username: string, password: string): Promise<string>;
}
