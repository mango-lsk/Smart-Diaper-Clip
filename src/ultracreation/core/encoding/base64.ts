import {TypeInfo} from '../typeinfo';
import {EEncoding, EInvalidArg} from '../exception';
import {TUtf8Encoding} from './utf8';

export class TBase64Encoding
{
    static EncodeToString(In: ArrayBuffer | Uint8Array | string): string
    {
        return TUtf8Encoding.Decode(this.Encode(In));
    }

    static DecodeToString(In: ArrayBuffer | Uint8Array | string): string
    {
        return TUtf8Encoding.Decode(this.Decode(In));
    }

/* IEncodingStatic */

    static Encode(In: ArrayBuffer | Uint8Array | string): Uint8Array
    {
        if (TypeInfo.IsString(In))
            In = TUtf8Encoding.Encode(In);

        if (In instanceof ArrayBuffer)
            In = new Uint8Array(In);
        if (! (In instanceof Uint8Array))
            throw new EInvalidArg('In');

        // init base64 xchange table at first use
        if (! TypeInfo.Assigned(this._xlat_encode))
        {
            this._xlat_encode = new Uint8Array(65);

            for (let i = 65; i < 91; i ++)      // A~Z
                this._xlat_encode[i - 65] = i;
            for (let i = 97; i < 123; i ++)     // a~z
                this._xlat_encode[i - 97 + 26] = i;
            for (let i = 48; i < 58; i ++)      // 0~9
                this._xlat_encode[i - 48 + 52] = i;

            this._xlat_encode[62] = 43;     // +
            this._xlat_encode[63] = 47;     // /
            this._xlat_encode[64] = 61;     // =
        }

        const RetVal = new Uint8Array(Math.trunc((In.byteLength + 2) / 3) * 4);

        let I: number;
        let J = 0;

        for (I = 0; I < Math.trunc(In.byteLength / 3) * 3; I += 3)
        {
            const A = In[I];
            const B = In[I + 1];
            const C = In[I + 2];

            RetVal[J ++] = this._xlat_encode[(A >> 2) & 0x3F];
            RetVal[J ++] = this._xlat_encode[(((A &  3) << 4) + (B >> 4)) & 0x3F];
            RetVal[J ++] = this._xlat_encode[(((B & 15) << 2) + (C >> 6)) & 0x3F];
            RetVal[J ++] = this._xlat_encode[C & 0x3F];
        }

        if (I < In.byteLength)
        {
            const A = In[I];
            const B = I + 1 < In.byteLength ? In[I + 1] : 0;

            RetVal[J ++] = this._xlat_encode[(A >> 2) & 0x3F];
            RetVal[J ++] = this._xlat_encode[(((A & 3) << 4) + (B >> 4)) & 0x3F];

            if (I + 1 < In.byteLength)
                RetVal[J ++] = this._xlat_encode[((B & 15) << 2) & 0x3F];
            else
                RetVal[J ++] = this._xlat_encode[64];   // =

            RetVal[J] = this._xlat_encode[64];          // =
        }

        return RetVal;
    }

    static Decode(In: ArrayBuffer | Uint8Array | string): Uint8Array
    {
        if (TypeInfo.IsString(In))
            In = TUtf8Encoding.Encode(In);

        if (In instanceof ArrayBuffer)
            In = new Uint8Array(In);
        if (! (In instanceof Uint8Array))
            throw new EInvalidArg('In');

        let Size = Math.trunc((In.byteLength + 3) / 4) * 3;
        if (Size === 0)
            return new Uint8Array(0);

        switch (In.byteLength % 4)
        {
        case 1:     // not possiable 6 bits
            throw new EEncoding('Corrupted base64');
        case 2:     // 12bits
            Size -= 2;
            break;
        case 3:     // 18bits
            Size --;
            break;
        default:
            if (In[In.byteLength - 1] === 61)
                Size --;
            if (In.byteLength > 1 && In[In.byteLength - 2] === 61)
                Size --;
            break;
        }
        const RetVal = new Uint8Array(Size);

        let I = 0;
        let J = 0;
        while (I < In.byteLength)
        {
            const A = ValueOf(In[I ++]);
            let B = 0;
            let C = 0;
            let D = 0;

            if (I < In.byteLength)
                B = ValueOf(In[I ++]);
            if (I < In.byteLength)
                C = ValueOf(In[I ++]);
            if (I < In.byteLength)
                D = ValueOf(In[I ++]);

            RetVal[J ++] = (A << 2) | (B >> 4);
            if (J < Size)
                RetVal[J ++] = ((B & 15) << 4) | (C >> 2);
            if (J < Size)
                RetVal[J ++] = ((C & 3) << 6) | D;
        }

        return RetVal;

        function ValueOf(base64: number): number
        {
            if (base64 === 61)  // =
                return 0;

            if (base64 === 43)  // +
                return 62;
            if (base64 === 47)  // /
                return 63;

            if (base64 >= 65 && base64 < 91)    // A-Z, 0~25
                return base64 - 65;

            if (base64 >= 97 && base64 < 123)   // a~z, 26~51
                return base64 - 97 + 26;

            if (base64 >= 48 && base64 < 58)    // 0~9, 52~61
                return base64 - 48 + 52;

            throw new EEncoding('Corrupted base64: ' + base64);
        }
    }

    private static _xlat_encode: Uint8Array;
}
