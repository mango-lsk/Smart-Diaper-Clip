import {TypeInfo} from '../../core/typeinfo';
import {TLV} from '../../core/tlv';
import {UNIT_UUID} from './att.const';

export class BluetoothTLV extends TLV
{
    static PostureTLV: TLV;
    static ThermometerTLV: TLV;
    static override Decode(Buf: Uint8Array | ArrayBuffer, StartOffset: number): BluetoothTLV[]
    {
        const View = Buf instanceof ArrayBuffer ? new Uint8Array(Buf) : Buf;
        const RetVal = new Array<BluetoothTLV>();
        let Idx = StartOffset;

        while (Idx < View.byteLength)
        {
            if (Idx + 2 > View.byteLength)
            {
                console.log('%cIncomplete Bluetooth TLV', 'color:red');
                break;
            }

            const Type = (0x27 << 8) | View[Idx ++];
            const CType = (View[Idx] & 0xF0) >> 4;
            const Digit = View[Idx ++] & 0x0F;

            const CTypeSize  = TLV.__ctype_size(CType);

            if (-1 === CTypeSize)
            {
                console.log('%cUnsupported Bluetooth TLV', 'color:red');
                break;
            }
            if (Idx + CTypeSize > View.byteLength)
            {
                console.log('%cIncomplete Bluetooth TLV', 'color:red');
                break;
            }

            const RAW = new Uint8Array(View.buffer, View.byteOffset + Idx, CTypeSize);
            Idx += CTypeSize;

            const TypeLV = this.Repository.get(Type);
            const v = TypeInfo.Assigned(TypeLV) ? new TypeLV(Type, Digit, RAW) : new BluetoothTLV(Type, Digit, RAW);
            try
            {
                // try parse to Primitive
                this.AccessDecode(v, CType);
                RetVal.push(v as BluetoothTLV);
            }
            catch (e)
            {
                console.log(`%cDecode TLV error ${(e as Error).message}`, 'color:red');
            }
        }

        return RetVal;
    }
}

export namespace BluetoothTLV
{
    export class EnergyDensityTLV extends BluetoothTLV
    {
        static override readonly TAG = UNIT_UUID.WATT_PER_SQ_METER;
        static override readonly Metric = 'watt/㎡';
    }
    TLV.Register(EnergyDensityTLV);

    export class LuxTLV extends BluetoothTLV
    {
        static override readonly TAG = UNIT_UUID.LUX;
        static override readonly Metric = 'lx';
    }
    TLV.Register(LuxTLV);

    export class KelvinTLV extends BluetoothTLV
    {
        static override readonly TAG = UNIT_UUID.KELVIN;
        static override readonly Metric = '°K';
    }
    TLV.Register(KelvinTLV);

    export class CelsiusTLV extends BluetoothTLV
    {
        static override readonly TAG = UNIT_UUID.CELSIUS;
        static override readonly Metric = '°C';
    }
    TLV.Register(CelsiusTLV);

    export class FahrenheitTLV extends BluetoothTLV
    {
        static override readonly TAG = UNIT_UUID.FAHRENHEIT;
        static override readonly Metric = '°F';
    }
    TLV.Register(FahrenheitTLV);

    export class PercentageTLV extends BluetoothTLV
    
    {
        static override readonly TAG = UNIT_UUID.PERCENTAGE;
        static override readonly Metric = '%';
    }
    TLV.Register(PercentageTLV);

    export class VoltTLV extends BluetoothTLV
    {
        static override readonly TAG = UNIT_UUID.VOLT;
        static override readonly Metric = 'V';
    }
    TLV.Register(VoltTLV);

    export class AmpereTLV extends BluetoothTLV
    {
        static override readonly TAG = UNIT_UUID.AMPERE;
        static override readonly Metric = 'A';
    }
    TLV.Register(AmpereTLV);

    export class FaradTLV extends BluetoothTLV
    {
        static override readonly TAG = UNIT_UUID.FARAD;
        static override readonly Metric = 'F';
    }
    TLV.Register(FaradTLV);

    export class OhmTLV extends BluetoothTLV
    {
        static override readonly TAG = UNIT_UUID.OHM;
        static override readonly Metric = 'Ω';
    }
    TLV.Register(OhmTLV);

    export class PascalTLV extends BluetoothTLV
    {
        static override readonly TAG = UNIT_UUID.PASCAL;
        static override readonly Metric = 'Pa';
    }
    TLV.Register(PascalTLV);
}
