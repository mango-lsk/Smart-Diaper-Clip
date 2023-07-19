import {EEncoding} from '../exception';
import {TypeInfo} from '../typeinfo';

export class EInvalidUtf8 extends EEncoding
{
}

export class TUtf8Encoding
{
    static Encode(Str: string, Offset = 0, Count?: number): Uint8Array
    {
        if (! TypeInfo.Assigned(Str))
            Offset = Count = 0;
        else if (! TypeInfo.Assigned(Count) || Offset + Count > Str.length)
            Count = Str.length - Offset;

        const End = Offset + Count;
        let buf_len = 0;

        for (let I = Offset; I < End; I ++)
        {
            let c = Str.charCodeAt(I);
            if ((c & 0xFC00) === 0xD800 && (I + 1 < Str.length))
            {
                const c2 = Str.charCodeAt(I + 1);
                if ((c2 & 0xFC00) === 0xDC00)
                {
                    c = 0x10000 + ((c - 0xD800) << 10) + (c2 - 0xDC00);
                    I ++;
                }
            }
            buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
        }

        const buf = new Uint8Array(buf_len);
        let Bytes = 0;

        for (let I = Offset; I < End; I ++)
        {
            const c: number = Str.charCodeAt(I);

            if (c < 0x80)
            {
                buf[Bytes ++] = c;
            }
            else if (c < 0x800)
            {
                buf[Bytes ++] = 0xC0 | (c >> 6);
                buf[Bytes ++] = 0x80 | (c & 0x3F);
            }
            else if (c < 0x10000)
            {
                buf[Bytes ++] = 0xE0 | (c >> 12);
                buf[Bytes ++] = 0x80 | (c >> 6 & 0x3F);
                buf[Bytes ++] = 0x80 | (c & 0x3F);
            }
            else
            {
                buf[Bytes++] = 0xF0 | (c >> 18);
                buf[Bytes++] = 0x80 | (c >> 12 & 0x3F);
                buf[Bytes++] = 0x80 | (c >> 6 & 0x3F);
                buf[Bytes++] = 0x80 | (c & 0x3F);
            }
        }

        return buf;
    }

    static Decode(buf: Uint8Array | ArrayBuffer, Offset = 0, Count?: number): string
    {
        if (! TypeInfo.Assigned(buf))
            Offset = Count = 0;
        else if (! TypeInfo.Assigned(Count) || Offset + Count > buf.byteLength)
            Count = buf.byteLength - Offset;

        const view = buf instanceof ArrayBuffer ?  new Uint8Array(buf) : buf;

        let I = Offset;
        let Str = '';
        const End = Offset + Count;

        while (I < End)
        {
            let char_code: number;

            const c1 = view[I];
            let c2 = 0x80;
            let c3 = 0x80;
            let c4 = 0x80;

            if (c1 === 0)
                break;

            if (c1 < 0x80)
            {
                char_code = c1;
                I ++;
            }
            else if ((c1 & 0xE0) === 0xC0)
            {
                c2 = view[I + 1];
                char_code = ((c1 & 0x1F) << 6) | (c2 & 0x3F);
                I += 2;
            }
            else if ((c1 & 0xF0) === 0xE0)
            {
                c2 = view[I + 1];
                c3 = view[I + 2];
                char_code = ((c1 & 0x0F) << 12) | ((c2 & 0x3F) << 6) | (c3 & 0x3F);
                I += 3;
            }
            else // if((c1 & 0xF8) === 0xF0)
            {
                c2 = view[I + 1];
                c3 = view[I + 2];
                c4 = view[I + 3];
                char_code = ((c1 & 0x07) << 18) | ((c2 & 0x3F) << 12) | ((c3 & 0x3F) << 6) | (c4 & 0x3F);
                I += 3;
            }

            if ((c2 & 0xC0) !== 0x80 || (c3 & 0xC0) !== 0x80 || (c4 & 0xC0) !== 0x80)
                throw new EInvalidUtf8();

            Str += String.fromCharCode(char_code);
        }

        return Str;
    }
}
