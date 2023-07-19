import {TypeInfo} from '../core/typeinfo';
import {EInvalidArg} from '../core/exception';

import {THash, IHashStatic} from './abstract';
import {TUtf8Encoding} from '../core/encoding/utf8';

@TypeInfo.StaticImplements<IHashStatic<string | Uint8Array>>()
export class THashCrc8 extends THash
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
                Crc ^= Buf[I];

                for (let j = 0; j < 8; j++)
                {
                    if (Crc & 0x80)
                        Crc = ((Crc << 1) ^ THashCrc8.CRC8_POLYNORIAL) & 0xFF;
                    else
                        Crc <<= 1;
                }
            }
        }
        return Crc;
    }

    static Get(In: string | Uint8Array): THashCrc8
    {
        if (TypeInfo.IsString(In))
            In = TUtf8Encoding.Encode(In);

        if (! (In instanceof Uint8Array))
            throw new EInvalidArg('In');

        return new THashCrc8().Update(In).Final();
    }

    static CRC8_POLYNORIAL = 0x31;
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
        this._Value = THashCrc8.SEED;

        return this;
    }

    Update(Buf: Uint8Array, Count?: number, Pos = 0): this
    {
        if (! TypeInfo.Assigned(Count) || Count > Buf.byteLength)
            Count = Buf.byteLength;

        this._Value = (this.constructor as typeof THashCrc8).Update(this._Value, Buf, Count, Pos);
        this._ProcessedBytes += Count;
        return this;
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
    private _Value = THashCrc8.SEED;
}
