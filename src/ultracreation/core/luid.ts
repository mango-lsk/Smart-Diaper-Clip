/**
 *  TLuid
 *      Locally Unique Identifier should be unique on this computer
 */
import {RandomSource} from './random';
import {TBase64Encoding} from './encoding/base64';
import {HexConv} from './conv';

export class TLuid
{
    static From(Str: string): TLuid
    {
        const RetVal = new TLuid();
        RetVal.Value = TBase64Encoding.Decode(Str);

        return RetVal;
    }

    static Generate(): string
    {
        return new TLuid().toString();
    }

    constructor()
    {
        const ary = new Uint8Array(12);
        const x = new Uint32Array(ary.buffer, 0, 1);

        const dt = new Date();

        // 4294967296 / 86400000 = 49.7 days loop
        x[0] = dt.getTime();
        // year & 0x00FF
        ary[4] = dt.getFullYear();
        // year mixed month
        ary[5] = ((dt.getFullYear() & 0xFF00) >> 4) | dt.getMonth();
        // 7 random bytes
        RandomSource.Fill(ary, 6, 6);

        // interleave values
        [ary[0], ary[2], ary[4]] = [ary[6], ary[7], ary[8]];

        this.Value = ary;
    }

    toHexString(): string
    {
        return HexConv.BinToHex(this.Value);
    }

    toBase32String(): string
    {
        return '';
    }

    toString(): string
    {
        // 16 character
        return TBase64Encoding.EncodeToString(this.Value);
    }

    Value: Uint8Array;
}
