import {TypeInfo} from '../core/typeinfo';
import {EInvalidArg} from '../core/exception';

import {THash, IHashStatic} from './abstract';
import {TUtf8Encoding} from '../core/encoding/utf8';

@TypeInfo.StaticImplements<IHashStatic<string | Uint8Array>>()
export class THashCrcitt extends THash
{
    static Update(Crc: number, Buf: Uint8Array | null, Count?: number, Pos = 0): number
    {
        if (! TypeInfo.Assigned(Buf))
            return this.SEED;

        if (! TypeInfo.Assigned(Count) || (Count + Pos) > Buf.byteLength)
            Count = Buf.byteLength - Pos;

        if (Count > 0)
        {
            for (let I = Pos; I < Count + Pos; I ++)
            {
                Crc ^= Buf[I] << 8;

                for (let j = 0; j < 8; j++)
                {
                    if (Crc & 0x8000)
                        Crc = ((Crc << 1) ^ THashCrcitt.CRC16_POLYNORIAL) & 0xFFFF;
                    else
                        Crc <<= 1;
                }
            }
        }
        return Crc;
    }

    static Get(In: string | Uint8Array): THashCrcitt
    {
        if (TypeInfo.IsString(In))
            In = TUtf8Encoding.Encode(In);

        if (! (In instanceof Uint8Array))
            throw new EInvalidArg('In');

        return new THashCrcitt().Update(In).Final();
    }

    static CRC16_POLYNORIAL = 0x1021;
    static SEED = 0;

    get ProcessedBytes(): number
    {
        return this._ProcessedBytes;
    }

    Value(): number
    {
        return this._Value;
    }

    Reset(): this
    {
        this._ProcessedBytes = 0;
        this._Value = THashCrcitt.SEED;

        return this;
    }

    Update(Buf: Uint8Array, Count?: number, Pos = 0): this
    {
        if (! TypeInfo.Assigned(Count) || Count > Buf.byteLength)
            Count = Buf.byteLength;

        this._Value = (this.constructor as typeof THashCrcitt).Update(this._Value, Buf, Count, Pos);
        this._ProcessedBytes += Count;
        return this;
        /*
        if (! TypeInfo.Assigned(Count) || Count > Buf.byteLength)
            Count = Buf.byteLength;

        if (Count > 0)
        {
            for (let i = Pos; i < Count + Pos; i ++)
            {
                this._Value ^= Buf[i] << 8;

                for (let j = 0; j < 8; j++)
                {
                    if (this._Value & 0x8000)
                        this._Value = ((this._Value << 1) ^ THashCrcitt.CRC16_POLYNORIAL) & 0xFFFF;
                    else
                        this._Value <<= 1;
                }
            }

            this._ProcessedBytes += Count;
        }

        return this;
        */
    }

    Final(): this
    {
        return this;
    }

    Print(Delimter?: string): string
    {
        return this._Value.toString(16);
    }

    private _ProcessedBytes = 0;
    private _Value = THashCrcitt.SEED;
}
