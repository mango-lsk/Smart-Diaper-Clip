import {TypeInfo} from './typeinfo';
import {Endianness} from './endian';

/** Uint8Array <--> Integers as BIG-Endian */

export class BytesConv
{
    static AsUint(IntSize: BytesConv.IntTypeSize, Buf: Uint8Array, Offset: number = 0,
        Endian = Endianness.HOST_ENDIAN): number
    {
        switch (IntSize)
        {
        case 1:
            return Buf[Offset];

        case 2:
            if (Endian === Endianness.LITTLE_ENDIAN)
                return Buf[Offset] | Buf[Offset + 1] << 8;
            else
                return Buf[Offset] << 8 | Buf[Offset + 1];

        case 4:
            if (Endian === Endianness.LITTLE_ENDIAN)
            {
                return (Buf[Offset] | Buf[Offset + 1] << 8 | Buf[Offset + 2] << 16 | (0x7F & Buf[Offset + 3]) << 24) +
                    (0x80 & Buf[Offset + 3] ? 2147483648 : 0);
            }
            else
            {
                return (((0x7F & Buf[Offset]) << 24) | Buf[Offset + 1] << 16 | Buf[Offset + 2] << 8 | Buf[Offset + 3]) +
                    (0x80 & Buf[Offset] ? 2147483648 : 0);
            }

        case 8:
            {
                const v = Buf.slice(Offset, Offset + IntSize);
                Endianness.ToHost(v, Endian);
                return Number(new BigUint64Array(v.buffer, 0, 1)[0]);
            }

        /** none standard types */
        default:
            if (Endian === Endianness.LITTLE_ENDIAN)
            {
                let RetVal = 0;
                for (let I = IntSize - 1; I >= 0; I --)
                    RetVal = RetVal * 256 + Buf[I + Offset];
                return RetVal;
            }
            else
            {
                let RetVal = 0;
                for (let I = 0; I < IntSize; I ++)
                    RetVal = RetVal * 256 + Buf[I + Offset];
                return RetVal;
            }
        }
    }

    static AsInt(IntSize: BytesConv.IntTypeSize, Buf: Uint8Array, Offset: number = 0,
        Endian = Endianness.HOST_ENDIAN): number
    {
        switch (IntSize)
        {
        case 1:
            return (Buf[Offset] & 0x3F) - (Buf[Offset] & 0x80);

        case 2:
            if (Endian === Endianness.LITTLE_ENDIAN)
            {
                return (Buf[Offset] | (0x7F & Buf[Offset + 1]) << 8) -
                    (0x80 & Buf[Offset + 1] ? 32768 : 0);
            }
            else
            {
                return ((0x7F & Buf[Offset]) << 8 | Buf[Offset + 1]) -
                    (0x80 & Buf[Offset] ? 32768 : 0);
            }

        case 4:
            if (Endian === Endianness.LITTLE_ENDIAN)
            {
                return (Buf[Offset] | Buf[Offset + 1] << 8 | Buf[Offset + 2] << 16 | (0x7F & Buf[Offset + 3]) << 24) -
                    (0x80 & Buf[Offset + 3] ? 2147483648 : 0);
            }
            else
            {
                return ((0x7F & Buf[Offset]) << 24 | Buf[Offset + 1] << 16 | Buf[Offset + 2] << 8 | Buf[Offset + 3]) -
                    (0x80 & Buf[Offset] ? 2147483648 : 0);
            }

        case 8:
            {
                const v = Buf.slice(Offset, Offset + IntSize);
                Endianness.ToHost(v, Endian);
                return Number(new BigInt64Array(v.buffer, 0, 1)[0]);
            }

        /** none standard types */
        default:
            if (Endian === Endianness.LITTLE_ENDIAN)
            {
                const Complement = Buf[Offset + IntSize - 1] & 0x80 ? Math.pow(2, IntSize * 8 - 1) : 0;
                let RetVal = Buf[Offset + IntSize - 1] & 0x7F;

                for (let I = IntSize - 2; I >= 0; I --)
                    RetVal = RetVal * 256 + Buf[I + Offset];
                return RetVal - Complement;
            }
            else
            {
                const Complement = Buf[Offset] & 0x80 ? Math.pow(2, IntSize * 8 - 1) : 0;
                let RetVal = Buf[Offset] & 0x7F;

                for (let I = 1; I < IntSize; I ++)
                    RetVal = RetVal * 256 + Buf[I + Offset];
                return RetVal - Complement;
            }
        }
    }

    static AsFloat(FloatSize: BytesConv.FloatTypeSize, Buf: Uint8Array, Offset: number,
        Endian = Endianness.HOST_ENDIAN): number
    {
        switch (FloatSize)
        {
        case 4:
            {
                const v = Buf.slice(Offset, Offset + FloatSize);
                Endianness.ToHost(v, Endian);
                return new Float32Array(v.buffer, 0, 1)[0];
            }

        case 8:
            {
                const v = Buf.slice(Offset, Offset + FloatSize);
                Endianness.ToHost(v, Endian);
                return new Float64Array(v.buffer, 0, 1)[0];
            }

        default:
            console.log(`%cillegal FloatTypeSize: ${FloatSize}`, 'color:red');
            return NaN;
        }
    }

    static ToUint(v: number, IntSize: BytesConv.IntTypeSize, Buf: Uint8Array, Offset: number = 0,
        Endian = Endianness.HOST_ENDIAN): void
    {
        if (Endian === Endianness.BIG_ENDIAN)
        {
            for (let I = IntSize - 1; I !== 0; I --)
            {
                Buf[Offset + I] = v & 0xFF;
                v = Math.trunc(v / 256);
            }
        }
        else
        {
            for (let I = 0; I < IntSize; I ++)
            {
                Buf[Offset + I] = v & 0xFF;
                v = Math.trunc(v / 256);
            }
        }
    }

    static ToInt(v: number, IntSize: BytesConv.IntTypeSize, Buf: Uint8Array, Offset: number = 0,
        Endian = Endianness.HOST_ENDIAN): void
    {
        if (v < 0)
            this.ToUint(v + Math.pow(2, IntSize * 8), IntSize, Buf, Offset, Endian);
        else
            this.ToUint(v, IntSize, Buf, Offset, Endian);
    }

    static ToFloat(v: number, FloatSize: BytesConv.FloatTypeSize, Buf: Uint8Array, Offset: number = 0,
        Endian = Endianness.HOST_ENDIAN): void
    {
        let view: Uint8Array;

        switch (FloatSize)
        {
        case 4:
            {
                const f = new Float32Array(1);
                f[0] = v;
                view = new Uint8Array(f.buffer);
            }
            break;
        case 8:
            {
                const f = new Float64Array(1);
                f[0] = v;
                view = new Uint8Array(f.buffer);
            }
            break;

        default:
            console.log(`%cillegal FloatTypeSize: ${FloatSize}`, 'color:red');
            return;
        }

        if (Endian !== Endianness.HOST_ENDIAN)
            Endianness.SwapEndian(view);
        Buf.set(view, Offset);
    }
}
export namespace BytesConv
{
    export type IntTypeSize = 1 | 2 | 3 | 4 | 6 | 8;
    export type FloatTypeSize = 4 | 8;
}

/* Integers / Bytes Array <--> HEX string */
export namespace HexConv
{
    export function IntToHex(v: number, Digit?: number): string
    {
        if (TypeInfo.Assigned(Digit))
        {
            const str = '0000000000000000' + v.toString(16).toUpperCase();
            return str.substring(str.length - Digit);
        }
        else
            return v.toString(16).toUpperCase();
    }

    export function BinToHex(Buf: Uint8Array, Count?: number): string
    {
        if (! TypeInfo.Assigned(Count))
            Count = Buf.byteLength;
        let RetVal = '';

        for (let I = 0; I < Count; I ++)
        {
            const str = '00' + Buf[I].toString(16).toUpperCase();
            RetVal += str.substring(str.length - 2);
        }
        return RetVal;
    }

    export function HexToBin(str: string): Uint8Array
    {
        const Buf = new Uint8Array(str.length / 2);

        for (let i = 0; i < str.length / 2; i ++)
            Buf[i] = parseInt(str[i * 2], 16) * 16 + parseInt(str[i * 2 + 1], 16);

        return Buf;
    }
}

// basic Unit conversion
export namespace UnitConv
{
    export type TUnitName = string;
    export type TMetricName = string;
    export type TMetricSymbol = string;

    export interface IMetric
    {
        Name: TMetricName;
        Symbol: TMetricSymbol;
    }

    export interface IUnitDefault
    {
        Name: TUnitName;
        Base: TMetricName;
        DefaultConvert: TMetricName;
    }

    export type TUnitConverter = (value: number) => number;

    interface IMetricReg extends IMetric
    {
        ConverterHash: Map<TMetricName, TUnitConverter>;
    }

    interface IUnit
    {
        Name: TUnitName;
        Base: IMetricReg | undefined;
        DefaultConvert?: IMetricReg;

        UnitHash: Map<TMetricName, IMetricReg>;
    }

    const Registry = new Map<TUnitName, IUnit>();

    export function RegisterMetricSystem(Name: TUnitName, Metric: TMetricName, Symbol: TMetricSymbol): void;
    export function RegisterMetricSystem(Name: TUnitName, Metric: IMetric): void;
    export function RegisterMetricSystem(Name: TUnitName, Metric: IMetric | TMetricName, Symbol?: TMetricSymbol): void
    {
        let Reg = Registry.get(Name);
        if (! TypeInfo.Assigned(Reg))
        {
            Reg = {Name, Base: undefined, UnitHash: new Map<TMetricName, IMetricReg>()};
            Registry.set(Name, Reg);
        }

        let MetricReg = TypeInfo.IsString(Metric) ? Reg.UnitHash.get(Metric) : Reg.UnitHash.get(Metric.Name);
        if (! TypeInfo.Assigned(MetricReg))
        {
            let MetricName: string;
            let MetricSymbol: string;

            if (TypeInfo.IsString(Metric))
            {
                MetricName = Metric;
                MetricSymbol = Symbol as string;
            }
            else
            {
                MetricName = Metric.Name;
                MetricSymbol = Metric.Symbol;
            }

            MetricReg = {Name: MetricName, Symbol: MetricSymbol, ConverterHash: new Map<TMetricName, TUnitConverter>()};
            Reg.UnitHash.set(MetricReg.Name, MetricReg);

            if (! TypeInfo.Assigned(Reg.Base))
            {
                Reg.Base = MetricReg;
                Reg.DefaultConvert = MetricReg;
            }

            console.log(`UnitConv: "${Name} " meteric ${MetricReg.Name} (${MetricReg.Symbol})`);
        }
    }

    export function RegisterConverter(Name: TUnitName, Base: TMetricName, Converters: Array<[IMetric | TMetricName, TUnitConverter]>): void
    {
        let Reg = Registry.get(Name);
        if (! TypeInfo.Assigned(Reg))
        {
            Reg = {Name, Base: undefined, UnitHash: new Map<TMetricName, IMetricReg>()};
            Registry.set(Name, Reg);
        }

        const BaseReg = Reg.UnitHash.get(Base);
        if (! TypeInfo.Assigned(BaseReg))
        {
            console.log(`UnitConv: ${Base} has no registered information...Call RegisterMetricSystem first`);
            return;
        }

        for (const c of Converters)
        {
            let ToReg: IMetricReg | undefined;

            if (TypeInfo.IsString(c[0]))
            {
                ToReg = Reg.UnitHash.get(c[0] as string);
                if (! TypeInfo.Assigned(ToReg))
                {
                    console.log(`%cUnitConv: unknown mertic system ${c[0]}`, 'color:red');
                    continue;
                }
            }
            else
            {
                const m = c[0] as IMetric;
                ToReg = Reg.UnitHash.get(m.Name);

                if (! TypeInfo.Assigned(ToReg))
                {
                    ToReg = {Name: m.Name, Symbol: m.Symbol, ConverterHash: new Map<TMetricName, TUnitConverter>()};
                    Reg.UnitHash.set(ToReg.Name, ToReg);
                }
            }

            if (TypeInfo.Assigned(BaseReg.ConverterHash.get(ToReg.Name)))
                console.log(`%cUnitConv: ${BaseReg.Name} => ${ToReg.Name} already registered`, 'color:orange');
            BaseReg.ConverterHash.set(ToReg.Name, c[1]);
        }
        console.log(Reg);
    }

    export function SetupBase(Subject: TUnitName, Base: IMetric | TMetricName): void
    {
        let Reg = Registry.get(Subject);
        if (! TypeInfo.Assigned(Reg))
        {
            Reg = {Name: Subject, Base: undefined, UnitHash: new Map<TMetricName, IMetricReg>()};
            Registry.set(Subject, Reg);
        }

        let BaseReg = TypeInfo.IsString(Base) ? Reg.UnitHash.get(Base) : Reg.UnitHash.get(Base.Name);
        if (! TypeInfo.Assigned(BaseReg))
        {
            if (TypeInfo.IsString(Base))
            {
                console.log(`%cUnitConv: Unit${Base} has registered information...Call Register(Subject, Base) first`, 'color:red');
                return;
            }
            else
                BaseReg = {Name: Base.Name, Symbol: Base.Symbol, ConverterHash: new Map<TMetricName, TUnitConverter>()};

            Reg.UnitHash.set(BaseReg.Name, BaseReg);
        }

        Reg.Base = BaseReg;
        Reg.DefaultConvert = Reg.Base;
    }

    export function SetConvertDefault(Name: TUnitName, UnitName: TMetricName): void
    {
        const Reg = Registry.get(Name);
        if (! TypeInfo.Assigned(Reg))
            return;

        if (! TypeInfo.Assigned(Reg.Base))
        {
            console.log(`%cUnitConv: ${Name} ' has not base...Call SetupBase(Subject, Base) first`, 'color:red');
            return;
        }

        if (Reg.Base.Name !== UnitName)
        {
            const ConvReg = Reg.Base.ConverterHash.get(UnitName);
            if (! TypeInfo.Assigned(ConvReg))
                console.log(`%cUnitConv: can not conver to ${UnitName}`, 'color:red');
        }

        Reg.DefaultConvert = Reg.UnitHash.get(UnitName);
    }

    export function MetricDefault(Subject: TUnitName): IMetric
    {
        const Reg = Registry.get(Subject);

        if (TypeInfo.Assigned(Reg) && TypeInfo.Assigned(Reg.DefaultConvert))
            return Reg.DefaultConvert;
        else
            return {Name: '', Symbol: ''};
    }

    export function MetricLookup(Subject: TUnitName, MetricName: TMetricName): IMetric
    {
        const Reg = Registry.get(Subject);

        if (TypeInfo.Assigned(Reg) && TypeInfo.Assigned(Reg.Base))
        {
            const m = Reg.UnitHash.get(MetricName);
            if (TypeInfo.Assigned(m))
                return m;
        }

        return {Name: '', Symbol: ''};
    }

    export function ExportMetricDefaults(): Array<IUnitDefault>
    {
        const RetVal = new Array<IUnitDefault>();

        Registry.forEach(Reg =>
        {
            if (TypeInfo.Assigned(Reg.Base) && TypeInfo.Assigned(Reg.Base) &&
                TypeInfo.Assigned(Reg.DefaultConvert) &&
                Reg.Base !== Reg.DefaultConvert)
            {
                RetVal.push({Name: Reg.Name, Base: Reg.Base.Name, DefaultConvert: Reg.DefaultConvert.Name});
            }
        });

        return RetVal;
    }

    export function ImportMetricDefaults(ary: Array<IUnitDefault>): void
    {
        ary.forEach(iter =>
        {
            const Reg = Registry.get(iter.Name);
            if (! TypeInfo.Assigned(Reg))
                return;

            const BaseReg = Reg.UnitHash.get(iter.Base);
            const DefaultReg = Reg.UnitHash.get(iter.DefaultConvert);

            if (TypeInfo.Assigned(BaseReg) && TypeInfo.Assigned(DefaultReg) && BaseReg !== DefaultReg &&
                BaseReg.ConverterHash.get(iter.DefaultConvert))
            {
                Reg.Base = BaseReg;
                Reg.DefaultConvert = DefaultReg;
            }
        });
    }

    export function Convertibles(Subject: TUnitName, Base?: TMetricName): Array<IMetric>
    {
        const Reg = Registry.get(Subject);
        if (! TypeInfo.Assigned(Reg))
            return [];

        const BaseReg = TypeInfo.Assigned(Base) ? Reg.UnitHash.get(Base) : Reg.Base;
        if (TypeInfo.Assigned(BaseReg))
        {
            const ary = new Array<IMetric>();

            const Keys = BaseReg.ConverterHash.keys();
            for (let iter = Keys.next(); ! iter.done; iter = Keys.next())
            {
                const RetVal = Reg.UnitHash.get(iter.value);
                if (TypeInfo.Assigned(RetVal))
                {
                    ary.push(RetVal);
                    // ary.push({Name: RetVal.Name, Symbol: RetVal.Symbol});
                }
            }

            if (TypeInfo.Assigned(Reg.Base) && ary.length > 0)
            {
                ary.unshift(Reg.Base);
                // ary.unshift({Name: BaseReg.Name, Symbol: BaseReg.Symbol});
            }
            return ary;
        }
        else
            return [];
    }

    /// convert to or using default converter to convert value
    export function Convert(Subject: TUnitName, Value?: number): number;
    export function Convert(Subject: TUnitName, Value?: number, To?: TMetricName): number;
    export function Convert(Subject: TUnitName, Value?: number, To?: TMetricName): number
    {
        if (! TypeInfo.Assigned(Value) || isNaN(Value))
            return NaN;

        const Reg = Registry.get(Subject);
        if (! TypeInfo.Assigned(Reg))
        {
            console.log(`%cUnitConv unknown subject: ${Subject}`, 'color:red');
            return NaN;
        }

        let Base = Reg.Base;
        if (! TypeInfo.Assigned(Base))
        {
            console.log(`%cUnitConv subject: ${Subject}  has no Base yet`, 'color:orange');
            Reg.Base = Reg.UnitHash.values().next().value;
            Reg.DefaultConvert = Reg.Base;

            Base = Reg.Base;
        }
        if (! TypeInfo.Assigned(Base))
        {
            console.log(`%cUnitConv subject: ${Subject} has no converter registered`, 'color:red');
            return NaN;
        }

        if (TypeInfo.Assigned(Reg.DefaultConvert))
        {
            if (! TypeInfo.Assigned(To))
                To = Reg.DefaultConvert.Name;
            if (Reg.Base === Reg.DefaultConvert && To === Reg.DefaultConvert.Name)
                return Value;
        }
        else if (! TypeInfo.Assigned(To))
            To = '';

        const Converter = Base.ConverterHash.get(To);
        if (TypeInfo.Assigned(Converter))
            return Converter(Value);
        else
            return NaN;
    }
}
