import {TypeInfo} from '../../core/typeinfo';
import {EAbort} from '../../core/exception';
import {TMemStream} from '../../core/stream';
import {TUtf8Encoding} from '../../core/encoding/utf8';
import {TAbstractShell, LINE_BREAK, LINE_BUFFER} from '../abstract.shell';

import {OTG} from './otg';
import {TUsbStream} from './connection';

/* TShell */

export class TShell extends TAbstractShell
{
    constructor()
    {
        super();
    }

    get IsAttached(): boolean
    {
        return OTG.IsAttached;
    }

    Connect(): Promise<void>
    {
        if (TypeInfo.Assigned(this.Channel))
            return Promise.resolve();
        if (TypeInfo.Assigned(this.Connecting))
            return this.Connecting;

        const Connection = OTG.AttachedDevice();
        if (! TypeInfo.Assigned(Connection))
            return Promise.reject(new EAbort());

        this.Connecting = Connection.Open()
            .then(() =>
            {
                this.Connecting = undefined;
                this.Channel = Connection.StartNotification(TUsbShellStream);

                Connection.subscribe({
                    next: () =>
                        this.OnRead((this.Channel  as TUsbShellStream).Line),
                    complete: () =>
                    {
                        console.log('USB connection completed');
                        this.Channel = undefined;

                        setTimeout(() => this.OnDisconnected());
                    },
                    error: err =>
                    {
                        console.log(`%cUSB connection error: ${err.message}`, 'color:red');
                        this.Channel = undefined;

                        setTimeout(() => this.OnConnectionError(err));
                    }
                });

                return super.Connect();
            })
            .catch((err: any) =>
            {
                console.log(`%cConnect error : ${err.message}`, 'color:red');
                this.Channel = undefined;

                this.OnConnectionError(err);
                return Promise.reject(err);
            });

        return this.Connecting;
    }

    private Connecting: Promise<void> | undefined;
}

/* TUsbShellStream */

export class TUsbShellStream extends TUsbStream
{
    public Line = '';

    private LineBuffer = new TMemStream(LINE_BUFFER);
    private LineBreak: Uint8Array = TUtf8Encoding.Encode(LINE_BREAK);
    private LineBreakMatched = 0;

/* Subject<T> */

    next(buf: ArrayBuffer): void
    {
    /**
     *  do not inherited, our class is last buffer consumer
     */
        this.InBuffer.Push(new Uint8Array(buf));
        const byte = new Uint8Array(1);

        while (! this.InBuffer.IsEmpty)
        {
            this.InBuffer.ExtractTo(byte);
            this.LineBuffer.Write(byte);

            if (byte[0] === this.LineBreak[this.LineBreakMatched])
            {
                this.LineBreakMatched ++;

                if (this.LineBreakMatched === this.LineBreak.byteLength)
                {
                    const BytesArray = new Uint8Array(this.LineBuffer.Memory, 0, this.LineBuffer.Position - this.LineBreak.byteLength);
                    this.Line = TUtf8Encoding.Decode(BytesArray);
                    console.log(this.Line);

                    if (TypeInfo.Assigned(this._Owner))
                        this._Owner.next();
                    else
                        console.log('%cUSB connection was disposed?', 'color:red');

                    this.LineBuffer.Clear();
                    this.LineBreakMatched = 0;
                }
            }
            else
                this.LineBreakMatched = 0;
        }
    }
}
