/**
 *  Native Socket(tcp/udp only) support
 *      .ultracreation-socket-plugin
 *          cordova plugin add https://github.com/ultracreation/cordova-plugin-socket.git
 *
 *  the plugin support Inet Socket Only, map socket type to 'tcp', 'udp', 'tcp_server'
 */
import {TypeInfo} from '../../core/typeinfo';
import {Exception} from '../../core/exception';
import {EStreamRead, EStreamWrite, TAsyncStream} from '../../core/stream';
import {TCordovaPlugin} from '../cordova.plugin';

import '../errno.c';

/* ESocket */

export class ESocket extends Exception
{
    constructor(Message: string, Code: number)
    {
        super(Message + ' error :' + Code);
    }
}

interface InetConsts
{
    MTU: number;
    MTU_GUARANTEE: number;

    ADDR_ANY: string;
    ADDR_LOOPBACK: string;
    ADDR_BROADCAST: string;
    ADDR_NONE: string;

    PORT_ANY: number;

    IPPROTO_TCP: number;
    IPPROTO_UDP: number;
}

const Inet: InetConsts =
{
    MTU: 16384,
    MTU_GUARANTEE: 576,

    ADDR_ANY: '0.0.0.0',
    ADDR_LOOPBACK: '127.0.0.1',
    ADDR_BROADCAST: '255.255.255.255',
    ADDR_NONE: '',

    PORT_ANY: 0,

    IPPROTO_TCP: 6,
    IPPROTO_UDP: 17
};

/*
    AUTH EXTERNAL 31303030
*/

declare global
{
    const enum TSocketFamily {AF_INET}
    const enum TSocketType {SOCK_STREAM, SOCK_DGRAM}
    const enum TSocketShutdownHow {READ, WRITE, READ_WRITE}

    const Inet: InetConsts;

    interface Window
    {
        Inet: InetConsts;
    }

    interface CordovaPlugins
    {
        Socket: typeof NativeSocket;
    }
}
window.Inet = Inet;

class NativeSocket extends TCordovaPlugin
{
    static override readonly Name: string = 'socket';
    static override readonly Repository: string = 'https://github.com/ultracreation/cordova-plugin-socket.git';

    static get errno(): number
    {
        return this.GetProperty<number>('errno');
    }

    static socket(family = TSocketFamily.AF_INET, type: TSocketType, protocol = 0): Promise<number>
    {
        let ServerType: string;

        if (protocol === Inet.IPPROTO_TCP)
            ServerType = 'tcp_server';
        else
            ServerType = ['tcp', 'udp'][type];

        return this.CallbackToPromise_LeftParam<number>('socket', ServerType).then(Id =>
        {
            if (-1 === Id)
                throw new ESocket('socket()', this.errno);
            else
                return Id;
        });
    }

    static close(fd: number): Promise<void>
    {
        return this.CallbackToPromise_LeftParam<number>('close', fd).then(async retval =>
        {
            if (-1 === retval)
                throw new ESocket('close()', this.errno);
        });
    }

    static select_readfds(fds: Array<number>, timeout: number): Promise<Array<number>>
    {
        return this.CallbackToPromise_LeftParam<number[]>('select_readfds', fds, timeout).then(async ready_fds =>
        {
            if (0 !== this.errno)
                throw new ESocket('select(read_fds)', this.errno);
            else
                return ready_fds;
        });
    }

    static getifaddrs(): Promise<{name: string; addr: string}[]>
    {
        return this.CallbackToPromise<any[]>('getifaddrs').then(async addrs =>
        {
            if (0 !== this.errno)
                throw new ESocket('getifaddrs()', this.errno);
            else
                return addrs;
        });
    }

    static getsockname(fd: number): Promise<string>
    {
        return this.CallbackToPromise_LeftParam<string>('getsockname', fd).then(async addr =>
        {
            if (0 !== this.errno)
                throw new ESocket('getsockname()', this.errno);
            else
                return addr;
        });
    }

    static getpeername(fd: number): Promise<string>
    {
        return this.CallbackToPromise_LeftParam<string>('getpeername', fd).then(async addr =>
        {
            if (0 !== this.errno)
                throw new ESocket('getpeername()', this.errno);
            else
                return addr;
        });
    }

    static shutdown(fd: number, how: TSocketShutdownHow): Promise<void>
    {
        return this.CallbackToPromise_LeftParam<number>('shutdown', fd, how).then(async retval =>
        {
            if (-1 === retval)
                throw new ESocket('shutdown()', this.errno);
        });
    }

    static bind_addr(fd: number, addr: string): Promise<void>
    {
        return this.CallbackToPromise_LeftParam<number>('bind', fd, addr).then(async retval =>
        {
            if (-1 === retval)
                throw new ESocket('bind()', this.errno);
        });
    }

    static listen(fd: number, backlog: number = 0): Promise<void>
    {
        return this.CallbackToPromise_LeftParam<number>('listen', fd, backlog).then(async retval =>
        {
            if (-1 === retval)
                throw new ESocket('listen()', this.errno);
        });
    }

    static accept(fd: number): Promise<{fd: number, RemoteAddr: string}>
    {
        return this.CallbackToPromise_LeftParam<{SocketId: number, SocketAddr: string}>('accept', fd).then(async retval =>
        {
            if (-1 !== retval.SocketId)
                throw new ESocket('accept()', this.errno);
            else
                return {fd: retval.SocketId, RemoteAddr: retval.SocketAddr};
        });
    }

    static connect(fd: number, addr: string): Promise<void>
    {
        return this.CallbackToPromise_LeftParam<number>('connect', fd, addr).then(async retval =>
        {
            if (-1 === retval)
                throw new ESocket('connect()', this.errno);
        });
    }

    static recv(fd: number, size: number): Promise<ArrayBuffer>
    {
        if (-1 === fd)
            return Promise.reject(new ESocket('recv()', CError.ENOTCONN));

        return this.CallbackToPromise_LeftParam<ArrayBuffer>('recv', fd, size).then(async retval =>
        {
            if (0 === retval.byteLength && 0 !== this.errno)
                throw new ESocket('recv()', this.errno);
            else
                return retval;
        });
    }

    static recvfrom(fd: number, size: number): Promise<{ByteBase64: string, SocketAddr: string}>
    {
        if (-1 === fd)
            return Promise.reject(new ESocket('recvfrom()', CError.ENOTCONN));

        return this.CallbackToPromise_LeftParam<{ByteBase64: string, SocketAddr: string}>('recvfrom', fd, size).then(async retval =>
        {
            if (0 !== this.errno)
                throw new ESocket('recvfrom()', this.errno);
            if (0 === retval.ByteBase64.length)
                throw new ESocket('recvfrom()', CError.ECONNABORTED);

            return retval;
        });
    }

    static send(fd: number, buf: ArrayBuffer | Uint8Array): Promise<number>
    {
        if (-1 === fd)
            return Promise.reject(new ESocket('send()', CError.ENOTCONN));

        return this.CallbackToPromise_LeftParam<number>('send', fd, this.ArrayBufferOf(buf)).then(async retval =>
        {
            if (-1 === retval)
                throw new ESocket('send()', this.errno);
            else
                return retval;
        });
    }

    static sendto(fd: number, buf: ArrayBuffer | Uint8Array, sockaddr: string): Promise<number>
    {
        if (-1 === fd)
            return Promise.reject(new ESocket('sendto()', CError.ENOTCONN));

        return this.CallbackToPromise_LeftParam<number>('sendto', fd, this.ArrayBufferOf(buf), sockaddr).then(async retval =>
        {
            if (-1 === retval)
                throw new ESocket('sendto()', this.errno);
            else
                return retval;
        });
    }

    static SetReuseAddress(fd: number, enable: boolean): Promise<void>
    {
        return this.CallbackToPromise_LeftParam<number>('setreuseraddr', fd, enable).then(async retval =>
        {
            if (-1 === retval)
                throw new ESocket('setreuseraddr()', this.errno);
        });
    }

    static SetBroadcast(fd: number, enable: boolean): Promise<void>
    {
        return this.CallbackToPromise_LeftParam<number>('setbroadcast', fd, enable).then(async retval =>
        {
            if (-1 === retval)
                throw new ESocket('setsockopt(SO_BROADCAST)', this.errno);
        });
    }

    static ArrayBufferOf(Buf: ArrayBuffer | Uint8Array): ArrayBuffer
    {
        if (Buf instanceof Uint8Array)
        {
            if (Buf.byteOffset !== 0)
            {
                const src = Buf;

                Buf = new ArrayBuffer(Buf.byteLength);
                const dst = new Uint8Array(Buf);
                dst.set(src);
            }
            else
                Buf = Buf.buffer;

            return Buf;
        }
        else
            return Buf;
    }
}
TCordovaPlugin.Register(NativeSocket, 'Socket');

/* TSocket */

export class TSocket extends TAsyncStream
{
    constructor(Family: TSocketFamily, Type: TSocketType, Protocol?: number);
    constructor();
    constructor(Family?: number, Type?: TSocketType, Protocol?: number)
    {
        super();

        if (TypeInfo.Assigned(Family))
        {
            this._Family = Family;
            this._Type = Type!;
            this._Protocol = TypeInfo.Assigned(Protocol) ? Protocol : 0;
        }
    }

    get Family(): TSocketFamily
    {
        return this._Family;
    }

    get Type(): TSocketType
    {
        return this.Type;
    }

    get Protocol(): number
    {
        return this._Protocol;
    }

    get Fd(): number
    {
        return this._Fd;
    }

    Close(): Promise<void>
    {
        if (-1 !== this._Fd)
        {
            const tmp_fd = this._Fd;
            this._Fd = -1;

            return NativeSocket.close(tmp_fd);
        }
        else
            return Promise.resolve();
    }

    Shutdown(How: TSocketShutdownHow): Promise<void>
    {
        return NativeSocket.shutdown(this._Fd, How);
    }

    async Bind(LocalAddr: string): Promise<void>
    {
        if (-1 === this._Fd)
            this._Fd = await NativeSocket.socket(this._Family, this._Type, this._Protocol);

        return NativeSocket.bind_addr(this._Fd, LocalAddr);
    }

    async BindIfaceLocalAddr(iface_type: 'wlan' | 'eth' | 'rmnet', port: number): Promise<void>
    {
        let addrs = await NativeSocket.getifaddrs();
        console.log(addrs);
        addrs = addrs.filter(addr => addr.name.includes(iface_type));
        let bind_addr = Inet.ADDR_ANY;
        if (addrs.length === 1)
            bind_addr = addrs[0].addr;
        // to do...
        console.log('bind to ' + bind_addr);
        return this.Bind(`${bind_addr}:${port}`);
    }

    Listen(BackLog: number = 0): Promise<void>
    {
        return NativeSocket.listen(this._Fd, BackLog);
    }

    Accept(): Promise<{Socket: TSocket, RemoteAddr: string}>
    {
        return NativeSocket.accept(this._Fd).then(val =>
        {
            const retval = new TSocket();

            retval._Fd = val.fd;
            retval._Family = this._Family;
            retval._Type = this._Type;
            retval._Protocol = this._Protocol;

            return {Socket: retval, RemoteAddr: val.RemoteAddr};
        });
    }

    async Connect(RemoteAddr: string): Promise<void>
    {
        if (-1 === this._Fd)
            this._Fd = await NativeSocket.socket(this._Family, this._Type, this._Protocol);

        return NativeSocket.connect(this._Fd, RemoteAddr);
    }

    WaitForReadReady(Timeout: number): Promise<boolean>
    {
        return NativeSocket.select_readfds([this._Fd], Timeout).then(ary => ary.length > 0);
    }

    Recv(Size: number): Promise<ArrayBuffer>
    {
        return NativeSocket.recv(this._Fd, Size);
    }

    RecvFrom(Size: number): Promise<{ByteBase64: string, SocketAddr: string}>
    {
        return NativeSocket.recvfrom(this._Fd, Size);
    }

    Send(Buf: ArrayBuffer | Uint8Array): Promise<number>
    {
        return NativeSocket.send(this._Fd, Buf);
    }

    SendTo(Buf: ArrayBuffer | Uint8Array, RemoteAddr: string): Promise<number>
    {
        return NativeSocket.sendto(this._Fd, Buf, RemoteAddr);
    }

    GetLocalAddr(): Promise<string>
    {
        if (-1 !== this._Fd)
            return NativeSocket.getsockname(this._Fd);
        else
            return Promise.resolve('');
    }

    GetRemoteAddr(): Promise<string>
    {
        if (-1 !== this._Fd)
            return NativeSocket.getpeername(this._Fd);
        else
            return Promise.resolve('');
    }

    SetReuseAddress(Enable: boolean): Promise<void>
    {
        return NativeSocket.SetReuseAddress(this._Fd, Enable);
    }

    SetBroadcast(Enable: boolean): Promise<void>
    {
        return NativeSocket.SetBroadcast(this._Fd, Enable);
    }

/** TAsyncStream */

    async Read(Buf: Uint8Array | ArrayBuffer, opts?: IStreamReadOptions): Promise<number>
    {
        if (-1 === this._Fd)
            return Promise.reject(new EStreamRead());

        let view: Uint8Array = Buf instanceof Uint8Array ? Buf : new Uint8Array(Buf);
        let _count = Buf.byteLength;

        if (TypeInfo.Assigned(opts))
        {
            if (TypeInfo.Assigned(opts.Count) && _count > opts.Count)
                _count = opts.Count;

            const _offset = TypeInfo.Assigned(opts.Offset) ? opts.Offset : 0;
            if (0 !== _offset || _count !== view.byteLength)
                view = new Uint8Array(view.buffer, view.byteOffset + _offset, _count);
        }
        _count = _count > view.byteLength ? view.byteLength : _count;

        if (await this.WaitForReadReady(3000))
        {
            return this.Recv(_count).then(RetVal =>
            {
                view.set(new Uint8Array(RetVal));
                return RetVal.byteLength;
            });
        }
        else
            throw new EStreamRead();
    }

    Write(Buf: Uint8Array | ArrayBuffer, opts?: IStreamWriteOptions): Promise<number>
    {
        if (-1 === this._Fd)
            return Promise.reject(new EStreamWrite());

        let view: Uint8Array = Buf instanceof Uint8Array ? Buf : new Uint8Array(Buf);
        let _count = Buf.byteLength;

        if (TypeInfo.Assigned(opts))
        {
            if (TypeInfo.Assigned(opts.Count) && _count > opts.Count)
                _count = opts.Count;

            const _offset = TypeInfo.Assigned(opts.Offset) ? opts.Offset : 0;
            if (0 !== _offset || _count !== view.byteLength)
                view = new Uint8Array(view.buffer, view.byteOffset + _offset, _count);
        }
        _count = _count > view.byteLength ? view.byteLength : _count;

        return this.Send(view);
    }

    private _Family!: TSocketFamily;
    private _Type!: TSocketType;
    private _Protocol!: number;

    private _Fd = -1;
}
