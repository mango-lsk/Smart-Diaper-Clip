import {Subject} from 'rxjs';

import {TypeInfo} from '../core/typeinfo';
import {EDisconnected, ETimedout} from '../core/exception';

import {DBusRegistry} from './registry';
import {DBusError} from './error';

class TDBusWebSocketTransport extends Subject<void> implements DBusRegistry.ITransport
{
    get IsConnected(): boolean
    {
        return TypeInfo.Assigned(this.ws) && WebSocket.OPEN === this.ws.readyState;
    }

    Connect(Address: string): Promise<void>
    {
        if (TypeInfo.Assigned(this.ws))
            return Promise.resolve();

        return new Promise<WebSocket>((resolve, reject) =>
        {
            const ws = this.ws = new WebSocket(`ws://${Address}`);
            ws.binaryType = 'arraybuffer';

            ws.onopen = ev =>
            {
                resolve(ws);
            };

            ws.onerror = ev =>
            {
                const err = new DBusError.ETimedout();
                this.error(err);
                reject(err);
            };

            ws.onclose = ev =>
            {
                const err = new DBusError.EDisconnected();
                this.error(err);
                reject(err);
            };
        })
        .then(ws =>
        {
            ws.onopen = null;
            ws.onclose = ev => this.complete();

            ws.onerror = ev => {
                this.error(new DBusError.EDisconnected()),
                console.log(`%cWebSocket transport generial error.`, 'color:red');
            };

            ws.onmessage = ev =>
            {
                if (ev.data instanceof ArrayBuffer)
                {
                    this.Buffers.push(ev.data);

                    if (TypeInfo.Assigned(this.BufferResolve))
                    {
                        this.BufferResolve();

                        this.BufferResolve = undefined;
                        this.BufferReject = undefined;
                    }
                }
                else
                    console.log(`%cWebSocket transport received text: ${ev.data}`, 'color:yellow');
            };
        })
        .then(async () =>
        {
            try
            {
                await DBusRegistry.Authorize.Anonymous(this);
            }
            catch (err)
            {
                this.error(err);
                throw err;
            }
        });
    }

    async Close(): Promise<void>
    {
        if (TypeInfo.Assigned(this.ws))
        {
            if (WebSocket.CLOSED !== this.ws.readyState && WebSocket.CLOSING !== this.ws.readyState)
                this.ws.close(1000, 'shutdown');
        }
    }

    async SendBuf(Buf: ArrayBuffer | Uint8Array): Promise<void>
    {
        if (! TypeInfo.Assigned(this.ws))
        {
            console.log(`%cWebSocket transport not Connected.`, 'color:red');
            throw new DBusError.ENoConnection();
        }

        if (WebSocket.OPEN === this.ws?.readyState)
            this.ws.send(Buf);
        else
            throw new EDisconnected();
    }

    async Recv(Count: number, Timeout?: number): Promise<Uint8Array>
    {
        if (! TypeInfo.Assigned(this.ws))
        {
            console.log(`%cWebSocket transport not Connected.`, 'color:red');
            throw new DBusError.ENoConnection();
        }

        if (! TypeInfo.Assigned(this.ReadingBuffer))
        {
            let TimeoutId: timeout_t;
            await new Promise<void>((resolve, reject) =>
            {
                if (0 === this.Buffers.length)
                {
                    this.BufferResolve = resolve;
                    this.BufferReject = reject;

                    if (TypeInfo.Assigned(Timeout))
                    {
                        TimeoutId = setTimeout(() =>
                        {
                            reject(new ETimedout());
                            this.error(new EDisconnected());
                        }, Timeout);
                    }
                }
                else
                    resolve();
            })
            .finally(() => clearTimeout(TimeoutId));

            const buf = this.Buffers.shift() as ArrayBuffer;
            this.ReadingBuffer = new Uint8Array(buf);
        }

        const Reading = this.ReadingBuffer;
        const bytes_left = Reading.buffer.byteLength - Reading.byteOffset;
        let RetVal: Uint8Array;

        if (bytes_left > Count)
        {
            RetVal = new Uint8Array(Reading.buffer, Reading.byteOffset, Count);
            this.ReadingBuffer = new Uint8Array(Reading.buffer, Reading.byteOffset + Count);
        }
        else
        {
            RetVal = new Uint8Array(Reading.buffer, Reading.byteOffset, bytes_left);
            this.ReadingBuffer = undefined;
        }

        return RetVal;
    }

    override complete()
    {
        super.complete();
        this._Dispose();
    }

    override error(err: any)
    {
        super.error(err);
        this._Dispose();
    }

    private _Dispose(): void
    {
        if (TypeInfo.Assigned(this.ws))
        {
            console.log(`%cWebSocket transport closed.`, 'color:yellow');

            this.ws.onopen = null;
            this.ws.onclose = null;
            this.ws.onmessage = null;
            this.ws.onerror = null;

            if (WebSocket.CLOSED !== this.ws.readyState && WebSocket.CLOSING !== this.ws.readyState)
                this.ws.close();
            this.ws = undefined;

            if (TypeInfo.Assigned(this.BufferReject))
                this.BufferReject(new DBusError.EDisconnected());

            this.BufferResolve = undefined;
            this.BufferReject = undefined;
            this.ReadingBuffer = undefined;
        }
    }

    private ws?: WebSocket;

    private Buffers = new Array<ArrayBuffer>();
    private BufferResolve?: () => void;
    private BufferReject?: (err: Error) => void;
    private ReadingBuffer?: Uint8Array;
}

// register transport

DBusRegistry.RegisterTransportFactory('websocket', () =>
{
    return new TDBusWebSocketTransport();
});

DBusRegistry.RegisterTransportFactory('ws', () =>
{
    return new TDBusWebSocketTransport();
});
