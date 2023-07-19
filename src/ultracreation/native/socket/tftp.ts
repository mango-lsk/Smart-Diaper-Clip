import {Subject} from 'rxjs';

import {TypeInfo} from '../../core/typeinfo';
import {EAbort, Exception} from '../../core/exception';

import {TSocket} from './socket';
import {TUtf8Encoding} from '../../core/encoding/utf8';
import {TBase64Encoding} from '../../core/encoding/base64';
import {TAsciiEncoding} from '../../core/encoding/ascii';

export class ETFtpGeneric extends Exception
{
    constructor(public code: number, message: string)
    {
        super(message);
    }
}

export class ETFtpInvalidPdu extends ETFtpGeneric
{
    constructor()
    {
        super(0x8001, 'e_tftp_invalid_pdu');
    }
}

export class ETFtpTimeout extends ETFtpGeneric
{
    constructor()
    {
        super(0x8002, 'e_tftp_timeout');
    }
}

export class ETFtpInvalidOP extends ETFtpGeneric
{
    constructor()
    {
        super(0x8003, 'e_tftp_invalid_op');
    }
}

export class ETFtpUnsupportedOP extends ETFtpGeneric
{
    constructor()
    {
        super(0x8004, 'e_tftp_unsupported_op');
    }
}

export class ETFtpInvalidMode extends ETFtpGeneric
{
    constructor()
    {
        super(0x8005, 'e_tftp_invalid_mode');
    }
}

export class ETFtpFileNotExists extends ETFtpGeneric
{
    constructor()
    {
        super(0x8006, 'e_tftp_file_not_exists');
    }
}

export class ETFTPInvalidBNumber extends ETFtpGeneric
{
    constructor()
    {
        super(0x8007, 'e_ftp_invalid_block_number');
    }
}

export namespace TFtpPdu
{
    export const CONST_HEAD_SIZE = 4;
    export const DEF_DATA_PAYLOAD = 512;
    export const DEF_MTU = DEF_DATA_PAYLOAD + CONST_HEAD_SIZE;

    export const DATA_PLAYLOAD = 8192;
    export const MTU = DATA_PLAYLOAD + CONST_HEAD_SIZE;

    export enum TFTP_OP
    {
        RRQ     = 1,
        WRQ,
        DATA,
        ACK,
        ERROR,
        OACK // tftp extension
    }

    export type TFTP_MODE = 'netascii' | 'octet';

    const TFTP_MODE_NET_ASCII = TUtf8Encoding.Encode('netascii');
    const TFTP_MODE_OCTET = TUtf8Encoding.Encode('octet');

    // TFTP 2348
    const OPT_BLKSIZE = 'blksize';

    // TFTP 2349
    // seconds to wait before retransmitting
    const OPT_TIMEOUT = 'timeout';
    const OPT_TRANSFER_SIZE = 'tsize';

    export interface IOption
    {
        blksize?: number;
        tsize?: number;
        timeout?: number;
        [idx: string]: number | undefined;
    }

    export interface IRequestPacket
    {
        OP: TFTP_OP;
        FileName: string;
        Mode: TFTP_MODE;
        OPT?: IOption;
    }

    export interface IDataPacket
    {
        OP: TFTP_OP;
        BN: number;
        Data: Uint8Array;
    }

    export interface IAckPacket
    {
        OP: TFTP_OP;
        BN: number;
    }

    export interface IErrorPacket
    {
        OP: TFTP_OP;
        code: number;
        msg: string;
    }

    export interface IOAckPacket
    {
        OP: TFTP_OP;
        OPT: IOption;
    }

    export type IPacket = IRequestPacket | IDataPacket | IAckPacket | IOAckPacket | IErrorPacket;

    export function ParsePacket(view: Uint8Array): IPacket
    {
        if (view.byteLength < CONST_HEAD_SIZE)
            throw new ETFtpInvalidPdu();

        const OP = (view[0] << 8) + view[1];
        if (OP < TFTP_OP.RRQ || OP > TFTP_OP.OACK)
            throw new ETFtpInvalidOP();

        switch (OP)
        {
        case TFTP_OP.RRQ:
        case TFTP_OP.WRQ:
            const p = ParseFileNameMode();
            return {OP, FileName: p.FileName, Mode: p.Mode};

        case TFTP_OP.ACK:
            return {OP, BN: (view[2] << 8) + view[3]};

        case TFTP_OP.DATA:
            return {OP, BN: (view[2] << 8) + view[3], Data: view.subarray(4, view.byteLength)};

        case TFTP_OP.OACK:
            return {OP, OPT: ParseOption()};

        case TFTP_OP.ERROR:
        default:
            return {OP, code: (view[2] << 8) + view[3], msg: ParseError()};
        }

        function IdxOfByteZero(offset: number, end: number = view.byteLength): number
        {
            for (let Idx = offset; Idx < end; Idx ++)
            {
                if (view[Idx] === 0)
                    return Idx;
            }
            return 0;
        }

        function ParseFileNameMode(): {FileName: string, Mode: TFTP_MODE}
        {
            const FileNameEnd = IdxOfByteZero(2);
            if (FileNameEnd === 0)
                throw new ETFtpInvalidPdu();

            const ModeEnd = IdxOfByteZero(FileNameEnd + 1);
            if (ModeEnd === 0)
                throw new ETFtpInvalidPdu();

            const Mode = TUtf8Encoding.Decode(view, FileNameEnd + 1, ModeEnd);
            switch (Mode)
            {
            case'netascii':
            case'octet':
                break;
            default:
                throw new ETFtpInvalidMode();
            }

            try
            {
                return {FileName: TUtf8Encoding.Decode(view, 2, FileNameEnd), Mode};
            }
            catch (e)
            {
                throw new ETFtpInvalidPdu();
            }
        }

        function ParseError(): string
        {
            const ErrorEnd = IdxOfByteZero(2);
            if (ErrorEnd === 0)
                throw new ETFtpInvalidPdu();

            try
            {
                return TUtf8Encoding.Decode(view, 2, ErrorEnd);
            }
            catch (e)
            {
                throw new ETFtpInvalidPdu();
            }
        }

        function ParseOption(): IOption
        {
            const Retval: IOption = {};
            const OptVals: Array<{Opt: string, Value: number}> = [];

            let Offset = 2;
            for (;;)
            {
                const OptEnd = IdxOfByteZero(Offset);
                if (OptEnd === 0)
                    break;

                const opt = TAsciiEncoding.Decode(view, Offset, OptEnd);
                Offset = OptEnd + 1;

                const ValueEnd = IdxOfByteZero(Offset);
                if (ValueEnd === 0)
                    break;

                const value = TAsciiEncoding.Decode(view, Offset, ValueEnd);
                Offset = ValueEnd + 1;

                OptVals.push({Opt: opt, Value: parseInt(value, 10)});
            }

            for (const OptVal of OptVals)
            {
                switch (OptVal.Opt)
                {
                case OPT_BLKSIZE:
                case OPT_TRANSFER_SIZE:
                    Retval.blksize = OptVal.Value;
                    break;
                case OPT_TIMEOUT:
                    Retval.timeout = OptVal.Value;
                    break;
                default:
                    break;
                }
            }

            return Retval;
        }
    }

    export function MakeRRQ(FileName: string, Mode: TFTP_MODE, Opt?: IOption): ArrayBuffer
    {
        return MakeRQ(FileName, TFTP_OP.RRQ, Mode, Opt);
    }

    export function MakeWRQ(FileName: string, Mode: TFTP_MODE, Opt?: IOption): ArrayBuffer
    {
        return MakeRQ(FileName, TFTP_OP.WRQ, Mode, Opt);
    }

    export function MakeDATA(BN: number, buf: Uint8Array, blksize: number = DEF_DATA_PAYLOAD): ArrayBuffer
    {
        let RetVal: ArrayBuffer;

        const End = BN * blksize;
        const Start = End - blksize;

        if (buf.byteLength >= End)
            RetVal = new ArrayBuffer(blksize + CONST_HEAD_SIZE);
        else
            RetVal = new ArrayBuffer(buf.byteLength % blksize + CONST_HEAD_SIZE);

        const View = new Uint8Array(RetVal);
        View[1] = TFTP_OP.DATA;

        View[2] = BN >> 8;
        View[3] = BN & 0xFF;

        const Data = new Uint8Array(buf.buffer, buf.byteOffset + Start, RetVal.byteLength - 4);
        View.set(Data, 4);

        return RetVal;
    }

    export function MakeERROR(code: number, err: string): ArrayBuffer
    {
        const e = TUtf8Encoding.Encode(err);
        const Length = 4 /* OP */ + e.byteLength + 1 /* '\0' */;

        const RetVal = new ArrayBuffer(Length);
        const View = new Uint8Array(RetVal);

        View[1] = TFTP_OP.ERROR;

        View[2] = code >> 8;
        View[3] = code & 0xFF;

        View.set(e, 4);
        return RetVal;
    }

    export function MakeACK(BN: number): ArrayBuffer
    {
        const RetVal = new ArrayBuffer(4);
        const View =  new Uint8Array(RetVal);
        View[1] = TFTP_OP.ACK;

        View[2] = BN >> 8;
        View[3] = BN & 0xFF;

        return RetVal;
    }

    function MakeRQ(FileName: string, OP: TFTP_OP, Mode: TFTP_MODE, Opt?: IOption): ArrayBuffer
    {
        let M: Uint8Array;
        switch (Mode)
        {
        case'netascii':
            M = TFTP_MODE_NET_ASCII;
            break;

        case'octet':
        default:
            M = TFTP_MODE_OCTET;
            break;
        }

        const F = TUtf8Encoding.Encode(FileName);
        const Length = 2 /* OP */ + F.byteLength + 1 /* '\0' */ + M.byteLength + 1;

        let OptLength = 0;
        if (TypeInfo.Assigned(Opt))
        {
            for (const Key of Object.keys(Opt))
            {
                const Val = Opt[Key];
                if (TypeInfo.Assigned(Val))
                    OptLength += TAsciiEncoding.Encode(Key).byteLength + 1 +
                        TAsciiEncoding.Encode(Val.toString()).byteLength + 1;
            }
        }

        const RetVal = new ArrayBuffer(Length + OptLength);
        const View = new Uint8Array(RetVal);

        let Offset = 1;
        View[Offset] = OP;
        Offset += 1;

        View.set(F, Offset);
        Offset += F.byteLength + 1;

        View.set(M, Offset);
        Offset += M.byteLength + 1;

        if (TypeInfo.Assigned(Opt))
        {
            for (const Key of Object.keys(Opt))
            {
                const Val = Opt[Key];
                if (TypeInfo.Assigned(Val))
                {
                    const EncodeOpt = TAsciiEncoding.Encode(Key);
                    const EncodeVal = TAsciiEncoding.Encode(Val.toString());

                    View.set(EncodeOpt, Offset);
                    Offset += EncodeOpt.byteLength + 1;

                    View.set(EncodeVal, Offset);
                    Offset += EncodeVal.byteLength + 1;
                }
            }
        }

        return RetVal;
    }
}

/** TFtp */

export abstract class TFtp
{
    static CreateServer(Port = 69): TFtp.Server
    {
        return TFtpServer.GetInstance(Port);
    }

    static CreateClient(Host: string, Port = 69): TFtp.Client
    {
        return new TFtpClient(Host, Port);
    }

    abstract Startup(): Promise<void>;

    Shutdown(): void
    {
        const Values = this.Sessions.values();

        for (let iter = Values.next(); ! iter.done; iter = Values.next())
            iter.value.Abort();
    }

    protected Sessions = new Map<string, TFtpSession>();
}

export namespace TFtp
{
    export let TIMEOUT = 2500;
    export let RESEND_COUNT = 5;

    export interface Server
    {
        Startup(): Promise<void>;
        Shutdown(): void;

        AddFile(FileName: string, Buf: Uint8Array | ArrayBuffer): void;
    }

    /** Client */

    export interface Client
    {
        Startup(): Promise<void>;
        Shutdown(): void;

        Get(FileName: string): Promise<TFtpSession>;
        Put(FileName: string, FileBuf: Uint8Array | ArrayBuffer): Promise<TFtpSession>;
    }
}

/** TFtpSession */

@TypeInfo.Sealed()
export class TFtpSession extends Subject<any>
{
    BlkSize = TFtpPdu.DEF_DATA_PAYLOAD;

    static MaxQueueSize = 3;

    constructor(public Socket: TSocket, public RemoteAddr: string, private OnDispose: (Session: TFtpSession) => void)
    {
        super();
    }

    Abort(): void
    {
        this.error(new EAbort());
    }

    StartSendFile(FileBuf: Uint8Array): void
    {
        this.SendBuf = FileBuf;
        this.ReceiveBN = 0;
        this.SendBN = 0;
        this.ResendBN = 0;
        this.TransmitAborted = false;
        this.TransmitCount = 0;

        this.StartTS = Date.now();
        this.LastSentTS = 0;

        console.log('StartSendFile count: ' + Math.round(this.SendBuf.byteLength / this.BlkSize));
        this.LoopTransmit();
    }

    Handle(Packet: any /* TFtpPdu.IAckPacket | TFtpPdu.IDataPacket | TFtpPdu.IErrorPacket */): void
    {
        if (Packet.OP === TFtpPdu.TFTP_OP.ERROR)
        {
            const err = new ETFtpGeneric((Packet as TFtpPdu.IErrorPacket).code,
                (Packet as TFtpPdu.IErrorPacket).msg);

            this.error(err);
            throw err;
        }

        const ReceivingBN = this.ReceiveBN + 1;

        /* transmit request */
        if (TypeInfo.Assigned(this.SendBuf))
        {
            // expect ACK
            if (Packet.OP === TFtpPdu.TFTP_OP.DATA)
                throw new ETFtpInvalidOP();

            if ((Packet as TFtpPdu.IAckPacket).BN < this.ReceiveBN)
            {
                console.log('ignore BN: ' + (Packet as TFtpPdu.IAckPacket).BN + ' As received: ' + this.ReceiveBN);
                return;
            }

            this.ReceiveBN = (Packet as TFtpPdu.IAckPacket).BN;
            if (this.ReceiveBN === this.ResendBN)
                this.ResendBN = 0;

            if (this.ReceiveBN === ReceivingBN)
            {
                const BytesSent = this.ReceiveBN * this.BlkSize;
                if (BytesSent <= this.SendBuf.byteLength)
                {
                    // console.log('diff: ' + (Date.now()- this.WaitingBNQ[0].TS));
                    this.next(BytesSent);
                }
                else
                {
                    console.log('sent: ' + this.SendBuf.byteLength + ' time: ' + (Date.now() - this.StartTS) + 'ms');
                    this.TransmitAborted = true;
                    this.complete();
                }

                if (this.ReceiveBN % 200 === 0)
                    console.log('sent: ' + this.ReceiveBN + ' time: ' +
                        (Date.now() - this.StartTS) + 'ms');
            }
            else if (this.ReceiveBN < ReceivingBN)
            {
                // nothing to do?
                console.log('Waiting:' + ReceivingBN + ' Received:' + this.ReceiveBN);
                this.ResendBN = this.ReceiveBN + 1;
            }
            else
            {
                console.log('Waiting:' + ReceivingBN + ' Received:' + this.ReceiveBN);
                // throw new ETFTPInvalidBNumber();
            }
        }
        /* receive request */
        else
        {
            if (Packet.OP !== TFtpPdu.TFTP_OP.DATA && Packet.OP !== TFtpPdu.TFTP_OP.OACK)
            {
                // Nothing to do
                console.log(Packet);
                throw new ETFtpUnsupportedOP();
            }

            if (Packet.OP === TFtpPdu.TFTP_OP.DATA)
                this.ReceiveBN = (Packet as TFtpPdu.IDataPacket).BN;
            else
                this.StartTS = Date.now();

            const ack = TFtpPdu.MakeACK(this.ReceiveBN);
            this.Socket.SendTo(ack, this.RemoteAddr);

            if (this.ReceiveBN === ReceivingBN)
                this.next((Packet as TFtpPdu.IDataPacket).Data);
            else if (this.ReceiveBN !== 0)
                console.log('re-receive BN: ' + this.ReceiveBN);

            if (this.ReceiveBN !== 0 && this.ReceiveBN % 200 === 0)
                console.log('received: ' + this.ReceiveBN + ' time: ' + (Date.now() - this.StartTS) + 'ms');

            if (Packet.OP === TFtpPdu.TFTP_OP.DATA && (Packet as TFtpPdu.IDataPacket).Data.length < this.BlkSize)
            {
                console.log('received: ' + (this.ReceiveBN * this.BlkSize) +
                    ' time: ' + (Date.now() - this.StartTS) + 'ms');
                this.complete();
            }
        }
    }

    override complete(): void
    {
        this.Dispose();
        return super.complete();
    }

    override error(err: any): void
    {
        this.Dispose();
        super.error(err);
    }

    private Dispose(): void
    {
        this.TransmitAborted = true;

        if (TypeInfo.Assigned(this.TransmitTimeoutId))
        {
            clearTimeout(this.TransmitTimeoutId);
            this.TransmitTimeoutId = undefined;
        }

        if (TypeInfo.Assigned(this.OnDispose))
            this.OnDispose(this);
    }

    private LoopTransmit()
    {
        if (this.TransmitAborted)
            return;

        if (this.ResendBN !== 0)
        {
        }
        else if ((this.SendBN - this.ReceiveBN) >= TFtpSession.MaxQueueSize)
        {
            if ((Date.now() - this.LastSentTS) < TFtp.TIMEOUT)
            {
                setTimeout(() => this.LoopTransmit(), 2);
                return;
            }
            else
            {
                console.log('No ack as waited ' + TFtp.TIMEOUT + 'ms');
                this.ResendBN = this.ReceiveBN + 1;
            }
        }
        else if (TypeInfo.Assigned(this.SendBuf) && this.SendBN * this.BlkSize < this.SendBuf.length)
        {
            this.SendBN++;
            this.TransmitCount = 1;
        }

        if (this.ResendBN !== 0)
        {
            if (this.TransmitCount > 1 && (Date.now() - this.LastSentTS) < TFtp.TIMEOUT)
            {
                setTimeout(() => this.LoopTransmit(), 10);
                return;
            }

            if (this.TransmitCount < TFtp.RESEND_COUNT)
            {
                this.TransmitCount ++;
                this.SendBN = this.ResendBN;
                console.log('re-sent: ' + this.SendBN);
            }
            else
            {
                const err = new ETFtpTimeout();
                this.error(err);
                throw err;
            }
        }

        this.LastSentTS = Date.now();
        this.Transmit(this.SendBN);

        this.TransmitTimeoutId = setTimeout(() => this.LoopTransmit());
    }

    private Transmit(BN: number): void
    {
        const buf = TFtpPdu.MakeDATA(BN, this.SendBuf as Uint8Array, this.BlkSize);
        this.Socket.SendTo(buf, this.RemoteAddr);
    }

    protected ReceiveBN = 0;
    protected SendBN = 0;
    protected ResendBN = 0;

    private StartTS = 0;
    private LastSentTS = 0;
    private TransmitCount = 0;
    private TransmitAborted = true;
    private TransmitTimeoutId?: timeout_t;

    private SendBuf?: Uint8Array;
}

/*
interface IPduInfo
{
    BN: number;
    TransmitCount: number;
    TS: number;
}
*/

/** TFtpServer */
// As extend TFTP option, to do...
@TypeInfo.Sealed()
export class TFtpServer extends TFtp implements TFtp.Server
{
    static GetInstance(Port: number): TFtpServer
    {
        let Inst = this.Instances.get(Port);
        if (! TypeInfo.Assigned(Inst))
        {
            Inst = new TFtpServer(Port);
            this.Instances.set(Port, Inst);
        }

        return Inst;
    }

    private static Instances = new Map<number, TFtpServer>();

    private constructor(public Port: number)
    {
        super();
    }

    override Shutdown(): void
    {
        super.Shutdown();

        if (TypeInfo.Assigned(this.ServiceSocket))
        {
            this.ServiceSocket.Close().catch(err => console.log(err));
            this.ServiceSocket = undefined;
            (this.constructor as typeof TFtpServer).Instances.delete(this.Port);
        }
        console.log('Server.Shutdown(' + this.Port + ')');
    }

    AddFile(FileName: string, Buf: Uint8Array | ArrayBuffer): void
    {
        if (Buf instanceof ArrayBuffer)
            Buf = new Uint8Array(Buf);

        this.Files.set(FileName, Buf as Uint8Array);
    }

    override async Startup(): Promise<void>
    {
        console.log('Server.Listen(' + this.Port + ')');
        // create service
        this.ServiceSocket = new TSocket(TSocketFamily.AF_INET, TSocketType.SOCK_DGRAM, 0);
        await this.ServiceSocket.Bind(`${Inet.ADDR_ANY}:${this.Port}`);

        this.ServiceLoop()
            .catch(err => console.log('%c' + err.message, 'color:red'))
            .then(() => this.Shutdown());
    }

    private async ServiceLoop(): Promise<void>
    {
        while (TypeInfo.Assigned(this.ServiceSocket))
        {
            const req = await this.ServiceSocket.RecvFrom(TFtpPdu.DEF_MTU);
            let Session = this.Sessions.get(req.SocketAddr);
            try
            {
                const packet = TFtpPdu.ParsePacket(TBase64Encoding.Decode(req.ByteBase64));

                switch (packet.OP)
                {
                case TFtpPdu.TFTP_OP.RRQ:
                    if (TypeInfo.Assigned(Session))
                        throw new ETFtpInvalidOP();

                    const FileBuf = this.Files.get((packet as TFtpPdu.IRequestPacket).FileName);
                    if (! TypeInfo.Assigned(FileBuf))
                        throw new ETFtpFileNotExists();

                    Session = new TFtpSession(this.ServiceSocket, req.SocketAddr,
                        _Session => this.OnSessionDispose(_Session));
                    Session.StartSendFile(FileBuf);

                    this.Sessions.set(req.SocketAddr, Session);
                    break;

                case TFtpPdu.TFTP_OP.WRQ:
                    if (TypeInfo.Assigned(Session))
                        throw new ETFtpInvalidOP();

                    Session = new TFtpSession(this.ServiceSocket, req.SocketAddr,
                        _Session => this.OnSessionDispose(_Session));
                    this.Sessions.set(req.SocketAddr, Session);
                    break;

                case TFtpPdu.TFTP_OP.ACK:
                case TFtpPdu.TFTP_OP.DATA:
                case TFtpPdu.TFTP_OP.ERROR:
                    if (! TypeInfo.Assigned(Session))
                        throw new ETFtpInvalidOP();

                    Session.Handle(packet as any);
                    break;
                }
            }
            catch (e)
            {
                if (TypeInfo.Assigned(Session))
                    Session.error(e);

                if (e instanceof ETFtpGeneric)
                {
                    await this.ServiceSocket.SendTo(TFtpPdu.MakeERROR(e.code, e.message), req.SocketAddr);
                    continue;
                }
                else
                    throw e;
            }
        }
    }

    private OnSessionDispose(Session: TFtpSession)
    {
        this.Sessions.delete(Session.RemoteAddr);
    }

    private ServiceSocket: TSocket | undefined;
    private Files = new Map<string, Uint8Array>();
}

/** TFtpClient */

@TypeInfo.Sealed()
export class TFtpClient extends TFtp implements TFtp.Client
{
    constructor(public Host: string, public Port = 69)
    {
        super();
    }

    Startup(): Promise<void>
    {
        return Promise.resolve();
    }

    override Shutdown(): void
    {
    }

    async Get(FileName: string): Promise<TFtpSession>
    {
        const Socket = new TSocket(TSocketFamily.AF_INET, TSocketType.SOCK_DGRAM, 0);
        await Socket.Bind(`${Inet.ADDR_ANY}:${Inet.PORT_ANY}`);
        const LocalAddr = await Socket.GetLocalAddr();

        const Session = new TFtpSession(Socket, this.Host + ':' + this.Port.toString(10),
            () =>
            {
                Socket.Close();
                this.Sessions.delete(LocalAddr);
            });
        this.Sessions.set(LocalAddr, Session);

        try
        {
            const RRQ = TFtpPdu.MakeRRQ(FileName, 'octet', {blksize: TFtpPdu.DATA_PLAYLOAD});

            let ack = false;
            for (let i = 0; i < 3; i++)
            {
                await Socket.SendTo(RRQ, Session.RemoteAddr);

                if (await Socket.WaitForReadReady(5000))
                {
                    ack = true;
                    break;
                }
            }
            if (! ack)
                throw new ETFtpTimeout();

            const rsp = await Socket.RecvFrom(TFtpPdu.MTU);
            const packet = TFtpPdu.ParsePacket(TBase64Encoding.Decode(rsp.ByteBase64));
            console.log(packet);

            if (packet.OP === TFtpPdu.TFTP_OP.DATA || packet.OP === TFtpPdu.TFTP_OP.OACK ||
                packet.OP === TFtpPdu.TFTP_OP.ERROR)
            {
                if (packet.OP === TFtpPdu.TFTP_OP.OACK && TypeInfo.IsNumber((packet as TFtpPdu.IOAckPacket).OPT.blksize))
                    Session.BlkSize = (packet as TFtpPdu.IOAckPacket).OPT.blksize as number;
                else if (packet.OP === TFtpPdu.TFTP_OP.DATA)
                    Session.BlkSize = TFtpPdu.DATA_PLAYLOAD;

                Session.RemoteAddr = rsp.SocketAddr;
                Session.Handle(packet);
            }
            else
                throw new ETFtpInvalidOP();
        }
        catch (e)
        {
            Session.error(e);
            return Session;
        }

        this.SessionLoop(Session)
            .catch(err => console.log('%c' + err.message, 'color:red'));

        return Session;
    }

    async Put(FileName: string, FileBuf: Uint8Array | ArrayBuffer): Promise<TFtpSession>
    {
        if (FileBuf instanceof ArrayBuffer)
            FileBuf = new Uint8Array(FileBuf);

        const Socket = new TSocket(TSocketFamily.AF_INET, TSocketType.SOCK_DGRAM, 0);
        await Socket.Bind(`${Inet.ADDR_ANY}:${Inet.PORT_ANY}`);
        const LocalAddr = await Socket.GetLocalAddr();

        const Session = new TFtpSession(Socket, this.Host + ':' + this.Port.toString(10),
            () =>
            {
                Socket.Close();
                this.Sessions.delete(LocalAddr);
            });
        this.Sessions.set(LocalAddr, Session);

        try
        {
            const WRQ = TFtpPdu.MakeWRQ(FileName, 'octet', {blksize: TFtpPdu.DATA_PLAYLOAD});

            let ack = false;
            for (let i = 0; i < 3; i ++)
            {
                await Socket.SendTo(WRQ, Session.RemoteAddr);

                if (await Socket.WaitForReadReady(5000))
                {
                    ack = true;
                    break;
                }
            }
            if (! ack)
                throw new ETFtpTimeout();

            const rsp = await Socket.RecvFrom(TFtpPdu.MTU);
            const packet = TFtpPdu.ParsePacket(TBase64Encoding.Decode(rsp.ByteBase64));
            console.log(packet);

            if (packet.OP === TFtpPdu.TFTP_OP.ERROR)
                throw new ETFtpGeneric((packet as TFtpPdu.IErrorPacket).code, (packet as TFtpPdu.IErrorPacket).msg);

            if ((packet.OP !== TFtpPdu.TFTP_OP.ACK && packet.OP !== TFtpPdu.TFTP_OP.OACK) ||
                (packet.OP === TFtpPdu.TFTP_OP.ACK && (packet as TFtpPdu.IAckPacket).BN !== 0))
                throw new ETFtpInvalidOP();

            if (packet.OP === TFtpPdu.TFTP_OP.OACK && TypeInfo.IsNumber((packet as TFtpPdu.IOAckPacket).OPT.blksize))
                Session.BlkSize = (packet as TFtpPdu.IOAckPacket).OPT.blksize as number;

            console.log('negotiated transfer block size: ' + Session.BlkSize);

            Session.RemoteAddr = rsp.SocketAddr;
            Session.StartSendFile(FileBuf as Uint8Array);
        }
        catch (e)
        {
            console.error(e);
            Session.error(e);
            return Session;
        }

        this.SessionLoop(Session)
            .catch(err => console.log('%c' + err.message, 'color:red'));

        return Session;
    }

    protected async SessionLoop(Session: TFtpSession): Promise<void>
    {
        while (! Session.isStopped)
        {
            if (! (await Session.Socket.WaitForReadReady(5000)))
                throw new ETFtpTimeout();

            const rsp = await Session.Socket.RecvFrom(Session.BlkSize + TFtpPdu.CONST_HEAD_SIZE);
            try
            {
                const packet = TFtpPdu.ParsePacket(TBase64Encoding.Decode(rsp.ByteBase64));

                switch (packet.OP)
                {
                case TFtpPdu.TFTP_OP.ACK:
                case TFtpPdu.TFTP_OP.DATA:
                case TFtpPdu.TFTP_OP.ERROR:
                    Session.Handle(packet as any);
                    break;

                /* case TFtpPdu.TFTP_OP.RRQ:
                case TFtpPdu.TFTP_OP.WRQ:
                */
                default:
                    throw new ETFtpInvalidOP();
                }
            }
            catch (e)
            {
                Session.error(e);

                if (e instanceof ETFtpGeneric)
                {
                    await Session.Socket.SendTo(TFtpPdu.MakeERROR(e.code, e.message), rsp.SocketAddr);
                    continue;
                }
                else
                    throw e;
            }
        }
    }
}
