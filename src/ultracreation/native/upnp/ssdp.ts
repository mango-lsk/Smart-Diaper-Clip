/**
 *  UPnP.SSDP implementation
 *
 *  Note:
 *      SSDP using HTTP/1.1 like protocol, its not meaning that SSDP is fully base on HTTP 1.1
 */

import {Observable} from 'rxjs';
import {Encoding} from '../../core/encoding';
import {TypeInfo} from '../../core/typeinfo';
import {TCordovaPlugin} from '../cordova.plugin';

import {TSocket} from '../socket';

interface ICacheControl
{
    MaxAge: number;
}

interface IUPnP
{
    /// BOOTID.UPNP.ORG
    BootId: number;
    /// CONFIGID.UPNP.ORG
    ConfigId: number;
    /// SEARCHPORT.UPNP.ORG
    SearchPort?: number;
}

interface ICommonHeader
{
    CacheControl?: ICacheControl;

    Location: string;
    Server: string;
    USN: string;

    // may not exists on some device
    UPnP?: IUPnP;

    /// hash accessing
    [Name: string]: string | ICacheControl | IUPnP | undefined;
}

declare global
{
    interface CordovaPlugins
    {
        SSDP: typeof SSDP;
    }

    namespace cordova.plugin
    {
        namespace SSDP
        {
            interface IDeviceNotify extends ICommonHeader
            {
                Host: string;

                NT: string;
                NTS: string;
            }

            interface ISearchReponse extends ICommonHeader
            {
                Date?: string;
                // Ext: '';
                ST: string;
            }
        }
    }
}

class SSDP extends TCordovaPlugin
{
    static override readonly Name: string = 'SSDP';

    static override get IsPluginInstalled(): boolean
    {
        /// SSDP require socket plugin
        return cordova.plugin.Socket.IsPluginInstalled;
    }

    static Listen(): Observable<Uint8Array>
    {
        return new Observable(obs =>
        {
            const Socket = new TSocket(TSocketFamily.AF_INET, TSocketType.SOCK_DGRAM, 0);

            Socket.Bind(`${Inet.ADDR_ANY}:${SSDP.PORT}`).then(async () =>
            {
                // await Socket.SetBroadcast(true);
                await Socket.SetReuseAddress(true);

                setTimeout(() => ListenNext());
            })
            .catch(err =>
            {
                Socket.Close();
                obs.error(err);
            });

            function ListenNext(): void
            {
                Socket.RecvFrom(1500)
                    .then(buf =>
                    {
                        obs.next(Encoding.Base64.Decode(buf.ByteBase64));
                        setTimeout(() => ListenNext());
                    })
                    .catch(err =>
                    {
                        if (-1 !== Socket.Fd)
                            obs.error(err);
                    });
            }

            return () => Socket.Close();
        });
    }

    static Options: SSDP.IOptions = {
        Search: {
            MX: 5
        }
    };

    /**
     *  default Search for 'upnp:rootdevice' only.
     */
    static Search(): Observable<cordova.plugin.SSDP.ISearchReponse>;
    /**
     *  Search for all devices and services.
     */
    static Search(Target: 'ssdp:all'): Observable<cordova.plugin.SSDP.ISearchReponse>;
    /**
     *  Search for root devices only.
     */
    static Search(Target: 'upnp:rootdevice'): Observable<cordova.plugin.SSDP.ISearchReponse>;
    /**
     *  Search by its UUID
     */
    static Search(Target: 'uuid', uuid: string): Observable<cordova.plugin.SSDP.ISearchReponse>;
    /**
     *  Search any Target (domain:<device/service>:type:version)
     */
    static Search(Target: string): Observable<cordova.plugin.SSDP.ISearchReponse>;
    /**
     *  Search upnp.org predefined device/service
     */
    static Search(Domain: 'schemas-upnp-org', Kind: 'device', DeviceType: string, Version: number): Observable<cordova.plugin.SSDP.ISearchReponse>;
    static Search(Domain: 'schemas-upnp-org', Kind: 'service', SearchType: string, Version: number): Observable<cordova.plugin.SSDP.ISearchReponse>;
    /**
     *  Search vendor domain's device/service
     */
    static Search(Domain: string, Kind: 'device', DeviceType: string, Version: number): Observable<cordova.plugin.SSDP.ISearchReponse>;
    static Search(Domain: string, Kind: 'service', ServiceType: string, Version: number): Observable<cordova.plugin.SSDP.ISearchReponse>;
    /** */
    static Search(DomainOrTarget?: string, ...args: any[]): Observable<cordova.plugin.SSDP.ISearchReponse>
    {
        return this._Query(SSDP.MULTI_CAST, DomainOrTarget, ...args);
    }

    /**
     *  default Query host for 'upnp:rootdevice'.
     */
    static Query(Host: string): Observable<cordova.plugin.SSDP.ISearchReponse>;
    /**
     *  Query host for device and services.
     */
    static Query(Host: string, Target: 'ssdp:all'): Observable<cordova.plugin.SSDP.ISearchReponse>;
    /**
     *  Query host for root device.
     */
    static Query(Host: string, Target: 'upnp:rootdevice'): Observable<cordova.plugin.SSDP.ISearchReponse>;
    /**
     *  Query host is device'UUID
     */
    static Query(Host: string, Target: 'uuid', uuid: string): Observable<cordova.plugin.SSDP.ISearchReponse>;
    /**
     *  Query host is (domain:<device/service>:type:version)?
     */
    static Query(Host: string, Target: string): Observable<cordova.plugin.SSDP.ISearchReponse>;
    /**
     *  Query host is upnp.org predefined device/service
     */
    static Query(Host: string, Domain: 'schemas-upnp-org', Kind: 'device' | 'service', DeviceType: string, Version?: number): Observable<cordova.plugin.SSDP.ISearchReponse>;
    /**
     *  Query host is vendor domain's device/service
     */
    static Query(Host: string, Domain: string, Kind: 'device' | 'service', ServiceType: string, Version?: number): Observable<cordova.plugin.SSDP.ISearchReponse>;
    static Query(Host: string, DomainOrTarget?: string, ...args: any[]): Observable<cordova.plugin.SSDP.ISearchReponse>
    {
        return this._Query(Host, DomainOrTarget, ...args);
    }

    private static _Query(Host: string, DomainOrTarget?: string, ...args: any[]): Observable<cordova.plugin.SSDP.ISearchReponse>
    {
       let ST: string | undefined;

       if (TypeInfo.Assigned(DomainOrTarget))
       {
           switch (DomainOrTarget)
           {
           case 'ssdp:all':
           case 'upnp:rootdevice':
               ST = DomainOrTarget;
               break;

           case 'uuid':
               ST = `uuid:${args[0]}`;
               break;

           default:
                // kind
                if (TypeInfo.Assigned(args[0]))
                {
                    if ('schemas-upnp-org' !== DomainOrTarget)
                        DomainOrTarget.replace(/\./g, '-');

                    ST = `urn:${DomainOrTarget}:${args[0]}:${args[1]}`;

                    // version ?
                    if (TypeInfo.Assigned(args[2]))
                        ST += `:${args[2]}`;
                }
                else
                    ST = `urn:${DomainOrTarget}`;

                break;
           }
       }
       else
           ST = 'upnp:rootdevice';

       const Request = ['M-SEARCH * HTTP/1.1',
           `Host: ${Host}`,
           `Man: "ssdp:discover"`,
           `MX: ${this.Options.Search.MX}`,
           `ST: ${ST}`,
        //    `USER-AGENT: UPnP/1.1 ultracreation/1`,
            '', ''].join('\r\n');

        return new Observable(obs =>
        {
            const Socket = new TSocket(TSocketFamily.AF_INET, TSocketType.SOCK_DGRAM, 0);

            Socket.BindIfaceLocalAddr('wlan', Inet.PORT_ANY)
                .then(async () =>
                {
                    console.log(`%cSSDP: searching...\r\n%c${Request}`, 'color:lightgreen', 'color:green');

                    await Socket.SetBroadcast(true);
                    await Socket.SendTo(Encoding.ASCII.Encode(Request), Host);

                    setTimeout(() => ListenNext());
                })
                .catch(err =>
                {
                    Socket.Close();
                    obs.error(err);

                    console.log(`%cSSDP: search canceled ${err.message}`, 'color:yellow');
                });

            const TimeoutId = setTimeout(() =>
            {
                Socket.Close();
                obs.complete();

                console.log(`%cSSDP: timedout`, 'color:lightgreen');
            }, this.Options.Search.MX * 1000);

            function ListenNext(): void
            {
                Socket.WaitForReadReady(SSDP.Options.Search.MX * 1000)
                    .then(() => Socket.RecvFrom(1500))
                    .then(buf =>
                    {
                        const resp = SSDP.ParseSearch(Encoding.Base64.Decode(buf.ByteBase64));

                        if (TypeInfo.Assigned(resp))
                            obs.next(resp);

                        setTimeout(() => ListenNext());
                    })
                    .catch(err =>
                    {
                        if (-1 !== Socket.Fd)
                            obs.error(err);

                        clearTimeout(TimeoutId);
                    });
            }

            return () =>
            {
                clearTimeout(TimeoutId);
                Socket.Close();
            };
        });
    }
}
TCordovaPlugin.Register(SSDP);

namespace SSDP
{
    export const PORT = 1900;
    export const MULTI_CAST = `239.255.255.250:${PORT}`;

    export enum KnownDeviceType
    {
        'InternetGatewayDevice',
    }

    interface ISearchOptions
    {
        /**
         *  maximum wait time in seconds
         */
        MX: 1 | 2 | 3 | 4 | 5;
    }

    export interface IOptions
    {
        Search: ISearchOptions;
    }

    export function ParseNotify(Buf: Uint8Array): cordova.plugin.SSDP.IDeviceNotify | undefined
    {
        const header = ParseHeader(Buf) as cordova.plugin.SSDP.IDeviceNotify;

        if (TypeInfo.Assigned(header))
        {
            if (TypeInfo.Assigned(header.NT) || ! TypeInfo.Assigned(header.NTS))
            {
                console.log(`%cSSDP: header is not NOTIFY`, 'color:red');
                console.log(header);
                return undefined;
            }
            else
                return header;
        }
        else
            return undefined;
    }

    export function ParseSearch(Buf: Uint8Array): cordova.plugin.SSDP.ISearchReponse | undefined
    {
        const header = ParseHeader(Buf) as cordova.plugin.SSDP.ISearchReponse;

        if (TypeInfo.Assigned(header))
        {
            if (! TypeInfo.Assigned(header.ST))
            {
                console.log(`%cSSDP: header is not search response`, 'color:red');
                console.log(header);
                return undefined;
            }
            else
                return header;
        }
        else
            return undefined;
    }

    function ParseHeader(Buf: Uint8Array): ICommonHeader | undefined
    {
        const Lines = Encoding.ASCII.Decode(Buf).split('\r\n');
        // console.log(Lines);

        /// least 3 lines to start parse
        if (3 > Lines.length)
            return undefined;

        if ('HTTP/1.1 200 OK' !== Lines[0])
            return undefined;
        /// warning end of http'headers: '\r\n'
        if ('' !== Lines[Lines.length - 1] || '' !== Lines[Lines.length - 2])
        {
            console.log(`%cSSDP: header not ending with "\r\n"`, 'color:red');
            return undefined;
        }

        const RetVal = {} as any;

        for (let I = 1; I < Lines.length - 2; I ++)
        {
            const Line = Lines[I];
            const Idx = Line.indexOf(':');

            if (-1 === Idx)
            {
                console.log(`%cSSDP: invalid line in header ${Line}`, 'color:red');
                return undefined;
            }

            const Key = Line.substring(0, Idx);
            const Value = Line.substring(Idx + 1).trim();
            let Parse: string[];

            switch (Key.toUpperCase())
            {
            // common header
            case 'CACHE-CONTROL':
                Parse = Value.split('=');
                if (2 === Parse.length && 'max-age' === Parse[0].trim().toLocaleLowerCase())
                    (RetVal as ICommonHeader).CacheControl = {MaxAge: parseInt(Parse[1], 10)};
                break;
            case 'LOCATION':
                (RetVal as ICommonHeader).Location = Value;
                break;
            case 'SERVER':
                (RetVal as ICommonHeader).Server = Value;
                break;
            case 'USN':
                (RetVal as ICommonHeader).USN = Value;
                break;

            // common header => X.UPNP.ORG
            case 'BOOTID.UPNP.ORG':
                if (! TypeInfo.Assigned((RetVal as ICommonHeader).UPnP))
                    (RetVal as ICommonHeader).UPnP = {} as any;
                (RetVal as ICommonHeader).UPnP!.BootId = parseInt(Value, 10);
                break;
            case 'CONFIGID.UPNP.ORG':
                if (! TypeInfo.Assigned((RetVal as ICommonHeader).UPnP))
                    (RetVal as ICommonHeader).UPnP = {} as any;
                (RetVal as ICommonHeader).UPnP!.ConfigId = parseInt(Value, 10);
                break;
            case 'SEARCHPORT.UPNP.ORG':
                if (! TypeInfo.Assigned((RetVal as ICommonHeader).UPnP))
                    (RetVal as ICommonHeader).UPnP = {} as any;
                (RetVal as ICommonHeader).UPnP!.SearchPort = parseInt(Value, 10);
                break;

            // notify header
            case 'HOST':
                (RetVal as cordova.plugin.SSDP.IDeviceNotify).Host = Value;
                break;
            case 'NT':
                (RetVal as cordova.plugin.SSDP.IDeviceNotify).NT = Value;
                break;
            case 'NTS':
                (RetVal as cordova.plugin.SSDP.IDeviceNotify).NT = Value;
                break;

            // response header
            case 'DATE':
                (RetVal as cordova.plugin.SSDP.ISearchReponse).Date = Value;
                break;
            case 'ST':
                (RetVal as cordova.plugin.SSDP.ISearchReponse).ST = Value;
                break;

            default:
                (RetVal as ICommonHeader)[Key] = Value;
                break;
            }
        }

        if (TypeInfo.Assigned(RetVal.Location) && TypeInfo.Assigned(RetVal.Server) && TypeInfo.Assigned(RetVal.USN))
        {
            return RetVal;
        }
        else
        {
            console.log(`%cSSDP: header not recognized"`, 'color:red');
            return undefined;
        }
    }
}
