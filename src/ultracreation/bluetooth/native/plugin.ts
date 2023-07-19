/**
 *  Native Bluetooth LE support
 *      .cordova-plugin-ble-central
 *          cordova plugin add cordova-plugin-ble-central --variable BLUETOOTH_USAGE_DESCRIPTION="Simulate Serial Communication"
 *          https://github.com/don/cordova-plugin-ble-central
 */
import {Subject, Observable} from 'rxjs';

import {TypeInfo} from '../../core/typeinfo';
import {Exception, EInvalidArg, EAbort} from '../../core/exception';
import {Platform} from '../../core/platform';
import {TAsyncWritable} from '../../core/stream';
import {TBase64Encoding} from '../../core/encoding/base64';

import {MTU_DEFAULT, MTU_MAX} from '../sig';
import {TCordovaPlugin, ECordovaPlugin, ECordovaPluginNotInstalled} from '../../native/cordova.plugin';
import {ICharNotification, IGattConnection} from './interface';

declare var window: any;

/** BLE targeting 8000 bps with 20 MTU */
const WRITE_MIN_INTERVAL = 20;

/**
 *  TGapCentral.Connect using Promise to indicate the connection is successful
 *   but ble callback never notification the unsuccess connection
 *   CONNECT_FAILURE_TIMEOUT is how long the promise should report connect is failure
 */
const CONNECT_FAILURE_TIMEOUT = 8100;

/** pause and restart scanning due to BLE death the long scan */
const SCAN_TIMEOUT = 5000;
const SCAN_RESTART = 1000;
const LOW_POWER_SCAN_RESTART = 3000;

/** Buffer size to cache the peripherial notification data, data will discard when buffer full */
// const NOTIFICATION_IN_BUFFER = 4 * 1024;

declare global
{
    namespace cordova.plugin
    {
        namespace BLE
        {
            type TStateNotify = 'on' | 'off'; // | 'turningOff' | 'turningOn';

            interface IScanDiscovery
            {
                id: string;
                name: string;
                rssi: number;
                advertising: ArrayBuffer | object | null;
                timestamp: number;
                mac?: string;    // really mac address if exists
            }

            interface IGattConnection extends Observable<void>
            {
                Close(): Promise<void>;
            }

            type TCharacteristicProp = 'Read' | 'Write' | 'WriteWithoutResponse' | 'Notify' | 'Indicate';

            interface ICharacteristicInfo
            {
                service: string;
                characteristic: string;
                properties: Array<TCharacteristicProp>;
                descriptors: Array<object>;
            }

            interface IScanOptions
            {
                reportDuplicates: boolean;
                AndroidQuirk?: Android.ScanOptions;

                ScanRestartPause?: number;
            }
        }
    }

    interface CordovaPlugins
    {
        BLE: typeof NativeBLE;
    }
}

namespace Android
{
    export interface ScanOptions
    {
        // https://developer.android.com/reference/kotlin/android/bluetooth/le/ScanSettings.Builder#setscanmode
        scanMode: 'lowPower' | 'balanced' | 'lowLatency' | 'opportunistic';
        // https://developer.android.com/reference/kotlin/android/bluetooth/le/ScanSettings.Builder#setcallbacktype
        callbackType?: 'all' | 'first' | 'last';
        // https://developer.android.com/reference/kotlin/android/bluetooth/le/ScanSettings.Builder#setmatchmode
        matchMode?: 'aggressive' | 'sticky';
        // https://developer.android.com/reference/kotlin/android/bluetooth/le/ScanSettings.Builder#setnumofmatches
        numOfMatches?: 'one'| 'few' | 'max';
        // https://developer.android.com/reference/kotlin/android/bluetooth/le/ScanSettings.Builder#setphy
        phy? : '1m' | 'coded' | 'all';
        // https://developer.android.com/reference/kotlin/android/bluetooth/le/ScanSettings.Builder#setlegacy
        legacy?: boolean;
        // https://developer.android.com/reference/kotlin/android/bluetooth/le/ScanSettings.Builder#setreportdelay
        reportDelay?: number;
    }

    export const enum ConnectionPriority
    {
        CONNECTION_PRIORITY_BALANCED,
        CONNECTION_PRIORITY_HIGH,
        CONNECTION_PRIORITY_LOW_POWER
    }
}

/* EBluetoothLEPlugin */

class EBluetoothLEPlugin extends ECordovaPlugin
{
    constructor(Message?: string)
    {
        if (TypeInfo.Assigned(Message))
            super(Message);
        else
            super('e_ble_plugin');
    }
}

class NativeBLE extends TCordovaPlugin
{
    static override readonly Name: string = 'ble';
    static override readonly Repository: string = 'cordova-plugin-ble-central';

    static Admin: typeof TAdmin;
    static Central: typeof TGapCentral;
}
TCordovaPlugin.Register(NativeBLE, 'BLE');

/* EConnectTimeout */

export class EConnectTimeout extends Exception
{
    constructor()
    {
        super('e_connect_timeout');
    }
}

/* TAdmin */

class TAdmin extends TCordovaPlugin
{
    static override readonly Name: string = 'ble';
    static override readonly Repository: string = 'cordova-plugin-ble-central';

    static IsLocationServiceEnabled(): Promise<boolean>
    {
        return this.CallbackToPromise<void>('isLocationEnabled')
            .then(() => true)
            .catch(err => false);
    }

    static IsEnabled(): Promise<boolean>
    {
        return this.CallbackToPromise('isEnabled')
            .then(() => true)
            .catch(err => false);
    }

    static async Enable(): Promise<boolean>
    {
        if (await this.IsEnabled())
            return true;

        if (this.Platform.IsAndroid)
        {
            return this.CallbackToPromise('enable')
                .then(() => true)
                .catch(err =>
                {
                    console.log(err);
                    return false;
                });
        }
        else if (this.Platform.IsiOS)
        {
            if (TypeInfo.Assigned((window as any).cordova.plugins.diagnostic))
            {
                window.cordova.plugins.diagnostic.requestBluetoothAuthorization(
                    () => console.log('NativeBLE: Bluetooth authorization was requested.'),
                    (err: any) => console.error(err)
                );
            }
            return false;
        }
        else
        {
            console.log('%cNativeBLE Unsupported platforms', 'color:red');
            return false;
        }
    }

    static async WaitForEnable(): Promise<void>
    {
        if (! await this.IsEnabled())
        {
            return new Promise<void>((resolve, reject) =>
            {
                const sub = this.OnStateChange.subscribe({
                    next: state =>
                    {
                        console.log(`wait enable: ${state}`);
                        if ('on' === state)
                        {
                            console.log(`wait enable: ${state}`);
                            sub.unsubscribe();
                            resolve();
                        }
                    },
                    error: err =>
                    {
                        reject(new EAbort());
                        sub.unsubscribe();
                    },
                    complete: () =>
                    {
                        reject(new EAbort());
                        sub.unsubscribe();
                    }
                });
            });
        }
    }

    static get OnStateChange(): Subject<cordova.plugin.BLE.TStateNotify>
    {
        if (! TypeInfo.Assigned(this._OnStateChange))
        {
            this._OnStateChange = new Subject<cordova.plugin.BLE.TStateNotify>();

            if (NativeBLE.IsPluginInstalled)
            {
                console.log('NativeBLE: startStateNotifications()');

                window.ble.startStateNotifications(
                    (state: cordova.plugin.BLE.TStateNotify) =>
                    {
                        console.log(`%cNativeBLE state change: ${state}`, 'color:yellow');

                        if ('off' === state)
                            TGapCentral.KillConnections();

                        this._OnStateChange.next(state);
                    },
                    (err: string) =>
                    {
                        console.log(`%cNativeBLE error: ${err}`, 'color:red');
                        this._OnStateChange.next('off');
                    }
                );
            }
        }

        return this._OnStateChange;
    }

    private static _OnStateChange: Subject<cordova.plugin.BLE.TStateNotify>;
}
NativeBLE.Admin = TAdmin;

/* TGapCentral */

class TGapCentral
{
    private static DEFAULT_OPTIONS: cordova.plugin.BLE.IScanOptions =
    {
        reportDuplicates: true,

        AndroidQuirk: {
            scanMode: 'lowLatency',
            callbackType: 'all',
        }
    };

    /**
     *  private constructor this is all static member class
     */
    private constructor()
    {
    }

    static Scan(): Observable<cordova.plugin.BLE.IScanDiscovery>
    {
        return new Observable(obs =>
        {
            this._StartScan(false).subscribe(obs);

            return () =>
            {
                if (! TypeInfo.Assigned(this.Scanning) || ! this.Scanning.observed)
                    this.StopScan();
            };
        });
    }

    static LowPowerScan(): Observable<cordova.plugin.BLE.IScanDiscovery>
    {
        return new Observable(obs =>
        {
            this._StartScan(true).subscribe(obs);

            return () =>
            {
                if (! TypeInfo.Assigned(this.Scanning) || ! this.Scanning.observed)
                    this.StopScan();
            };
        });
    }

    private static _StartScan(LowPower: boolean): Subject<cordova.plugin.BLE.IScanDiscovery>
    {
        if (! TypeInfo.Assigned(this.Scanning))
            this.Scanning = new Subject<cordova.plugin.BLE.IScanDiscovery>();

        if (NativeBLE.IsPluginInstalled)
        {
            this.ScanningOptions = Object.assign({}, this.DEFAULT_OPTIONS,
                this.DEFAULT_OPTIONS.AndroidQuirk, {scanMode: LowPower ? 'balanced' : 'lowLatency'});

            delete this.ScanningOptions.AndroidQuirk;
            this.ScanningOptions.ScanRestartPause = LowPower ? LOW_POWER_SCAN_RESTART : SCAN_RESTART;

            setTimeout(() => this._ScanNext());
        }
        else
        {
            const err = new ECordovaPluginNotInstalled(NativeBLE);
            console.log(`%cNativeBLE StartScan() with error: ${err.message}`, 'color:yellow');

            setTimeout(() =>
            {
                if (TypeInfo.Assigned(this.Scanning))
                    this.Scanning.error(err);
            });
        }

        return this.Scanning;
    }

    private static _ScanNext(): void
    {
        TAdmin.IsEnabled().then(en =>
        {
            if (! en)
                return;

            console.log(`NativeBLE startScanWithOptions(): ${JSON.stringify(this.ScanningOptions)}`);
            clearTimeout(this.ScanNextTimerId);

            this.ScanNextTimerId = setTimeout(() =>
            {
                window.ble.stopScan(() => {}, (err: any) => {});

                this.ScanNextTimerId = setTimeout(() =>
                {
                    if (TypeInfo.Assigned(this.Scanning))
                        this._ScanNext();
                }, this.ScanningOptions!.ScanRestartPause);
            }
            , SCAN_TIMEOUT);

            window.ble.startScanWithOptions([], this.ScanningOptions!,
                (Device: cordova.plugin.BLE.IScanDiscovery) =>
                {
                    if (TypeInfo.Assigned(this.Scanning))
                    {
                        // <noname> device'name by id
                        if (! TypeInfo.Assigned(Device.name))
                            Device.name = '';

                        this.Scanning.next(Device);
                    }
                },
                () =>
                {
                    clearTimeout(this.ScanNextTimerId);

                    setTimeout(() =>
                    {
                        if (TypeInfo.Assigned(this.Scanning))
                            this.Scanning.error(new EBluetoothLEPlugin());
                    });
                }
            );
        });
    }

    /**
     *  Stop GATT scan
     *      @returns Promise<void> to indicate successful / failure
     */
    static async StopScan(): Promise<void>
    {
        clearTimeout(this.ScanNextTimerId);

        if (TypeInfo.Assigned(this.Scanning))
        {
            this.Scanning.complete();
            this.Scanning = undefined;
        }

        if (NativeBLE.IsPluginInstalled)
        {
            await new Promise<void>((resolve, reject) =>
            {
                window.ble.stopScan(
                    () =>
                    {
                        resolve();
                        console.log(`NativeBLE: scan stopped.`);
                    },
                    (err: any) =>
                    {
                        resolve();
                        console.log(`%cNativeBLE stopScan() error: ${err}`, 'color:red');
                    }
                );
            });
        }
    }

    /**
     *  Get adversing Manufactory data
     */
    static GetManufactoryData(native_adv: any): Uint8Array | undefined
    {
        if (! TypeInfo.Assigned(native_adv))
            return undefined;

        let RetVal: Uint8Array | undefined;
        // android
        if (native_adv instanceof ArrayBuffer)
        {
            const ary = new Array<Uint8Array>();

            AndroidAdversingWalkthrough(native_adv, (tag, view): boolean =>
            {
                if (0xFF === tag)
                {
                    ary.push(view);

                    /** make nosense more than 2 manufactory data */
                    if (2 === ary.length)
                        return false;
                }
                return true;
            });

            if (0 === ary.length)
                return undefined;
            else if (1 === ary.length)
                return ary[0];
            else if (ary.length > 2)
                return undefined;

            // compare manufactory id
            if (ary[0][0] === ary[1][0] && ary[0][1] === ary[1][1])
            {
                const retval = new Uint8Array(ary[0].length + ary[1].length - 2);

                retval.set(ary[0], 0);
                const view = new Uint8Array(ary[1].buffer, ary[1].byteOffset + 2, ary[1].byteLength - 2);
                retval.set(view, ary[0].length);

                return retval;
            }
            else
                return undefined;
        }
        // ios
        else
        {
            try
            {
                if (TypeInfo.Assigned(native_adv.kCBAdvDataManufacturerData))
                {
                    // ios 10+
                    if (TypeInfo.Assigned(native_adv.kCBAdvDataManufacturerData.data))
                        RetVal = TBase64Encoding.Decode(native_adv.kCBAdvDataManufacturerData.data);
                    // ios 9-
                    else
                        RetVal = new Uint8Array(native_adv.kCBAdvDataManufacturerData);
                }
                else
                    RetVal = undefined;
            }
            catch (err)
            {
                console.log('%cNativeBLE error: Decode adv.kCBAdvDataManufacturerData.data', 'color:red');
                RetVal = undefined;
            }
        }
        return RetVal;

        /**
         *  Android only: Walk Through TGapCentral.StartScan adversing response data
         *  @returns true to continue, false assume caller found the data reqiured and breaks walk through
         */
        function AndroidAdversingWalkthrough(adv: ArrayBuffer, TagCallback: (tag: number, view: Uint8Array) => boolean): void
        {
            const view = new Uint8Array(adv);
            let idx = 0;

            while (idx < view.byteLength)
            {
                const len = view[idx];
                if (0 === len)
                    break;

                const block_view = new Uint8Array(adv, idx + 2, len - 1);
                if (! TagCallback(view[idx + 1], block_view))
                    break;
                idx = idx + len + 1;
            }
        }
    }

    /**
     *  Connect retrive an GAP connection.
     *  the BLE Read/Write/WriteNoResponse can be called after connect, TGattConnection also a Subject that can be subscribe:
     *      .BLE Notification OnData event = next, ths happened after StartNotification called
     *      .Disconnect event = complete
     *
     *      @param Timeout is how long the connection should kepp, 0 = INFINITE until Disconnect
     *      @returns Promise<TGattConnection> of a newly created connection
     */
    static Connect(DeviceId: string, Timeout: number = 0, ConnectionType?: typeof TGattConnection): Promise<TGattConnection>
    {
        if (! NativeBLE.IsPluginInstalled)
            return Promise.reject(new ECordovaPluginNotInstalled(NativeBLE));

        const _conn = this.Connections.get(DeviceId);
        if (TypeInfo.Assigned(_conn))
            return Promise.resolve(_conn);

        let Connecting = this.Connecting.get(DeviceId);

        if (! TypeInfo.Assigned(Connecting))
        {
            const Tick = Date.now();

            Connecting = new Promise<TGattConnection>((resolve, reject) =>
            {
                if (! TypeInfo.Assigned(ConnectionType))
                    ConnectionType = TGattConnection;
                const conn = new ConnectionType(DeviceId);

                console.log(`NativeBLE Connecting ${DeviceId}`);

                this.Disconnect(DeviceId).then(() =>
                    setTimeout(() => ble_try_connect(TGapCentral)));

                const IntervalId = setInterval(() =>
                {
                    const diff = Date.now() - Tick;
                    if (diff > CONNECT_FAILURE_TIMEOUT)
                    {
                        console.log(`%cNativeBLE Connect failure due to Timeout use_time: ${Date.now() - Tick}`, 'color:red');
                        this.Connecting.delete(DeviceId);
                        clearInterval(IntervalId);

                        this.Disconnect(DeviceId).catch(err => {}).then(() =>
                        {
                            console.log(`NativeBLE disconnect: ${DeviceId}`);
                            reject(new EConnectTimeout());
                        });
                    }
                    else if (! this.Connecting.has(DeviceId))
                    {
                        console.log(`NativeBLE connect aborting: ${DeviceId}`);

                        clearInterval(IntervalId);
                        reject(new EAbort());
                    }
                }, 100);

                function ble_try_connect(Self: typeof TGapCentral): void
                {
                    if (! Self.Connecting.has(DeviceId))
                        return;

                    window.ble.connect(DeviceId,
                        (info: any) =>
                        {
                            for (const iter of info.characteristics)
                                conn.CharacteristicsInfo.set(iter.characteristic.toUpperCase(), iter);

                            clearInterval(IntervalId);
                            Self.Connecting.delete(DeviceId);

                            resolve(conn);
                        },
                        () =>
                        {
                            if (Self.Connecting.has(DeviceId))
                            {
                                setTimeout(() =>
                                {
                                    console.log(`NativeBLE ble_try_connect tick: ${Date.now() - Tick}`);
                                    ble_try_connect(Self);
                                }, 500);
                            }
                            else
                            {
                                console.log('%cNativeBLE connect long term disconnect callback', 'color:orange');
                                Self.RemoveConnection(DeviceId);
                            }
                        }
                    );
                }
            })
            .then(async conn =>
            {
                this.Connections.set(DeviceId, conn);
                console.log(`NativeBLE Connected ${DeviceId} use_time: ${Date.now() - Tick}`);

                if (Platform.IsAndroid)
                {
                    const mtu = await this.RequestMTU(DeviceId);
                    if (0 !== mtu)
                    {
                        console.log(`NativeBLE android requested MTU size: ${mtu}`);
                        conn.MTU = mtu;
                    }

                    window.ble.requestConnectionPriority(DeviceId, Android.ConnectionPriority.CONNECTION_PRIORITY_HIGH,
                        () => console.log(`NativeBLE android set ConnectionPriority to 'High'`));
                }
                return conn;
            });

            this.Connecting.set(DeviceId, Connecting);
        }
        return Connecting;
    }

    /**
     *  Disconnect the GAP connection.
     *      the TGattConnection that owns this DeviceId will be trigger complete
     */
    static Disconnect(DeviceId: string): Promise<void>
    {
        if (! NativeBLE.IsPluginInstalled)
            return Promise.resolve();

        if (this.Connecting.delete(DeviceId))
            console.log(`NativeBLE disconnecting: ${DeviceId}`);

        return new Promise<void>((resolve, reject) =>
        {
            window.ble.disconnect(DeviceId,
                (buf: any) =>
                {
                    TGapCentral.RemoveConnection(DeviceId);
                    resolve();
                },
                (err: any) =>
                {
                    TGapCentral.RemoveConnection(DeviceId);
                    resolve();
                });
        });
    }

    private static RequestMTU(DeviceId: string): Promise<number>
    {
        if (! NativeBLE.IsPluginInstalled)
            return Promise.reject(new ECordovaPluginNotInstalled(NativeBLE));

        return new Promise<number>((resolve, reject) =>
        {
            window.ble.requestMtu(DeviceId, MTU_MAX,
                (mtu: number) =>
                {
                    resolve(mtu - 3);
                },
                () =>
                {
                    resolve(0);
                }
            );
        });
    }

    /**
     *  kill all connections
     */
    static async KillConnections(): Promise<void>
    {
        const Connecting = Array.from(this.Connecting);
        this.Connecting.clear();
        for (const iter of Connecting)
            await this.Disconnect(iter[0]);

        const Connected = Array.from(this.Connections);
        this.Connections.clear();
        for (const iter of Connected)
            await this.Disconnect(iter[0]);
    }

    private static RemoveConnection(DeviceId: string): void
    {
        const conn = this.Connections.get(DeviceId);

        if (TypeInfo.Assigned(conn))
        {
            this.Connections.delete(DeviceId);
            conn.complete();
            console.log(`${conn.DeviceId} disconnected.`);
        }
    }

    static StrictWrite = false;

    private static Scanning?: Subject<cordova.plugin.BLE.IScanDiscovery>;
    private static ScanningOptions?: cordova.plugin.BLE.IScanOptions;
    private static ScanNextTimerId: timeout_t;

    private static readonly Connections = new Map<string, TGattConnection>();
    private static readonly Connecting = new Map<string, Promise<TGattConnection>>();
}
NativeBLE.Central = TGapCentral;

/* TGattConnection */

interface IWriteQueueNext
{
    Instance: TGattConnection;
    Method: 'write' | 'writeWithoutResponse';
    Service: string;
    Characteristic: string;
    Buf: ArrayBuffer;
    resolve: (value: number) => void;
    reject: (reason?: any) => void;
}

export class TGattConnection extends Subject<void> implements IGattConnection
{
    constructor(readonly DeviceId: string)
    {
        super();
    }

    Close(): Promise<void>
    {
        return TGapCentral.Disconnect(this.DeviceId);
    }

    RSSI(): Promise<number | undefined>
    {
        return new Promise((resolve, reject) =>
        {
            window.ble.readRSSI(this.DeviceId,
                (rssi: number) => resolve(rssi),
                (err: string) => resolve(undefined));
        });
    }

    ReadChar(Service: string, Characteristic: string): Promise<ArrayBuffer>
    {
        return new Promise<ArrayBuffer>((resolve, reject) =>
        {
            const Self = this;
            window.ble.read(this.DeviceId, Service, Characteristic,
                (buf: any) =>
                    resolve(buf),
                (err: any) =>
                {
                    Self.error(new EBluetoothLEPlugin('read failure'));
                    reject((err));
                });
        });
    }

    WriteChar(Service: string, Characteristic: string, buf: ArrayBuffer): Promise<number>
    {
        if (buf.byteLength > this.MTU)
            throw new EInvalidArg(`Write exceed the BLE MTU ${this.MTU.toString()}`);

        return new Promise<number>((resolve, reject) =>
        {
            this._Write({
                Instance: this,
                Method: 'write',
                Service, Characteristic, Buf: buf,
                resolve, reject
            });
        });
    }

    WriteCharNoResponse(Service: string, Characteristic: string, buf: ArrayBuffer): Promise<number>
    {
        if (buf.byteLength > this.MTU)
            throw new EInvalidArg(`Write exceed the BLE MTU ${this.MTU.toString()}`);

        return new Promise<number>((resolve, reject) =>
        {
            this._Write({
                Instance: this,
                Method: 'writeWithoutResponse',
                Service, Characteristic, Buf: buf,
                resolve, reject
            });
        });
    }

    private _Write(Ctx: IWriteQueueNext): void
    {
        window.ble[Ctx.Method](Ctx.Instance.DeviceId, Ctx.Service, Ctx.Characteristic, Ctx.Buf,
            () =>
                Ctx.resolve(Ctx.Buf.byteLength),
            (err: any) =>
            {
                const obj = new EBluetoothLEPlugin(`BLE.${Ctx.Method}: ${err}`);
                Ctx.Instance.error(obj);
                Ctx.reject(obj);
            }
        );
    }

    /**
     *  start new or get Characteristic Stream that receive Notification
     *      *NOTE*: each Service.Characteristic can have one solo Characteristic Stream
     *      multiple StartNotification calls using same Service & Characteristic got same Stream
     */
    StartNotification<T extends TCharNotification>(Service: string, Characteristic: string,
        CharNotificationConstructor?: typeof TCharNotification): T
    {
        let ary = this.Notifications.get(this);
        if (! TypeInfo.Assigned(ary))
        {
            ary = new Array<TCharNotification>();
            this.Notifications.set(this, ary);
        }

        for (const iter of ary)
        {
            if (iter.Service === Service && iter.Characteristic === Characteristic)
                return iter as T;
        }

        if (! TypeInfo.Assigned(CharNotificationConstructor))
            CharNotificationConstructor = TCharNotification;

        const RetVal = new CharNotificationConstructor(this, Service, Characteristic);
        ary.push(RetVal);

        window.ble.startNotification(this.DeviceId, Service, Characteristic,
            (buf: ArrayBuffer) => RetVal.next(buf),
            (err: any) => console.log(err)
        );
        console.log(`TGattConnection.StartNotification: ${this.DeviceId} ${Service} ${Characteristic}`);

        return RetVal as T;
    }

    StopNotification(Service: string, Characteristic: string): void
    {
        const ary = this.Notifications.get(this);

        if (TypeInfo.Assigned(ary))
        {
            for (let i = 0; i < ary.length; i++)
            {
                if (ary[i].Service !== Service || ary[i].Characteristic !== Characteristic)
                    continue;

                const s = ary.splice(i, 1)[0];
                s.complete();

                window.ble.stopNotification(this.DeviceId, Service, Characteristic,
                    (succ: string) => {},
                    (err: string) => {}
                );
                console.log(`TGattConnection.StopNotification: ${this.DeviceId} ${Service} ${Characteristic}`);
                break;
            }
        }
    }

    private Dispose()
    {
        console.log('GapConnection dispose');

        if (TypeInfo.Assigned(this.OnTimeout))
            this.OnTimeout.complete();

        const ary = this.Notifications.get(this);

        if (TypeInfo.Assigned(ary))
        {
            ary.forEach(iter =>
            {
                window.ble.stopNotification(this.DeviceId, iter.Service, iter.Characteristic);
                iter.complete();
            });

            this.Notifications.set(this, []);
        }
    }

    MTU = MTU_DEFAULT - 3;
    readonly CharacteristicsInfo = new Map<string, cordova.plugin.BLE.ICharacteristicInfo>();
    readonly OnTimeout = new Subject<TGattConnection>();

    private readonly Notifications = (this.constructor as typeof TGattConnection).Notifications;
    private static readonly Notifications = new Map<TGattConnection, Array<TCharNotification>>();

    /* Subject */
    override complete(): void
    {
        console.log('GapConnection completed');
        this.Dispose();

        super.complete();
    }

    override error(err: any): void
    {
        console.log(`GapConnection error: ${err.message}`);
        this.Dispose();

        super.error(err);
    }
}

/* TCharNotification */

export class TCharNotification extends TAsyncWritable implements ICharNotification
{
    constructor(readonly Connection: TGattConnection, readonly Service: string, readonly Characteristic: string)
    {
        super();
    }

    Close(): Promise<void>
    {
        return this.Connection.Close();
    }

    StopNotification(): void
    {
        if (TypeInfo.Assigned(this.Connection))
            this.Connection.StopNotification(this.Service, this.Characteristic);
    }

    override Write(Buf: Uint8Array | ArrayBuffer, opts?: IStreamWriteOptions): Promise<number>
    {
        let view: Uint8Array = Buf instanceof Uint8Array ? Buf : new Uint8Array(Buf);
        let _count = this.Connection.MTU;

        if (TypeInfo.Assigned(opts))
        {
            if (TypeInfo.Assigned(opts.Count) && _count > opts.Count)
                _count = opts.Count;

            const _offset = TypeInfo.Assigned(opts.Offset) ? opts.Offset : 0;
            if (0 !== _offset || _count !== view.byteLength)
                view = new Uint8Array(view.buffer, view.byteOffset + _offset, _count);
        }
        _count = _count > view.byteLength ? view.byteLength : _count;

        /*
        if (! TypeInfo.Assigned(this.Connection))
            throw new Error('e_disconnected');
        */

        // copy Uint8Array => new ArrayBuffer: plugin has no Uint8Array method
        const buf = new Uint8Array(_count);
        buf.set(view);

        if (TGapCentral.StrictWrite)
            return this.Connection.WriteChar(this.Service, this.Characteristic, buf.buffer);
        else
            return this.Connection.WriteCharNoResponse(this.Service, this.Characteristic, buf.buffer);
    }

    override WriteBuf(Buf: Uint8Array, opts?: IStreamWriteOptions): Observable<number>
    {
        if (! TypeInfo.Assigned(opts))
            opts = {};
        if (! TypeInfo.Assigned(opts.FlowControl))
            opts.FlowControl = {Interval: WRITE_MIN_INTERVAL};
        if (! TypeInfo.Assigned(opts.FlowControl.Interval))
            opts.FlowControl.Interval = WRITE_MIN_INTERVAL;

        return super.WriteBuf(Buf, opts);
    }

    protected override _Dispose()
    {
        this.StopNotification();
    }
}
