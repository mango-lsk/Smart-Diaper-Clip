/**
 *  TGuid
 *  Globally Unique Identifier / Universally Unique Identifier
 *      but..we still using randrom source, it not able to globally / universally unique
 */
import {RandomSource} from './random';
import {HexConv} from './conv';

export class TGuid
{
    static Generate(): string
    {
        return new TGuid().toString();
    }

    constructor()
    {
        this.Value = new Uint8Array(16);
        RandomSource.Fill(this.Value);

        // Guid from randrom source
        this.Value[6] = (this.Value[6] & 0x0F) | 0x40;
        this.Value[8] = (this.Value[8] & 0x3F) | 0x80;
    }

    toString(): string
    {
        let RetVal = '{';

        for (let i = 0; i  < this.Value.byteLength; i ++)
        {
            RetVal += HexConv.IntToHex(this.Value[i], 2).toUpperCase();

            // if (i in [3, 5, 7, 9])
            if (i === 3 || i === 5 || i === 7 || i === 9)
                RetVal += '-';
        }

        return RetVal + '}';
    }

    Value: Uint8Array;
}
