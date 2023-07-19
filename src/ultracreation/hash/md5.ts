/*
input (of char)
    console.log(THashMd5.Get('').toString());
    console.log(THashMd5.Get('a').toString());
    console.log(THashMd5.Get('abc').toString());
    console.log(THashMd5.Get('message digest').toString());
    console.log(THashMd5.Get('abcdefghijklmnopqrstuvwxyz').toString());
    console.log(THashMd5.Get('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789').toString());
    console.log(THashMd5.Get('12345678901234567890123456789012345678901234567890123456789012345678901234567890').toString());
 output
    "d41d8cd98f00b204e9800998ecf8427e",
    "0cc175b9c0f1b6a831c399e269772661",
    "900150983cd24fb0d6963f7d28e17f72",
    "f96b697d7cb7938d525a2f31aaf161d0",
    "c3fcd3d76192e4007dfb496cca67e13b",
    "d174ab98d277d9f5a5611c2c9f419d9f",
    "57edf4a22be3c955ac49da2e2107b67a",
******************************************************************************/
import {TypeInfo} from '../core/typeinfo';
import {EInvalidArg} from '../core/exception';
import {HexConv} from '../core/conv';

import {EHashIsFinalize, EHashIsNotFinalize, THash, IHashStatic} from './abstract';
import {TUtf8Encoding} from '../core/encoding/utf8';

const MD5Pad: number[] =
[
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee,
    0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
    0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed,
    0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05,
    0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039,
    0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
];

const s1: number[] = [7, 12, 17, 22];
const s2: number[] = [5,  9, 14, 20];
const s3: number[] = [4, 11, 16, 23];
const s4: number[] = [6, 10, 15, 21];

function ROTATE_LEFT(x: number, n: number)
{
    return (x << n) | (x >>> (32 - n));
}

@TypeInfo.StaticImplements<IHashStatic<Uint8Array | string>>()
export class THashMd5 extends THash
{
    static Get(In: string | Uint8Array | undefined, Delimter: string = ''): THashMd5
    {
        if (TypeInfo.IsString(In))
            In = TUtf8Encoding.Encode(In);

        if (TypeInfo.Assigned(In) && ! (In instanceof Uint8Array))
            throw new EInvalidArg('In');

        const Md5 = new THashMd5();

        if (TypeInfo.Assigned(In))
            Md5.Update(In as Uint8Array);

        return Md5.Final();
    }

    static get Empty(): THashMd5
    {
        return new THashMd5().Final();
    }

    protected constructor()
    {
        super();

        this.State = new Uint32Array(4);

        const Buffer = new ArrayBuffer(64);
        this.Cache = new Uint8Array(Buffer, 0, 64);
        this.CacheView32 = new Uint32Array(Buffer, 0, 16);

        this.Reset();
    }

    get ProcessedBytes(): number
    {
        return this._ProcessedBytes;
    }

    Value(): Uint8Array | undefined
    {
        return this._FinalState;
    }

    Reset(): this
    {
        this._ProcessedBytes = 0;
        this.State[0] = 0x67452301;
        this.State[1] = 0xefcdab89;
        this.State[2] = 0x98badcfe;
        this.State[3] = 0x10325476;

        this.IsFinal = false;
        return this;
    }

    Update(Buf: Uint8Array | ArrayBuffer, Offset = 0, Count?: number): this
    {
        if (this.IsFinal)
            throw new EHashIsFinalize();

        let View = Buf instanceof Uint8Array ? Buf : new Uint8Array(Buf);

        if (0 !== Offset)
        {
            View = new Uint8Array(View.buffer, View.byteOffset + Offset, Count);
            Offset = 0;
        }
        if (! TypeInfo.Assigned(Count) || Count > View.byteLength)
            Count = View.byteLength;

        if (Count > 0)
        {
            const cached_count: number = this._ProcessedBytes & 63;
            this._ProcessedBytes += Count;

            if (cached_count + Count < 64)
            {
                if (Count !== View.byteLength)
                {
                    const view = new Uint8Array(View.buffer, View.byteOffset, Count);
                    this.Cache.set(view, cached_count);
                }
                else
                    this.Cache.set(View, cached_count);

                return this;
            }

            let copy_count = 64 - cached_count;
            View = new Uint8Array(View.buffer, View.byteOffset, copy_count);
            Count -= copy_count;

            this.Cache.set(View, cached_count);
            this.Transform();

            while (Count >= 64)
            {
                View = new Uint8Array(View.buffer, View.byteOffset + copy_count, 64);
                copy_count = 64;
                Count -= 64;

                this.Cache.set(View);
                this.Transform();
            }

            if (Count > 0)
            {
                View = new Uint8Array(View.buffer, View.byteOffset + 64, Count);
                this.Cache.set(View);
            }
        }

        return this;
    }

    Final(): this
    {
        let cached_count: number = this._ProcessedBytes & 63;

        this.Cache[cached_count ++] = 0x80;
        for (let i = cached_count; i < 64; i ++)
            this.Cache[i] = 0;

        if (cached_count > 56)
        {
            this.Transform();

            for (let i = 0; i < this.CacheView32.length; i ++)
                this.CacheView32[i] = 0;
        }

        this.CacheView32[14] = 8 * this._ProcessedBytes;
        this.CacheView32[15] = 0;   // (8 * this._ProcessedBytes) >> 32;
        this.Transform();

        const State8 = new Uint8Array(this.State.buffer, 0, 16);
        [State8[0], State8[1], State8[2], State8[3]] = [State8[3], State8[2], State8[1], State8[0]];
        [State8[4], State8[5], State8[6], State8[7]] = [State8[7], State8[6], State8[5], State8[4]];
        [State8[8], State8[9], State8[10], State8[11]] = [State8[11], State8[10], State8[9], State8[8]];
        [State8[12], State8[13], State8[14], State8[15]] = [State8[15], State8[14], State8[13], State8[12]];

        this.IsFinal = true;
        this._FinalState = State8;

        return this;
    }

    Print(Delimter: string = ''): string
    {
        if (! this.IsFinal)
            throw new EHashIsNotFinalize();

        return HexConv.IntToHex(this.State[0], 8) + Delimter +
            HexConv.IntToHex(this.State[1], 8) + Delimter +
            HexConv.IntToHex(this.State[2], 8) + Delimter +
            HexConv.IntToHex(this.State[3], 8);
    }

    protected Transform(): this
    {
        let a = this.State[0];
        let b = this.State[1];
        let c = this.State[2];
        let d = this.State[3];
        let tmp: number;

        /* Round 1 */
        for (let i = 0; i < 16; i++)
        {
            tmp = a + ((b & c) | ((~b) & d)) + this.CacheView32[i] + MD5Pad[i];
            tmp = ROTATE_LEFT(tmp, s1[i & 3]);
            tmp += b;
            a = d; d = c; c = b; b = tmp;
        }
        /* Round 2 */
        for (let i = 0, j = 1; i < 16; i++, j += 5)
        {
            tmp = a + ((b & d) | (c & (~d))) + this.CacheView32[j & 15] + MD5Pad[i + 16];
            tmp = ROTATE_LEFT(tmp, s2[i & 3]);
            tmp += b;
            a = d; d = c; c = b; b = tmp;
        }
        /* Round 3 */
        for (let i = 0, j = 5; i < 16; i++, j += 3)
        {
            tmp = a + (b ^ c ^ d) + this.CacheView32[j & 15] + MD5Pad[i + 32];
            tmp = ROTATE_LEFT(tmp, s3[i & 3]);
            tmp += b;
            a = d; d = c; c = b; b = tmp;
        }
        /* Round 4 */
        for (let i = 0, j = 0; i < 16; i++, j += 7)
        {
            tmp = a + (c ^ (b | (~d))) + this.CacheView32[j & 15] + MD5Pad[i + 48];
            tmp = ROTATE_LEFT(tmp, s4[i & 3]);
            tmp += b;
            a = d; d = c; c = b; b = tmp;
        }

        this.State[0] += a;
        this.State[1] += b;
        this.State[2] += c;
        this.State[3] += d;

        return this;
    }

    private _ProcessedBytes = 0;
    private Cache: Uint8Array;
    private CacheView32: Uint32Array;

    private State: Uint32Array;
    private IsFinal = false;
    private _FinalState: Uint8Array | undefined;
}
