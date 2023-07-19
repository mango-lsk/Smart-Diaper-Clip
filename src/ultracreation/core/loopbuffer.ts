import {TypeInfo} from './typeinfo';

export class TLoopBuffer
{
    constructor(Size: number)
    {
        this.ReadIndex = this.WriteIndex = 0;
        this._Memory = new Uint8Array(Size);
    }

    get Size(): number
    {
        return this._Memory.byteLength;
    }

    get Count(): number
    {
        return (this.WriteIndex + this._Memory.byteLength - this.ReadIndex) % this._Memory.byteLength;
    }

    get Avail(): number
    {
        // mod loopbuffer method, avail element should be -1
        return this._Memory.byteLength - this.Count - 1;
    }

    get IsEmpty(): boolean
    {
        return this.ReadIndex === this.WriteIndex;
    }

    get IsFull(): boolean
    {
        return (this.WriteIndex + 1) % this._Memory.byteLength === this.ReadIndex;
    }

    get Memory(): ArrayBuffer
    {
        return this._Memory.buffer as ArrayBuffer;
    }

    Clear(): void
    {
        this.ReadIndex = this.WriteIndex = 0;
    }

    Push(Buf: Uint8Array | ArrayBuffer, Count?: number): boolean
    {
        let src = Buf instanceof ArrayBuffer ? new Uint8Array(Buf, 0, Count) : Buf;

        if (! TypeInfo.Assigned(Count) || Count > src.byteLength)
            Count = Buf.byteLength;

        if (Count > this.Avail)
            return false;

        let RightSize = this._Memory.byteLength - this.WriteIndex;
        RightSize = RightSize > Count ? Count : RightSize;

        // fill right side of buffer
        src = new Uint8Array(src.buffer, src.byteOffset, RightSize);
        this._Memory.set(src, this.WriteIndex);
        // fill left side of buffer
        if (RightSize !== Count)
        {
            src = new Uint8Array(src.buffer, src.byteOffset + RightSize, Count - RightSize);
            this._Memory.set(src);
        }

        // update write index
        this.WriteIndex = (this.WriteIndex + Count) % this._Memory.byteLength;
        return true;
    }

    ExtractTo(Buf: Uint8Array | ArrayBuffer, Count?: number, Offset?: number): number
    {
        const dst = Buf instanceof ArrayBuffer ? new Uint8Array(Buf, 0) : Buf;
        const BufferedSize = this.Count;

        if (! TypeInfo.Assigned(Offset))
            Offset = 0;
        if (! TypeInfo.Assigned(Count) || Count > dst.byteLength - Offset || Count > BufferedSize)
            Count = dst.byteLength - Offset > BufferedSize ? BufferedSize : dst.byteLength - Offset;

        if (Count > 0)
        {
            let RightSize = this._Memory.byteLength - this.ReadIndex;
            RightSize = RightSize > Count ? Count : RightSize;

            // extract right side of buffer
            let src = new Uint8Array(this._Memory.buffer, this.ReadIndex, RightSize);
            dst.set(src, Offset);

            // extract left side of buffer
            if (RightSize !== Count)
            {
                src = new Uint8Array(this._Memory.buffer, 0, Count - RightSize);
                dst.set(src, RightSize + Offset);
            }

            // update read index
            this.ReadIndex = (this.ReadIndex + Count) % this._Memory.byteLength;
        }

        return Count;
    }

    Extract(): Uint8Array;
    Extract(Count: number): Uint8Array;
    Extract(Count?: number): Uint8Array
    {
        if (0 === Count)
            return new Uint8Array(0);

        const BufferedSize = this.Count;

        if (! TypeInfo.Assigned(Count) || Count > BufferedSize)
            Count = BufferedSize;

        const Buf = new Uint8Array(Count);
        this.ExtractTo(Buf);

        return Buf;
    }

    private _Memory: Uint8Array;
    private ReadIndex: number;
    private WriteIndex: number;
}
