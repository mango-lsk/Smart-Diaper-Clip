import {TypeInfo} from '../core/typeinfo';

import './types';
import {DBusError} from './error';
import {TUtf8Encoding} from '../core/encoding/utf8';
import {Observable} from 'rxjs';

export namespace DBusRegistry
{
    export interface ITransport extends Observable<void>
    {
        readonly IsConnected: boolean;

        Connect(Address: string): Promise<void>;
        Close(): Promise<void>;

        Recv(Count: number, Timeout?: number): Promise<ArrayBuffer | Uint8Array>;
        SendBuf(Buf: ArrayBuffer | Uint8Array): Promise<void>;
    }

    export function CreateTransport(Protocol?: string): ITransport
    {
        let Transport: ITransport | undefined;

        if (TypeInfo.Assigned(Protocol))
            Transport = GetTransport(Protocol);
        else
            Transport = GetTransport('*');

        if (! TypeInfo.Assigned(Transport))
            throw new Error('transport not assigned. import a transport implementation');

        return Transport;
    }

    export function GetTransport(Protocol: '*' | string): ITransport | undefined
    {
        if ('*' === Protocol)
        {
            for (const iter of TransportFactories)
                return iter[1]();

            return undefined;
        }
        else
        {
            const Factory = TransportFactories.get(Protocol);

            if (TypeInfo.Assigned(Factory))
                return Factory();
            else
                return undefined;
        }
    }

    export function RegisterTransportFactory(Id: string, Factory: () => ITransport)
    {
        TransportFactories.set(Id, Factory);
    }

    const TransportFactories = new Map<string, () => ITransport>();

/* Authorize */

    export namespace Authorize
    {
        export function Reset(Transport: DBusRegistry.ITransport): Promise<void>
        {
            console.log('%cDBus: sending BEGIN..', 'color:lightgreen');
            return Transport.SendBuf(TUtf8Encoding.Encode('BEGIN\r\n'));
        }

        export async function Anonymous(Transport: DBusRegistry.ITransport): Promise<void>
        {
            console.log('%cDBus: sending anonymouse authorize...', 'color:lightgreen');

            await Transport.SendBuf(
                TUtf8Encoding.Encode('\0AUTH ANONYMOUS 646275732e756c7472616372656174696f6e\r\n')); // 'dbus.ultracreation'

            const buf = await Transport.Recv(128, 5000);
            const result = TUtf8Encoding.Decode(buf).split(' ');

            if (result.length > 0 && 'OK' === result[0])
            {
                console.log('%cDBus: authorization successful, sending BEGIN..', 'color:lightgreen');
                return Transport.SendBuf(TUtf8Encoding.Encode('BEGIN\r\n'));
            }
            else
                throw new DBusError.EAuthroizationFailure();
        }
    }

/* Registration */

    export function RegisterStruct(Name: string, Members: DBusStructDecl): DBusStructDecl
    {
        StructureHash.set(Name, Members);
        return Members;
    }

    export function RegisterInterface(Name: string): DBusInterfaceDecl
    {
        let RetVal = InterfaceHash.get(Name);

        if (! TypeInfo.Assigned(RetVal))
        {
            RetVal = new TDBusInterfaceDecl();
            InterfaceHash.set(Name, RetVal);
        }
        return RetVal;
    }

    export function GetInterface(Name: string): DBusInterfaceDecl | undefined
    {
        return InterfaceHash.get(Name);
    }

    export function CovertOutput(RetVal: any, Decl: DBusTypeDecl | DBusTypeDecl[]): any
    {
        if (Decl instanceof Array && 1 === Decl.length)
            Decl = Decl[0];

        if (Decl instanceof Array)                              // DBusArrayDecl | DBusDictDecl | DBusTypeDecl[]
        {
            if (! (RetVal instanceof Array) || Decl.length !== RetVal.length)
            {
                if (1 !== Decl.length && ! (RetVal instanceof Map))
                    console.log(`%cConvertRetVal() not matching the description. ${Decl}: ${RetVal}`, 'color:yellow');

                return RetVal;
            }

            for (let i = 0; i < Decl.length; i ++)
            {
                const sub_decl = Decl[i];

                if (! TypeInfo.IsString(sub_decl))
                    RetVal[i] = CovertOutput(RetVal[i], sub_decl);
            }

            return RetVal;
        }
        else if (TypeInfo.IsObject(Decl))                       // DBusStructDecl
        {
            const Keys = Object.keys(Decl);
            const Obj = {} as any;

            let Idx = 0;
            for (const Name of Keys)
            {
                const sub_decl = Decl[Name];

                if (TypeInfo.IsString(sub_decl))
                    Obj[Name] = RetVal[Idx];
                else
                    Obj[Name] = CovertOutput(RetVal[Idx], sub_decl);
                Idx ++;
            }
            return Obj;
        }
        else                                                    // DBusType | DBusType.BYTE_ARRAY
        {
            // Decl
            return RetVal;
        }
    }

/* RTTI */

    type DBusStructDecl = {[Name: string]: DBusTypeDecl};
    type DBusArrayDecl = [DBusType];
    type DBusDictDecl = [DBusType, DBusSignature | DBusTypeDecl];

    type DBusTypeDecl = DBusType | DBusType.BYTE_ARRAY | DBusArrayDecl | DBusStructDecl | DBusDictDecl;

    function SignatureOf(Decl: DBusTypeDecl): DBusSignature
    {
        if (Decl instanceof Array)          // DBusTypeDecl[]
        {
            if (2 === Decl.length)
            {
                if (! DBusType.IsBasicType(Decl[0]))        // DBusDict, require to check sub-signature
                    throw new DBusError.EInvalidSignature('DBusDict key only allow basic type');

                let entry_sig: DBusSignature;

                if (TypeInfo.IsString(Decl[1]))
                    entry_sig = Decl[1];
                else
                    entry_sig = SignatureOf(Decl[1]);

                if (! DBusType.IsSingleCompleteType(entry_sig))
                    throw new DBusError.EInvalidSignature('DBusDict value must simple complete type');
                return `${DBusType.ARRAY}{${Decl[0]}${entry_sig}}`;
            }
            else
            {
                return `${DBusType.ARRAY}${Decl}`;
            }
        }
        else if (TypeInfo.IsObject(Decl))   // DBusStructDecl
        {
            const values = Object.values(Decl);
            const signatures = new Array<DBusSignature>();

            for (const iter of values)
            {
                if (TypeInfo.IsObject(iter))
                    signatures.push(SignatureOf(iter));
                else
                    signatures.push(iter);
            }

            return `(${signatures.join('')})`;
        }
        else                                                // DBusType | DBusType.BYTE_ARRAY('ay')
            return Decl;
    }

    type DBusInParameter = {IN: DBusTypeDecl};
    type DBusOutParameter = {OUT: DBusTypeDecl};
    type DBusParameter = DBusInParameter | DBusOutParameter;

    interface DBusMethodDecl
    {
        Signature?: DBusSignature;

        OUT: DBusTypeDecl[];
        OUT_Signature?: DBusSignature;
    }

    export interface DBusSignalDecl
    {
        Signature: DBusSignature;
        OUT: DBusTypeDecl[];
    }

    export interface DBusPropertyDecl
    {
        Signature: DBusSignature;
        OUT: DBusTypeDecl;
    }

    export interface DBusInterfaceDecl
    {
        End(): this;

        AddMethod(Name: string, ...args: DBusParameter[]): this;
        AddSignal(Name: string, ...args: DBusTypeDecl[]): this;
        AddProperty(Name: string, Parameter: DBusTypeDecl): this;

        readonly Methods: Map<string, DBusMethodDecl>;
        readonly Signals: Map<string, DBusSignalDecl>;
        readonly Properties: Map<string, DBusPropertyDecl>;
    }

    class TDBusInterfaceDecl implements DBusInterfaceDecl
    {
        End(): this
        {
            Object.seal(this);
            return this;
        }

        AddMethod(Name: string, ...args: DBusParameter[]): this
        {
            const IN_args: DBusTypeDecl[] = [];
            const OUT_args: DBusTypeDecl[] = [];

            for (const iter of (args as any))
            {
                let error = false;

                if (TypeInfo.Assigned(iter.IN))
                {
                    error = TypeInfo.Assigned((iter as any).OUT);
                    IN_args.push(iter.IN);
                }
                else if (TypeInfo.Assigned(iter.OUT))
                {
                    error = TypeInfo.Assigned((iter as any).IN);
                    OUT_args.push(iter.OUT);
                }

                if (error)
                {
                    console.log(`%c${Name} args has bot IN/OUT in 1 arg`, 'color:red');
                    throw new DBusError.EInvalidSignature();
                }
            }
            let IN_Signature: DBusSignature | undefined;
            let OUT_Signature: string | undefined;

            if (IN_args.length > 0)
            {
                IN_Signature = '';
                try
                {
                    for (const iter of IN_args)
                        IN_Signature += SignatureOf(iter);
                }
                catch (e)
                {
                    console.log(`%c${e instanceof Error ? e.message : e}`, 'color:red');
                    throw e;
                }
            }
            if (OUT_args.length > 0)
            {
                OUT_Signature = '';
                try
                {
                    for (const iter of OUT_args)
                    OUT_Signature += SignatureOf(iter);
                }
                catch (e)
                {
                    console.log(`%c${e instanceof Error ? e.message : e}`, 'color:red');
                    throw e;
                }
            }

            // console.log(`${Name}: IN(${IN_Signature}), OUT(${OUT_Signature})`);
            this.Methods.set(Name, {Signature: IN_Signature, OUT_Signature, OUT: OUT_args});
            return this;
        }

        AddSignal(Name: string, ...args: DBusTypeDecl[]): this
        {
            let Signature = '';
            try
            {
                for (const iter of args)
                    Signature += SignatureOf(iter);

                this.Signals.set(Name, {Signature, OUT: args});
                return this;
            }
            catch (e)
            {
                console.log(`%c${e instanceof Error ? e.message : e}`, 'color:red');
                throw e;
            }
        }

        AddProperty(Name: string, Decl: DBusTypeDecl): this
        {
            this.Properties.set(Name, {Signature: SignatureOf(Decl), OUT: Decl});
            return this;
        }

        readonly Methods = new Map<string, DBusMethodDecl>();
        readonly Signals = new Map<string, DBusSignalDecl>();
        readonly Properties = new Map<string, DBusPropertyDecl>();
    }

    const InterfaceHash = new Map<string, DBusInterfaceDecl>();
    const StructureHash = new Map<string, DBusStructDecl>();
}

export enum DBusType
{
// basic
    BYTE                = 'y',
    BOOLEAN             = 'b',
    INT16               = 'n',
    INT32               = 'i',
    INT64               = 'x',
    UINT16              = 'q',
    UINT32              = 'u',
    UINT64              = 't',
    DOUBLE              = 'd',
    UNIX_FD             = 'h',
// string
    OBJECT_PATH         = 'o',
    SIGNATURE           = 'g',
    STRING              = 's',
// container
    ARRAY               = 'a',
    VARIANT             = 'v',
    STRUCT              = '(',
    DICT_ENTRY          = '{',
}

export namespace DBusType
{
    export type BYTE_ARRAY = 'ay';
    export const BYTE_ARRAY = 'ay';

    export const enum _NumericT
    {
        BYTE                = 'y',
        BOOLEAN             = 'b',
        INT16               = 'n',
        INT32               = 'i',
        INT64               = 'x',
        UINT16              = 'q',
        UINT32              = 'u',
        UINT64              = 't',
        DOUBLE              = 'd',
        UNIX_FD             = 'h',
    }

    export const enum _StringT
    {
        STRING              = 's',
        OBJECT_PATH         = 'o',
        SIGNATURE           = 'g',
    }

    export const enum _ContainerT
    {
        ARRAY               = 'a',
        VARIANT             = 'v',
        DICT_ENTRY          = '{',
        STRUCT              = '('
    }

    const ValidBasicTypes: string[] =
    [
        DBusType.BYTE,          DBusType.BOOLEAN,
        DBusType.INT16,         DBusType.INT32,         DBusType.INT64,
        DBusType.UINT16,        DBusType.UINT32,        DBusType.UINT64,
        DBusType.DOUBLE,        DBusType.UNIX_FD,
    ];

    const ValidStringTypes: string[] =
    [
        DBusType.OBJECT_PATH,   DBusType.SIGNATURE,     DBusType.STRING,
    ];

    const ValidContainerTypes: string[] =
    [
        DBusType.ARRAY,         DBusType.VARIANT,       DBusType.DICT_ENTRY,    DBusType.STRUCT
    ];

    const STRUCT_END = ')';
    const DICT_ENTRY_END = '}';

    export function IsNumericType(sig: DBusSignature | DBusType): sig is _NumericT
    {
        return 1 === sig.length && ValidBasicTypes.includes(sig);
    }

    export function IsStringType(sig: DBusSignature | DBusType): sig is _StringT
    {
        return 1 === sig.length && ValidStringTypes.includes(sig);
    }

    export function IsContainerType(sig: DBusSignature | DBusType): sig is _ContainerT
    {
        return 1 === sig.length && ValidContainerTypes.includes(sig);
    }

    export function IsVariantLike(v: any): v is DBusVariant
    {
        if (! TypeInfo.Assigned(v.Type) && ! TypeInfo.Assigned(v.Value))
            return false;

        if (ValidBasicTypes.includes(v.Type))
            return TypeInfo.IsNumber(v.Value) || TypeInfo.IsBoolean(v.Value);
        else if (ValidStringTypes.includes(v.Type))
            return TypeInfo.IsString(v.Value);
        else
            return false;
    }

    export function IsBasicType(sig: DBusSignature | DBusType): sig is _NumericT | _StringT
    {
        return IsNumericType(sig) || IsStringType(sig);
    }

    export function IsSingleCompleteType(sig: DBusSignature | DBusType): sig is _NumericT | _StringT | _ContainerT
    {
        if (IsBasicType(sig) || DBusType.VARIANT === sig)
            return true;

        if (DBusType.ARRAY === sig[0])
            return IsSingleCompleteType(sig.substring(1));

        if (DBusType.DICT_ENTRY === sig[0])
        {
            let recursive = 1;
            for (let i = 1; i < sig.length; i ++)
            {
                if (DBusType._ContainerT.DICT_ENTRY === sig[i])
                    recursive ++;
                else if (DICT_ENTRY_END === sig[i] && 0 === -- recursive)
                    return i === sig.length - 1;
            }
        }
        else if (DBusType.STRUCT === sig[0])
        {
            let recursive = 1;
            for (let i = 1; i < sig.length; i ++)
            {
                if (DBusType._ContainerT.STRUCT === sig[i])
                    recursive ++;
                else if (STRUCT_END === sig[i] && 0 === -- recursive)
                    return i === sig.length - 1;
            }
        }
        return false;
    }

    export function NextSingleCompleteTypeIdx(Signature: DBusSignature, Idx = 0): number
    {
        if (Signature.length > Idx)
        {
            if (IsBasicType(Signature[Idx]) || DBusType.VARIANT === Signature[Idx])
                return Idx + 1;

            if (DBusType.STRUCT === Signature[Idx])
            {
                let recursive = 1;
                for (let i = Idx + 1; i < Signature.length; i ++)
                {
                    if (DBusType._ContainerT.STRUCT === Signature[i])
                        recursive ++;
                    else if (STRUCT_END === Signature[i] && 0 === -- recursive)
                        return i + 1;
                }

                console.log(`%cstruct Signature STRUCT_END(')') expected. ${Signature}`, 'color:red');
                return -1;
            }

            if (DBusType.DICT_ENTRY === Signature[Idx])
            {
                let recursive = 1;
                for (let i = Idx + 1; i < Signature.length; i ++)
                {
                    if (DBusType._ContainerT.DICT_ENTRY === Signature[i])
                        recursive ++;
                    else if (DICT_ENTRY_END === Signature[i] && 0 === -- recursive)
                        return i + 1;
                }

                console.log(`%cdict Signature DICT_ENTRY_END('}') expected. ${Signature}`, 'color:red');
                return -1;
            }

            if (DBusType.ARRAY === Signature[Idx])
            {
                for (; Idx < Signature.length; Idx ++)
                {
                    if (DBusType.ARRAY !== Signature[Idx])
                        return NextSingleCompleteTypeIdx(Signature, Idx);
                }
            }
        }

        console.log(`%cunknown Signature ${Signature}`, 'color:red');
        return -1;
    }

    export function Validate(Signature: DBusSignature): void
    {
    }

    export function ValidateObjectPath(ObjectPath: DBusObjectPath): void
    {
    }
}
