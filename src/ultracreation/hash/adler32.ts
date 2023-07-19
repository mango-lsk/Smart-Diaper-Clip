/*
input (of char)
    console.log(THashAdler32.Get('').toString());
    console.log(THashAdler32.Get('a').toString());
    console.log(THashAdler32.Get('abc').toString());
    console.log(THashAdler32.Get('message digest').toString());
    console.log(THashAdler32.Get('abcdefghijklmnopqrstuvwxyz').toString());
    console.log(THashAdler32.Get('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789').toString());
    console.log(THashAdler32.Get('12345678901234567890123456789012345678901234567890123456789012345678901234567890').toString());
 output
    "00000001",
    "00620062",
    "024d0127",
    "29750586",
    "90860b20",
    "8adb150c",
    "97b61069",
******************************************************************************/
import {TypeInfo} from '../core/typeinfo';
import {EInvalidArg} from '../core/exception';

import {THash, IHashStatic} from './abstract';
import {TUtf8Encoding} from '../core/encoding/utf8';
import {HexConv} from '../core/conv';

const BASE = 65521;
const NMAX = 5552;

@TypeInfo.StaticImplements<IHashStatic<string | Uint8Array>>()
export class THashAdler32 extends THash
{
    static Update(adler: number, Buf: Uint8Array | null, Count?: number, Pos = 0): number
    {
        // console.log(adler, Buf, Count, Pos);
        if (! TypeInfo.Assigned(Buf))
            return this.SEED;
        if (! TypeInfo.Assigned(Count) || Count > Buf.byteLength)
            Count = Buf.byteLength;

        let a = adler & 0xFFFF;
        let b = (adler >>> 16) & 0xFFFF;

        for (let i = 0; i < Count; i ++)
        {
            let n = Math.min(NMAX, Count - i);

            do
            {
                a += Buf[i++] << 0;
                b += a;
            }
            while (--n);

            a %= BASE;
            b %= BASE;
        }

        return ((b << 16) | a) >>> 0;
    }

    static Get(In: string | Uint8Array): THashAdler32
    {
        if (TypeInfo.IsString(In))
            In = TUtf8Encoding.Encode(In);

        if (! (In instanceof Uint8Array))
            throw new EInvalidArg('In');

        return new THashAdler32().Update(In);
    }

    static SEED = 1;

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
        this._Value = 0;
        return this;
    }

    Update(Buf: Uint8Array, Count?: number, Pos = 0): this
    {
        if (! TypeInfo.Assigned(Count) || Count > Buf.byteLength)
            Count = Buf.byteLength;

        this._Value = (this.constructor as typeof THashAdler32).Update(this._Value, Buf, Count, Pos);
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
    private _Value: number = THashAdler32.SEED;
}
