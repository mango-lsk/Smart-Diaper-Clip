import {Subject, Subscription} from 'rxjs';

import {TypeInfo} from '../../core/typeinfo';
import {EDisconnected, ENoConnection, ETimedout} from '../../core/exception';
import {TUtf8Encoding} from '../../core/encoding/utf8';

import {DBusRegistry} from '../../dbus/registry';
import '../../mqtt';

export class TDBusMqttTransport extends Subject<void> implements DBusRegistry.ITransport
{
    get IsConnected()
    {
        return Mqtt.IsConnected;
    }

    async Connect(DeviceId: string): Promise<void>
    {
        const ControllerId = Mqtt.ClientId.substring(Mqtt.ClientId.length - 5, Mqtt.ClientId.length - 1);

        this.Context = {
            DeviceId,
            Controller: TUtf8Encoding.Encode(ControllerId)
        };

        this.MqttSub = Mqtt.Listen(`${DeviceId}/${ControllerId}`).subscribe(
            {next: buf =>
            {
                if (TypeInfo.Assigned(this.BufferResolve))
                {
                    this.BufferResolve(buf);

                    this.BufferResolve = undefined;
                    this.BufferReject = undefined;
                }
                else
                    this.Buffers.push(buf);
            },
            complete: () => this.complete(),
            error: err => this.error(err)
        });

        await DBusRegistry.Authorize.Reset(this);
        await this.Recv('OK'.length + 1, 5000);
    }

    Close(): Promise<void>
    {
        if (TypeInfo.Assigned(this.MqttSub))
            this.MqttSub.unsubscribe();

        this._Dispose();

        // mqtt: always online
        return Promise.resolve();
    }

    async Recv(Count: number, Timeout?: number): Promise<Uint8Array>
    {
        if (! TypeInfo.Assigned(this.ReadingBuffer))
        {
            let TimeoutId: timeout_t;
            const buf = await new Promise<Uint8Array>((resolve, reject) =>
            {
                if (TypeInfo.Assigned(Timeout))
                {
                    TimeoutId = setTimeout(() =>
                    {
                        reject(new ETimedout());
                        this.error(new EDisconnected());
                    }, Timeout);
                }

                if (0 === this.Buffers.length)
                {
                    this.BufferResolve = resolve;
                    this.BufferReject = reject;
                }
                else
                    resolve(this.Buffers.shift()!);
            })
            .finally(() => clearTimeout(TimeoutId));

            this.ReadingBuffer = new Uint8Array(buf.buffer, buf.byteOffset);
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

    SendBuf(Buf: ArrayBuffer | Uint8Array): Promise<void>
    {
        if (! TypeInfo.Assigned(this.Context))
            return Promise.reject(new ENoConnection());

        const Packet = new Uint8Array(Buf.byteLength + this.Context.Controller.byteLength);

        Packet.set(this.Context.Controller);
        Packet.set(Buf instanceof ArrayBuffer ? new Uint8Array(Buf) : Buf, this.Context.Controller.byteLength);

        return Mqtt.Publish(`${this.Context.DeviceId}`, Packet);
    }

    override error(err: any)
    {
        super.error(err);
        this._Dispose();
    }

    override complete(): void
    {
        super.complete();
        this._Dispose();
    }

    private _Dispose(err?: any): void
    {
        if (TypeInfo.Assigned(this.BufferReject))
            this.BufferReject(err);

        this.Buffers = [];
        this.Context = undefined;
        this.MqttSub = undefined;
    }

    private MqttSub?: Subscription;
    private Context? : {DeviceId: string; Controller: Uint8Array};

    private Buffers = new Array<Uint8Array>();
    private BufferResolve?: (data: Uint8Array) => void;
    private BufferReject?: (err: Error) => void;
    private ReadingBuffer?: Uint8Array;
}
