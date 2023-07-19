import {Subject, Observable} from 'rxjs';

import {TypeInfo} from './typeinfo';
import {EAbort, EInvalidArg, ENotSupported} from './exception';
import {Endianness} from './endian';
import {TUtf8Encoding} from './encoding/utf8';

const MAX_UINT40 = Math.pow(2, 40);
const MAX_INT40 = (MAX_UINT40 / 2 - 1);

const MAX_UINT48 = Math.pow(2, 48);
const MAX_INT48 = (MAX_UINT48 / 2 - 1);

interface IStream
{
    Endian: Endianness.TEndian;
    readonly RandomAccess: boolean;     // in memory data stream, supports IInstantReadable/ IInstantWritable

    Seek(Offset: number, Origin: TSeekOrigin): number;
}

declare global
{
    type IntTypeSize = 1 | 2 | 3 | 4 | 5 | 6 | 8;

    const enum TSeekOrigin
    {
        FormBeginning,
        FormCurrent,
        FromEnd
    }

    interface IStreamReadOptions
    {
        Offset?: number;
        Count?: number;
    }

    interface IStreamWriteOptions
    {
        Offset?: number;
        Count?: number;

        FlowControl?: {Interval: number};
    }

    interface IStreamWriteBufOptions
    {
        Offset?: number;
        Count?: number;

        FlowControl?: IStreamFlowControl;
    }

    interface IStreamFlowControl
    {
        Interval?: number;

        PageSize?: number;
        PageInterval?: number;
    }

    interface IInstantReadable extends IStream
    {
        Read(Buf: Uint8Array | ArrayBuffer, opts?: IStreamReadOptions): number;
        ReadBuf(Buf: Uint8Array | ArrayBuffer, opts?: IStreamReadOptions): Observable<number>;

        ReadByte(): number;
        ReadUint(IntSize: IntTypeSize): number;
        ReadInt(IntSize: IntTypeSize): number;
        ReadFloat32(): number;
        ReadFloat64(): number;

        ReadLn(): string;
    }

    interface IAsyncReadable extends IStream
    {
        Read(Buf: Uint8Array | ArrayBuffer, opts?: IStreamReadOptions): Promise<number>;
        ReadBuf(Buf: Uint8Array | ArrayBuffer, opts?: IStreamReadOptions): Observable<number>;

        ReadUint(IntSize: IntTypeSize): Promise<number>;
        ReadInt(IntSize: IntTypeSize): Promise<number>;
        ReadFloat32(): Promise<number>;
        ReadFloat64(): Promise<number>;
        ReadLn(): Promise<string>;
    }

    interface IInstantWritable extends IStream
    {
        Write(Buf: Uint8Array | ArrayBuffer, opts?: IStreamWriteOptions): number;
        WriteBuf(Buf: Uint8Array | ArrayBuffer, opts?: IStreamWriteBufOptions): Observable<number>;

        WriteByte(N: number): void;
        WriteUint(N: number, IntSize: IntTypeSize): void;
        WriteInt(N: number, IntSize: IntTypeSize): void;
        WriteFloat32(F: number): void;
        WriteFloat64(F: number): void;
        WriteLn(Str: string, LN?: string): void;
    }

    interface IAsyncWritable extends IStream
    {
        FlowControlCallback(Interval: number): number;

        Write(Buf: Uint8Array | ArrayBuffer, opts?: IStreamWriteOptions): Promise<number>;
        WriteBuf(Buf: Uint8Array | ArrayBuffer, opts?: IStreamWriteBufOptions): Observable<number>;

        WriteUint(N: number, IntSize: IntTypeSize): Promise<void>;
        WriteInt(N: number, IntSize: IntTypeSize): Promise<void>;
        WriteFloat32(F: number): Promise<void>;
        WriteFloat64(F: number): Promise<void>;
        WriteLn(Str: string, LN?: string): Promise<void>;
    }
}

declare module 'rxjs'
{
    interface Observable<T>
    {
        /**
         *  sometimes we really not care return values
         */
        toPromiseResurrect(): Promise<void>;
    }
}

Observable.prototype.toPromiseResurrect = function toPromiseResurrect(): Promise<void>
{
    return new Promise<void>((resolve, reject) =>
    {
        this.subscribe({
            complete: () => resolve(),
            error: err => reject(err)
        });
    });
};

/** Exceptions */

export class EStreamRead extends EAbort
{
    constructor()
    {
        super('e_stream_read');
    }
}

export class EStreamWrite extends EAbort
{
    constructor()
    {
        super('e_stream_write');
    }
}

/**
 *  TStream with Subject life cycle
 *      Subject.next is meanless unless inherited classes overrides it
 */
export abstract class TStream extends Subject<any> implements IStream
{
    constructor(RandomAccess: boolean);
    constructor(RandomAccess: boolean, Endian: Endianness.TEndian);
    constructor(readonly RandomAccess: boolean, public Endian = Endianness.HOST_ENDIAN)
    {
        super();
    }

    Seek(Offset: number, Origin: TSeekOrigin): number
    {
        return 0;
    }

    get Size(): number
    {
        const curr = this.Seek(0, TSeekOrigin.FormCurrent);
        const retval = this.Seek(0, TSeekOrigin.FromEnd) - this.Seek(0, TSeekOrigin.FormBeginning);
        this.Seek(curr, TSeekOrigin.FormBeginning);

        return retval;
    }

    get Position(): number
    {
        return this.Seek(0, TSeekOrigin.FormCurrent);
    }

    set Position(Value: number)
    {
        this.Seek(Value, TSeekOrigin.FormBeginning);
    }

/* Subject */

    override error(err: any): void
    {
        super.error(err);
        this._Dispose(err);
    }

    override complete(): void
    {
        super.complete();
        this._Dispose();
    }

    protected _Dispose(err?: Error): void
    {
        if (TypeInfo.Assigned(err))
            console.log(`Stream _Dispose: ${err.message}`);
        else
            console.log('Stream: _Dispose');
    }
}

export abstract class TInstantReadable extends TStream implements IInstantReadable
{
    constructor(Endian: Endianness.TEndian = Endianness.HOST_ENDIAN)
    {
        super(true, Endian);
    }

    abstract ReadByte(): number;
    abstract Read(Buf: Uint8Array | ArrayBuffer, opts?: IStreamReadOptions): number;

    ReadBuf(Buf: Uint8Array | ArrayBuffer, opts?: IStreamReadOptions): Observable<number>
    {
        return ReadableImplement.ReadBuf(this, Buf, opts);
    }

    ReadUint(IntSize: IntTypeSize): number
    {
        return ReadableImplement.ReadUint(this, IntSize) as number;
    }

    ReadInt(IntSize: IntTypeSize): number
    {
        return ReadableImplement.ReadInt(this, IntSize) as number;
    }

    ReadFloat32(): number
    {
        return ReadableImplement.ReadFloat32(this) as number;
    }

    ReadFloat64(): number
    {
        return ReadableImplement.ReadFloat64(this) as number;
    }

    ReadLn(): string
    {
        return ReadableImplement.ReadLn(this) as string;
    }
}

export abstract class TAsyncReadable extends TStream implements IAsyncReadable
{
    constructor(Endian: Endianness.TEndian = Endianness.HOST_ENDIAN)
    {
        super(false, Endian);
    }

    abstract Read(Buf: Uint8Array | ArrayBuffer, opts?: IStreamReadOptions): Promise<number>;

    ReadBuf(Buf: Uint8Array | ArrayBuffer, opts?: IStreamReadOptions): Observable<number>
    {
        return ReadableImplement.ReadBuf(this, Buf, opts) as Observable<number>;
    }

    async ReadUint(IntSize: IntTypeSize): Promise<number>
    {
        return ReadableImplement.ReadUint(this, IntSize);
    }

    async ReadInt(IntSize: IntTypeSize): Promise<number>
    {
        return ReadableImplement.ReadInt(this, IntSize);
    }

    async ReadFloat32(): Promise<number>
    {
        return ReadableImplement.ReadFloat32(this);
    }

    async ReadFloat64(): Promise<number>
    {
        return ReadableImplement.ReadFloat64(this);
    }

    async ReadLn(): Promise<string>
    {
        return ReadableImplement.ReadLn(this);
    }
}

export abstract class TInstantWritable extends TStream implements IInstantWritable
{
    constructor(Endian: Endianness.TEndian = Endianness.HOST_ENDIAN)
    {
        super(true, Endian);
    }

    abstract WriteByte(N: number): void;
    abstract Write(Buf: Uint8Array | ArrayBuffer, opts?: IStreamWriteOptions): number;

    WriteBuf(Buf: Uint8Array | ArrayBuffer, opts?: IStreamWriteOptions): Observable<number>
    {
        return WritableImplement.WriteBuf(this, Buf, opts);
    }

    WriteUint(N: number, IntSize: IntTypeSize): void
    {
        return WritableImplement.WriteUint(this, N, IntSize) as void;
    }

    WriteInt(N: number, IntSize: IntTypeSize): void
    {
        return WritableImplement.WriteInt(this, N, IntSize) as void;
    }

    WriteFloat32(F: number): void
    {
        WritableImplement.WriteFloat32(this, F);
    }

    WriteFloat64(F: number): void
    {
        WritableImplement.WriteFloat64(this, F);
    }

    WriteLn(Str: string, LN = '\r\n'): void
    {
        WritableImplement.WriteLn(this, Str, LN);
    }
}

export abstract class TAsyncWritable extends TStream implements IAsyncWritable
{
    constructor();
    constructor(Endian: Endianness.TEndian);
    constructor(Endian: Endianness.TEndian = Endianness.HOST_ENDIAN)
    {
        super(false, Endian);
    }

    abstract Write(Buf: Uint8Array | ArrayBuffer, opts?: IStreamWriteOptions): Promise<number>;

    WriteBuf(Buf: Uint8Array | ArrayBuffer, opts?: IStreamWriteBufOptions): Observable<number>
    {
        return WritableImplement.WriteBuf(this, Buf, opts) as Observable<number>;
    }

    WriteUint(N: number, IntSize: IntTypeSize): Promise<void>
    {
        return WritableImplement.WriteUint(this, N, IntSize) as Promise<void>;
    }

    WriteInt(N: number, IntSize: IntTypeSize): Promise<void>
    {
        return WritableImplement.WriteInt(this, N, IntSize) as Promise<void>;
    }

    WriteFloat32(F: number): Promise<void>
    {
        return WritableImplement.WriteFloat32(this, F) as Promise<void>;
    }

    WriteFloat64(F: number): Promise<void>
    {
        return WritableImplement.WriteFloat64(this, F) as Promise<void>;
    }

    WriteLn(Str: string, LN = '\r\n'): Promise<void>
    {
        return WritableImplement.WriteLn(this, Str, LN);
    }

    FlowControlCallback(Interval: number): number
    {
        return Interval;
    }
}

export abstract class TAsyncStream extends TStream implements IAsyncReadable, IAsyncWritable
{
    constructor(Endian: Endianness.TEndian = Endianness.HOST_ENDIAN)
    {
        super(false, Endian);
    }

    abstract Read(Buf: Uint8Array | ArrayBuffer, opts?: IStreamReadOptions): Promise<number>;

    ReadBuf(Buf: Uint8Array | ArrayBuffer, opts?: IStreamWriteOptions): Observable<number>
    {
        return ReadableImplement.ReadBuf(this, Buf, opts) as Observable<number>;
    }

    async ReadUint(IntSize: IntTypeSize): Promise<number>
    {
        return ReadableImplement.ReadUint(this, IntSize);
    }

    async ReadInt(IntSize: IntTypeSize): Promise<number>
    {
        return ReadableImplement.ReadInt(this, IntSize);
    }

    async ReadFloat32(): Promise<number>
    {
        return ReadableImplement.ReadFloat32(this);
    }

    async ReadFloat64(): Promise<number>
    {
        return ReadableImplement.ReadFloat64(this);
    }

    async ReadLn(): Promise<string>
    {
        return ReadableImplement.ReadLn(this);
    }

    abstract Write(Buf: Uint8Array | ArrayBuffer, opts?: IStreamWriteOptions): Promise<number>;

    WriteBuf(Buf: Uint8Array | ArrayBuffer, opts?: IStreamWriteBufOptions): Observable<number>
    {
        return WritableImplement.WriteBuf(this, Buf, opts);
    }

    async WriteUint(N: number, IntSize: IntTypeSize): Promise<void>
    {
        return WritableImplement.WriteUint(this, N, IntSize);
    }

    async WriteInt(N: number, IntSize: IntTypeSize): Promise<void>
    {
        return WritableImplement.WriteInt(this, N, IntSize);
    }

    async WriteFloat32(F: number): Promise<void>
    {
        return WritableImplement.WriteFloat32(this, F);
    }

    async WriteFloat64(F: number): Promise<void>
    {
        return WritableImplement.WriteFloat64(this, F);
    }

    async WriteLn(Str: string, LN = '\r\n'): Promise<void>
    {
        return WritableImplement.WriteLn(this, Str, LN);
    }

    FlowControlCallback(Interval: number): number
    {
        return Interval;
    }
}

/** TMemStream */

export class TMemStream extends TStream implements IInstantReadable, IInstantWritable
{
    constructor(Capacity: number, AutoGrow?: boolean)
    constructor(Buf: ArrayBuffer | Uint8Array, AutoGrow?: boolean)
    constructor(CapacityOrBuf: number | ArrayBuffer | Uint8Array, readonly AutoGrow: boolean = false)
    {
        super(true);

        if (TypeInfo.IsNumber(CapacityOrBuf))
        {
            if (AutoGrow)
                CapacityOrBuf = (CapacityOrBuf + 0x1FF) & 0xFFFFFE00;

            this._Memory = new Uint8Array(CapacityOrBuf);
        }
        else
        {
            if (CapacityOrBuf instanceof ArrayBuffer)
                this._Memory = new Uint8Array(CapacityOrBuf);
            else if (CapacityOrBuf instanceof Uint8Array)
                this._Memory = CapacityOrBuf;
            else
                throw new EInvalidArg('CapacityOrBuf');

            this._Size = CapacityOrBuf.byteLength;
        }
    }

    get Capacity(): number
    {
        return this._Memory.byteLength;
    }

    set Capacity(Value: number)
    {
        if (Value > this._Memory.byteLength)
        {
            const old = this._Memory;

            this._Memory = new Uint8Array(Value);
            this._Memory.set(old);
        }
        else if (Value < this._Memory.byteLength)
        {
            const old = new Uint8Array(this._Memory.buffer, 0, Value);

            this._Memory = new Uint8Array(Value);
            this._Memory.set(old);
        }
    }

    get Memory(): ArrayBuffer
    {
        return this._Memory.buffer;
    }

    get MemoryView(): Uint8Array
    {
        return this._Memory;
    }

    ShrinkMemory(): ArrayBuffer
    {
        this.Capacity = this._Size;
        return this._Memory.buffer;
    }

    Clear(): void
    {
        this._Size = this._Position = 0;
    }

    private Graw(Count: number): void
    {
        if (!this.AutoGrow)
            return;
        if (this._Memory.byteLength - this._Position >= Count)
            return;

        if (this._Memory.byteLength < Count)
            Count *= 2;
        else
            Count = this._Memory.byteLength * 2;

        this.Capacity = Count;
    }

    protected _Memory: Uint8Array;
    protected _Size = 0;
    protected _Position = 0;

    /* TStream */

    override Seek(Offset: number, Origin: TSeekOrigin): number
    {
        switch (Origin)
        {
            case TSeekOrigin.FormBeginning:
                this._Position = Offset;
                break;
            case TSeekOrigin.FormCurrent:
                this._Position += Offset;
                break;
            case TSeekOrigin.FromEnd:
                this._Position = this._Size + Offset;
                break;
        }

        if (this._Position < 0)
            this._Position = 0;
        else if (this._Position > this._Size)
            this._Position = this._Size;

        return this._Position;
    }

    override get Size(): number
    {
        return this._Size;
    }

    override set Size(val: number)
    {
        if (val < this.Capacity)
            this._Size = val;
        else
            this._Size = this.Capacity;
    }

    /* IInstantReadable */

    Read(Buf: Uint8Array | ArrayBuffer, opts?: IStreamReadOptions): number
    {
        let view = Buf instanceof Uint8Array ? Buf : new Uint8Array(Buf);
        let _count = this._Size - this._Position;

        if (TypeInfo.Assigned(opts))
        {

            if (TypeInfo.Assigned(opts.Count) && _count > opts.Count)
                _count = opts.Count;

            const _offset = TypeInfo.Assigned(opts.Offset) ? opts.Offset : 0;
            if (0 !== _offset || _count !== view.byteLength)
                view = new Uint8Array(view.buffer, view.byteOffset + opts.Offset!, _count);
        }
        _count = _count > view.byteLength ? view.byteLength : _count;

        if (_count > 0)
        {
            const src = new Uint8Array(this._Memory.buffer, this._Memory.byteOffset + this._Position, _count);
            const dst = new Uint8Array(view.buffer, view.byteOffset, _count);
            dst.set(src);

            this._Position += _count;
        }
        return _count;
    }

    ReadByte(): number
    {
        if (this.Position < this.Size)
            return this.MemoryView[this.Position ++];
        else
            throw new EStreamRead();
    }

    ReadBuf(Buf: Uint8Array | ArrayBuffer, opts?: IStreamReadOptions): Observable<number>
    {
        return ReadableImplement.ReadBuf(this, Buf, opts);
    }

    ReadUint(IntSize: IntTypeSize): number
    {
        return ReadableImplement.ReadUint(this, IntSize) as number;
    }

    ReadInt(IntSize: IntTypeSize): number
    {
        return ReadableImplement.ReadInt(this, IntSize) as number;
    }

    ReadFloat32(): number
    {
        return ReadableImplement.ReadFloat32(this) as number;
    }

    ReadFloat64(): number
    {
        return ReadableImplement.ReadFloat64(this) as number;
    }

    ReadLn(): string
    {
        return ReadableImplement.ReadLn(this) as string;
    }

    /* IInstantWritable */

    Write(Buf: Uint8Array | ArrayBuffer, opts?: IStreamWriteOptions): number
    {
        let view = Buf instanceof Uint8Array ? Buf : new Uint8Array(Buf);
        let _count = view.byteLength;

        if (TypeInfo.Assigned(opts))
        {
            if (TypeInfo.Assigned(opts.Count) && _count > opts.Count)
                _count = opts.Count;

            const _offset = TypeInfo.Assigned(opts.Offset) ? opts.Offset : 0;
            if (0 !== _offset || _count !== view.byteLength)
                view = new Uint8Array(view.buffer, view.byteOffset + opts.Offset!, _count);
        }
        _count = _count > view.byteLength ? view.byteLength : _count;

        if (_count > 0)
        {
            this.Graw(_count);

            const src = new Uint8Array(view.buffer, view.byteOffset, _count);
            const dst = new Uint8Array(this._Memory.buffer, this._Memory.byteOffset + this._Position, _count);
            dst.set(src);

            this._Position += _count;
            if (this._Position > this._Size)
                this._Size = this._Position;
        }
        return _count;
    }

    WriteByte(N: number): void
    {
        if (this._Position < this._Memory.byteLength)
        {
            this._Memory[this._Position ++] = N;

            if (this._Position > this._Size)
                this._Size = this._Position;
        }
        else
            throw new EStreamWrite();
    }

    WriteBuf(Buf: Uint8Array | ArrayBuffer, opts?: IStreamWriteBufOptions): Observable<number>
    {
        return WritableImplement.WriteBuf(this, Buf, opts);
    }

    WriteUint(N: number, IntSize: IntTypeSize): void
    {
        WritableImplement.WriteUint(this, N, IntSize);
    }

    WriteInt(N: number, IntSize: IntTypeSize): void
    {
        WritableImplement.WriteInt(this, N, IntSize);
    }

    WriteFloat32(F: number): void
    {
        WritableImplement.WriteFloat32(this, F);
    }

    WriteFloat64(F: number): void
    {
        WritableImplement.WriteFloat64(this, F);
    }

    WriteLn(Str: string, LN = '\r\n'): void
    {
        WritableImplement.WriteLn(this, Str, LN);
    }
}

namespace ReadableImplement
{
    function IsInstantReadable(Stream: IStream): Stream is IInstantReadable
    {
        return Stream.RandomAccess;
    }

    export function ReadBuf(Stream: IStream, Buf: Uint8Array | ArrayBuffer, opts?: IStreamReadOptions): Observable<number>
    {
        const Observer = new Subject<number>();

        let view: Uint8Array = Buf instanceof Uint8Array ? Buf : new Uint8Array(Buf);
        let _count = view.byteLength;
        let _readed = 0;

        if (TypeInfo.Assigned(opts))
        {
            if (TypeInfo.Assigned(opts.Count) && _count > opts.Count)
                _count = opts.Count;

            const _offset = TypeInfo.Assigned(opts.Offset) ? opts.Offset : 0;
            if (0 !== _offset || _count !== view.byteLength)
                view = new Uint8Array(view.buffer, view.byteOffset + opts.Offset!, _count);
        }
        _count = _count > view.byteLength ? view.byteLength : _count;

        if (0 === _count)
        {
            setTimeout(() => {Observer.next(0); Observer.complete();});
            return Observer;
        }

        if (IsInstantReadable(Stream))
        {
            while (_readed < _count)
            {
                const retval = Stream.Read(view, {Count: _count - _readed});

                if (0 === retval)
                {
                    setTimeout(() => Observer.error(new EStreamRead()));
                    break;
                }
                else
                {
                    _readed += retval;
                    Observer.next(_readed);
                }
            }

            if (_readed === _count)
                setTimeout(() => Observer.complete());
        }
        else
            setTimeout(() => ReadNext(Stream as IAsyncReadable));

        return Observer;

        function ReadNext(_stream: IAsyncReadable): void
        {
            _stream.Read(view, {Count: _count - _readed}).then(reading =>
            {
                if (reading <= 0)
                {
                    if (Stream instanceof Subject)
                        return Observer.error(new EStreamRead());
                }
                _readed += reading;

                if (_readed < _count)
                    setTimeout(() => ReadNext(_stream));
                else
                    Observer.complete();

                Observer.next(_readed);
            })
            .catch(err =>
            {
                Observer.error(err);
            });
        }
    }

    export function ReadUint(Stream: IStream, IntSize: IntTypeSize): Promise<number> | number
    {
        if (IsInstantReadable(Stream))
        {
            if (8 === IntSize)
            {
                /*
                const view = new BigUint64Array(1);
                await Stream.ReadBuf(view.buffer, 8 - IntSize);

                if (Stream.Endian !== Endianness.HOST_ENDIAN)
                    Endianness.SwapEndian(view.buffer);

                if (view[0] > Number.MAX_SAFE_INTEGER)
                    throw new ERange('BigUint is out of Number.MAX_SAFE_INTEGER');
                else
                    return Number(view[0]);
                */
                throw new ENotSupported('Int64');
            }
            else if (IntSize > 1)
            {
                let RetVal = 0;

                if (Stream.Endian === Endianness.BIG_ENDIAN)
                {
                    for (let I = 0; I < IntSize; I ++)
                        RetVal = RetVal * 256 + Stream.ReadByte();
                }
                else
                {
                    for (let I = 0; I < IntSize; I ++)
                        RetVal = Stream.ReadByte() * Math.pow(256, I) + RetVal;
                }

                return RetVal;
            }
            else
                return Stream.ReadByte();
        }
        else
        {
            return Promise.resolve(Stream as TAsyncReadable).then(async Readable =>
            {
                const buf = new Uint8Array(IntSize);
                await Readable.ReadBuf(buf);

                if (IntSize > 6)
                {
                    /*
                    const view = new BigUint64Array(1);
                    await Readable.ReadBuf(view.buffer, 8 - IntSize);

                    if (Readable.Endian !== Endianness.HOST_ENDIAN)
                        Endianness.SwapEndian(view.buffer);

                    if (view[0] > Number.MAX_SAFE_INTEGER)
                        throw new ERange('BigUint is out of Number.MAX_SAFE_INTEGER');
                    else
                        return Number(view[0]);
                    */
                    throw new ENotSupported('Int64');
                }
                else if (IntSize > 1)
                {
                    let RetVal = 0;

                    if (Readable.Endian === Endianness.BIG_ENDIAN)
                    {
                        for (let I = 0; I < IntSize; I ++)
                            RetVal = RetVal * 256 + buf[I];
                    }
                    else
                    {
                        for (let I = 0; I < IntSize; I ++)
                            RetVal = buf[I] * Math.pow(256, I) + RetVal;
                    }

                    return RetVal;
                }
                else
                    return buf[0];
            });
        }
    }

    export function ReadInt(Stream: IStream, IntSize: IntTypeSize): Promise<number> | number
    {
        if (IsInstantReadable(Stream))
        {
            if (IntSize > 6)
            {
                /*
                const view = new BigInt64Array(1);

                await Stream.ReadBuf(view.buffer, 0, IntSize);

                if (Stream.Endian !== Endianness.HOST_ENDIAN)
                    Endianness.SwapEndian(view.buffer);

                if (view[0] > Number.MAX_SAFE_INTEGER || view[0] < Number.MIN_SAFE_INTEGER)
                    throw new ERange('BigInt is out of [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]');
                else
                    retval = Number(view[0]);
                */
                throw new ENotSupported('Uint64');
            }
            else
                return UintToInt(ReadUint(Stream, IntSize) as number);
        }
        else
        {
            return Promise.resolve(Stream as IAsyncReadable).then(async Readable =>
            {
                if (IntSize > 6)
                {
                    /*
                    const view = new BigInt64Array(1);

                    await Readable.ReadBuf(view.buffer, 0, IntSize);

                    if (Readable.Endian !== Endianness.HOST_ENDIAN)
                        Endianness.SwapEndian(view.buffer);

                    if (view[0] > Number.MAX_SAFE_INTEGER || view[0] < Number.MIN_SAFE_INTEGER)
                        throw new ERange('BigInt is out of [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]');
                    else
                        retval = Number(view[0]);
                    */
                    throw new ENotSupported('Uint64');
                }
                else
                    return UintToInt(await ReadUint(Readable, IntSize));
            });
        }

        function UintToInt(N: number): number
        {
            switch (IntSize)
            {
                case 1:
                    if (N & 0x80)
                        N = -(N & 0x7F) - 1;
                    break;
                case 2:
                    if (N & 0x8000)
                        N = -(N & 0x7FFF) - 1;
                    break;
                case 3:
                    if (N & 0x800000)
                        N = -(N & 0x7FFFFF) - 1;
                    break;
                case 4:
                    if (N & 0x80000000)
                        N = -(~N + 1);
                    break;
                case 5:
                    if (N > MAX_INT40)
                        N = -(N - MAX_INT40);
                    break;
                case 6:
                    if (N > MAX_INT48)
                        N = -(N - MAX_INT48);
                    break;
            }

            return N;
        }
    }

    export function ReadFloat32(Stream: IStream): Promise<number> | number
    {
        const buf = new Uint8Array(4);

        if (IsInstantReadable(Stream))
        {
            Stream.ReadBuf(buf);
            return new DataView(buf.buffer).getFloat32(0, Endianness.LITTLE_ENDIAN === Stream.Endian);
        }
        else
        {
            return ReadBuf(Stream, buf).toPromiseResurrect().then(() =>
                new DataView(buf.buffer).getFloat32(0, Endianness.LITTLE_ENDIAN === Stream.Endian));
        }
    }

    export function ReadFloat64(Stream: IStream): Promise<number> | number
    {
        const buf = new Uint8Array(8);

        if (IsInstantReadable(Stream))
        {
            Stream.ReadBuf(buf);
            return new DataView(buf.buffer).getFloat64(0, Endianness.LITTLE_ENDIAN === Stream.Endian);
        }
        else
        {
            return ReadBuf(Stream, buf).toPromiseResurrect().then(() =>
                new DataView(buf.buffer).getFloat64(0, Endianness.LITTLE_ENDIAN === Stream.Endian));
        }
    }

    export function ReadLn(Stream: IStream): Promise<string> | string
    {
        const LineBuffer = new Uint8Array(1024);
        let Count = 0;

        if (IsInstantReadable(Stream))
        {
            while (true)
            {
                const byte = Stream.ReadByte();

                if (10 === byte || 0 === byte)        // '\n' || '\0'
                {
                    // exclude '\r'
                    if (Count > 0 && 13 === LineBuffer[Count - 1])
                        Count--;

                    return TUtf8Encoding.Decode(LineBuffer, 0, Count);
                }
                else if (Count < 1024)
                {
                    LineBuffer[Count] = byte;
                    Count ++;
                }
                else
                    throw new EAbort();
            }
        }
        else
        {
            return Promise.resolve(Stream as IAsyncReadable).then(async Readable =>
            {
                const Byte = new Uint8Array(1);

                while (true)
                {
                    await Readable.Read(Byte);

                    if (10 === Byte[0] || 0 === Byte[0])    // '\n' || '\0'
                    {
                        // exclude '\r'
                        if (Count > 0 && 13 === LineBuffer[Count - 1])
                            Count--;

                        return TUtf8Encoding.Decode(LineBuffer, 0, Count);
                    }
                    else if (Count < 1024)
                    {
                        LineBuffer[Count] = Byte[0];
                        Count ++;
                    }
                    else
                        throw new EAbort();
                }
            });
        }
    }
}

namespace WritableImplement
{
    function IsInstantWritable(Stream: IStream): Stream is IInstantWritable
    {
        return Stream.RandomAccess;
    }

    export function WriteBuf(Stream: IStream, Buf: Uint8Array | ArrayBuffer, opts?: IStreamWriteBufOptions): Observable<number>
    {
        const Observer = new Subject<number>();

        let view: Uint8Array = Buf instanceof Uint8Array ? Buf : new Uint8Array(Buf);
        let _count = Buf.byteLength;
        let _written = 0;
        let _page_written = 0;
        let _flow_control: IStreamFlowControl = {Interval: 0, PageSize: 0, PageInterval: 100};

        if (TypeInfo.Assigned(opts))
        {
            if (TypeInfo.Assigned(opts.FlowControl))
                _flow_control = Object.assign(_flow_control, opts.FlowControl);

            if (TypeInfo.Assigned(opts.Count) && _count > opts.Count)
                _count = opts.Count;

            const _offset = TypeInfo.Assigned(opts.Offset) ? opts.Offset : 0;
            if (0 !== _offset || _count !== view.byteLength)
                view = new Uint8Array(view.buffer, view.byteOffset + opts.Offset!, _count);
        }
        _count = _count > view.byteLength ? view.byteLength : _count;

        if (0 === _count)
        {
            setTimeout(() => {Observer.next(0), Observer.complete();});
            return Observer;
        }

        if (IsInstantWritable(Stream))
        {
            while (_written < _count)
            {
                const retval = Stream.Write(view, {Count: _count - _written});

                if (0 === retval)
                {
                    Observer.error(new EStreamWrite());
                    break;
                }
                else
                {
                    _written +=  retval;
                    Observer.next(_written);
                }
            }

            if (_written === _count)
                setTimeout(() => Observer.complete());
        }
        else
            setTimeout(() => WriteNext((Stream as IAsyncWritable)), (Stream as IAsyncWritable).FlowControlCallback(_flow_control.Interval!));

        return Observer;

        function WriteNext(_stream: IAsyncWritable): void
        {
            _stream.Write(view, {Offset: _written, Count: _count - _written, FlowControl: {Interval: _flow_control.Interval!}}).catch(err => -1).then(async writting =>
            {
                if (writting <= 0)
                {
                    if (Stream instanceof Subject)
                        return Observer.error(new EStreamWrite());
                }
                _written += writting;
                Observer.next(_written);

                if (_written < _count)
                {
                    if (TypeInfo.Assigned(_flow_control.PageSize) && 0 < _flow_control.PageSize)
                    {
                        const page_writing = Math.trunc(_written / _flow_control.PageSize);

                        if (page_writing !== _page_written)
                        {
                            _page_written = page_writing;

                            const Interval =  _stream.FlowControlCallback(TypeInfo.Assigned(_flow_control.PageInterval) ? _flow_control.PageInterval : 100);
                            if (0 < Interval)
                                console.log(`PageInterval: ${Interval}`);

                            setTimeout(() => WriteNext(_stream), Interval);
                        }
                        else
                            setTimeout(() => WriteNext(_stream), _stream.FlowControlCallback(_flow_control.Interval!));
                    }
                    else
                        setTimeout(() => WriteNext(_stream), _stream.FlowControlCallback(_flow_control.Interval!));
                }
                else
                    setTimeout(() => Observer.complete());
            });
        }
    }

    export function WriteUint(Stream: IStream, N: number, IntSize: IntTypeSize): Promise<void> | void
    {
        const buf = new Uint8Array(IntSize);

        if (Endianness.HOST_ENDIAN === Stream.Endian)
        {
            for (let I = 0; I < IntSize; I ++)
            {
                buf[I] = N % 256;
                N = Math.trunc(N / 256);
            }
        }
        else
        {
            for (let I = IntSize - 1; I >= 0; I--)
            {
                buf[I] = N % 256;
                N = Math.trunc(N / 256);
            }
        }
        return WriteBuf(Stream, buf).toPromiseResurrect();
    }

    export function WriteInt(Stream: IStream, N: number, IntSize: IntTypeSize): Promise<void> | void
    {
        if (N < 0)
            N += Math.pow(2, IntSize * 8);
        return WriteUint(Stream, N, IntSize);
    }

    export function WriteFloat32(Stream: IStream, F: number): Promise<void> | void
    {
        const buf = new Uint8Array(4);

        const view = new DataView(buf.buffer);
        view.setFloat32(0, F, Endianness.LITTLE_ENDIAN === Stream.Endian);

        return WriteBuf(Stream, buf).toPromiseResurrect();
    }

    export function WriteFloat64(Stream: IStream, F: number): Promise<void>
    {
        const buf = new Uint8Array(8);

        const view = new DataView(buf.buffer);
        view.setFloat64(0, F, Endianness.LITTLE_ENDIAN === Stream.Endian);

        return WriteBuf(Stream, buf).toPromiseResurrect();
    }

    export function WriteLn(Stream: IStream, str: string, ln: string): Promise<void>
    {
        return WriteBuf(Stream, TUtf8Encoding.Encode(str + ln)).toPromiseResurrect();
    }
}
