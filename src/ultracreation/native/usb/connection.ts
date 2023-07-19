import {Subject, Observable} from 'rxjs';

import {TypeInfo} from '../../core/typeinfo';
import {Exception, EInvalidArg} from '../../core/exception';
import {TAsyncStream} from '../../core/stream';

import {TLoopBuffer} from '../../core/loopbuffer';

/** Buffer size to cache the peripherial notification data, data will discard when buffer full */
const NOTIFICATION_IN_BUFFER = 8 * 1024;

/* EPlugin */

export class EPlugin extends Exception
{
    constructor()
    {
        super('e_usb_plugin');
    }
}

/* EPermission */
export class EPermission extends Exception
{
    constructor()
    {
        super('e_usb_permission');
    }
}

/**
 *  TUsbConnection
 *      subscribe.next indicate the data from USB
 *      subscribe.complete indicate the USB was unpluged
 */
export class TUsbConnection extends Subject<void>
{
    constructor(private _VendorId: number, private _ProductId: number, private _MTU: number, private _Latency: number)
    {
        super();
    }

    get VendorId(): number
    {
        return this._VendorId;
    }

    get ProductId(): number
    {
        return this._ProductId;
    }

    get MTU(): number
    {
        return this._MTU;
    }

    get Latency(): number
    {
        return this._Latency;
    }

    RequestPermission(): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            (window as any).usb.requestPermission({vid: this._VendorId, pid: this._ProductId},
                () => resolve(),
                (err: string) => reject(new EPermission()));
        });
    }

    Open(): Promise<void>
    {
        const Self = this;
        return new Promise<void>((resolve, reject) =>
        {
            (window as any).usb.open({vid: this._VendorId, pid: this._ProductId},
                () =>
                    resolve(),
                (err: string) =>
                {
                    console.log('TUsbConnection.Open error: ' + err);

                    const err_obj = new EPlugin();
                    Self.error(err_obj);
                    reject(err_obj);
                });
        });
    }

    StartNotification(USBtoSerialStreamType?: typeof TUsbStream): TUsbStream
    {
        if (TypeInfo.Assigned(this.Stream))
            return this.Stream;

        if (! TypeInfo.Assigned(USBtoSerialStreamType))
            USBtoSerialStreamType = TUsbStream;

        const RetVal = new USBtoSerialStreamType(this);
        this.Stream = RetVal;

        const Self = this;
        (window as any).usb.registerReadCallback(
            (buf: ArrayBuffer) =>
                RetVal.next(buf),
            (err: string) =>
            {
                console.log('TUsbConnection.StartNotification error: ' + err);
                Self.error(new EPlugin());
            });

        return RetVal;
    }

    override complete(): void
    {
        this.Dispose();
        super.complete();
    }

    override error(err: any): void
    {
        this.Dispose();
        super.error(err);
    }

    private Dispose()
    {
        console.log('Usb Connection dispose');

        if (TypeInfo.Assigned(this.Stream))
            this.Stream.complete();
    }

    Read(): Promise<ArrayBuffer>
    {
        return new Promise<ArrayBuffer>((resolve, reject) =>
        {
            const Self = this;
            (window as any).usb.read(
                (buf: any) =>
                    resolve(buf),
                (err: any) =>
                {
                    Self.error(err);
                    reject((err));
                });
        });
    }

    Write(buf: ArrayBuffer): void
    {
        if (buf.byteLength > this.MTU)
            throw new EInvalidArg('Buffer ' + buf.byteLength + ' exceed the MTU ' + this.MTU.toString());

        (window as any).usb.write(buf,
            () => {},
            (err: string) => console.log('TUsbConnection.Write err ' + err));
    }

    private Stream: TUsbStream | undefined;
}

export class TUsbStream extends TAsyncStream
{
    constructor(protected _Owner: TUsbConnection | undefined)
    {
        super();
    }

/* TAsyncStream */

    override Read(Buf: Uint8Array | ArrayBuffer, Offset = 0, Count?: number): Promise<number>
    {
        if (! TypeInfo.Assigned(this._Owner))
            return Promise.resolve(0);

        if (! TypeInfo.Assigned(Offset))
            Offset = 0;
        let _buf = Buf instanceof Uint8Array ? Buf : new Uint8Array(Buf);

        if (0 !== Offset)
        {
            _buf = new Uint8Array(_buf.buffer, _buf.byteOffset + Offset, Count);
            Offset = 0;
        }
        if (! TypeInfo.Assigned(Count) || Count > _buf.byteLength)
            Count = _buf.byteLength;

        if (Count !== Buf.byteLength)
        {
            const view = new Uint8Array(_buf.buffer, _buf.byteOffset, Count);
            return Promise.resolve(this.InBuffer.ExtractTo(view));
        }
        else
            return Promise.resolve(this.InBuffer.ExtractTo(_buf));
    }

    override Write(Buf: Uint8Array | ArrayBuffer, Offset = 0, Count?: number): Promise<number>
    {
        if (! TypeInfo.Assigned(Offset))
            Offset = 0;
        let _buf = Buf instanceof Uint8Array ? Buf : new Uint8Array(Buf);

        if (0 !== Offset)
        {
            _buf = new Uint8Array(_buf.buffer, _buf.byteOffset + Offset, Count);
            Offset = 0;
        }
        if (! TypeInfo.Assigned(Count) || Count > _buf.byteLength)
            Count = _buf.byteLength;

        return Promise.resolve(this.WriteGuarantee(_buf, Count));
    }

    private WriteGuarantee(Buf: Uint8Array, Count: number): number
    {
        if (! TypeInfo.Assigned(this._Owner))
            return 0;

        if (Count > this._Owner.MTU)
            Count = this._Owner.MTU;

        const View = new Uint8Array(Buf.buffer, Buf.byteOffset, Count);
        Buf = new Uint8Array(Count);
        Buf.set(View);

        this._Owner.Write(Buf.buffer);
        return Count;
    }

    override WriteBuf(Buf: Uint8Array | ArrayBuffer, Offset = 0, Count?: number): Observable<number>
    {
        return super.WriteBuf(Buf, Offset, Count, {Interval: TypeInfo.Assigned(this._Owner) ? this._Owner.Latency : 0});
    }

    protected override  _Dispose()
    {
        this._Owner = undefined;
    }

/* Subject<T> */

    override next(buf: ArrayBuffer)
    {
        this.InBuffer.Push(new Uint8Array(buf));
        super.next(buf);
    }

    protected InBuffer = new TLoopBuffer(NOTIFICATION_IN_BUFFER);
}
