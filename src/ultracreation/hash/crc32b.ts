/*
input (of char)
    console.log(THashCrc32b.Get('').toString());
    console.log(THashCrc32b.Get('a').toString());
    console.log(THashCrc32b.Get('abc').toString());
    console.log(THashCrc32b.Get('message digest').toString());
    console.log(THashCrc32b.Get('abcdefghijklmnopqrstuvwxyz').toString());
    console.log(THashCrc32b.Get('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789').toString());
    console.log(THashCrc32b.Get('12345678901234567890123456789012345678901234567890123456789012345678901234567890').toString());
 output
    "00000000",
    "e8b7be43",
    "352441c2",
    "20159d7f",
    "4c2750bd",
    "1fc2e6d2",
    "7ca94a72",
******************************************************************************/
import {TypeInfo} from '../core/typeinfo';
import {EInvalidArg} from '../core/exception';

import {THash, IHashStatic} from './abstract';
import {TUtf8Encoding} from '../core/encoding/utf8';
import {HexConv} from '../core/conv';

@TypeInfo.StaticImplements<IHashStatic<string | Uint8Array>>()
export class THashCrc32b extends THash
{
    static Update(Crc: number, Buf: Uint8Array | null, Count?: number, Pos = 0): number
    {
        if (! TypeInfo.Assigned(Buf))
            return this.SEED;

        if (! TypeInfo.Assigned(Count) || (Count + Pos) > Buf.byteLength)
            Count = Buf.byteLength - Pos;

        Crc ^= -1;

        for (let I = Pos; I < Pos + Count; I ++)
            Crc = (Crc >>> 8) ^ this._XlatTable[(Crc ^ Buf[I]) & 0xFF];
        return (Crc ^ (-1)) >>> 0;
    }

    static Get(In: string | Uint8Array): THashCrc32b
    {
        if (TypeInfo.IsString(In))
            In = TUtf8Encoding.Encode(In);

        if (! (In instanceof Uint8Array))
            throw new EInvalidArg('In');

        return new THashCrc32b().Update(In).Final();
    }

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
        this._Value = THashCrc32b.SEED;

        return this;
    }

    Update(Buf: Uint8Array, Count?: number, Pos = 0): this
    {
        if (! TypeInfo.Assigned(Count) || Count > Buf.byteLength)
            Count = Buf.byteLength;

        this._Value = (this.constructor as typeof THashCrc32b).Update(this._Value, Buf, Count, Pos);
        this._ProcessedBytes += Count;
        return this;
    }

    Final(): this
    {
        return this;
    }

    Print(Delimter?: string): string
    {
        return HexConv.IntToHex(this._Value, 8);
    }

    private _ProcessedBytes = 0;
    private _Value: number = THashCrc32b.SEED;
    private static _XlatTable = MakeXlatTable();
}

function MakeXlatTable(): Uint32Array
{
    let c: number;
    const table = new Uint32Array(256);

    for (let I = 0; I < 256; I ++)
    {
        c = I;
        for (let J = 0; J < 8; J ++)
            c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));

        table[I] = c;
    }

    return table;
}
