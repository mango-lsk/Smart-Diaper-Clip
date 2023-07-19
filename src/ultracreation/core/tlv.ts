import {TypeInfo} from './typeinfo';
import {BytesConv} from './conv';
import {Endianness} from './endian';
import {TUtf8Encoding} from './encoding/utf8';
import {EExists} from './exception';

const DIGIT_NAN = '----------------';

/** TLV */

export class TLV extends Object
{
/* static */
    static readonly TAG: number;
    static readonly Metric?: string;
    static readonly Icon?: string;

    static Register(Type: typeof TLV): void
    {
        // TAG(0) reserved for Unitness
        if (0 !== Type.TAG)
        {
            if (this.Repository.has(Type.TAG))
                throw new EExists(`TLV(0x${Type.TAG.toString(16)}) already registered.`);
            else
                this.Repository.set(Type.TAG, Type);
        }
    }

    static Decode(Buf: Uint8Array | ArrayBuffer, Offset: number,
        TagSize?: BytesConv.IntTypeSize, LengthSize?: BytesConv.IntTypeSize): Array<TLV>
    {
        if (! TypeInfo.Assigned(TagSize))
            TagSize = 1;
        if (! TypeInfo.Assigned(LengthSize))
            LengthSize = 1;

        const View = Buf instanceof ArrayBuffer ? new Uint8Array(Buf) : Buf;
        const RetVal = new Array<TLV>();

        while (Offset < View.byteLength)
        {
            if (Offset + TagSize > View.byteLength)
            {
                console.log('%cincomplete TLV', 'color:red');
                break;
            }
            const Type = BytesConv.AsUint(TagSize, View, Offset, Endianness.LITTLE_ENDIAN);
            Offset += TagSize;

            if (Offset + LengthSize > View.byteLength)
            {
                console.log('%cincomplete TLV', 'color:red');
                break;
            }

            const Length = LengthSize > 0 ?  BytesConv.AsUint(LengthSize, View, Offset, Endianness.LITTLE_ENDIAN) : 4;
            Offset += LengthSize;
            /**
             *  @about data length
             *      @highest bit is set(1) we reserved 3bits for precision(0~7)
             *          remain bits (0x0F or 0x0FFF or 0x0FFFFFFF) used as data length
             *      @hightest bit is unset(0)
             *          remain bits (0x7F or 0x7FFF or 0x7FFFFFFF) used as data length
             */
            let DataLength = Length;
            let Precision = 0;

            switch (LengthSize)
            {
            case 1:
                if ((Length & 0x80) !== 0)
                {
                    DataLength = Length & 0x0F;
                    Precision = (Length >> 4) & 0x07;
                }
                break;
            case 2:
                if ((Length & 0x8000) !== 0)
                {
                    DataLength = Length & 0x0FFF;
                    Precision = (Length >> 12) & 0x07;
                }
                break;
            case 4:
            default:
                if ((Length & 0x80000000) !== 0)
                {
                    DataLength = Length & 0x00FFFFFF;
                    Precision = (Length >> 28) & 0x07;
                }
                break;
            }

            if (Offset + DataLength > View.byteLength)
            {
                console.log('%cincomplete TLV', 'color:red');
                break;
            }
            const RAW = new Uint8Array(View.buffer, View.byteOffset + Offset, DataLength);
            Offset += DataLength;

            const TypeLV = this.Repository.get(Type);
            if (TypeInfo.Assigned(TypeLV))
            {
                const v = new TypeLV(Type, Precision, RAW);
                try
                {
                    // try parse to Primitive
                    v.Decode();
                    RetVal.push(v);
                }
                catch (e)
                {
                    console.log(`%TLV error: ${e instanceof Error ? e.message : (e as any).toString()}`, 'color:red');
                }
            }
            else
                console.log(`%cTLV: skip unknown type(0x${Type.toString(16)})`, 'color:yellow');
        }

        return RetVal;
    }

    protected static AccessDecode(v: TLV, ctype?: TLV.__ctype_id)
    {
        v._ctype = ctype;
        v.Decode();
    }

    protected static Repository = new Map<number, typeof TLV>();

/* Instance */

    constructor(Value: TypeInfo.Primitive, Digit: number, Icon?: string);
    constructor(Type: number, Digit: number, Raw: Uint8Array);
    constructor(TypeOrValue: TypeInfo.Primitive, Digit?: number, RawOrIcon?: Uint8Array | string)
    {
        super();

        if (! TypeInfo.Assigned(RawOrIcon) || TypeInfo.IsString(RawOrIcon))
        {
            this.Type = (this.constructor as typeof TLV).TAG;
            this.Digit = Digit;

            this.Value = TypeOrValue;
            this._override_icon = RawOrIcon;
        }
        else
        {
            this.Type = TypeOrValue as number;
            this.Digit = Digit;

            this._raw = RawOrIcon;
        }
    }

    get Icon(): string | undefined
    {
        if (TypeInfo.Assigned(this._override_icon))
            return this._override_icon;
        else
            return (this.constructor as typeof TLV).Icon;
    }

    AssignValue(other: TLV)
    {
        this._ctype = other._ctype;
        this._raw = other._raw;

        this.Value = other.Value;
    }

    protected Decode(): void
    {
        const TypeSize = TLV.__ctype_size(this._ctype);

        if (TypeInfo.Assigned(this._ctype) && TypeInfo.Assigned(this._raw))
        {
            switch (this._ctype)
            {
            case TLV.__ctype_id.UINT8:
            case TLV.__ctype_id.UINT16:
            case TLV.__ctype_id.UINT32:
            case TLV.__ctype_id.UNT64:
                if (this._raw.byteLength > TypeSize)
                {
                    const Exp10 = Math.pow(10, TypeInfo.Assigned(this.Digit) ? this.Digit : 0);
                    this.Value = [];

                    for (let Idx = 0; Idx < this._raw.length; Idx += TypeSize)
                    {
                        this.Value.push(BytesConv.AsUint(TypeSize as BytesConv.IntTypeSize,
                            this._raw, Idx, Endianness.LITTLE_ENDIAN) / Exp10);
                    }
                }
                else
                {
                    this.Value = BytesConv.AsUint(TypeSize as BytesConv.IntTypeSize,
                        this._raw, 0, Endianness.LITTLE_ENDIAN) / Math.pow(10, TypeInfo.Assigned(this.Digit) ? this.Digit : 0);
                }
                break;

            case TLV.__ctype_id.INT8:
            case TLV.__ctype_id.INT16:
            case TLV.__ctype_id.INT32:
            case TLV.__ctype_id.INT64:
                if (this._raw.byteLength > TypeSize)
                {
                    const Exp10 = Math.pow(10, TypeInfo.Assigned(this.Digit) ? this.Digit : 0);
                    this.Value = [];

                    for (let Idx = 0; Idx < this._raw.length; Idx += TypeSize)
                    {
                        this.Value.push(BytesConv.AsInt(TypeSize as BytesConv.IntTypeSize,
                            this._raw, Idx, Endianness.LITTLE_ENDIAN) / Exp10);
                    }
                }
                else
                {
                    this.Value = BytesConv.AsInt(TypeSize as BytesConv.IntTypeSize,
                        this._raw, 0, Endianness.LITTLE_ENDIAN) / Math.pow(10, TypeInfo.Assigned(this.Digit) ? this.Digit : 0);
                }
                break;

            case TLV.__ctype_id.FLOAT32:
            case TLV.__ctype_id.FLOAT64:
                if (this._raw.byteLength > TypeSize)
                {
                    this.Value = [];

                    for (let Idx = 0; Idx < this._raw.length; Idx += TypeSize)
                    {
                        this.Value.push(BytesConv.AsFloat(TypeSize as BytesConv.FloatTypeSize,
                            this._raw, Idx, Endianness.LITTLE_ENDIAN));
                    }
                }
                else
                {
                    this.Value = BytesConv.AsFloat(TypeSize as BytesConv.FloatTypeSize,
                        this._raw, 0, Endianness.LITTLE_ENDIAN);
                }
                break;

            case TLV.__ctype_id.BOOL:
                if (this._raw.byteLength > 1)
                {
                    this.Value = [];

                    for (const iter of this._raw)
                        this.Value.push(iter > 0);
                }
                else
                    this.Value = this._raw[0] > 0;
                break;

            case TLV.__ctype_id.STRING:
                this.Value = TUtf8Encoding.Decode(this._raw);
                break;

            case TLV.__ctype_id.VOID:
            default:
                this.Value = NaN;
            }
        }
        else
            this.Value = NaN;
    }

    /* Object */

    // tslint:disable-next-line:ban-types
    override valueOf(): Object
    {
        if (TypeInfo.Assigned(this.Value))
            return this.Value;
        else
            return {};
    }

    override toString(): string
    {
        if (TypeInfo.IsArrayLike(this.Value))
        {
            const ary = new Array<string>();

            for (const iter of this.Value)
                ary.push(StringOf(iter, TypeInfo.Assigned(this.Digit) ? this.Digit : 0));

            return ary.join(' ');
        }
        else
            return StringOf(this.Value, TypeInfo.Assigned(this.Digit) ? this.Digit : 0);

        function StringOf(v: TypeInfo.Primitive, Digit: number): string
        {
            if (TypeInfo.Assigned(v))
            {
                if (TypeInfo.IsNumber(v))
                {
                    if (isFinite(v))
                    {
                        if (0 < Digit)
                        {
                            const n = Math.trunc(v);
                            const digit = Math.round((Math.abs(v - n) * Math.pow(10, Digit)));

                            v = `${v < 0 ? '-' : ''}${Math.abs(n).toString()}.${digit.toString()}`;
                        }
                        else
                            v = Math.round(v).toString();
                    }
                    else
                    {
                        if (v === Number.POSITIVE_INFINITY)
                            v = '+∞';
                        else if (v === Number.NEGATIVE_INFINITY)
                            v = '-∞';
                        else
                            v = 'NaN';
                    }
                }
                else
                    v = v.toString();
            }
            else
            {
                if (0 < Digit)
                    v = `${DIGIT_NAN.substring(0, 1)}.${DIGIT_NAN.substring(0, Digit)}`;
                else
                    v = DIGIT_NAN.substring(0, 1);
            }
            return v;
        }
    }

    readonly Type: number;
    readonly Metric = (this.constructor as typeof TLV).Metric;

    Invisible?: true;
    Digit?: number;

    Value: TypeInfo.Primitive | Array<TypeInfo.Primitive>;

    protected _ctype?: TLV.__ctype_id;
    protected _raw? : Uint8Array;
    private _override_icon?: string;
}

export namespace TLV
{
    export const enum __ctype_id
    {
        VOID                = 0x00,
        /// unsigned typeS: 1~4
        UINT8               = 0x01,
        UINT16,
        UINT32,
        UNT64,
        // float types:     6~7
        FLOAT32             = 0x06,
        FLOAT64,
        FLOAT               = FLOAT32,
        DOUBLE              = FLOAT64,
        /// boolean type
        BOOL                = 0x08,
        /// signed types:   9~12
        INT8                = 0x09,
        INT16               = 0x0A,
        INT32               = 0x0B,
        INT64               = 0x0C,
        // char * (+n)
        STRING              = 0x0F,
    }


    export function __ctype_size(ctype: __ctype_id | undefined): BytesConv.IntTypeSize | BytesConv.FloatTypeSize | 0 | -1
    {
        switch (ctype)
        {
        case TLV.__ctype_id.UINT8:
        case TLV.__ctype_id.INT8:
        case TLV.__ctype_id.BOOL:
            return 1;
        case TLV.__ctype_id.UINT16:
        case TLV.__ctype_id.INT16:
            return 2;
        case TLV.__ctype_id.UINT32:
        case TLV.__ctype_id.INT32:
        case TLV.__ctype_id.FLOAT32:
            return 4;
        case TLV.__ctype_id.UNT64:
        case TLV.__ctype_id.INT64:
        case TLV.__ctype_id.FLOAT64:
            return 8;
        case TLV.__ctype_id.VOID:
            return 0;

        default:
        case TLV.__ctype_id.STRING:
            return -1;
        }
    }

    export class CVoid extends TLV
    {
        static override TAG = TLV.__ctype_id.VOID;
        protected override _ctype = TLV.__ctype_id.VOID;
    }

    export class CUint8 extends TLV
    {
        static override TAG = TLV.__ctype_id.UINT8;
        protected override _ctype = TLV.__ctype_id.UINT8;
    }

    export class CUint16 extends TLV
    {
        static override TAG = TLV.__ctype_id.UINT16;
        protected override _ctype = TLV.__ctype_id.UINT16;
    }

    export class CUint32 extends TLV
    {
        static override TAG = TLV.__ctype_id.UINT32;
        protected override _ctype = TLV.__ctype_id.UINT32;
    }

    export class CInt8 extends TLV
    {
        static override TAG = TLV.__ctype_id.INT8;
        protected override _ctype = TLV.__ctype_id.INT8;
    }

    export class CInt16 extends TLV
    {
        static override TAG = TLV.__ctype_id.INT16;
        protected override _ctype = TLV.__ctype_id.INT16;
    }

    export class CInt32 extends TLV
    {
        static override TAG = TLV.__ctype_id.INT32;
        protected override _ctype = TLV.__ctype_id.INT32;
    }

    export class CFloat extends TLV
    {
        static override TAG = TLV.__ctype_id.FLOAT;
        protected override _ctype = TLV.__ctype_id.FLOAT;
    }

    export class CDouble extends TLV
    {
        static override TAG = TLV.__ctype_id.DOUBLE;
        protected override _ctype = TLV.__ctype_id.DOUBLE;
    }

    export class CBoolean extends TLV
    {
        static override TAG = TLV.__ctype_id.BOOL;
        protected override _ctype = TLV.__ctype_id.BOOL;
    }
}
