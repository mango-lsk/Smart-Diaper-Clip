import {Subject} from 'rxjs';

import {TypeInfo} from '../../core/typeinfo';
import {EAbort, ENotImplemented} from '../../core/exception';
import {TBase64Encoding} from '../../core/encoding/base64';
import {TLoopBuffer} from '../../core/loopbuffer';
import {TAsyncStream, TMemStream} from '../../core/stream';

import {TSocket} from './socket';

const DEFAULT_CONNECTION_INACTIVE_TIMEOUT = 0;  // forever
const IN_STREAM_BUFFER = 65536;

/* TSocketStream */

export abstract class TSocketStream extends TAsyncStream
{
    constructor(protected Owner: TAbstractSocket, RemoteAddr: string, ...args: any[])
    {
        super();
        this._RemoteAddr = Owner.CreateAddressing(RemoteAddr);
    }

    get RemoteAddr(): TAddressing
    {
        return this._RemoteAddr;
    }

    get LocalAddr(): TAddressing
    {
        return this.Owner.LocalAddr;
    }

    abstract get Socket(): TSocket | undefined;
    abstract get ReceiveLength(): number;

    protected _RemoteAddr: TAddressing;
}

/* TSocketConnection */

export class TSocketConnection extends TSocketStream
{
    constructor(Owner: TAbstractSocket, RemoteAddr: string, protected _Socket: TSocket, ...args: any[])
    {
        super(Owner, RemoteAddr);
        this.LastActivityTS = Date.now();
    }

    /// @protected: but call from TSocketServer/TSocketClient
    _NotificationInactiveTimeout(): Promise<void>
    {
        console.log(`Connection Timeout: ${this._RemoteAddr.SocketAddr}`);
        return this.Close();
    }

    get Socket(): TSocket
    {
        return this._Socket;
    }

    get ReceiveLength(): number
    {
        return this.InBuffer.Count;
    }

    Close(): Promise<void>
    {
        if (!TypeInfo.Assigned(this._Socket))
            return Promise.resolve();
        else if (this.Owner instanceof TSocketServer)
            return this.Owner.CloseConnection(this);
        else if (this.Owner instanceof TSocketClient)
            return this.Owner.Close();
        else
            return Promise.reject(new EAbort());
    }

    Shutdown(How: TSocketShutdownHow = TSocketShutdownHow.WRITE): Promise<void>
    {
        return this.Socket.Shutdown(How);
    }

    /** TAsyncStream */

    override Read(Buf: Uint8Array | ArrayBuffer, Offset = 0, Count?: number): Promise<number>
    {
        return Promise.resolve(this.InBuffer.ExtractTo(Buf, Count, Offset));
    }

    override Write(Buf: Uint8Array | ArrayBuffer, Offset = 0, Count?: number): Promise<number>
    {
        if (!TypeInfo.Assigned(Offset))
            Offset = 0;
        let _buf = Buf instanceof Uint8Array ? Buf : new Uint8Array(Buf);

        if (0 !== Offset)
        {
            _buf = new Uint8Array(_buf.buffer, _buf.byteOffset + Offset, Count);
            Offset = 0;
        }
        if (!TypeInfo.Assigned(Count) || Count > _buf.byteLength)
            Count = _buf.byteLength;

        if (_buf.byteOffset !== 0 || Buf.byteLength !== Count)
        {
            const View = new Uint8Array(_buf.buffer, _buf.byteOffset, Count);
            _buf = new Uint8Array(Count);
            _buf.set(View);
        }

        return this._Socket.Send(_buf.buffer)
            .then(BytesSent =>
            {
                if (BytesSent > 0)
                    this.LastActivityTS = Date.now();
                return BytesSent;
            });
    }

    override Seek(Offset: number, Origin: TSeekOrigin): number
    {
        if (Offset === 0)
        {
            switch (Origin)
            {
                case TSeekOrigin.FormBeginning:
                case TSeekOrigin.FormCurrent:
                    return 0;
                case TSeekOrigin.FromEnd:
                    return this.InBuffer.Count;
                default:
                    return 0;
            }
        }
        else
            return 0;
    }

    /** Subject */

    override next(buf: ArrayBuffer): void
    {
        // cache the buffer
        this.InBuffer.Push(new Uint8Array(buf));
        // notify Listener
        this.Owner.OnReadReady.next(this);
    }

    LastActivityTS: number;
    protected InBuffer = new TLoopBuffer(IN_STREAM_BUFFER);
}

/* TSocketDatagram */

export class TSocketDatagram extends TSocketStream
{
    constructor(Owner: TAbstractSocket, RemoteAddr: string, Buf: ArrayBuffer, ...args: any[])
    {
        super(Owner, RemoteAddr);
        this.Datagram = new TMemStream(Buf);
    }

    get Socket(): TSocket | undefined
    {
        return this.Owner.Socket;
    }

    get ReceiveLength(): number
    {
        return this.Datagram.Size;
    }

    get Buffer(): ArrayBuffer
    {
        return this.Datagram.Memory;
    }

    set Buffer(v: ArrayBuffer)
    {
        this.Datagram = new TMemStream(v);
    }

    get BufferView(): Uint8Array
    {
        return this.Datagram.MemoryView;
    }

    Read(Buf: Uint8Array | ArrayBuffer, Offset = 0, Count?: number): Promise<number>
    {
        return Promise.resolve(this.Datagram.Read(Buf, Offset, Count));
    }

    Write(Buf: Uint8Array | ArrayBuffer, Offset = 0, Count?: number): Promise<number>
    {
        return Promise.resolve(this.Datagram.Write(Buf, Offset, Count));
    }

    override Seek(Offset: number, Origin: TSeekOrigin): number
    {
        return this.Datagram.Seek(Offset, Origin);
    }

    private Datagram: TMemStream;
}

/* TAddressing */

export abstract class TAddressing
{
    abstract get SocketAddr(): string;
    abstract get IsUnaddressed(): boolean;
}

/* TSocketAddr */

export class TSocketAddr extends TAddressing
{
    constructor(protected _Addr: string)
    {
        super();
    }

    get SocketAddr(): string
    {
        return this._Addr;
    }

    get IsUnaddressed(): boolean
    {
        return this._Addr === '';
    }
}

/* TAbstractSocket */

export abstract class TAbstractSocket
{
    constructor(Addressing: TAddressing | {SocketAddr: string}, StreamClass: typeof TSocketStream)
    {
        if (Addressing instanceof TAddressing)
            this._LocalAddr = Addressing;
        else
            this._LocalAddr = new TSocketAddr(Addressing.SocketAddr);

        this._StreamClass = StreamClass;
    }

    protected static get SocketFamily(): TSocketFamily
    {
        throw new ENotImplemented();
    }

    protected static get SocketType(): TSocketType
    {
        throw new ENotImplemented();
    }

    protected static get SocketProtocol(): number
    {
        return 0;
    }

    abstract CreateAddressing(SocketAddr: string): TAddressing;

    /**
     *  @param args
     *      for TCP server/client Close has (GracefulTimeout: number) param
     *  @param GracefulTimeout
     *      when > 0 perform graceful close, hard close when countdown to 0
     *      when = 0 perform hard close
     *      when < 0 clients sockets remain connected until it close/shutdown from another side
     */
    Close(...args: any[]): Promise<void>
    {
        if (!TypeInfo.Assigned(this.Socket))
            return Promise.resolve();
        if (TypeInfo.Assigned(this.Closing))
            return this.Closing;

        this.Closing = this.CloseInheritable(...args)
            .then(() => this.Closing = undefined);

        return this.Closing;
    }

    protected CloseInheritable(...args: any[]): Promise<void>
    {
        if (TypeInfo.Assigned(this.Socket))
        {
            const tmp = this.Socket;
            this.Socket = undefined;

            return tmp.Close();
        }
        else
            return Promise.resolve();
    }

    get Active(): boolean
    {
        return TypeInfo.Assigned(this.Socket);
    }

    get LocalAddr(): TAddressing
    {
        return this._LocalAddr;
    }

    protected async CreateSocket(): Promise<void>
    {
        const Family = (this.constructor as typeof TSocketServer).SocketFamily;
        const Type = (this.constructor as typeof TSocketServer).SocketType;
        const Protocol = (this.constructor as typeof TSocketServer).SocketProtocol;

        this.Socket = new TSocket(Family, Type, Protocol);
        await this.Socket.Bind(this._LocalAddr.SocketAddr);

        // this._LocalAddr = this.CreateAddressing(await this.Socket.GetLocalAddr());
        if (this._LocalAddr.IsUnaddressed)
            this._LocalAddr = this.CreateAddressing(await this.Socket.GetLocalAddr());
    }

    Socket: TSocket | undefined;
    InactiveTimeout: number = DEFAULT_CONNECTION_INACTIVE_TIMEOUT;
    OnReadReady = new Subject<TSocketStream>();

    protected _LocalAddr: TAddressing;
    protected _StreamClass: typeof TSocketStream;
    protected Closing: Promise<void> | undefined;
}

/* TSocketServer */

export abstract class TSocketServer extends TAbstractSocket
{
    Open(): Promise<void>
    {
        if (TypeInfo.Assigned(this.Socket))
            return Promise.resolve();
        if (TypeInfo.Assigned(this.Opening))
            return this.Opening;

        this.Opening = this.CreateSocket()
            .then(async () =>
            {
                const SocketType = (this.constructor as typeof TSocketServer).SocketType;

                if (SocketType === TSocketType.SOCK_STREAM && TypeInfo.Assigned(this.Socket))
                    await this.Socket.Listen();
            })
            .then(() => this.StartMonitor())
            .then(() => {this.Opening = undefined;});

        return this.Opening;
    }

    /**
     *  @param GracefulTimeout
     *      when > 0 perform graceful close, hard close when countdown to 0
     *      when = 0 perform hard close
     *      when < 0 clients sockets remain connected until it close/shutdown from another side
     */
    protected override CloseInheritable(GracefulTimeout: number = 500): Promise<void>
    {
        console.log(`ServerSocket Closing... ${GracefulTimeout}`);

        return super.CloseInheritable()
            .then(() =>
            {
                // graceful closing
                if (GracefulTimeout > 0)
                {
                    this.Connections
                        .forEach(Conn => Conn.Shutdown(TSocketShutdownHow.WRITE).catch(err => {}));
                }

                // hard close socket when timeout
                setTimeout(() =>
                    this.Connections.forEach(Conn => Conn.Close().catch(err => {})), GracefulTimeout);

                return new Promise<void>((resolve, reject) =>
                {
                    if (this.Connections.size === 0)
                    {
                        resolve();
                        return;
                    }
                    else
                        console.log(`SocketServer Waitfor ${this.Connections.size} client connections to shutdown.`);

                    this.OnDisconnect.subscribe(Conn =>
                    {
                        if (this.Connections.size === 0)
                            resolve();
                        else
                            console.log(`SocketServer recycle client connection: ${this.Connections.size}`);
                    });
                });
            })
            .then(() => console.log('ServerSocket Closed'));
    }

    CloseConnection(Conn: TSocketConnection): Promise<void>
    {
        console.log(`Closing Connection: ${Conn.RemoteAddr.SocketAddr}`);

        if (this.Connections.delete(Conn.Socket.Fd))
        {
            return Conn.Socket.Close()
                .catch(err =>
                    console.log('%c' + err.message, 'color:red'))
                .then(() =>
                {
                    this.OnDisconnect.next(Conn);
                    Conn.complete();
                });
        }
        else
            return Promise.resolve();
    }

    protected StartMonitor(): void
    {
        const peek_fds: Array<number> = [];

        if (!TypeInfo.Assigned(this.Socket))
        {
            if (this.Connections.size === 0)
                return;
        }
        else
            peek_fds.push(this.Socket.Fd);

        this.Connections.forEach(Conn =>
        {
            if (Conn.Socket.Fd !== -1) // this may caused by call Conn.Socket.Close() directly
                peek_fds.push(Conn.Socket.Fd);
            else
                setTimeout(() => this.OnDisconnect.next(Conn));
        });

        cordova.plugin.Socket.select_readfds(peek_fds, 500)
            .then(fds =>
            {
                let FdActivity: Array<Promise<void>> = [];

                for (const fd of fds)
                {
                    if (TypeInfo.Assigned(this.Socket) && fd === this.Socket.Fd)
                        FdActivity.push(this.ServerSocketReadReady());
                    else
                        FdActivity.push(this.ServerClientSocketReadReady(fd));
                }

                let FdActivityCompleted: Promise<void>;
                if (FdActivity.length === 0)
                {
                    /** todo: action for select() timeout */
                    FdActivityCompleted = Promise.resolve();
                }
                else
                    FdActivityCompleted = Promise.all(FdActivity).then(() => {});

                FdActivityCompleted.then(() =>
                {
                    // another may push when timeout
                    FdActivity = [];

                    if (this.InactiveTimeout > 0)
                    {
                        const ActivityTS = Date.now();
                        this.Connections.forEach(Conn =>
                        {
                            if (ActivityTS - Conn.LastActivityTS > this.InactiveTimeout)
                                FdActivity.push(Conn._NotificationInactiveTimeout());
                        });
                    }

                    // loop
                    if (FdActivity.length !== 0)
                        Promise.all(FdActivity).then(all => setTimeout(() => this.StartMonitor(), 1));
                    else
                        setTimeout(() => this.StartMonitor(), 1);
                });
            })
            .catch(err =>
            {
                console.log(`%cStartMonitor error: ${err.message}`, 'color:red');
                // hard close for everything
                setTimeout(() => this.Close(0));
            });
    }

    get ConnectionCount(): number
    {
        return this.Connections.size;
    }

    protected ServerSocketReadReady(): Promise<void>
    {
        if (!TypeInfo.Assigned(this.Socket))
            return Promise.reject(new EAbort());

        const SocketType = (this.constructor as typeof TSocketServer).SocketType;

        if (SocketType === TSocketType.SOCK_STREAM)
        {
            return this.Socket.Accept()
                .then((Result: {Socket: TSocket, RemoteAddr: string}) =>
                {
                    const ConnectionType = this._StreamClass as typeof TSocketConnection;
                    const Conn = new ConnectionType(this, Result.RemoteAddr, Result.Socket);

                    this.Connections.set(Result.Socket.Fd, Conn);
                    this.OnAccept.next(Conn);
                    console.log(`Accepted Connection: ${Result.RemoteAddr}`);
                })
                .catch(err =>
                    console.log('%c' + err.message, 'color:red'));
        }
        else
        {
            return this.Socket.RecvFrom(Inet.MTU)
                .then((data: {ByteBase64: string, SocketAddr: string}) =>
                {
                    const DatagramType = this._StreamClass as typeof TSocketDatagram;
                    const Buf = TBase64Encoding.Decode(data.ByteBase64).buffer;

                    const Datagram = new DatagramType(this, data.SocketAddr, Buf as ArrayBuffer);
                    this.OnReadReady.next(Datagram);
                })
                .catch(err =>
                    console.log('%c' + err.message, 'color:red'));
        }
    }

    protected async ServerClientSocketReadReady(Fd: number): Promise<void>
    {
        const Conn = this.Connections.get(Fd);

        // this connection is not managed by us
        if (!TypeInfo.Assigned(Conn))
            return cordova.plugin.Socket.close(Fd);

        const buf = await Conn.Socket.Recv(Inet.MTU).catch(err =>
        {
            console.log(`server: ${this.LocalAddr} fd: ${Fd} ${err.message}`, 'color:red');
            return new ArrayBuffer(0);
        });

        if (buf.byteLength !== 0)
        {
            Conn.LastActivityTS = Date.now();
            return Conn.next(buf);
        }
        else
            return this.CloseConnection(Conn).catch(err => {});
    }

    Connections = new Map<number, TSocketConnection>();
    OnAccept = new Subject<TSocketConnection>();
    OnDisconnect = new Subject<TSocketConnection>();

    private Opening: Promise<void> | undefined;
}

/* TSocketClient */

export abstract class TSocketClient extends TAbstractSocket
{
    Connect(RemoteAddr: string): Promise<TSocketConnection>
    {
        if (TypeInfo.Assigned(this.Connecting))
            return this.Connecting;

        this.Connecting = this.CreateSocket()
            .then(() =>
                (this.Socket as TSocket).Connect(RemoteAddr))
            .then(() =>
            {
                const ConnectionType = this._StreamClass as typeof TSocketConnection;
                this.Connection = new ConnectionType(this, RemoteAddr, this.Socket as TSocket);
            })
            .then(() => this.StartMonitor())
            .then(() => this.Connection as TSocketConnection);

        return this.Connecting.then(Conn =>
        {
            this.Connecting = undefined;
            return Conn;
        });
    }

    protected override CloseInheritable(): Promise<void>
    {
        return super.CloseInheritable()
            .then(() =>
            {
                if (TypeInfo.Assigned(this.Connection))
                {
                    this.OnDisconnect.next(this.Connection);
                    this.Connection.complete();
                    this.Connection = undefined;
                }
            });
    }

    protected StartMonitor()
    {
        if (!TypeInfo.Assigned(this.Socket))
            return;

        this.Socket.WaitForReadReady(500).then(async ReadReady =>
        {
            let FdActivity: Promise<void> | undefined;
            if (ReadReady)
            {
                FdActivity = (this.Socket as TSocket).Recv(Inet.MTU)
                    .catch(err =>
                    {
                        console.log('%c' + err.message, 'color:red');
                        return new ArrayBuffer(0);
                    })
                    .then(buf =>
                    {
                        if (buf.byteLength !== 0)
                        {
                            (this.Connection as TSocketConnection).LastActivityTS = Date.now();
                            return (this.Connection as TSocketConnection).next(buf);
                        }
                        else
                            return this.Close();
                    })
                    .catch(err =>
                        console.log('%c' + err.message, 'color:red'));
            }
            else
                FdActivity = Promise.resolve();

            FdActivity.then(() =>
            {
                FdActivity = undefined;

                if (this.InactiveTimeout > 0)
                {
                    const Activity = Date.now();
                    if (Activity - (this.Connection as TSocketConnection).LastActivityTS > this.InactiveTimeout)
                        FdActivity = (this.Connection as TSocketConnection)._NotificationInactiveTimeout();
                }

                // loop
                if (FdActivity)
                    FdActivity.then(() => setTimeout(() => this.StartMonitor(), 50));
                else
                    setTimeout(() => this.StartMonitor(), 50);
            });
        })
            .catch(err =>
            {
                console.log(`%cStartMonitor error: ${err.message}`, 'color:red');
                // hard close for everything
                setTimeout(() => this.Close());
            });
    }

    Connection: TSocketConnection | undefined;
    OnDisconnect = new Subject<TSocketConnection>();

    private Connecting: Promise<TSocketConnection> | undefined;
}

/* Inet Addressing */

export class TInetAddr extends TAddressing
{
    constructor();
    constructor(InetAddr: {Host?: string, Port: number});
    constructor(Port: number);
    constructor(Addressing?: {Host?: string, Port: number} | number)
    {
        super();

        if (!TypeInfo.Assigned(Addressing))
        {
            this._Host = Inet.ADDR_ANY;
            this._Port = Inet.PORT_ANY;
        }
        else if (TypeInfo.IsNumber(Addressing))
        {
            this._Host = Inet.ADDR_ANY;
            this._Port = Addressing;
        }
        else
        {
            if (TypeInfo.Assigned(Addressing.Host))
                this._Host = Addressing.Host;
            else
                this._Host = Inet.ADDR_ANY;

            if (TypeInfo.Assigned(Addressing.Port))
                this._Port = Addressing.Port;
            else
                this._Port = Inet.PORT_ANY;
        }
    }

    static CreateFromSocketAddr(SocketAddr: string): TInetAddr
    {
        const Idx = SocketAddr.lastIndexOf(':');
        return new TInetAddr({Host: SocketAddr.substring(0, Idx), Port: parseInt(SocketAddr.substring(Idx + 1), 10)});
    }

    override get SocketAddr(): string
    {
        return this._Host + ':' + this._Port;
    }

    override get IsUnaddressed(): boolean
    {
        return this.SocketAddr === Inet.ADDR_NONE ||
            this.SocketAddr === ':0';
    }

    get Host(): string
    {
        return this._Host;
    }

    get Port(): number
    {
        return this._Port;
    }

    protected _Host: string;
    protected _Port: number;
}

/* TInetServer */

export abstract class TInetServer extends TSocketServer
{
    constructor(LocalAddr: {Host?: string, Port?: number}, StreamClass: typeof TSocketStream);
    constructor(LocalPort: number, StreamClass: typeof TSocketStream);
    constructor(Addressing?: any, StreamClass?: typeof TSocketStream)
    {
        super(new TInetAddr(Addressing), StreamClass as (typeof TSocketStream));
    }

    protected static override get SocketFamily(): TSocketFamily
    {
        return TSocketFamily.AF_INET;
    }

    protected override CreateSocket(): Promise<void>
    {
        return super.CreateSocket().then(() =>
        {
            const SelfType = this.constructor as typeof TInetServer;
            console.log(`${SelfType.SocketType === TSocketType.SOCK_STREAM ? 'SOCK_STREAM' : 'SOCK_DGRAM'} Server Created: ${this._LocalAddr.SocketAddr}`);
        });
    }

    override CreateAddressing(SocketAddr: string): TAddressing
    {
        return TInetAddr.CreateFromSocketAddr(SocketAddr);
    }

    override get LocalAddr(): TInetAddr
    {
        return this._LocalAddr as TInetAddr;
    }
}

/* TTcpServer */

export class TTcpServer extends TInetServer
{
    constructor(LocalAddr: {Host?: string, Port?: number}, ConnectionClass?: typeof TSocketConnection);
    constructor(LocalPort: number, ConnectionClass?: typeof TSocketConnection);
    constructor(Addressing?: {Host?: string, Port?: number} | number, ConnectionClass?: typeof TSocketConnection)
    {
        if (!TypeInfo.Assigned(ConnectionClass))
            ConnectionClass = TSocketConnection;

        super(Addressing as any, ConnectionClass);
    }

    protected static override get SocketType(): TSocketType
    {
        return TSocketType.SOCK_STREAM;
    }

    protected static override get SocketProtocol(): number
    {
        return Inet.IPPROTO_TCP;
    }
}

/* TTcpClient */

export class TTcpClient extends TSocketClient
{
    constructor(LocalAddr?: {Host?: string, Port?: number}, ConnectionClass?: typeof TSocketConnection);
    constructor(LocalPort?: number, ConnectionClass?: typeof TSocketConnection);
    constructor(Addressing?: any, ConnectionClass?: typeof TSocketConnection)
    {
        if (!TypeInfo.Assigned(ConnectionClass))
            ConnectionClass = TSocketConnection;

        super(new TInetAddr(Addressing), ConnectionClass);
    }

    protected static override get SocketFamily(): TSocketFamily
    {
        return TSocketFamily.AF_INET;
    }

    protected static override get SocketType(): TSocketType
    {
        return TSocketType.SOCK_STREAM;
    }

    override Connect(RemoteAddr: TInetAddr | string): Promise<TSocketConnection>
    {
        if (TypeInfo.IsString(RemoteAddr))
            return super.Connect(RemoteAddr);
        else
            return super.Connect(new TInetAddr(RemoteAddr).SocketAddr);
    }

    override CreateAddressing(SocketAddr: string): TAddressing
    {
        return TInetAddr.CreateFromSocketAddr(SocketAddr);
    }

    override get LocalAddr(): TInetAddr
    {
        return this._LocalAddr as TInetAddr;
    }
}

/* TUdpServer */

export class TUdpServer extends TInetServer
{
    constructor(LocalAddr: {Host?: string, Port?: number}, DatagramClass?: typeof TSocketDatagram);
    constructor(LocalPort: number, DatagramClass?: typeof TSocketDatagram);
    constructor(Addressing?: any, DatagramClass?: typeof TSocketDatagram)
    {
        if (!TypeInfo.Assigned(DatagramClass))
            DatagramClass = TSocketDatagram;

        super(Addressing, DatagramClass);
    }

    protected static override get SocketType(): TSocketType
    {
        return TSocketType.SOCK_DGRAM;
    }

    override CreateAddressing(SocketAddr: string): TAddressing
    {
        return TInetAddr.CreateFromSocketAddr(SocketAddr);
    }

    override get LocalAddr(): TInetAddr
    {
        return this._LocalAddr as TInetAddr;
    }
}

/* TUdpClient */

export class TUdpClient extends TAbstractSocket
{
    constructor(LocalAddr?: {Host?: string, Port?: number}, DatagramClass?: typeof TSocketDatagram);
    constructor(LocalPort?: number, DatagramClass?: typeof TSocketDatagram);
    constructor(Addressing?: any, DatagramClass?: typeof TSocketDatagram)
    {
        super(new TInetAddr(Addressing), TypeInfo.Assigned(DatagramClass) ? DatagramClass : TSocketDatagram);
    }

    protected static override get SocketFamily(): TSocketFamily
    {
        return TSocketFamily.AF_INET;
    }

    protected static override get SocketType(): TSocketType
    {
        return TSocketType.SOCK_DGRAM;
    }

    CreateDatagram(opts: {RemoteAddr?: string, Size?: number, DatagramClass?: typeof TSocketDatagram}): TSocketDatagram
    {
        let SocketDgramType = this._StreamClass as typeof TSocketDatagram;
        let RemoteAddr = Inet.ADDR_BROADCAST;
        let Size = Inet.MTU;

        if (TypeInfo.Assigned(opts.DatagramClass))
            SocketDgramType = opts.DatagramClass;
        if (TypeInfo.Assigned(opts.Size))
            Size = opts.Size;
        if (TypeInfo.Assigned(opts.RemoteAddr))
            RemoteAddr = opts.RemoteAddr;

        return new SocketDgramType(this, RemoteAddr, new ArrayBuffer(Size));
    }

    Broadcast(BufferOrDgram: ArrayBuffer | Uint8Array | TSocketDatagram, Port: number): Promise<number>
    {
        let Buf: ArrayBuffer;
        const RemoteAddr = new TInetAddr({Host: Inet.ADDR_BROADCAST, Port}).SocketAddr;

        if (BufferOrDgram instanceof TSocketDatagram)
        {
            const View = new Uint8Array(BufferOrDgram.Size);
            View.set(BufferOrDgram.BufferView);

            Buf = View.buffer as ArrayBuffer;
        }
        else
            Buf = cordova.plugin.Socket.ArrayBufferOf(BufferOrDgram);

        let CreatingSocket: Promise<void>;

        if (TypeInfo.Assigned(this.Socket))
            CreatingSocket = Promise.resolve();
        else
            CreatingSocket = this.CreateSocket();

        return CreatingSocket
            .then(() =>
            {
                if (this.BroadcastEnabled)
                    return Promise.resolve();
                else
                    return (this.Socket as TSocket).SetBroadcast(true).then(() => {this.BroadcastEnabled = true;});
            })
            .then(() => (this.Socket as TSocket).SendTo(Buf, RemoteAddr));
    }

    SendTo(BufferOrDgram: ArrayBuffer | Uint8Array | TSocketDatagram, RemoteAddr?: string): Promise<number>
    {
        let Buf: ArrayBuffer;

        if (BufferOrDgram instanceof TSocketDatagram)
        {
            const View = new Uint8Array(BufferOrDgram.Size);
            View.set(BufferOrDgram.BufferView);

            Buf = View.buffer as ArrayBuffer;
            if (!TypeInfo.Assigned(RemoteAddr))
                RemoteAddr = BufferOrDgram.RemoteAddr.SocketAddr;
        }
        else
            Buf = cordova.plugin.Socket.ArrayBufferOf(BufferOrDgram);

        if (!TypeInfo.Assigned(RemoteAddr))
            return Promise.reject(new Error('no RemoteAddr to SendTo()'));

        let CreatingSocket: Promise<void>;
        if (TypeInfo.Assigned(this.Socket))
            CreatingSocket = Promise.resolve();
        else
            CreatingSocket = this.CreateSocket();

        return CreatingSocket
            .then(() => (this.Socket as TSocket).SendTo(Buf, RemoteAddr as string));
    }

    override CreateAddressing(SocketAddr: string): TAddressing
    {
        return TInetAddr.CreateFromSocketAddr(SocketAddr);
    }

    protected override CreateSocket(): Promise<void>
    {
        return super.CreateSocket();
    }

    private BroadcastEnabled = false;
}

/** TUDPTranscever */

export class TUDPTranscever extends TUdpServer
{
    CreateDatagram(opts: {RemoteAddr?: string, Size?: number, DatagramClass?: typeof TSocketDatagram}): TSocketDatagram
    {
        let SocketDgramType = this._StreamClass as typeof TSocketDatagram;
        let RemoteAddr = Inet.ADDR_BROADCAST;
        let Size = Inet.MTU;

        if (TypeInfo.Assigned(opts.DatagramClass))
            SocketDgramType = opts.DatagramClass;
        if (TypeInfo.Assigned(opts.Size))
            Size = opts.Size;
        if (TypeInfo.Assigned(opts.RemoteAddr))
            RemoteAddr = opts.RemoteAddr;

        return new SocketDgramType(this, RemoteAddr, new ArrayBuffer(Size));
    }

    Broadcast(BufferOrDgram: ArrayBuffer | Uint8Array | TSocketDatagram, Port: number): Promise<number>
    {
        let Buf: ArrayBuffer;
        const RemoteAddr = new TInetAddr({Host: Inet.ADDR_BROADCAST, Port}).SocketAddr;

        if (BufferOrDgram instanceof TSocketDatagram)
        {
            const View = new Uint8Array(BufferOrDgram.Size);
            View.set(BufferOrDgram.BufferView);

            Buf = View.buffer as ArrayBuffer;
        }
        else
            Buf = cordova.plugin.Socket.ArrayBufferOf(BufferOrDgram);

        let OpeningSocket: Promise<void>;

        if (TypeInfo.Assigned(this.Socket))
            OpeningSocket = Promise.resolve();
        else
            OpeningSocket = this.Open();

        return OpeningSocket
            .then(() =>
            {
                if (!this.BroadcastEnabled)
                    return (this.Socket as TSocket).SetBroadcast(true).then(() => {this.BroadcastEnabled = true;});
                else
                    return Promise.resolve();
            })
            .then(() => (this.Socket as TSocket).SendTo(Buf, RemoteAddr));
    }

    SendTo(BufferOrDgram: ArrayBuffer | TSocketDatagram | Uint8Array, RemoteAddr?: string): Promise<number>
    {
        let Buf: ArrayBuffer;

        if (BufferOrDgram instanceof TSocketDatagram)
        {
            const View = new Uint8Array(BufferOrDgram.Size);
            View.set(BufferOrDgram.BufferView);

            Buf = View.buffer as ArrayBuffer;
            if (!TypeInfo.Assigned(RemoteAddr))
                RemoteAddr = BufferOrDgram.RemoteAddr.SocketAddr;
        }
        else
            Buf = cordova.plugin.Socket.ArrayBufferOf(BufferOrDgram);

        if (!TypeInfo.Assigned(RemoteAddr))
            return Promise.reject(new Error('no RemoteAddr to SendTo()'));

        let OpeningSocket: Promise<void>;
        if (TypeInfo.Assigned(this.Socket))
            OpeningSocket = Promise.resolve();
        else
            OpeningSocket = this.Open();

        return OpeningSocket
            .then(() => (this.Socket as TSocket).SendTo(Buf, RemoteAddr as string));
    }

    protected override CreateSocket(): Promise<void>
    {
        return super.CreateSocket();
    }

    private BroadcastEnabled = false;
}
