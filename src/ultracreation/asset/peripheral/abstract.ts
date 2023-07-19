import {Observable, Subject} from 'rxjs';

import {TypeInfo} from '../../core/typeinfo';
import {EAbort, ENotImplemented} from '../../core/exception';
import {TLV} from '../../core/tlv';
import {TAsset} from '../abstract';

/* TPeripheral */

export class TPeripheral extends TAsset
{
    static ClassName = '';
    static ProductName = '';
    static Icon?: string;

    static AdName: string[] = [];
    static AdNameExpr?: RegExp;

    static StartDiscovery(SubCls?: typeof TPeripheral): Observable<TPeripheral>
    {
        return new Observable(obs => obs.complete());
    }

/* Instance */

    constructor()
    {
        super('');

        const Type = (this.constructor as typeof TPeripheral);

        this.ObjectName = 'Peripheral.' + Type.ClassName;
        this.Name = Type.ProductName;
    }

    readonly ClassName = (this.constructor as typeof TPeripheral).ClassName;
    readonly ProductName = (this.constructor as typeof TPeripheral).ProductName;
    readonly Icon =  (this.constructor as typeof TPeripheral).Icon;

    get IsObjectSaved(): boolean
    {
        return 0 < this.Timestamp;
    }

    get VersionHint(): string
    {
        if (TypeInfo.Assigned(this.Version))
        {
            const minor = this.Version % 10000;
            const middle = Math.trunc(this.Version / 10000) % 1000;
            const major = Math.trunc(this.Version / 1000 / 10000);

            return 'v' + major.toString() + '.' + middle.toString() + '.' + minor.toString();
        }
        else
            return '';
    }

     /**
      *  override to generate PerpheralFactory.OnSignalLost event
      */
    get Timeout(): number
    {
        return this._Timeout;
    }

    set Timeout(val: number)
    {
        this._Timeout = val;
    }

    get RSSI(): number | undefined
    {
        return undefined;
    }

    /** @internal called by factory */
    SignalIntvUpdate(): void
    {
        // nothing todo
    }

    /** @internal called by factory */
    SignalLost(): void
    {
        for (const iter of this.TLV)
            iter.Value = undefined;

        console.log(`%cSignal lost: ${this.Id}`, 'color:yellow');
    }

    GetTLV(Type: number): TLV | undefined
    {
        return this.TLV.find(iter => iter.Type === Type);
    }

    RemoveTLV(...Types: number[])
    {
        for (let Idx = this.TLV.length - 1; Idx >= 0; Idx --)
        {
            if (-1 !== Types.indexOf(this.TLV[Idx].Type))
                this.TLV.splice(Idx, 1);
        }
    }

    /**
     *  @internal
     */
    UpdateTLValues(ValueList: Array<TLV>): void
    {
        for (const iter of ValueList)
        {
            const v = this.GetTLV(iter.Type);
            if (v)
                v.AssignValue(iter);
            else
                this.TLV.push(iter);
        }
    }

    Version = 0;
    LastActivity = 0;
    readonly TLV = new Array<TLV>();

    protected _Timeout = 0;
}

/* TConnectablePeripheral */

export abstract class TConnectablePeripheral extends TPeripheral
{
    protected abstract ConnectAdapter(): Promise<TConnectablePeripheral.Connection>;

    /* instance */

    get IsConnected(): boolean
    {
        return TypeInfo.Assigned(this.Connection);
    }

    get IsConnecting(): boolean
    {
        return TypeInfo.Assigned(this.Connecting);
    }

    get ConnectId(): string
    {
        const v = this.ExtraProps.get('ConnectId');
        if (TypeInfo.Assigned(v))
            return v;
        else
            return this.Id;
    }

    set ConnectId(v: string)
    {
        this.ExtraProps.set('ConnectId', v);
    }

    Connect(): Promise<void>
    {
        if (TypeInfo.Assigned(this.Connection))
            return Promise.resolve();

        if (! TypeInfo.Assigned(this.Connecting))
        {
            this.Connecting = this.ConnectAdapter()
                .then(conn =>
                {
                    this.Connecting = undefined;
                    this.Connection = conn;

                    if (this.Connection instanceof Observable)
                    {
                        this.Connection.subscribe({
                            next: data => this.HandleDataIn(data),
                            complete: () => this.HandleDisconnect(),
                            error: err => this.HandleDisconnect(err)
                        });
                    }
                    else
                        console.log('%cConnection is not Observable', 'color:yellow');

                    return this.HandleConntected().catch(err =>
                    {
                        console.log(`%cHandleConntected() with error: ${err.message}`, 'color:red');

                        this.Connection = undefined;
                        conn.Close().catch(error => {}).then(() => this.HandleDisconnect());
                    });
                })
                .catch(err =>
                {
                    this.Connecting = undefined;
                    throw err;
                });
        }
        return this.Connecting;
    }

    async Disconnect(): Promise<void>
    {
        if (TypeInfo.Assigned(this.Connection))
        {
            await this.Connection.Close().catch(err => {});
            this.Connection = undefined;
        }
    }

    protected HandleConntected(): Promise<void>
    {
        return Promise.resolve();
    }

    protected HandleDisconnect(err?: Error): void
    {
        if (TypeInfo.Assigned(this.Connection))
            this.Connection = undefined;

        if (TypeInfo.Assigned(err) && ! (err instanceof EAbort))
            console.log(`%cDisconnect : ${err.message}`, 'color:red');

        this.OnDisconnect.next();
    }

    protected HandleDataIn(data: any): void
    {
        throw new ENotImplemented();
    }

    readonly OnDisconnect = new Subject<void>();

    protected Connection: TConnectablePeripheral.Connection | undefined;
    private Connecting?: Promise<void>;
}

export namespace TConnectablePeripheral
{
    /**
     *  implementation descendant classes can extends Observable<> to provide
     *      Connection lifecycle manage
     */
    export interface Connection
    {
        Close(): Promise<void>;
    }
}
