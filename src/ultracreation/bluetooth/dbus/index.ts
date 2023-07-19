import {Observable, Subject, Subscription} from 'rxjs';
import {filter, map} from 'rxjs/operators';

import {TypeInfo} from '../../core/typeinfo';
import {ETimedout} from '../../core/exception';
import {RandomSource} from '../../core/random';
import {EStreamWrite, TAsyncWritable} from '../../core/stream';
import {Encoding} from '../../core/encoding';

import {AdvFlag} from '../sig';
import {ICharNotification, IGattConnection} from '../native/interface';
import {Bluetooth} from './api';
import {TDBusPeripheral} from '../../asset/peripheral/dbus';
import {TBluetoothPeripheral} from '..';
import {PeripheralFactory} from '../../asset/peripheral';

const SCAN_TIMEOUT = 10000;
const SCAN_RESTART  = 1000;
const OPPORTUNISTIC_TIMEOUT = 6000;

const CONNECT_FAILURE_TIMEOUT = 5000;

export class TDBusBluetooth extends TDBusPeripheral
{
    static override ClassName = 'ultracreation:device:bluetooth';
    static override ProductName = 'Bluetooth Router';
    static override Icon = 'router.svg';

    constructor ()
    {
        super();

        this.Admin = this.MessageBus.CreateProxy(Bluetooth.InvokeContext);
        this._Central = this.MessageBus.CreateProxy(Bluetooth.Central.InvokeContext);
        this._Gatt =  this.MessageBus.CreateProxy(Bluetooth.Gatt.InvokeContext);

        this.Central = new TBluetoothCentral(this._Central, this._Gatt);
    }

    protected override HandleLocalDiscover(): void
    {
        console.log(`%cWifi <=> Bluetooth discover in local network`, 'color:lightgreen');
        super.HandleLocalDiscover();
    }

    protected override async HandleConntected(): Promise<void>
    {
        await super.HandleConntected();

        await this.Admin.Enable();
        console.log(`DBusBluetooth HCI enabled: ${this.Id}`);
    }

    Admin: Bluetooth;
    Central: TBluetoothCentral;

    private _Central: Bluetooth.Central;
    private _Gatt: Bluetooth.Gatt;
}
PeripheralFactory.Register(TDBusBluetooth);

class TBluetoothCentral
{
    constructor (private _Central: Bluetooth.Central, private _Gatt: Bluetooth.Gatt)
    {
    }

    Scan(): Observable<TBluetoothPeripheral>
    {
        return new Observable<TBluetoothPeripheral>(obs =>
        {
            this._StartScan('active');

            if (TypeInfo.Assigned(this.Scanning))
                this.Scanning.subscribe(obs);
            else
                obs.complete();

            return () =>
            {
                this.UnsubscribeScanSignals();
            };
        });
    }

    OpportunisticScan(): Observable<TBluetoothPeripheral>
    {
        return new Observable(obs =>
        {
            this._StartScan('opportunistic');

            if (TypeInfo.Assigned(this.Scanning))
                this.Scanning.subscribe(obs);
            else
                obs.complete();

            return () =>
            {
                this.UnsubscribeScanSignals();
            };
        });
    }

    private UnsubscribeScanSignals(): void
    {
        clearTimeout(this.DeferUnsubscribeTimeoutId);

        if (TypeInfo.Assigned(this.Scanning) && ! this.Scanning.observed)
        {
            this.ScanningType = undefined;
            this.ScanToken = undefined;
            this.Scanning = undefined;
        }

        this.DeferUnsubscribeTimeoutId = setTimeout(() =>
        {
            this.DeferUnsubscribeTimeoutId = undefined;

            if (! TypeInfo.Assigned(this.Scanning))
            {
                if (TypeInfo.Assigned(this.OnDiscoverSub))
                {
                    this.OnDiscoverSub.unsubscribe();
                    this.OnDiscoverSub = undefined;
                }
                if (TypeInfo.Assigned(this.OnScanExpiredSub))
                {
                    this.OnScanExpiredSub.unsubscribe();
                    this.OnScanExpiredSub = undefined;
                }
            }
        }, 5000);
    }

    private OpportunisticUpdateNext(): void
    {
        if (TypeInfo.Assigned(this.ScanNextTimeoutId))
        {
            clearTimeout(this.ScanNextTimeoutId);
            this.ScanNextTimeoutId = undefined;
        }
        const NextTimeout = OPPORTUNISTIC_TIMEOUT + (RandomSource.Generate() % 5) * 1000;

        this.ScanNextTimeoutId = setTimeout(() =>
        {
            this.ScanNextTimeoutId = undefined;

            if (TypeInfo.Assigned(this.ScanningType))
            {
                this.ScanToken = undefined;     // force start
                this._StartScan(this.ScanningType);
            }
        }, NextTimeout);
    }

    private _StartScan(Type: 'active' | 'opportunistic'): void
    {
        if (! TypeInfo.Assigned(this.Scanning))
        {
            this.Scanning = new Subject<TBluetoothPeripheral>();
            this.ScanningType = Type;
        }

        if (! TypeInfo.Assigned(this.OnDiscoverSub))
        {
            this.OnDiscoverSub = this._Central.OnDiscoverBase64.pipe(
                map(next =>
                {
                    this.OpportunisticUpdateNext();
                    const Adv = this.ParseAdv(next);

                    let NameBuf = Adv.get(AdvFlag.COMPLETE_NAME);
                    if (! TypeInfo.Assigned(NameBuf))
                        NameBuf = Adv.get(AdvFlag.SHORTENED_NAME);
                    const Name = TypeInfo.Assigned(NameBuf) ? Encoding.Utf8.Decode(NameBuf) : undefined;

                    const Peripherial = TBluetoothPeripheral.Identify(next.Id, Name,
                        Adv.get(AdvFlag.MANU_SPECIFIC_DATA));

                    if (TypeInfo.Assigned(Peripherial))
                    {
                        if (0 === next.RSSI)        // HCI reports impossiable value
                            Peripherial.UpdateRSSI(this, -100);
                        else
                            Peripherial.UpdateRSSI(this, next.RSSI);

                        return Peripherial;
                    }
                    else
                        return next;
                }),
                filter((iter): iter is TBluetoothPeripheral => iter instanceof TBluetoothPeripheral)
            ).subscribe({
                next: val => setTimeout(() => this.Scanning?.next(val)),
                complete: () => this.Scanning?.complete(),
                error: err => this.Scanning?.error(err)
            });
        }

        if (! TypeInfo.Assigned(this.StarttingScan) && ! TypeInfo.Assigned(this.ScanToken))
        {
            const Timeout = 'active' === Type ? SCAN_TIMEOUT : OPPORTUNISTIC_TIMEOUT;

            // TODO: why this must add latency to get thre result, mqtt bug?
            setTimeout(() =>
            {
                if ('opportunistic' === Type && TypeInfo.Assigned(this.ScanNextTimeoutId))
                {
                    // nothing to do, someone else has emit the scan
                }
                else if (! TypeInfo.Assigned(this.StarttingScan))
                {
                    console.log(`%cstartting ${Type} scan`, 'color:lightgreen');

                    this.StarttingScan = this._Central.StartScan(Timeout)
                        .then(token =>
                        {
                            console.log(`DBus=>Bluetooth StartScan(): ${token}, Timeout: ${Timeout}`);
                            this.ScanToken = token;
                        })
                        .catch(err =>
                        {
                            console.log(`%cDBus=>Bluetooth StartScan(): ${err.message}`, 'color:red');

                            if (TypeInfo.Assigned(this.Scanning))
                                this.Scanning.error(err);
                        })
                        .finally(() =>
                            this.StarttingScan = undefined);
                }
            }, 500);
        }
        this.ScanningType = Type;

        if (! TypeInfo.Assigned(this.OnScanExpiredSub))
        {
            this.OnScanExpiredSub = this._Central.OnScanExpired.subscribe(token =>
            {
                if (TypeInfo.Assigned(this.ScanNextTimeoutId))
                {
                    clearTimeout(this.ScanNextTimeoutId);
                    this.ScanNextTimeoutId = undefined;
                }

                if ('opportunistic' === this.ScanningType)
                {
                    if (token === this.ScanToken)
                        this.ScanToken = undefined;

                    this.OpportunisticUpdateNext();
                }
                else
                {
                    if (token === this.ScanToken)
                    {
                        console.log(`%crestart until ${SCAN_RESTART} ms`, 'color:lightgreen');
                        this.ScanToken = undefined;

                        this.ScanNextTimeoutId = setTimeout(() =>
                        {
                            this.ScanNextTimeoutId = undefined;

                            if (TypeInfo.Assigned(this.Scanning))
                                this._StartScan(this.ScanningType!);
                            else
                                console.log(`%cScanning done.`, 'color:lightgreen');

                        }, SCAN_RESTART);
                    }
                }
            });
        }
    }

    StopScan(): Promise<void>
    {
        // happens so fast?
        if (TypeInfo.Assigned(this.StarttingScan))
        {
            // await this.StarttingScan;
            console.log(`%cDBus=>Bluetooth StartScan() never started`, 'color:red');
            this.StarttingScan = undefined;
        }

        if (TypeInfo.Assigned(this.ScanNextTimeoutId))
        {
            clearTimeout(this.ScanNextTimeoutId);
            this.ScanNextTimeoutId = undefined;
        }

        if (TypeInfo.Assigned(this.Scanning))
        {
            this.Scanning.complete();
            this.Scanning = undefined;
        }

        this.ScanningType = undefined;
        return this._StopScan();
    }

    private _StopScan(): Promise<void>
    {
        if (TypeInfo.Assigned(this.ScanToken))
        {
            return this._Central.StopScan(this.ScanToken)
                .then(() =>
                    console.log(`DBus=>Bluetooth StopScan()`))
                .catch(err =>
                    console.log(`%cDBus=>Bluetooth StopScan(): ${err.message}`, 'color:yellow'));
        }
        else
            return Promise.resolve();
    }

    Connect(Id: string): Promise<TGattConnection>
    {
        const exist_conn = this.Connections.get(Id);
        if (TypeInfo.Assigned(exist_conn))
            return Promise.resolve(exist_conn);

        if (! TypeInfo.Assigned(this.OnDisconnectSub))
        {
            this.OnDisconnectSub = this._Central.OnDisconnect.subscribe(Fd =>
            {
                console.log(`DBusBluetooth: disconected ${Fd}`);
                this.RemoveConnection(Fd);
            });
        }

        let Connecting = this.Connecting.get(Id);
        if (TypeInfo.Assigned(Connecting))
            return Connecting;
        else
            console.log(`DBusBluetooth connecting: ${Id}`);

        Connecting = new Promise<[number, number]>((resolve, reject) => TryConnect(this._Central, Date.now(), resolve, reject))
            .then(FdMTU =>
            {
                console.log(`DBusBluetooth: ${Id} connected. Fd: ${FdMTU[0]}`);
                this.Connecting.delete(Id);
                const conn = new TGattConnection(this, this._Gatt, Id, FdMTU[0], FdMTU[1]);

                this.ConnectionsFd.set(FdMTU[0], conn);
                this.Connections.set(Id, conn);

                return conn;
            })
            .catch(err =>
            {
                if (0 === this.ConnectionsFd.size && TypeInfo.Assigned(this.OnDisconnectSub))
                {
                    this.OnDisconnectSub.unsubscribe();
                    this.OnDisconnectSub = undefined;
                }
                throw err;
            })
            .finally(() =>
            {
                this.Connecting.delete(Id);
            });

        this.Connecting.set(Id, Connecting);
        return Connecting;

        function TryConnect(Central: Bluetooth.Central, TickStart: number, resolve: (ret: [number, number]) => void, reject: (err: Error) => void): void
        {
            Central.Connect(Id).then(([Fd, MTU]) =>
            {
                if (Fd < 0)
                {
                    if (Date.now() - TickStart < CONNECT_FAILURE_TIMEOUT)
                    {
                        console.log(`DBusBluetooth: retry connecting: ${Id}`);
                        setTimeout(() => TryConnect(Central, TickStart, resolve, reject), 1000);
                    }
                    else
                        reject(new ETimedout());
                }
                else
                    resolve([Fd, MTU]);
            });
        }
    }

    Disconnect(Id: string): Promise<void>;
    Disconnect(Fd: number): Promise<void>;
    async Disconnect(IdOrFd: string | number): Promise<void>
    {
        if (TypeInfo.IsNumber(IdOrFd))
        {
            const conn = this.ConnectionsFd.get(IdOrFd);
            if (TypeInfo.Assigned(conn))
            {
                console.log(`DBusBluetooth disconnecting: ${conn.Id} ${IdOrFd}`);
                this.RemoveConnection(conn.Fd);
                await this._Central.Disconnect(IdOrFd).catch(err => console.log(err.message));
            }
        }
        else
        {
            const conn = this.Connections.get(IdOrFd);
            if (TypeInfo.Assigned(conn))
            {
                console.log(`DBusBluetooth disconnecting: ${IdOrFd} ${conn.Fd}`);
                this.RemoveConnection(conn.Fd);
                await this._Central.Disconnect(conn.Fd).catch(err => console.log(err.message));
            }
        }
    }

    ParseAdv(next: Bluetooth.IScanDiscoverBase64): Map < number, Uint8Array >
    {
        const Hash = new Map<AdvFlag, Uint8Array>();
        let Adv: Uint8Array | undefined;
        try
        {
            Adv = Encoding.Base64.Decode(next.Adv);
            let Idx = 0;

            while (Idx < Adv.length)
            {
                const L = Adv[Idx];
                if (0 === L)
                {
                    Idx ++;
                    continue;
                }
                Hash.set(Adv[Idx + 1], new Uint8Array(Adv.buffer, Adv.byteOffset + Idx + 2, L - 1));
                Idx = Idx + L + 1;
            }
        }
        catch (e)
        {
            console.log(Hash);
            console.log(`%cDBusBluetooth error parse advertising Id: ${next.Id}`, 'color:red');

            if (TypeInfo.Assigned(Adv))
                console.log(Adv);
            else
                console.log(next.Adv);
        }
        return Hash;
    }

    private RemoveConnection(Fd: number)
    {
        const conn = this.ConnectionsFd.get(Fd);
        if (TypeInfo.Assigned(conn))
        {
            conn.complete();

            this.ConnectionsFd.delete(Fd);
            this.Connections.delete(conn.Id);

            console.log(`DBusBluetooth: ${conn.Id} disconnected.`);
        }

        if (0 === this.ConnectionsFd.size && TypeInfo.Assigned(this.OnDisconnectSub))
        {
            this.OnDisconnectSub.unsubscribe();
            this.OnDisconnectSub = undefined;
        }
    }

    ScanningType?: 'active' | 'opportunistic';
    private StarttingScan?: Promise<void>;
    private ScanToken?: number;
    private Scanning?: Subject<TBluetoothPeripheral>;
    private ScanNextTimeoutId?: timeout_t;

    private Connections = new Map<string, TGattConnection>();
    private ConnectionsFd = new Map<number, TGattConnection>();
    private Connecting = new Map<string, Promise<TGattConnection>>();

    private DeferUnsubscribeTimeoutId?: timeout_t;
    private OnScanExpiredSub?: Subscription;
    private OnDiscoverSub?: Subscription;
    private OnDisconnectSub?: Subscription;
}

class TGattConnection extends Subject<void> implements IGattConnection
{
    constructor (private Central: TBluetoothCentral, private _Gatt: Bluetooth.Gatt,
        readonly Id: string, readonly Fd: number, readonly MTU: number)
    {
        super();
    }

    Close(): Promise<void>
    {
        return this.Central.Disconnect(this.Fd);
    }

    StartNotification(Service: string, Characteristic: string): ICharNotification
    {
        let Notifications = this.Notifications.get(this.Fd);
        if (! TypeInfo.Assigned(Notifications))
        {
            Notifications = new Array<TCharNotification>();
            this.Notifications.set(this.Fd, Notifications);
        }

        for (const iter of Notifications)
        {
            if (iter.Service === Service && iter.Characteristic === Characteristic)
                return iter;
        }

        const RetVal = new TCharNotification(this, Service, Characteristic);
        const Idx = Notifications.push(RetVal) - 1;

        this._Gatt.StartNotification({Fd: this.Fd, Service, Name: Characteristic})
            .then(() =>
            {
                console.log(`DBus=>Bluetooth StartNotification() success.`);
                this.HandleNotification();
            })
            .catch(err =>
            {
                console.log(`%cDBus=>Bluetooth StartNotification() error: ${err.message}`, 'color:red');
                Notifications?.splice(Idx, 1);

                // complete instead of RetVal.error(err)?
                RetVal.complete();
            });
        return RetVal;
    }

    StopNotification(Service: string, Characteristic: string): void
    {
        this.GetNotificationInstance(Service, Characteristic, true);
    }

    async ReadChar(Service: string, Characteristic: string): Promise<Uint8Array>
    {
        const buf = await this._Gatt.ReadCharBase64({Fd: this.Fd, Service, Name: Characteristic});
        return Encoding.Base64.Decode(buf);
    }

    WriteChar(Service: string, Characteristic: string, buf: ArrayBuffer | Uint8Array): Promise<number>
    {
        return this._Gatt.WriteCharBase64({Fd: this.Fd, Service, Name: Characteristic},
            Encoding.Base64.EncodeToString(buf));
    }

    WriteCharNoResponse(Service: string, Characteristic: string, buf: ArrayBuffer | Uint8Array, FlowControl: number): Promise<void>
    {
        return this._Gatt.WriteCharNoRespBase64({Fd: this.Fd, Service, Name: Characteristic},
            Encoding.Base64.EncodeToString(buf), FlowControl);
    }

    private HandleNotification(): void
    {
        if (! TypeInfo.Assigned(this.NotificationSub))
        {
            this.NotificationSub = this._Gatt.OnNotificationBase64.subscribe(notify =>
            {
                if (notify[0].Fd !== this.Fd)
                    return;

                const Inst = this.GetNotificationInstance(notify[0].Service, notify[0].Name);
                if (TypeInfo.Assigned(Inst))
                    Inst.next(Encoding.Base64.Decode(notify[1]));
            });
        }
    }

    private UnscribeNotification(): void
    {
        if (TypeInfo.Assigned(this.NotificationSub))
        {
            this.NotificationSub.unsubscribe();
            this.NotificationSub = undefined;
        }
    }

    private GetNotificationInstance(Service: string, Characteristic: string, Stop?: true): TCharNotification | undefined
    {
        const ary = this.Notifications.get(this.Fd);
        if (TypeInfo.Assigned(ary))
        {
            for (let i = 0; i < ary.length; i ++)
            {
                const iter = ary[i];

                if (iter.Service === Service && iter.Characteristic === Characteristic)
                {
                    if (Stop)
                    {
                        this._Gatt.StopNotification({Fd: this.Fd, Service, Name: Characteristic})
                            .then(() =>
                                console.log(`DBus=>Bluetooth StopNotification()`))
                            .catch(err =>
                                console.log(`%cDBus=>Bluetooth StartNotification() error: ${err.message}`, 'color:red'))
                            .finally(() =>
                            {
                                ary.splice(i, 1);

                                if (0 === ary.length)
                                {
                                    this.Notifications.delete(this.Fd);
                                    this.UnscribeNotification();
                                }
                            });
                    }
                    return iter;
                }
            }
        }

        console.log(`%cDBus=>Bluetooth: received GATT notification ${Service}.${Characteristic}, but this client has not subscription of it`, 'color:red');
        this._Gatt.StopNotification({Fd: this.Fd, Service, Name: Characteristic}).catch(err => {});

        return undefined;
    }

    override complete()
    {
        this._Dispose();
        super.complete();
    }

    override error(err: any)
    {
        this._Dispose();
        super.error(err);
    }

    private _Dispose(): void
    {
        const ary = this.Notifications.get(this.Fd);

        if (TypeInfo.Assigned(ary))
        {
            /*
            for (const iter of ary)
            {
                this._Gatt.StopNotification({Fd: this.Fd, Service: iter.Service, Name: iter.Characteristic})
                    .then(() =>
                        console.log(`DBus=>Bluetooth StopNotification()`))
                    .catch(err =>
                        console.log(`%cDBus=>Bluetooth StopNotification() error: ${err.message}`, 'color:red'));

                iter.error(new EAbort());
            }
            */
            this.Notifications.delete(this.Fd);
        }

        this.UnscribeNotification();
    }

    private Notifications = (this.constructor as typeof TGattConnection).Notifications;
    private NotificationSub?: Subscription;

    private static Notifications = new Map<number, Array<TCharNotification>>();
}

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
        this.Connection.StopNotification(this.Service, this.Characteristic);
    }

    override FlowControlCallback(Interval: number): number
    {
        return 0;
    }

    override complete(): void
    {
        super.complete();
        super.closed = true;
    }

    override error(err: any): void
    {
        super.error(err);
        super.closed = true;
    }

    override Write(Buf: Uint8Array | ArrayBuffer, opts?: IStreamWriteOptions): Promise<number>
    {
        if (this.closed)
            return Promise.reject(new EStreamWrite());

        let view: Uint8Array = Buf instanceof Uint8Array ? Buf : new Uint8Array(Buf);
        let _count = this.Connection.MTU;
        let _interval = 0;

        if (TypeInfo.Assigned(opts))
        {
            if (TypeInfo.Assigned(opts.Count) && _count > opts.Count)
                _count = opts.Count;
            if (TypeInfo.Assigned(opts.FlowControl) && TypeInfo.Assigned(opts.FlowControl.Interval))
                _interval = opts.FlowControl.Interval;

            const _offset = TypeInfo.Assigned(opts.Offset) ? opts.Offset : 0;
            if (0 !== _offset || _count !== view.byteLength)
                view = new Uint8Array(view.buffer, view.byteOffset + _offset, _count);
        }
        _count = _count > view.byteLength ? view.byteLength : _count;

        return this.Connection.WriteCharNoResponse(this.Service, this.Characteristic, view, _interval).then(() => _count);
    }
}
