import {TypeInfo} from './typeinfo';
import {ENotSupported} from './exception';

export class Endianness
{
    static IsLittleEndian(): boolean
    {
        return this.HOST_ENDIAN === this.LITTLE_ENDIAN;
    }

    static ToBig64(N: number, Endian = this.HOST_ENDIAN): number
    {
        if (this.BIG_ENDIAN !== Endian)
            return this.Swap64(N);
        else
            return N;
    }

    static ToBig32(N: number, Endian = this.HOST_ENDIAN): number
    {
        if (this.BIG_ENDIAN !== Endian)
            return this.Swap32(N);
        else
            return N;
    }

    static ToBig16(n: number, Endian = this.HOST_ENDIAN): number
    {
        if (this.BIG_ENDIAN !== Endian)
            return this.Swap16(n);
        else
            return n;
    }

    static ToBig(buf: Uint8Array | ArrayBuffer, Offset: number, Length: number, Endian: Endianness.TEndian): void;
    static ToBig(buf: Uint8Array | ArrayBuffer, Endian: Endianness.TEndian): void;
    static ToBig(buf: Uint8Array | ArrayBuffer, OffsetOrEndian?: number, Length?: number, Endian = this.HOST_ENDIAN): void
    {
        let Offset: number;
        if (! TypeInfo.Assigned(Length))
        {
            Endian = OffsetOrEndian as Endianness.TEndian;
            Offset = 0;
            Length = buf.byteLength;
        }
        else
            Offset = OffsetOrEndian as number;

        if (this.BIG_ENDIAN !== Endian)
            this.SwapEndian(buf, Offset, Length);
    }

    static ToLittle64(N: number, Endian = this.HOST_ENDIAN)
    {
        if (this.LITTLE_ENDIAN !== Endian)
            return this.Swap64(N);
        else
            return N;
    }

    static ToLittle32(N: number, Endian = this.HOST_ENDIAN)
    {
        if (this.LITTLE_ENDIAN !== Endian)
            return this.Swap32(N);
        else
            return N;
    }

    static ToLittle16(N: number, Endian = this.HOST_ENDIAN)
    {
        if (this.LITTLE_ENDIAN !== Endian)
            return this.Swap16(N);
        else
            return N;
    }

    static ToLittle(buf: Uint8Array | ArrayBuffer, Offset: number, Length: number, Endian: Endianness.TEndian): void;
    static ToLittle(buf: Uint8Array | ArrayBuffer, Endian: Endianness.TEndian): void;
    static ToLittle(buf: Uint8Array | ArrayBuffer, OffsetOrEndian?: number, Length?: number, Endian = this.HOST_ENDIAN): void
    {
        let Offset: number;
        if (! TypeInfo.Assigned(Length))
        {
            Endian = OffsetOrEndian as Endianness.TEndian;
            Offset = 0;
            Length = buf.byteLength;
        }
        else
            Offset = OffsetOrEndian as number;

        if (this.LITTLE_ENDIAN !== Endian)
            this.SwapEndian(buf, Offset, Length);
    }

    static ToNet64(N: number, Endian = this.HOST_ENDIAN)
    {
        if (this.NET_ENDIAN !== Endian)
            return this.Swap64(N);
        else
            return N;
    }

    static ToNet32(N: number, Endian = this.HOST_ENDIAN)
    {
        if (this.NET_ENDIAN !== Endian)
            return this.Swap32(N);
        else
            return N;
    }

    static ToNet16(N: number, Endian = this.HOST_ENDIAN)
    {
        if (this.NET_ENDIAN !== Endian)
            return this.Swap16(N);
        else
            return N;
    }

    static ToNet(buf: Uint8Array | ArrayBuffer, Offset: number, Length: number, Endian: Endianness.TEndian): void;
    static ToNet(buf: Uint8Array | ArrayBuffer, Endian: Endianness.TEndian): void;
    static ToNet(buf: Uint8Array | ArrayBuffer, OffsetOrEndian?: number, Length?: number, Endian: number = this.HOST_ENDIAN): void
    {
        let Offset: number;
        if (! TypeInfo.Assigned(Length))
        {
            Endian = OffsetOrEndian as Endianness.TEndian;
            Offset = 0;
            Length = buf.byteLength;
        }
        else
            Offset = OffsetOrEndian as number;

        if (this.NET_ENDIAN !== Endian)
            this.SwapEndian(buf, Offset, Length);
    }

    static ToHost64(N: number, Endian: Endianness.TEndian)
    {
        if (this.HOST_ENDIAN !== Endian)
            return this.Swap64(N);
        else
            return N;
    }

    static ToHost32(N: number, Endian: Endianness.TEndian)
    {
        if (this.HOST_ENDIAN !== Endian)
            return this.Swap32(N);
        else
            return N;
    }

    static ToHost16(N: number, Endian: Endianness.TEndian)
    {
        if (this.HOST_ENDIAN !== Endian)
            return this.Swap16(N);
        else
            return N;
    }

    static ToHost(buf: Uint8Array | ArrayBuffer, Offset: number, Length: number, Endian: Endianness.TEndian): void;
    static ToHost(buf: Uint8Array | ArrayBuffer, Endian: Endianness.TEndian): void;
    static ToHost(buf: Uint8Array | ArrayBuffer, OffsetOrEndian?: number, Length?: number, Endian = this.HOST_ENDIAN): void
    {
        let Offset: number;
        if (! TypeInfo.Assigned(Length))
        {
            Endian = OffsetOrEndian as Endianness.TEndian;
            Offset = 0;
            Length = buf.byteLength;
        }
        else
            Offset = OffsetOrEndian as number;

        if (this.HOST_ENDIAN !== Endian)
            this.SwapEndian(buf, Offset, Length);
    }

    static SwapEndian(buf: Uint8Array | ArrayBuffer, Offset = 0, Length?: number): void
    {
        Length = TypeInfo.Assigned(Length) ? Length : buf.byteLength;
        if (Length === 1)
            return;

        let view: Uint8Array;
        if (buf instanceof Uint8Array)
        {
            if (Offset === 0 && buf.byteLength === Length)
                view = buf;
            else
                view = new Uint8Array(buf.buffer, buf.byteOffset + Offset, Length);
        }
        else
            view = new Uint8Array(buf, Offset, Length);

        switch (view.byteLength)
        {
        case 2:
            [view[0], view[1]] = [view[1], view[0]];
            break;
        case 3:
            [view[0], view[1], view[2]] = [view[2], view[1], view[0]];
            break;
        case 4:
            [view[0], view[1], view[2], view[3]] = [view[3], view[2], view[1], view[0]];
            break;
        case 6:
            [view[0], view[1], view[2], view[3], view[4], view[5]] = [view[5], view[4], view[3], view[2], view[1], view[0]];
            break;
        case 8:
            [view[0], view[1], view[2], view[3], view[4], view[5], view[6], view[7]] = [view[7], view[6], view[5], view[4], view[3], view[2], view[1], view[0]];
            break;

        default:
            for (let Idx = 0; Idx < buf.byteLength / 2; Idx ++)
            {
                const tmp = view[buf.byteLength - Idx - 1];
                view[buf.byteLength - Idx - 1] = view[Idx];
                view[Idx] = tmp;
            }
            break;
        }
    }

    private static Swap64(N: number): number
    {
        /*
        return (N >>> 56) | ((N << 56)) |
            ((N >>> 40) & 0xFF00) | ((N << 40) & (0xFF << 48)) |
            ((N >>> 24) & 0xFF0000) | ((N << 24) &  (0xFF << 40)) |
            ((N >>> 8) & 0xFF000000) | ((N << 8) & (0xFF << 32));
        */
        throw new ENotSupported();
    }

    private static Swap32(N: number): number
    {
        return (((N >>> 24) | ((N << 24) & 0xFF000000)) |
            ((N >>> 8) & 0xFF00) | ((N << 8) & 0xFF0000)) >>> 0;
    }

    private static Swap16(n: number): number
    {
        return ((n >>> 8) & 0xFF) | ((n << 8) & 0xFF00);
    }
}

export namespace Endianness
{
    export type TEndian = 0 | 1;
    export const LITTLE_ENDIAN = 0;
    export const BIG_ENDIAN = 1;

    export const HOST_ENDIAN = CalculateHosEndian();
    export const NET_ENDIAN = BIG_ENDIAN;

    function CalculateHosEndian(): TEndian
    {
        const buffer = new ArrayBuffer(2);
        new DataView(buffer).setInt16(0, 256, true);

        if (256 === new Int16Array(buffer)[0])
            return LITTLE_ENDIAN;
        else
            return BIG_ENDIAN;
    }
}
