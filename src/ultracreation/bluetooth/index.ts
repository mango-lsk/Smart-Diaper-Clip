import {filter, map, Observable} from 'rxjs';

import {TypeInfo} from '../core/typeinfo';
import {TAsyncWritable} from '../core/stream';
import {Encoding} from '../core/encoding';
import {HexConv} from '../core/conv';
import {TLoopBuffer} from '../core/loopbuffer';

import {TConnectablePeripheral, TPeripheral} from '../asset/peripheral/abstract';
import {PeripheralFactory} from '../asset/peripheral/factory';
import {TShellPeripheral} from '../asset/peripheral/shell';

import {TLV} from '../core/tlv';
import {BluetoothTLV} from './sig/gap.tlv';

import {ICharNotification, IGapCentral, IGattConnection} from './native/interface';
import './native/plugin';

const SIGNAL_LOST_TIMEOUT = 60000;
const RSSI_CLEAR_TIMEOUT = 10000;

/**
 *      <uint8_t>       Manufactory data size
 *      <uint8_t>       Manufactory data TAG(0xFF)
 *      <uint16_t>      AD_MANUFACTORY_ID2
 *      <uint16_t>      PROJECT_VERSION
 *      <uint8_t[3]>    BLE MAC addr lower 3 Byte BigEndian [2][1][0]
 * -------------------- 9bytes
 *      <tlv[]>
 */
const AD_MANUFACTORY_ID1        = 0xFFBC;

/**
 *  in adv packet
 *      ...
 *      <uint8_t>       Manufactory data size
 *      <uint8_t>       Manufactory data TAG(0xFF)
 *      <uint16_t>      AD_MANUFACTORY_ID2
 *      <uint16_t>      PROJECT_VERSION
 *      <uint8_t[6]>    BLE MAC addr LittleEndian
 * -------------------- 12bytes
 *      <uint8_t[]>     PROJECT NAME '\0'
 *      <uint8_t>       Synchronize Id          // AD_MANUFACTORY_ID5
 *      <tlv[] | BluetoothTLV>                  // AD_MANUFACTORY_ID3: TLV @typesize = 2,
 *                                              // AD_MANUFACTORY_ID4, AD_MANUFACTORY_ID5: BluetoothTLV
 */
const AD_MANUFACTORY_ID2        = 0xFFBD;
/**
 *  same as AD_MANUFACTORY_ID2 except
 *      tlv[] with @typesize = 2
 */
const AD_MANUFACTORY_ID3        = 0xFFBE;
const AD_MANUFACTORY_ID4        = 0xFFBF;
const AD_MANUFACTORY_ID5        = 0xFFCC;


export class TBluetoothPeripheral extends TShellPeripheral
{
    /** BLE UART service & characteristic */
    static SHELL_SERVICE_UUID = 'FFE0';
    static SHELL_CHARACTERISTRIC_UUID = 'FFE1';

    constructor()
    {
        super();
        this._Timeout = SIGNAL_LOST_TIMEOUT;
    }

    override ConnectAdapter(): Promise<TConnectablePeripheral.Connection>
    {
        const ary  = Array.from(this.HashRSSI.entries()).sort((a, b) => b[1].RSSI - a[1].RSSI);

        if (0 < ary.length)
        {
            const iter = ary[0];

            if (cordova.plugin.BLE.Central === iter[0])
                return cordova.plugin.BLE.Central.Connect(this.ConnectId);
            else
                return iter[0].Connect(this.Id);
        }
        else
            return cordova.plugin.BLE.Central.Connect(this.ConnectId);
    }

    override CreateShellStream(Conn: TShellPeripheral.IConnection): TShellPeripheral.IShellStream
    {
        const SelfType = this.constructor as typeof TBluetoothPeripheral;

        const Notification = (Conn as IGattConnection).StartNotification(SelfType.SHELL_SERVICE_UUID,
            SelfType.SHELL_CHARACTERISTRIC_UUID);

        return new TBluetoothShellStream(Notification);
    }

    override get RSSI(): number | undefined
    {
        const ary  = Array.from(this.HashRSSI.values()).sort((a, b) => b.RSSI - a.RSSI);

        if (0 < ary.length)
            return ary[0].RSSI;
        else
            return undefined;
    }

    override SignalIntvUpdate(): void
    {
        /// TODO: update RSSI from connnected bluetooth device
    }

    override SignalLost(): void
    {
        super.SignalLost();
        this.HashRSSI.clear();
    }

    /* @internal */
    UpdateRSSI(Central: IGapCentral, RSSI: number): void
    {
        const now = Date.now();
        this.HashRSSI.set(Central, {RSSI, TS: now});

        for (const iter of this.HashRSSI)
        {
            if (RSSI_CLEAR_TIMEOUT < now - iter[1].TS)
                this.HashRSSI.delete(iter[0]);
        }
    }

    private HashRSSI = new Map<IGapCentral, {RSSI: number, TS: number}>();

/* static */

    static override StartDiscovery(SubCls?: typeof TPeripheral): Observable<TBluetoothPeripheral>
    {
        /// TBluetoothPeripherial => SubCls filter?
        return this.Scan(false);
    }

    static LowPowerScan(): Observable<TBluetoothPeripheral>
    {
        return this.Scan(true);
    }

    private static Scan(LowPower: boolean): Observable<TBluetoothPeripheral>
    {
        const ary = PeripheralFactory.DescendantOf(TBluetoothPeripheral);
        if (0 === ary.length)
        {
            console.log(`%cNativeBLE scan canceled: no registered BLE peripherials`, 'color:lightgreen');
            return super.StartDiscovery() as Observable<TBluetoothPeripheral>;
        }

        let NativeScanner: Observable<cordova.plugin.BLE.IScanDiscovery>;
        if (LowPower)
            NativeScanner = cordova.plugin.BLE.Central.LowPowerScan();
        else
            NativeScanner = cordova.plugin.BLE.Central.Scan();

        return NativeScanner.pipe(
            map(discover =>
            {
                const view = cordova.plugin.BLE.Central.GetManufactoryData(discover.advertising);
                const Peripheral = this.Identify(discover.id, discover.name, view);

                if (TypeInfo.Assigned(Peripheral))
                {
                    if (Peripheral instanceof TConnectablePeripheral)
                        Peripheral.ConnectId = discover.id;

                    Peripheral.HashRSSI.set(cordova.plugin.BLE.Central,{RSSI: discover.rssi, TS: Date.now()});
                    return Peripheral;
                }
                else
                    return undefined;
            }),
            filter((iter): iter is TBluetoothPeripheral => iter instanceof TBluetoothPeripheral)
        );
    }

    static Identify(AdvId: string, AdName: string | undefined, ManufactoryData: Uint8Array | undefined): TBluetoothPeripheral | undefined
    {
        if (! TypeInfo.Assigned(AdName) || ! TypeInfo.Assigned(ManufactoryData))
            return undefined;

        let id: string = AdvId;
        let manufactory_tag = 0;
        let ver = 0;
        let sync_id: number | undefined;
        let batt_lvl: number | undefined;
        let tlv_idx = 0;

        if (ManufactoryData.byteLength > 7)
        {
            // manufactory AD type
            manufactory_tag = ManufactoryData[0] * 256 + ManufactoryData[1];

            if ([AD_MANUFACTORY_ID2, AD_MANUFACTORY_ID3, AD_MANUFACTORY_ID4, AD_MANUFACTORY_ID5].includes(manufactory_tag))
            {
                // firmware version
                ver = ManufactoryData[2] * 256 + ManufactoryData[3];
                /// 1.xxx.xxxx
                ver = (((ver >> 12) & 0x0F) * 1000 + ((ver >> 8) & 0x0F)) * 10000 + (ver & 0xFF);

                // device'id
                id = (HexConv.IntToHex(ManufactoryData[9], 2) + ':' +
                    HexConv.IntToHex(ManufactoryData[8], 2) + ':' +
                    HexConv.IntToHex(ManufactoryData[7], 2) + ':' +
                    HexConv.IntToHex(ManufactoryData[6], 2) + ':' +
                    HexConv.IntToHex(ManufactoryData[5], 2) + ':' +
                    HexConv.IntToHex(ManufactoryData[4], 2)).toUpperCase();

                // device'name
                const start_idx = 10;
                let idx = start_idx;
                for (; idx < ManufactoryData.byteLength; idx ++)
                {
                    if (0 === ManufactoryData[idx])
                        break;
                }
                tlv_idx = idx + 1;

                if (AD_MANUFACTORY_ID5 === manufactory_tag)
                {
                    batt_lvl = ManufactoryData[tlv_idx ++];
                    sync_id = ManufactoryData[tlv_idx ++];
                }

                const view = new Uint8Array(ManufactoryData.buffer, ManufactoryData.byteOffset + start_idx, idx - start_idx);
                try
                {
                    const Name = Encoding.Utf8.Decode(view);
                    if (TypeInfo.Assigned(Name) && Name.length > 0)
                        AdName = Name;
                }
                catch (err)
                {
                    return undefined;
                }
            }
            else if (AD_MANUFACTORY_ID1 === manufactory_tag)
            {
                tlv_idx = 7;
                // firmware version
                ver = ManufactoryData[2] * 256 + ManufactoryData[3];
                /// 1.xxx.xxxx
                ver = (((ver >> 12) & 0x0F) * 1000 + ((ver >> 8) & 0x0F)) * 10000 + (ver & 0xFF);

                // device'id 08:7C:BE:92:C0:94
                // id = (data[4] * 65536 + data[5] * 256 + data[6]).toString(16);
                id = ('08:7C:BE:' +  HexConv.IntToHex(ManufactoryData[4], 2) + ':' +
                    HexConv.IntToHex(ManufactoryData[5], 2) + ':' +
                    HexConv.IntToHex(ManufactoryData[6], 2)).toUpperCase();
            }
            else
            {
                manufactory_tag = 0;
                // old compatible
                id = (HexConv.IntToHex(ManufactoryData[5], 2) + ':' +
                    HexConv.IntToHex(ManufactoryData[4], 2) + ':' +
                    HexConv.IntToHex(ManufactoryData[3], 2) + ':' +
                    HexConv.IntToHex(ManufactoryData[2], 2) + ':' +
                    HexConv.IntToHex(ManufactoryData[1], 2) + ':' +
                    HexConv.IntToHex(ManufactoryData[0], 2)).toUpperCase();

                const start_idx = 6;
                let idx = start_idx;
                for (; idx < ManufactoryData.byteLength; idx ++)
                {
                    if (0 === ManufactoryData[idx])
                        break;
                }
                tlv_idx = idx + 1;

                const view = new Uint8Array(ManufactoryData.buffer, ManufactoryData.byteOffset + start_idx, idx - start_idx);
                try
                {
                    const Name = Encoding.Utf8.Decode(view);
                    if (TypeInfo.Assigned(Name) && Name.length > 0)
                        AdName = Name;
                }
                catch (err)
                {
                    return undefined;
                }
            }
        }

        let Peripheral = PeripheralFactory.Get(id);

        if (! TypeInfo.Assigned(Peripheral) && id !== AdvId)
            Peripheral = PeripheralFactory.Get(AdvId);
        if (! TypeInfo.Assigned(Peripheral))
            Peripheral = PeripheralFactory.CreateByDiscovery(id, AdName);

        if (TypeInfo.Assigned(Peripheral))
        {
            Peripheral.Version = ver;
            Peripheral.LastActivity = Date.now();

            if (TypeInfo.Assigned(sync_id))
                (Peripheral as TBluetoothPeripheral)._adv_sync_id = sync_id;
            if (TypeInfo.Assigned(batt_lvl))
                (Peripheral as TBluetoothPeripheral)._adv_batt = batt_lvl;

            if (tlv_idx !== 0 && TypeInfo.Assigned(ManufactoryData))
            {
                if (AD_MANUFACTORY_ID4 <= manufactory_tag)
                    Peripheral.UpdateTLValues(BluetoothTLV.Decode(ManufactoryData, tlv_idx));
                else if (AD_MANUFACTORY_ID3 === manufactory_tag)
                    Peripheral.UpdateTLValues(TLV.Decode(ManufactoryData, tlv_idx, 2, 1));
                else
                    Peripheral.UpdateTLValues(TLV.Decode(ManufactoryData, tlv_idx, 1, 1));
            }

            return Peripheral as TBluetoothPeripheral;
        }
        else
            return undefined;
    }

    get SyncId(): number
    {
        if (this.IsObjectSaved)
        {
            const v = this.ExtraProps.get('SyncId');
            if (TypeInfo.Assigned(v))
                return v;
            else
                return 0;
        }
        else
            return 0;
    }

    protected set SyncId(val: number)
    {
        if (this.IsObjectSaved)
            this.ExtraProps.set('SyncId', val);
    }

    get Synchronizing(): boolean
    {
        return false;
    }

    Synchronize(): Promise<void>
    {
        return Promise.resolve();
    }

    get BatteryLevel(): number
    {
        return TypeInfo.Assigned(this._adv_batt) ? this._adv_batt : 100;
    }

    protected _adv_sync_id?: number;
    protected _adv_batt?: number;
}

export class TBluetoothShellStream extends TAsyncWritable implements TShellPeripheral.IShellStream
{
    constructor (private _Ref: ICharNotification)
    {
        super(_Ref.Endian);

        _Ref.subscribe({
            next: buf =>
            {
                if (buf instanceof ArrayBuffer)
                    buf = new Uint8Array(buf);
                if (! (buf instanceof Uint8Array))
                    return;

                let view = buf;
                while (true)
                {
                    const idx = view.indexOf(10);

                    if (-1 !== idx)
                    {
                        this.InBuffer.Push(view, idx + 1);
                        const LineBuffer = this.InBuffer.Extract();

                        // exclude '\n'
                        let Count = LineBuffer.length - 1;
                        // exclude '\r'
                        if (Count > 0 && 13 === LineBuffer[Count - 1])
                            Count --;

                        let Line: string;
                        try
                        {
                            Line = Encoding.Utf8.Decode(LineBuffer, 0, Count);
                        }
                        catch (e)
                        {
                            console.log('%cinvalid character detected, try using ASCII decode', 'color:red');
                            Line = Encoding.ASCII.Decode(LineBuffer, 0, Count);
                        }

                        view = new Uint8Array(view.buffer, view.byteOffset + idx + 1);
                        this.next(Line);
                    }
                    else
                    {
                        this.InBuffer.Push(view);
                        break;
                    }
                }
            },
            complete: () =>  {},
            error: err => {},
        });
    }

    Close(): Promise<void>
    {
        return this._Ref.Connection.Close();
    }

/* IAsyncWritable */

    override WriteUint(N: number, IntSize: IntTypeSize): Promise<void>
    {
        return this._Ref.WriteUint(N, IntSize);
    }

    override WriteInt(N: number, IntSize: IntTypeSize): Promise<void>
    {
        return this._Ref.WriteInt(N, IntSize);
    }

    override WriteFloat32(F: number): Promise<void>
    {
        return this._Ref.WriteFloat32(F);
    }

    override WriteFloat64(F: number): Promise<void>
    {
        return this._Ref.WriteFloat64(F);
    }

    override WriteLn(Str: string, LN?: string): Promise<void>
    {
        return this._Ref.WriteLn(Str, LN);
    }

    override Write(Buf: Uint8Array | ArrayBuffer, opts?: IStreamWriteOptions): Promise<number>
    {
        return this._Ref.Write(Buf, opts);
    }

    override WriteBuf(Buf: Uint8Array, opts?: IStreamWriteBufOptions): Observable<number>
    {
        return this._Ref.WriteBuf(Buf, opts);
    }

    private InBuffer = new TLoopBuffer(1024);
}
