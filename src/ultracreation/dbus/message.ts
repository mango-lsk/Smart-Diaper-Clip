/**
 *  DBus protocol: Message
 *      https://dbus.freedesktop.org/doc/dbus-specification.html
 */
import {TypeInfo} from '../core/typeinfo';
import {TMemStream, EStreamRead} from '../core/stream';
import {Endianness} from '../core/endian';
import {TUtf8Encoding} from '../core/encoding/utf8';

import {DBusError} from './error';
import {DBusType} from './registry';

// DBusMessage used consts
// c libdbus-1-dev's major protocol version, this is only protocol version for now
const MAJOR_PROTOCOL_VERSION = 1;

// DBus message flags
const enum Flags
{
    NOREPLY_EXPECTED = 0x01,
    NO_AUTO_START = 0x02,
    ALLOW_INTERACTIVE_AUTHORIZATION = 0x04,
}

// DBus message data alignment padding up to 7 bytes
const Padding = new Uint8Array(8);

// DBus message header fileds
const enum Header
{
    INVALID                         = 0,
    OBJECT_PATH,                    // of DBusType.OBJECT_PATH
    INTERFACE,                      // of DBusType.STRING
    MEMBER,                         // of DBusType.STRING
    ERROR_NAME,                     // of DBusType.STRING
    REPLY_SERIAL,                   // of DBusType.UINT32
    DESTINATION,                    // of DBusType.STRING
    SENDER,                         // of DBusType.STRING
    SIGNATURE,                      // of DBusType.SIGNATURE
    UNIX_FDS                        // of DBusType.INT32
}

export namespace TDBusMessage
{
    export const enum Type
    {
        INVALID                     = 0,
        METHOD_CALL,
        METHOD_RETURN,
        ERROR,
        SIGNAL
    }
}

export class TDBusMessage
{
    /// parse dbus message from buffer
    constructor(buf: Uint8Array);
    /// dbus_message_new_method_call()
    constructor(type: TDBusMessage.Type.METHOD_CALL, destination: string, objectpath: DBusObjectPath, intf: string, method: string);
    /// dbus_message_new_method_return()
    constructor(type: TDBusMessage.Type.METHOD_RETURN, method_call: TDBusMessage);
    /// dbus_message_new_signal()
    constructor(type: TDBusMessage.Type.SIGNAL, objectpath: DBusObjectPath, intf: string, method: string);
    /// dbus_message_new_error()
    constructor(type: TDBusMessage.Type.ERROR, ReplyTo: TDBusMessage, error_name: string, error_message: string);
    /// dbus any type of message
    constructor(TypeOrBuf: TDBusMessage.Type | Uint8Array, ...args: any[])
    {
        if (TypeOrBuf instanceof Uint8Array)
        {
            if (MAJOR_PROTOCOL_VERSION !== TypeOrBuf[3])
                throw new DBusError.EInvalidPacket(`unsupported protocol version: ${TypeOrBuf[3]}`);
            if (TypeOrBuf[1] < TDBusMessage.Type.METHOD_CALL || TypeOrBuf[1] > TDBusMessage.Type.SIGNAL)
                throw new DBusError.EInvalidPacket(`unknown message type: ${TypeOrBuf[1]}`);

            const buf = new TMemStream(TypeOrBuf, true);
            this.Type = TypeOrBuf[1];
            this.IsNoReplyExpected = Flags.NOREPLY_EXPECTED === TypeOrBuf[2];

            switch (String.fromCharCode(TypeOrBuf[0]))
            {
            case 'l':
                this.Endian = buf.Endian = Endianness.LITTLE_ENDIAN;
                break;
            case 'B':
                this.Endian = buf.Endian = Endianness.BIG_ENDIAN;
                break;
            default:
                throw new DBusError.EInvalidPacket(`unknown endian value ${TypeOrBuf[0]} '${String.fromCharCode(TypeOrBuf[0])}'`);
            }

            // seek to SN
            buf.Seek(8, TSeekOrigin.FormBeginning);
            // read SN
            this.SN = DBusReader.Get(buf, 'u');
            if (0 === this.SN)
                console.log(`%cDBusMessage: SN is zero`, 'color:red');

            try
            {
                const ary = DBusReader.Get(buf, 'a(yv)');

                let err: string | undefined;

                for (const iter of ary)
                {
                    switch (iter[0])
                    {
                    case Header.OBJECT_PATH:
                        this.ObjectPath = iter[1].Value;
                        break;
                    case Header.INTERFACE:
                        this.Interface = iter[1].Value;
                        break;
                    case Header.MEMBER:
                        this.Member = iter[1].Value;
                        break;
                    case Header.ERROR_NAME:
                        err = iter[1].Value;
                        break;
                    case Header.DESTINATION:
                        this.Destination = iter[1].Value;
                        break;
                    case Header.SENDER:
                        this.Sender = iter[1].Value;
                        break;

                    case Header.SIGNATURE:
                        this._Signature = iter[1].Value;
                        break;
                    case Header.REPLY_SERIAL:
                        this.Reply = {SN: iter[1].Value};
                        break;

                    case Header.UNIX_FDS:
                        /// what we need unix fd for?
                        break;
                    }
                }
                DBusReader.AlignTo(buf, 8);
                this.Content = new TMemStream(new Uint8Array(TypeOrBuf.buffer, buf.Position));
                this.Content.Endian = this.Endian;

                if (TypeInfo.Assigned(err))
                {
                    if (TypeInfo.Assigned(this.Reply))
                        this.Reply.ErrorName = err;
                    else
                        console.log(`%cDBusMessage: error no have reply SN`, 'color:red');
                }
            }
            catch (e)
            {
                const msg: string = e instanceof Error ?  e.message : (e as any).toString();
                console.log(`%cDBusMessage: head fields Unmarshalling() error: ${msg}`, 'color:red');

                if (e instanceof EStreamRead)
                    throw new DBusError.EInvalidPacket('invalid packet length');
                else
                    throw e;
            }
        }
        else
        {
            this.Endian = Endianness.HOST_ENDIAN;
            this.IsNoReplyExpected = false;
            this.Type = TypeOrBuf;

            switch (TypeOrBuf)
            {
            case TDBusMessage.Type.METHOD_CALL:
                this.Destination = args[0];
                this.ObjectPath = args[1];
                this.Interface = args[2];
                this.Member = args[3];
                break;

            case TDBusMessage.Type.SIGNAL:
                this.ObjectPath = args[0];
                this.Interface = args[1];
                this.Member = args[2];
                break;

            // METHOD_RETURN or ERROR
            default:
                const ReplyTo = args[0] as TDBusMessage;

                if (TDBusMessage.Type.METHOD_RETURN === TypeOrBuf)
                    this.Reply = {SN: ReplyTo.SN!};
                else if (TDBusMessage.Type.ERROR === TypeOrBuf)
                    this.Reply = {SN: ReplyTo.SN!, ErrorName: args[1], ErrorMessage: args[2]};

                this.ObjectPath = ReplyTo.ObjectPath;
                this.Interface = ReplyTo.Interface;
                this.Member = ReplyTo.Member;

                // exchange sender & destination
                this.Destination = ReplyTo.Sender;
                this.Sender = ReplyTo.Destination;
                break;
            }
        }
    }

    Append(Signatures: DBusSignature, ...args: any[]): void
    {
        if (! TypeInfo.Assigned(this.Content))
            this.Content = new TMemStream(512, true);

        const Position = this.Content.Position;
        try
        {
            DBusWriter.Append(this.Content, Signatures, ...args);

            if (TypeInfo.Assigned(this._Signature))
                this._Signature += Signatures;
            else
                this._Signature = Signatures;
        }
        catch (e)
        {
            // rollback
            this.Content.Position = Position;
            throw e;
        }
    }

    Parse(ExpectSignature?: DBusSignature): any | undefined
    {
        if (TypeInfo.Assigned(this._Signature) && TypeInfo.Assigned(this.Content))
        {
            if (TypeInfo.Assigned(ExpectSignature) && ExpectSignature !== this._Signature)
            {
                console.log(`%c${this.Origin?.Interface}.${this.Origin?.Member}(): Signature '${ExpectSignature}' is Obsoleted by '${this._Signature}'`, 'color:red');
                throw new DBusError.EInvalidSignature();
            }

            const Position = this.Content.Position;
            this.Content.Position = 0;

            const RetVal = DBusReader.Get(this.Content, this._Signature);
            this.Content.Position = Position;

            return RetVal;
        }
        else
            return undefined;
    }

    GetBuffer(): ArrayBuffer
    {
        // no AutoGrow? assume this is incoming buffer
        if (TypeInfo.Assigned(this.Content) && ! this.Content.AutoGrow)
            return this.Content.Memory;

        const header_fields = new Array<Array<any>>();

        if (TypeInfo.Assigned(this.ObjectPath))
            header_fields.push([Header.OBJECT_PATH, {Type: DBusType.OBJECT_PATH, Value: this.ObjectPath}]);
        if (TypeInfo.Assigned(this.Destination))
            header_fields.push([Header.DESTINATION, {Type: DBusType.STRING, Value: this.Destination}]);
        if (TypeInfo.Assigned(this.Interface))
            header_fields.push([Header.INTERFACE, {Type: DBusType.STRING, Value: this.Interface}]);
        if (TypeInfo.Assigned(this.Member))
            header_fields.push([Header.MEMBER, {Type: DBusType.STRING, Value: this.Member}]);

        if (TypeInfo.Assigned(this.Reply))
        {
            if (TypeInfo.Assigned(this.Reply.ErrorName))
                header_fields.push([Header.ERROR_NAME, {Type: DBusType.STRING, Value: this.Reply.ErrorName}]);

            header_fields.push([Header.REPLY_SERIAL, {Type: DBusType.STRING, Value: this.Reply.SN}]);
        }
        if (TypeInfo.Assigned(this.Sender))
            header_fields.push([Header.SENDER, {Type: DBusType.STRING, Value: this.Sender}]);
        if (TypeInfo.Assigned(this._Signature))
            header_fields.push([Header.SIGNATURE, {Type: DBusType.SIGNATURE, Value: this._Signature}]);

        const buf = new TMemStream(512, true);

        DBusWriter.Append(buf, 'yyyyuu',
            Endianness.HOST_ENDIAN === Endianness.LITTLE_ENDIAN ? 'l'.charCodeAt(0) : 'B'.charCodeAt(0),
            this.Type,
            0,  // flags
            MAJOR_PROTOCOL_VERSION,
            0,  // temporary set content length to 0
            this.SN,  // temporary set SN to 0
        );

        // attach header fields
        DBusWriter.Append(buf, 'a(yv)', header_fields);
        // head align to 8
        DBusWriter.PaddingTo(buf, 8);

        if (TypeInfo.Assigned(this.Content))
        {
            buf.WriteBuf(this.Content.MemoryView, {Count: this.Content.Size});

            buf.Seek(4, TSeekOrigin.FormBeginning);
            buf.WriteUint(this.Content.Size, 4);
        }

        return buf.ShrinkMemory();
    }

    readonly Endian: Endianness.TEndian;
    readonly Type: TDBusMessage.Type;
    readonly IsNoReplyExpected: boolean;

    readonly ObjectPath!: DBusObjectPath;
    readonly Interface!: string;
    readonly Destination?: string;
    readonly Member! :string;

    get Signature(): DBusSignature | undefined
    {
        return this._Signature;
    }

    Origin?: TDBusMessage;          // only validate when this message is METHOD_RETURN or ERROR
    SN!: number;                    // incoming message or assign by MessageBus
    Sender?: string;                // incoming message or assign by MessageBus
    Reply?: {SN: number, ErrorName?: string, ErrorMessage?: string};

    private _Signature?: DBusSignature;
    private Content?: TMemStream;
}

export namespace TDBusMessage
{
    export const HDR_SIZE = 16;

    export function ParseHdr(Hdr: ArrayBuffer): number
    {
        // yyyyuu + u
        if (Hdr.byteLength < 16)
            throw new DBusError.EInvalidPacket(`ParseHdr(): least need 16 bytes to processed`);

        const View = new Uint8Array(Hdr);

        if (MAJOR_PROTOCOL_VERSION !== View[3] )
            throw new DBusError.EInvalidPacket(`unsupported protocol version: ${View[3]}`);
        if (View[1] < TDBusMessage.Type.METHOD_CALL || View[1] > TDBusMessage.Type.SIGNAL)
            throw new DBusError.EInvalidPacket(`unknown message type: ${View[1]}`);

        let Endian: Endianness.TEndian;

        switch (String.fromCharCode(View[0]))
        {
        case 'B':
            Endian = Endianness.BIG_ENDIAN;
            break;
        case 'l':
            Endian = Endianness.LITTLE_ENDIAN;
            break;
        default:
            throw new DBusError.EInvalidPacket(`unknown endian value ${View[0]}'`);
        }

        const PreHeaderStream = new TMemStream(Hdr);
        PreHeaderStream.Endian = Endian;

        const args = DBusReader.Get(PreHeaderStream, 'yyyyuuu');
        const ContentSize = args[4];
        let HeaderFieldsSize = args[6];

        // header fields was padded to 8
        const Offset = HeaderFieldsSize & (8 - 1);
        if (0 !== Offset)
            HeaderFieldsSize = HeaderFieldsSize + 8 - Offset;

        return 16 + HeaderFieldsSize + ContentSize;
    }
}

namespace DBusReader
{
    export function AlignTo(Stream: TMemStream, align: 2 | 4 | 8)
    {
        const pad = Stream.Position & (align - 1);
        if (pad)
            Stream.Position = Stream.Position + align - pad;
    }

    export function Get(Stream: TMemStream, Signatures: DBusSignature): any
    {
        if (1 === Signatures.length)
        {
            if (DBusType.IsNumericType(Signatures))
                return ReadNumeric(Stream, Signatures);
            else if (DBusType.IsStringType(Signatures))
                return ReadString(Stream, Signatures);
            else if (DBusType._ContainerT.VARIANT === Signatures)
                return ReadVariant(Stream);
            else
                throw new DBusError.EInvalidSignature();
        }

        let sig_next_idx = DBusType.NextSingleCompleteTypeIdx(Signatures, 0);
        if (-1 === sig_next_idx)
            throw new DBusError.EInvalidSignature();

        if (sig_next_idx === Signatures.length)                 // Signatures only contains 1 simple complete type
            return ReadContainer(Stream, Signatures);

        const retval = new Array<any>();
        let sig_idx = 0;

        while (true)
        {
            const sub_sig = Signatures.substring(sig_idx, sig_next_idx);
            sig_idx = sig_next_idx;

            if (1 === sub_sig.length)
            {
                const val = DBusType.IsNumericType(sub_sig) ?
                    ReadNumeric(Stream, sub_sig) : DBusType.IsStringType(sub_sig) ?
                    ReadString(Stream, sub_sig) : DBusType.VARIANT === sub_sig ?
                    ReadVariant(Stream) : undefined;

                if (! TypeInfo.Assigned(val))
                    throw new DBusError.EInvalidSignature();

                retval.push(val);
            }
            else
                retval.push(ReadContainer(Stream, sub_sig));

            if (sig_idx < Signatures.length)
            {
                sig_next_idx = DBusType.NextSingleCompleteTypeIdx(Signatures, sig_idx);
                if (-1 === sig_next_idx)
                    throw new DBusError.EInvalidSignature();
            }
            else
                break;
        }
        return retval;
    }

    function ReadContainer(Stream: TMemStream, Signature: DBusSignature): Array<any> | Map<number | string, any> | Uint8Array // DBusVariant => using ReadVariant()
    {
        const sig = Signature[0] as DBusType._ContainerT;
        let sub_sig: DBusSignature;
        let container_end_pos = -1;

        if (DBusType._ContainerT.ARRAY === sig)
        {
            sub_sig = Signature[1];

            AlignTo(Stream, 4);
            const array_size = Stream.ReadUint(4);
            container_end_pos = Stream.Position + array_size;

            if (DBusType.ARRAY === sub_sig)             // array of array recursive
            {
                sub_sig = Signature.substring(1);

                const ary = new Array<any>();
                while (Stream.Position < container_end_pos)
                {
                    AlignTo(Stream, 8);
                    ary.push(ReadContainer(Stream, sub_sig));
                }
                return ary;
            }
        }
        else
            sub_sig = sig;

        if (DBusType._ContainerT.STRUCT === sub_sig)
        {
            if (DBusType._ContainerT.ARRAY === sig)     // array of struct
            {
                const struct_sig = Signature.substring(2, Signature.length - 1);
                const struct_ary = new Array<any>();

                while (Stream.Position < container_end_pos)
                {
                    AlignTo(Stream, 8);
                    struct_ary.push(Get(Stream, struct_sig));
                }
                return struct_ary;
            }
            else                                        // simple struct
            {
                const struct_sig = Signature.substring(1, Signature.length - 1);

                AlignTo(Stream, 8);
                return Get(Stream, struct_sig);
            }
        }
        else if (DBusType._ContainerT.DICT_ENTRY === sub_sig)
        {
            const key_sig = Signature.substring(2, 3);
            if (! DBusType.IsBasicType(key_sig))
            {
                console.log(`%cDBus: invalid dict registration, key Signature must basic type, but: '${key_sig}`, 'color:red');
                throw new DBusError.EInvalidSignature();
            }

            const entry_sig = Signature.substring(3, Signature.length - 1);
            if (! DBusType.IsSingleCompleteType(entry_sig))
            {
                console.log(`%cDBus: invalid dict registration, entry Signature must simple complete type, but: '${entry_sig}`, 'color:red');
                throw new DBusError.EInvalidSignature();
            }
            const dict = new Map<any, any>();

            while (Stream.Position < container_end_pos)
            {
                AlignTo(Stream, 8);
                // checking position again, due to dbus-daemon bug?
                if (Stream.Position >= container_end_pos)
                    break;

                const key = DBusType.IsNumericType(key_sig) ?
                    ReadNumeric(Stream, key_sig) :
                    ReadString(Stream, key_sig);
                const value = DBusType.IsNumericType(entry_sig) ?
                    ReadNumeric(Stream, entry_sig) : DBusType.IsStringType(entry_sig) ?
                    ReadString(Stream, entry_sig) : DBusType._ContainerT.VARIANT === entry_sig ?
                    ReadVariant(Stream) :
                    ReadContainer(Stream, entry_sig);

                dict.set(key, value);
            }
            return dict;
        }
        else if (DBusType.BYTE === sub_sig)             // array of byte => Uint8Array
        {
            const buf = new Uint8Array(container_end_pos - Stream.Position);
            Stream.ReadBuf(buf);

            return buf;
        }
        else if (DBusType.IsNumericType(sub_sig))       // array of number
        {
            const number_ary = new Array<boolean | number>();

            while (Stream.Position < container_end_pos)
                number_ary.push(ReadNumeric(Stream, sub_sig));

            return number_ary;
        }
        else if (DBusType.IsStringType(sub_sig))        // array of string
        {
            const string_ary = new Array<string>();

            while (Stream.Position < container_end_pos)
                string_ary.push(ReadString(Stream, sub_sig));

            return string_ary;
        }
        else
            throw new DBusError.EInvalidSignature();
    }

    function ReadVariant(Stream: TMemStream): DBusVariant
    {
        const sig = ReadString(Stream, DBusType._StringT.SIGNATURE);

        if (! DBusType.IsSingleCompleteType(sig))
        {
            console.log(`%cReadVariant: Variant can only collect simple complete types, but '${sig}'`, 'color:yellow');
            throw new DBusError.EInvalidSignature();
        }

        if (DBusType.IsNumericType(sig))
            return {Type: sig, Value: ReadNumeric(Stream, sig)};
        else if (DBusType.IsStringType(sig))
            return {Type: sig, Value: ReadString(Stream, sig)};
        else
            return {Type: sig, Value: Get(Stream, sig)};
    }

    function ReadNumeric(Stream: TMemStream, Type: DBusType._NumericT): number | boolean
    {
        switch (Type)
        {
        case DBusType._NumericT.BYTE:
            return Stream.ReadByte();

        case DBusType._NumericT.INT16:
            AlignTo(Stream, 2);
            return Stream.ReadInt(2);
        case DBusType._NumericT.INT32:
            AlignTo(Stream, 4);
            return Stream.ReadInt(4);
        case DBusType._NumericT.INT64:
            AlignTo(Stream, 8);
            return Stream.ReadInt(8);

        case DBusType._NumericT.UINT16:
            AlignTo(Stream, 2);
            return Stream.ReadUint(2);
        case DBusType._NumericT.UINT32:
            AlignTo(Stream, 4);
            return Stream.ReadUint(4);
        case DBusType._NumericT.UINT64:
            AlignTo(Stream, 8);
            return Stream.ReadUint(8);

        case DBusType._NumericT.BOOLEAN:
            AlignTo(Stream, 4);
            return Stream.ReadUint(4) > 0;
        case DBusType._NumericT.UNIX_FD:
            AlignTo(Stream, 4);
            return Stream.ReadInt(4);

        case DBusType._NumericT.DOUBLE:
            AlignTo(Stream, 4);
            return Stream.ReadFloat32();
        }
    }

    function ReadString(Stream: TMemStream, Type: DBusType._StringT): string
    {
        let Buf: Uint8Array;

        if (DBusType._StringT.SIGNATURE === Type)
        {
            const Size = Stream.ReadByte();
            Buf = new Uint8Array(Size);
        }
        else
        {
            AlignTo(Stream, 4);
            const Size = Stream.ReadUint(4);
            Buf = new Uint8Array(Size);
        }

        if (Buf.byteLength !== Stream.Read(Buf))
            throw new EStreamRead();
        // seek backward 1 byte?
        if (0 !== Stream.ReadByte())
            console.log('%cReadString(): string like types not terminated with nul', 'color:yellow');

        const retval = TUtf8Encoding.Decode(Buf);

        switch (Type)
        {
        case DBusType._StringT.OBJECT_PATH:
            DBusType.ValidateObjectPath(retval);
            break;
        case DBusType._StringT.SIGNATURE:
            DBusType.Validate(retval);
            break;
        }
        return retval;
    }
}

namespace DBusWriter
{
    export function PaddingTo(Stream: TMemStream, align: 2 | 4 | 8)
    {
        const pad = Stream.Position & (align - 1);
        if (0 !== pad)
            Stream.Write(Padding, {Count: align - pad});
    }

    export function Append(Stream: TMemStream, Signatures: DBusSignature, ...args: any[]): void
    {
        if (Signatures.length > 1)
        {
            let arg_idx = 0;
            let sig_idx = 0;

            while (sig_idx < Signatures.length)
            {
                const sig = Signatures[sig_idx ++];
                const v: any = args[arg_idx ++];

                if (DBusType._ContainerT.VARIANT === sig)
                {
                    if (! DBusType.IsVariantLike(v))
                        throw new DBusError.EInvalidArg(`argument ${arg_idx} expect DBusVariant like, but ${typeof v}`);

                    WriteVariant(Stream, v);
                }
                else if (DBusType.IsContainerType(sig))
                {
                    let sub_sig: string;
                    let array_size_pos = -1;

                    if (DBusType._ContainerT.ARRAY === sig)
                    {
                        sub_sig = Signatures[sig_idx];

                        PaddingTo(Stream, 4);
                        array_size_pos = Stream.Position;
                        Stream.WriteUint(0, 4);
                    }
                    else
                        sub_sig = sig;

                    if (DBusType._ContainerT.ARRAY === sub_sig)                 // array of array recursive
                    {
                        const sig_next_idx = DBusType.NextSingleCompleteTypeIdx(Signatures, sig_idx);
                        if (-1 === sig_next_idx)
                            throw new DBusError.EInvalidSignature();

                        sub_sig = Signatures.substring(sig_idx, sig_next_idx);
                        sig_idx = sig_next_idx;

                        for (const iter of v)
                        {
                            PaddingTo(Stream, 8);
                            Append(Stream, sub_sig, ...iter);
                        }
                    }
                    else if (DBusType._ContainerT.STRUCT === sub_sig)
                    {
                        if (sub_sig === sig)
                            sig_idx --;

                        const sig_next_idx = DBusType.NextSingleCompleteTypeIdx(Signatures, sig_idx);
                        if (-1 === sig_next_idx)
                            throw new DBusError.EInvalidSignature();

                        sub_sig = Signatures.substring(sig_idx + 1, sig_next_idx - 1);
                        sig_idx = sig_next_idx;

                        if (DBusType._ContainerT.ARRAY === sig)     // array of (struct)
                        {
                            if (! TypeInfo.IsArrayLike(v))
                            {
                                console.error('sig ' + sig + ' sub_sig: ' + sub_sig + ' v: ' + JSON.stringify(v));
                                throw new DBusError.EInvalidArg(`argument ${arg_idx} expect Array like, but ${typeof v}`);
                            }

                            for (const iter of v)
                            {
                                PaddingTo(Stream, 8);
                                Append(Stream, sub_sig, ...iter);
                            }
                        }
                        else
                        {
                            if (TypeInfo.IsArrayLike(v))
                            {
                                PaddingTo(Stream, 8);
                                Append(Stream, sub_sig, ...v);
                            }
                            else
                            {
                                const ary = Object.values(v);
                                PaddingTo(Stream, 8);
                                Append(Stream, sub_sig, ...ary);
                            }
                        }
                    }
                    // TODO: write dict entry?
                    else if (DBusType._ContainerT.DICT_ENTRY === sub_sig)
                    {
                        const sig_next_idx = DBusType.NextSingleCompleteTypeIdx(Signatures, sig_idx);
                        if (-1 === sig_next_idx)
                            throw new DBusError.EInvalidSignature();

                        const key_sig = Signatures[sig_idx + 1];
                        const entry_sig = Signatures.substring(sig_idx + 2, sig_next_idx - 2);
                        sig_idx = sig_next_idx;

                        if (! (v instanceof Map))
                            throw new DBusError.EInvalidSignature(`value is not a DBusDict, but ${(typeof v).toString()}`);
                        if (! DBusType.IsBasicType(key_sig))
                            throw new DBusError.EInvalidSignature(`dict'key must basic type, but '${key_sig}`);
                        if (! DBusType.IsSingleCompleteType(entry_sig))
                            throw new DBusError.EInvalidSignature(`dict'entry must simple complete type, but '${entry_sig}`);

                        for (const iter of v)
                        {
                            DBusType.IsNumericType(key_sig) ?
                                WriteNumeric(Stream, key_sig, iter[0]) :
                                WriteString(Stream, key_sig, iter[0]);

                            DBusType.IsNumericType(entry_sig) ?
                                WriteNumeric(Stream, entry_sig, iter[0]) : DBusType.IsStringType(entry_sig) ?
                                WriteString(Stream, entry_sig, iter[0]) :
                                Append(Stream, entry_sig, iter[1]);
                        }
                    }
                    else if (DBusType.BYTE === sub_sig)
                    {
                        const view = v instanceof ArrayBuffer ?
                            new Uint8Array(v) : v instanceof Uint8Array ?
                            v : undefined;

                        if (!TypeInfo.Assigned(view))
                            throw new DBusError.EInvalidArg(`argument ${arg_idx} expect Uint8Array/ArrayBuffer, but ${typeof v}`);

                        Stream.Write(view);
                    }
                    else if (DBusType.IsNumericType(sub_sig))       // array of dbus Basic type
                    {
                        if (! TypeInfo.IsArrayLike(v))
                            throw new DBusError.EInvalidArg(`argument ${arg_idx} expect Array like, but ${typeof v}`);
                        if (! TypeInfo.IsNumber(v[0]) && ! TypeInfo.IsBoolean(v[0]))
                            throw new DBusError.EInvalidArg(`argument ${arg_idx} expect Array<number | boolean>, but ${typeof v[0]}`);

                        for (const iter of v)
                            WriteNumeric(Stream, sub_sig, iter);
                    }
                    else if (DBusType.IsStringType(sub_sig))        // array of dbus string type
                    {
                        if (! TypeInfo.IsArrayLike(v))
                            throw new DBusError.EInvalidArg(`argument ${arg_idx} expect Array like, but ${typeof v}`);
                        if (! TypeInfo.IsString(v[0]))
                            throw new DBusError.EInvalidArg(`argument ${arg_idx} expect Array<string>, but ${typeof v[0]}`);

                        for (const iter of v)
                            WriteString(Stream, sub_sig, iter);
                    }

                    if (-1 !== array_size_pos)
                    {
                        const tmp = Stream.Position;
                        Stream.Position = array_size_pos;

                        Stream.WriteUint(tmp - array_size_pos - 4, 4);
                        Stream.Position = tmp;
                    }
                }
                else if (DBusType.IsNumericType(sig))
                {
                    if (! TypeInfo.IsNumber(v) && ! TypeInfo.IsBoolean(v))
                        throw new DBusError.EInvalidArg(`argument ${arg_idx} expect number | boolean, but ${typeof v}`);

                    WriteNumeric(Stream, sig, v);
                }
                else if (DBusType.IsStringType(sig))
                {
                    if (! TypeInfo.IsString(v))
                        throw new DBusError.EInvalidArg(`argument ${arg_idx} expect string, but ${typeof v}`);

                    WriteString(Stream, sig, v);
                }
                else
                    throw new DBusError.EInvalidSignature();
            }
        }
        else
        {
            const v = args[0];

            if (DBusType.IsNumericType(Signatures))
            {
                if (! TypeInfo.IsNumber(v) && ! TypeInfo.IsBoolean(v))
                    throw new DBusError.EInvalidArg(`argument expect number | boolean, but ${typeof v}`);

                WriteNumeric(Stream, Signatures, v);
            }
            else if (DBusType.IsStringType(Signatures))
            {
                if (! TypeInfo.IsString(v))
                    throw new DBusError.EInvalidArg(`argument expect string but ${typeof v}`);

                WriteString(Stream, Signatures, v);
            }
            else if (DBusType._ContainerT.VARIANT === Signatures)
            {
                if (! DBusType.IsVariantLike(v))
                    throw new DBusError.EInvalidArg(`argument expect DBusVariant like, but ${typeof v}`);

                WriteVariant(Stream, v);
            }
            else
                throw new DBusError.EInvalidSignature();
        }
    }

    function WriteNumeric(Stream: TMemStream, Type: DBusType._NumericT, Val: number | boolean): void
    {
        if (TypeInfo.IsBoolean(Val))
            Val = Val ? 1 : 0;

        switch (Type)
        {
        case DBusType._NumericT.BYTE:
            return Stream.WriteByte(Val);

        case DBusType._NumericT.INT16:
            PaddingTo(Stream, 2);
            return Stream.WriteInt(Val, 2);
        case DBusType._NumericT.INT32:
            PaddingTo(Stream, 4);
            return Stream.WriteInt(Val, 4);
        case DBusType._NumericT.INT64:
            PaddingTo(Stream, 8);
            return Stream.WriteInt(Val, 8);

        case DBusType._NumericT.UINT16:
            PaddingTo(Stream, 2);
            return Stream.WriteUint(Val, 2);
        case DBusType._NumericT.UINT32:
            PaddingTo(Stream, 4);
            return Stream.WriteUint(Val, 4);
        case DBusType._NumericT.UINT64:
            PaddingTo(Stream, 8);
            return Stream.WriteUint(Val, 8);

        case DBusType._NumericT.BOOLEAN:
            PaddingTo(Stream, 4);
            return Stream.WriteInt(Val, 4);
        case DBusType._NumericT.UNIX_FD:
            PaddingTo(Stream, 4);
            return Stream.WriteInt(Val, 4);

        case DBusType._NumericT.DOUBLE:
            PaddingTo(Stream, 4);
            return Stream.WriteFloat32(Val);
        }
    }

    function WriteString(Stream: TMemStream, Type: DBusType._StringT, Val: string): void
    {
        const buf = TUtf8Encoding.Encode(Val);

        switch (Type)
        {
        case DBusType._StringT.SIGNATURE:
            DBusType.Validate(Val);
            Stream.WriteByte(buf.length);
            break;

        case DBusType._StringT.OBJECT_PATH:
            DBusType.ValidateObjectPath(Val);
            // falling throutgh
        case DBusType._StringT.STRING:
            PaddingTo(Stream, 4);
            Stream.WriteUint(buf.length, 4);
            break;
        }

        Stream.WriteBuf(buf);
        Stream.WriteByte(0);
    }

    function WriteVariant(Stream: TMemStream, v: DBusVariant): void
    {
        WriteString(Stream, DBusType._StringT.SIGNATURE, v.Type);

        if (DBusType.IsNumericType(v.Type))
            WriteNumeric(Stream, v.Type, v.Value as number | boolean);
        else if (DBusType.IsStringType(v.Type))
            WriteString(Stream, v.Type, v.Value as string);
        else
            Append(Stream, v.Type, v.Value);
    }
}
