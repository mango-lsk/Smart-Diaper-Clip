import {lastValueFrom, Subject} from 'rxjs';
import {ETimedout} from '../../core/exception';
import {TSocket} from './socket';

import {DBusRegistry} from '../../dbus/registry';

class TDBusSocketTransport extends Subject<void> implements DBusRegistry.ITransport
{
    readonly Authorize = DBusRegistry.Authorize.Anonymous;

    get IsConnected(): boolean
    {
        return -1 !== this.Socket.Fd;
    }

    Connect(Address: string): Promise<void>
    {
        return this.Socket.Connect(Address)
            .catch(err =>
            {
                this.error(err);
                throw err;
            });
    }

    Close(): Promise<void>
    {
        if (-1 !== this.Socket.Fd)
        {
            this.complete();
            return this.Socket.Close().catch(err => {});
        }
        else
            return Promise.resolve();
    }

    Recv(Count: number, Timeout = -1): Promise<ArrayBuffer>
    {
        return this.Socket.WaitForReadReady(Timeout)
            .then(async ready =>
            {
                if (ready)
                    return this.Socket.Recv(Count);
                else
                    throw new ETimedout();
            })
            .catch(err =>
            {
                this.error(err);
                throw err;
            });
    }

    SendBuf(Buf: ArrayBuffer | Uint8Array): Promise<void>
    {
        return lastValueFrom(this.Socket.WriteBuf(Buf)).then(val => {})
            .catch(err =>
            {
                this.error(err);
                throw err;
            });
    }

    private Socket = new TSocket(TSocketFamily.AF_INET, TSocketType.SOCK_STREAM, 0);
}

// register transport

DBusRegistry.RegisterTransportFactory('socket', () =>
{
    return new TDBusSocketTransport();
});
