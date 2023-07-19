import {Subject} from 'rxjs';

import {TypeInfo} from 'ultracreation/core/typeinfo';
import {EEncoding} from 'ultracreation/core/exception';
import {THttpClient} from 'ultracreation/core/http';
import {TLV} from 'ultracreation/core/tlv';
import {ISqlConnection} from 'ultracreation/storage';

import {PeripheralFactory} from 'ultracreation/asset/peripheral';

import {TBluetoothPeripheral} from 'ultracreation/bluetooth';
import {TBluetoothOTA} from './shell/shell.ota';
import {BluetoothTLV, UNIT_UUID} from 'ultracreation/bluetooth/sig';
import {TShellRequest} from 'ultracreation/asset/peripheral/shell';
import {HumidityTLV, PostureDeprecatedTLV, TemperatureTLV, ThermometerTLV} from './tlv.deprecated';

declare global
{
    interface IStaticConfig
    {
        fw_demeter_version: string;
    }
}

/* TSmartPeripheral */

export class TSmartPeripheral extends TBluetoothPeripheral
{
    static Component = '';

    get FwVersion(): string
    {
        if (! TypeInfo.Assigned(this._fw_version))
        {
            const fw = (this.constructor as typeof TSmartPeripheral).ClassName.toLowerCase();
            this._fw_version = StaticConfig[`fw_${fw}_version`];

            if (! TypeInfo.Assigned(this._fw_version))
                this._fw_version = '0';
        }
        return this._fw_version;
    }

    get FwUpgradable(): boolean
    {
        if (0 === this.Version || '0' === this.FwVersion)   // no spoted or not supported
            return false;

        if (! TypeInfo.Assigned(this._fw_version_val))
        {
            const version = this.FwVersion.split('.');

            if (3 === version.length)
            {
                /// xx.xxx.xxxx
                const major = parseInt(version[0], 10);
                const minor = parseInt(version[1], 10);
                const rev = parseInt(version[2], 10);
                this._fw_version_val = major * 10000000 + minor * 10000 + rev;
            }
            else
                this._fw_version_val = 0;
        }
        return this._fw_version_val > this.Version;
    }

    async StartUpgradeFirmware(): Promise<Subject<number>>
    {
        const fw = `${StaticConfig.PATH_ASSETS}fw/${(this.constructor as typeof TSmartPeripheral).ClassName.toLowerCase()}.bin`;

        return THttpClient.Get<ArrayBuffer>(fw, undefined, 'arraybuffer')
            .then(fw => this.ShellExecute<TBluetoothOTA>(TBluetoothOTA, 'ota', fw, {Interval: 15, PageSize: 2560, PageInterval: 200}));
    }

    override UpdateTLValues(ValueList: TLV[]): void
    {
        // replace deprecated TLVs
        for (const iter of ValueList)
        {
            switch (iter.Type)
            {
            case HumidityTLV.TAG:
                this.RemoveTLV(BluetoothTLV.PercentageTLV.TAG);
                break;

            case TemperatureTLV.TAG:
                this.RemoveTLV(BluetoothTLV.CelsiusTLV.TAG);
                break;
            }
        }

        super.UpdateTLValues(ValueList);
    }

    override get Synchronizing(): boolean
    {
        return super.Synchronizing || 3600 < (Math.trunc(Date.now() / 1000) - this.TraceTS);
    }

    override async Synchronize(): Promise<void>
    {
        const conn = await StorageEngine.GetConnection();
        try
        {
            await this.Connect();

            if (this.SyncId !== this._adv_sync_id)
            await this.SynchronizeSettings();

            if (3600 < (Math.trunc(Date.now() / 1000) - this.TraceTS))
                await this.Trace(conn);
        }
        catch (e)
        {
        }
        finally
        {
            if (this.IsEditing)
                conn.StoreObject(this);

            StorageEngine.ReleaseConnection(conn);
            this.Disconnect();
        }
    }

    protected SynchronizeSettings(): Promise<void>
    {
        if (TypeInfo.Assigned(this._adv_sync_id))
            this.SyncId = this._adv_sync_id;

        return Promise.resolve();
    }

    get TraceTS(): number
    {
        const v = this.ExtraProps.get('TraceTS');
        if (TypeInfo.Assigned(v))
            return v;
        else
            return 0;
    }

    protected set TraceTS(val: number)
    {
        this.ExtraProps.set('TraceTS', val);
    }

    protected Trace(conn: ISqlConnection): Promise<void>
    {
        const NowTS = Math.trunc(Date.now() / 1000);
        let TS = this.TraceTS;

        return this.ShellExecute<ShellRequest.TraceHistory>(ShellRequest.TraceHistory, NowTS, this.TraceTS)
            .then(req => new Promise<void>((resolve, reject) =>
            {
                req.subscribe({
                    next: val =>
                    {
                        TS = val.TS > TS ? val.TS : TS; // compatiable desc TS
                        this.TraceSave(conn, val);
                    },
                    complete: () => resolve(),
                    error: err => reject(err)
                });
            }))
            .catch(err => console.log(`%ctrace error: ${err.Message}`, 'color:red'))
            .then(() =>
            {
                if (TS !== this.TraceTS)
                {
                    this.Edit();
                    this.TraceTS = TS;
                }
            });
    }

    protected TraceSave(conn: ISqlConnection, Val: {TS: number, Values: Array<number>}): Promise<void>
    {
        return Promise.resolve();
    }

    private _fw_version?: string;
    private _fw_version_val?: number;
}

namespace ShellRequest
{
    export class TraceHistory extends TShellRequest<{TS: number, Values: Array<number>}>
    {
        constructor(private NowTS: number, private LastTraceTS: number)
        {
            super();
        }

        override Abort(): Promise<void>
        {
            return Promise.resolve();
        }

        override _Start(): void
        {
            const cmd = `trace ${this.NowTS} ${this.LastTraceTS}`;
            console.log(cmd);
            this.ShellStream.WriteLn(cmd);
        }

        override _HandleResponse(Line: string): void
        {
            if ('' === Line)
                return this.complete();

            const Lines = Line.split(' ');
            if (2 !== Lines.length)
                return this.error(new EEncoding());

            const Values = Lines[1].split(',');
            if (0 === Values.length)
                return this.error(new EEncoding());

            const TS = parseInt(Lines[0], 16);
            const ary = new Array<number>();

            for (const iter of Values)
                ary.push(parseInt(iter, 10));
            this.next({TS, Values: ary});
       }
    }
}

/* TSmartCuckooPeripheral */

export class TSmartCuckooPeripheral extends TSmartPeripheral
{
    static override Component = 'smartcuckoo';
    static override ClassName = 'smartcuckoo';
    static override ProductName = 'SmartCuckoo';
    static override AdName = ['scc'];
}

/* TDemeterPeripheral */

export namespace TDemeterPeripheral
{
    export interface Settings
    {
        Buzzer: boolean;
        Temperature: [number, number];
        Humidity: [number, number];
    }
}
PeripheralFactory.Register(TSmartCuckooPeripheral);

export class TDemeterPeripheral extends TSmartPeripheral
{
    static override Component = 'demeter';
    static override ClassName = 'dmt';
    static override ProductName = 'demeter';
    static override Icon = 'demeter.svg';
    static override AdName = ['dmt'];

    constructor ()
    {
        super();

        const DefSettings: TDemeterPeripheral.Settings =
        {
            Buzzer: true,
            Temperature: [-40, 100],
            Humidity: [0, 100]
        };
        this.ExtraProps.set('settings', DefSettings);

        this.TLV.push(new BluetoothTLV.CelsiusTLV(undefined, 1, 'temperature.svg'));
        this.TLV.push(new BluetoothTLV.PercentageTLV(undefined, 0, 'humidity.svg'));
        this.TLV.push(new BluetoothTLV.LuxTLV(undefined, 0, 'sunny.svg'));
    }

    get Settings(): TDemeterPeripheral.Settings
    {
        return this.ExtraProps.get('settings');
    }

    set Settings(val: TDemeterPeripheral.Settings)
    {
        if (this.SettingsModified(val))
        {
            this.ExtraProps.set('settings', val);
            this.ExtraProps.set('SyncId', -1);
        }
    }

    SettingsModified(new_value: TDemeterPeripheral.Settings): boolean
    {
        const old = this.Settings;

        return old.Buzzer !== new_value.Buzzer ||
            old.Temperature[0] !== new_value.Temperature[0] || old.Temperature[1] !== new_value.Temperature[1] ||
            old.Humidity[0] !== new_value.Humidity[0] || old.Humidity[1] !== new_value.Humidity[1];
    }

    override valueOf(): TLV
    {
        return this.GetTLV(BluetoothTLV.LuxTLV.TAG)!;
    }

    get Temperature(): TLV
    {
        return this.GetTLV(BluetoothTLV.CelsiusTLV.TAG)!;
    }

    get Humidity(): BluetoothTLV
    {
        return this.GetTLV(BluetoothTLV.PercentageTLV.TAG)!;
    }

    protected override async SynchronizeSettings(): Promise<void>
    {
        let txt = '';

        if (0 > this.SyncId)
        {
            const v = this.Settings;
            const t = v.Temperature.map(iter => Math.trunc(iter * 10));
            const h = v.Humidity.map(iter => Math.trunc(iter));

            txt = await this.ShellExecute(`export b=${v.Buzzer ? 1 : 0} t="${t[0]}" T="${t[1]}" h=${h[0]} H=${h[1]}`);
        }
        else
            txt = await this.ShellExecute('export');

        this.Edit();
        this.SyncId = this._adv_sync_id!;

        if ('' !== txt)
            this.ParseExport(txt);
    }

    protected override async TraceSave(conn: ISqlConnection, Val: {TS: number, Values: Array<number>}): Promise<void>
    {
        try
        {
            await conn.Insert('Sampling', {Asset_Id: this.Id, TS: Val.TS,
                Type: BluetoothTLV.LuxTLV.TAG, Value: Val.Values[0]}).catch(err => {});

            await conn.Insert('Sampling', {Asset_Id: this.Id, TS: Val.TS,
                Type: BluetoothTLV.CelsiusTLV.TAG, Value: Val.Values[1] / 10}).catch(err => {});
            await conn.Insert('Sampling', {Asset_Id: this.Id, TS: Val.TS,
                Type: BluetoothTLV.PercentageTLV.TAG, Value: Val.Values[2]}).catch(err => {});
        }
        catch (e)
        {
            // error?
        }
    }

    private ParseExport(txt: string): void
    {
        const v = this.ExtraProps.get('settings') as TDemeterPeripheral.Settings;

        for (const iter of txt.split(' '))
        {
            const lines = iter.split('=');

            switch (lines[0])
            {
            case 'sync':
                this.SyncId = parseInt(lines[1], 10);
                break;
            case 'buzz':
                v.Buzzer = parseInt(lines[1], 10) > 0;
                break;

            case 't':
                v.Temperature[0] = parseInt(lines[1], 10) / 10;
                break;
            case 'T':
                v.Temperature[1] = parseInt(lines[1], 10) / 10;
                break;
            case 'h':
                v.Humidity[0] = parseInt(lines[1], 10);
                break;
            case 'H':
                v.Humidity[1] = parseInt(lines[1], 10);
                break;
            }
        }
    }
}
PeripheralFactory.Register(TDemeterPeripheral);

/* TThermobondPeripheral */

export class TThermobondPeripheral extends TSmartPeripheral
{
    static override Component = 'thermobond';
    static override ClassName = 'hrb';
    static override ProductName = 'thermometer';
    static override Icon = 'thermobond.svg';
    static override AdName = ['tho'];

    constructor ()
    {
        super();
        this.TLV.push(new ThermometerTLV(undefined, 0));
    }

    override valueOf(): TemperatureTLV | ThermometerTLV
    {
        let value = this.GetTLV(TemperatureTLV.TAG);
        if (! TypeInfo.Assigned(value))
            value = this.GetTLV(ThermometerTLV.TAG);

        return value! as TLV.CUint16;
    }

    override UpdateTLValues(ValueList: TLV[]): void
    {
        for (const iter of ValueList)
        {
            if (ThermometerTLV.TAG === iter.Type)
                this.RemoveTLV(ThermometerTLV.TAG);
        }

        super.UpdateTLValues(ValueList);
    }
}
PeripheralFactory.Register(TThermobondPeripheral);

/* TDiaperPeripheral */
export class TDiaperPeripheral extends TSmartPeripheral
{
    static override Component = 'diaper';
    static override ClassName = `dia`;
    // static override ProductName = `henkel'diaper`;
    static override ProductName = `智能尿布夹`;
    static override Icon = 'diaper.svg';
    static override AdName = ['dia'];

    constructor ()
    {
        super();

        this.TLV.push(new PostureTLV(undefined, 0, ''));
        this.TLV.push(new BluetoothTLV.PercentageTLV(undefined, 0, 'humidity.svg'));
    }

    override valueOf(): BluetoothTLV
    {
        const tlv  = this.GetTLV(BluetoothTLV.PercentageTLV.TAG);
        if (TypeInfo.Assigned(tlv))
            return tlv;
        else
            return this.GetTLV(HumidityTLV.TAG)!;
    }

    get Posture(): BluetoothTLV
    {
        let tlv  = this.GetTLV(PostureTLV.TAG);
        if (TypeInfo.Assigned(tlv))
            return tlv;

        tlv = this.GetTLV(PostureDeprecatedTLV.TAG)!;
        return tlv!;
    }

    override get Synchronizing(): boolean
    {
        return false;
    }

    override UpdateTLValues(ValueList: TLV[]): void
    {
        for (const iter of ValueList)
        {
            if (PostureDeprecatedTLV.TAG === iter.Type)
                this.RemoveTLV(PostureTLV.TAG);
        }

        super.UpdateTLValues(ValueList);
    }

    MaxHumidity!: number;
}
PeripheralFactory.Register(TDiaperPeripheral);

export class PostureTLV extends BluetoothTLV
{
    static override readonly TAG = UNIT_UUID.UNITLESS;
    override readonly Invisible = true;

    override get Icon(): string
    {
        /*
        const enum TPosture
        {
            UNKNOWN,           // unknown or not initialized
            STAND,
            HANDSTAND,
            LAY,
            LAY_LEFT,
            LAY_RIGHT,
            PRONE
        }
        */
        switch (this.Value)
        {
        case 1:
            return 'posture/stand.svg';
        case 2:
            return 'posture/stand.svg';
        case 3:
            return 'posture/lay.svg';
        case 4:
            return 'posture/lay_left.svg';
        case 5:
            return 'posture/lay_right.svg';
        case 6:
            return 'posture/prone.svg';
        default:
            return 'posture/unknown.svg';
        }
    }
}
TLV.Register(PostureTLV);
