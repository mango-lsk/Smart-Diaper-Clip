/**
 *  DBus TypeScript Implementation
 */
import {Subject, Observable, PartialObserver, map, filter, Subscription} from 'rxjs';

import {TypeInfo} from '../core/typeinfo';
import {TMemStream} from '../core/stream';

import './types';
import {freedesktop} from './freedesktop';
import {DBusError} from './error';
import {DBusRegistry, DBusType} from './registry';
import {TDBusMessage} from './message';

// const INVOKE_TIMEOUT = 6000;

interface IDBusGlobal
{
    Trace: IDBusTrace;
}

interface IDBusTrace
{
    MessageSN?: true;
}

declare global
{
    var DBus: IDBusGlobal;

    interface Window
    {
        DBus: IDBusGlobal;
    }
}
window.DBus = {Trace: {}};

class TDBusConnection
{
    get IsConnected(): boolean
    {
        return TypeInfo.Assigned(this._Transport) && this._Transport.IsConnected;
    }

    get Transport(): DBusRegistry.ITransport | undefined
    {
        return this._Transport;
    }

    Open(Address: string): Promise<void>
    {
        let Transport: DBusRegistry.ITransport;
        const Protocol = Address.split('://');

        if (1 < Protocol.length)
        {
            Transport = DBusRegistry.CreateTransport(Protocol[0]);
            Address = Protocol[1];
        }
        else
            Transport = DBusRegistry.CreateTransport();

        return Transport.Connect(Address).then(() =>
            this.UsingTransport(Transport));
    }

    async UsingTransport(Transport: DBusRegistry.ITransport): Promise<void>
    {
        if (TypeInfo.Assigned(this._Transport))
            this._Transport.Close().catch(err => {});

        this._Transport = Transport;

        await this.HandleConnected();
        setTimeout(() => this.OnConnected.next());
    }

    async Close(): Promise<void>
    {
        this.DisposeTransport();
    }

    protected HandleConnected(): Promise<void>
    {
        if (TypeInfo.Assigned(this._Transport))
        {
            this._Transport.subscribe({
                complete: () =>
                {
                    console.log(`%cDBus connection closed normally`, 'color:green');
                    this.DisposeTransport();
                },
                error: (err: Error) =>
                {
                    console.log(`%cDBus connection closed with error ${err.message}`, 'color:yellow');
                    this.DisposeTransport();
                }
            });
        }
        return Promise.resolve();
    }

    private DisposeTransport(): void
    {
        if (TypeInfo.Assigned(this._Transport))
        {
            this._Transport.Close().catch(err => {});
            this.HandleDisconnect();
        }
        this._Transport = undefined;
    }

    protected HandleDisconnect(): void
    {
        setTimeout(() => this.OnDisconnected.next());
    }

    protected SendMessage(msg: TDBusMessage): number
    {
        if (! TypeInfo.Assigned(this._Transport))
        {
            this.HandleDisconnect();
            throw new DBusError.ENoConnection();
        }

        msg.Sender = this.Id;
        msg.SN = ++ this.IncreatmentSN;

        this._Transport.SendBuf(msg.GetBuffer()).catch(err =>
        {
            if (TypeInfo.Assigned(this._Transport) && ! (this._Transport instanceof Observable))
            {
                // receive 0 indicate the connection is closed, when Transport not Observable
                //  like socket etc.
                this.DisposeTransport();
            }
        });

        if (DBus.Trace.MessageSN)
            console.log(`====> ${msg.Member} SN: ${msg.SN}`);
        return msg.SN;
    }

    protected async RecvMessage(): Promise<TDBusMessage>
    {
        if (! TypeInfo.Assigned(this._Transport))
            throw new DBusError.ENoConnection();

        try
        {
            let buf = await this._Transport.Recv(TDBusMessage.HDR_SIZE);
            if (0 === buf.byteLength)
                throw new DBusError.EDisconnected();

            const MemStream = new TMemStream(TDBusMessage.ParseHdr(buf));
            MemStream.WriteBuf(buf);

            while (MemStream.Position < MemStream.Capacity)
            {
                buf = await this._Transport.Recv(MemStream.Capacity - MemStream.Position);
                if (0 === buf.byteLength)
                    throw new DBusError.EDisconnected();

                MemStream.WriteBuf(buf);
            }

            const msg = new TDBusMessage(MemStream.MemoryView);

            if (DBus.Trace.MessageSN)
                console.log(`<==== message SN: ${msg.SN}, ReplySN: ${msg.Reply?.SN}`);
            return msg;
        }
        catch (err)
        {
            if (err instanceof Error)
                console.log(`%cTDBusConnection.RecvMessage() error: ${err.message}`, 'color:red');
            else
                console.log(`%cTDBusConnection.RecvMessage() error: ${err}`, 'color:red');

            if (TypeInfo.Assigned(this._Transport) && ! (this._Transport instanceof Observable))
            {
                // receive 0 indicate the connection is closed, when Transport not Observable
                //  like socket etc.
                this.DisposeTransport();
            }
            throw err;
        }
    }

    OnConnected = new Subject<void>();
    OnDisconnected = new Subject<void>();

    protected Id?: string;
    private IncreatmentSN = 0;

    private _Transport?: DBusRegistry.ITransport;
}

interface ISignalInstance
{
    Instance: DBusSignal<any>;
    Decl: DBusRegistry.DBusSignalDecl;
}

export class TMessageBus extends TDBusConnection implements freedesktop.DBus
{
    constructor()
    {
        super();

        this.NameAcquired = new DBusSignalImpl<string>(this,
            freedesktop.DBUS_PATH_DBUS, freedesktop.DBUS_INTERFACE_DBUS, 'NameAcquired');
        this.NameLost = new DBusSignalImpl<string>(this,
            freedesktop.DBUS_PATH_DBUS, freedesktop.DBUS_INTERFACE_DBUS, 'NameLost');
        this.NameOwnerChanged = new DBusSignalImpl<[string, string, string]>(this,
            freedesktop.DBUS_PATH_DBUS, freedesktop.DBUS_INTERFACE_DBUS, 'NameOwnerChanged');

        this.BindProperties(this, freedesktop.DBus.DBUS_DECL);
    }

    Introspect(Service: string, ObjectPath: DBusObjectPath): Promise<string>
    {
        return this.ProxyMethodCall({Service, ObjectPath, Interface: freedesktop.DBUS_INTERFACE_INTROSPECTABLE},
            'Introspect');
    }

    Ping(Service: string, ObjectPath: DBusObjectPath): Promise<string>
    {
        return this.ProxyMethodCall({Service, ObjectPath, Interface: freedesktop.DBUS_INTERFACE_PEER},
            'Ping');
    }

    ObservePropertiesChanged(Context: IDBusObject): DBusSignal<[string, DBusDict<string, DBusVariant>, string[]]>;
    ObservePropertiesChanged(ObjectPath: DBusObjectPath): DBusSignal<[string, DBusDict<string, DBusVariant>, string[]]>;
    ObservePropertiesChanged(ContextOrObjectPath: IDBusObject | DBusObjectPath): DBusSignal<[string, DBusDict<string, DBusVariant>, string[]]>
    {
        return this.GetSignal(TypeInfo.IsObject(ContextOrObjectPath) ? ContextOrObjectPath.ObjectPath : ContextOrObjectPath,
            freedesktop.DBUS_INTERFACE_PROPERTIES, 'PropertiesChanged')!.Instance;
    }

    GetPeroperties(Service: string, ObjectPath: DBusObjectPath, Interface: string): Promise<DBusDict<string, DBusVariant>>;
    GetPeroperties(Context: IDBusObject): Promise<DBusDict<string, DBusVariant>>;
    GetPeroperties(ServiceOrContext: string | IDBusObject, ObjectPath?: DBusObjectPath, Interface?: string): Promise<DBusDict<string, DBusVariant>>
    {
        let Context: IDBusObject;
        let QueryInterface: string;

        if (TypeInfo.IsString(ServiceOrContext))
        {
            Context = {Service: ServiceOrContext, ObjectPath: ObjectPath!, Interface: freedesktop.DBUS_INTERFACE_PROPERTIES};
            QueryInterface = Interface!;
        }
        else
        {
            Context = {Service: ServiceOrContext.Service, ObjectPath: ServiceOrContext.ObjectPath, Interface: freedesktop.DBUS_INTERFACE_PROPERTIES};
            QueryInterface = ServiceOrContext.Interface;
        }
        return this.ProxyMethodCall(Context, 'GetAll', QueryInterface);
    }

    GetPropertyValue(Context: IDBusObject, Name: string): Promise<DBusVariant>
    {
        const PropertyContext = {Service: Context.Service,
            ObjectPath: Context.ObjectPath,
            Interface: freedesktop.DBUS_INTERFACE_PROPERTIES
        };
        return this.ProxyMethodCall<DBusVariant>(PropertyContext, 'Get', Context.Interface, Name);
    }

    SetPropertyValue(Context: IDBusObject, Name: string, Value: DBusVariant): Promise<void>
    {
        const PropertyContext = {Service: Context.Service,
            ObjectPath: Context.ObjectPath,
            Interface: freedesktop.DBUS_INTERFACE_PROPERTIES
        };
        return this.ProxyMethodCall(PropertyContext, 'Set', Context.Interface, Name, Value);
    }

    GetObjectManager(Service: string): freedesktop.DBus.ObjectManager
    {
        return this.BindInterface<freedesktop.DBus.ObjectManager>(
            {Service, ObjectPath: '/', Interface: freedesktop.DBUS_INTERFACE_OBJECTMANAGER},
            freedesktop.DBus.ObjectManager._Decl);
    }

    CreateProxy<INTERFACE_T>(Context: IDBusObject): INTERFACE_T
    {
        const Decl = DBusRegistry.GetInterface(Context.Interface);

        if (! TypeInfo.Assigned(Decl))
            throw new DBusError.EUnknownInterface(Context.Interface);
        else
            return this.BindInterface<INTERFACE_T>(Context, Decl);
    }

    private BindInterface<INTERFACE_T>(Context: IDBusObject, Decl: DBusRegistry.DBusInterfaceDecl): INTERFACE_T
    {
        const RetVal: any = {InvokeContext: Context};

        this.BindMethods(RetVal, Decl);
        this.BindSignals(RetVal, Decl);
        this.BindProperties(RetVal, Decl);

        return RetVal;
    }

    private BindMethods(Obj: any, Intf: DBusRegistry.DBusInterfaceDecl): void
    {
        for (const iter of Intf.Methods)
        {
            const Method = iter[0];
            Obj[Method] = (...args: any[]): Promise<any> => this.ProxyMethodCall(Obj.InvokeContext, Method, ...args);
        }
    }

    private BindSignals(Obj: any, Intf: DBusRegistry.DBusInterfaceDecl): void
    {
        if (0 < Intf.Signals.size)
        {
            for (const iter of Intf.Signals)
            {
                const Name = iter[0];
                const Signal = this.GetSignal(Obj.InvokeContext.ObjectPath, Obj.InvokeContext.Interface, Name);

                if (TypeInfo.Assigned(Signal))
                    Obj[Name] = Signal.Instance;
                else
                    throw new DBusError.EUnknownSignal();
            }
        }
    }

    private BindProperties(Obj: any, Intf: DBusRegistry.DBusInterfaceDecl): void
    {
        if (0 < Intf.Properties.size)
        {
            const InvokeContext = Obj === this ? freedesktop.DBus.InvokeContext : Obj.InvokeContext as IDBusObject;
            Obj.Properties =
            {
                GetAll: async (): Promise<DBusDict<string, any>> =>
                {
                    const props: DBusDict<string, any> = await this.GetPeroperties(InvokeContext);
                    for (const iter of Intf.Properties)
                    {
                        const prop = props.get(iter[0]);
                        if (TypeInfo.Assigned(prop) && iter[1].Signature === prop.Type)
                            props.set(iter[0], prop.Value);
                    }
                    return props;
                },
                Get: async (property_name: string): Promise<any> =>
                {
                    const prop = await this.GetPropertyValue(InvokeContext, property_name);
                    const decl = Intf.Properties.get(property_name);
                    if (! TypeInfo.Assigned(decl) || decl.Signature !== prop.Type)
                    {
                        console.log(`%cDBus invalid property Signature, return DBusVariant instead`, 'color:yellow');
                        return prop;
                    }
                    else
                        return prop.Value;
                },
                Set: async (property_name: string, value: any): Promise<void> =>
                {
                    const decl = Intf.Properties.get(property_name);
                    if (! TypeInfo.Assigned(decl))
                    {
                        if (! DBusType.IsVariantLike(value))
                        {
                            console.log(`%cDBus property not registered, value need to be DBusVariant`, 'color:yellow');
                            throw new DBusError.EInvalidArg();
                        }
                    }
                    else
                        value = {Type: decl.Signature, Value: value};

                    return this.SetPropertyValue(InvokeContext, property_name, value);
                },
                OnChange: this.ObservePropertiesChanged(InvokeContext).pipe(
                    filter(val =>
                        InvokeContext.Interface === val[0]),
                    map(val =>
                    {
                        const changed: DBusDict<string, any> = val[1];
                        if (InvokeContext.Interface === val[0])
                        {
                            for (const iter of Intf.Properties)
                            {
                                const prop = changed.get(iter[0]);
                                if (TypeInfo.Assigned(prop) && iter[1].Signature === prop.Type)
                                    changed.set(iter[0], prop.Value);
                            }
                        }
                        return changed;
                    })
                )
            };
        }
    }

    EmitSignal<T>(Signal: DBusSignal<T>, ...args: any[]): Promise<void>
    {
        const Intf = DBusRegistry.GetInterface(Signal.Interface);
        if (! TypeInfo.Assigned(Intf))
            throw new DBusError.EUnknownInterface(Signal.Interface);

        const SignalParameter = Intf.Signals.get(Signal.Name);
        if (! TypeInfo.Assigned(SignalParameter))
            throw new DBusError.EUnknownSignal(`${Signal.Interface}.${Signal.Name}`);

        return this.ProxyInvoke(TDBusMessage.Type.SIGNAL, Signal, SignalParameter.Signature, ...args).then(() => {});
    }

    ProxyMethodCall<T>(Context: IDBusObject, Method: string, ...args: any[]): Promise<T>
    {
        const Intf = DBusRegistry.GetInterface(Context.Interface);
        if (! TypeInfo.Assigned(Intf))
            throw new DBusError.EUnknownInterface(Context.Interface);

        const MethodParameter = Intf.Methods.get(Method);
        if (! TypeInfo.Assigned(MethodParameter))
            throw new DBusError.EUnknownMethod(`${Context.Interface}.${Method}`);

        return this.ProxyInvoke(TDBusMessage.Type.METHOD_CALL, Context, Method, MethodParameter.Signature, ...args).then(msg =>
        {
            if (TypeInfo.Assigned(msg))
            {
                const obj = msg.Parse(MethodParameter.OUT_Signature);

                if (TypeInfo.Assigned(MethodParameter.OUT_Signature))
                    return DBusRegistry.CovertOutput(obj, MethodParameter.OUT);
                else
                    return obj;
            }
            else
                return undefined;
        });
    }

    protected override async HandleConnected(): Promise<void>
    {
        await super.HandleConnected();
        this.Id = await this.Hello();

        console.log(`%cDBus: unique name: ${this.Id}`, 'color:lightgreen');
        setTimeout(() => this.Mainloop());
    }

    protected override HandleDisconnect(): void
    {
        for (const iter of this.InvokeHash)
            iter[1].reject(new DBusError.EDisconnected());

        this.InvokeHash.clear();
        super.HandleDisconnect();
    }

    private ProxyInvoke(Type: TDBusMessage.Type.METHOD_CALL, InvokeContext: IDBusObject, Member: string, Signatures?: DBusSignature, ...args: any[]): Promise<TDBusMessage | undefined>;
    private ProxyInvoke(Type: TDBusMessage.Type.SIGNAL, Signal: DBusSignal<any>, Signatures?: DBusSignature, ...args: any[]): Promise<undefined>;
    private ProxyInvoke(Type: TDBusMessage.Type.METHOD_CALL | TDBusMessage.Type.SIGNAL, ...args: any[]): Promise<TDBusMessage | undefined>
    {
        if (TDBusMessage.Type.METHOD_CALL === Type)
        {
            const Context = args[0];
            const Method = args[1];
            const Signatures = args[2];
            const msg = new TDBusMessage(Type, Context.Service, Context.ObjectPath, Context.Interface, Method);

            if (TypeInfo.Assigned(Signatures))
            {
                args.splice(0, 3);
                msg.Append(Signatures, ...args);
            }

            if (msg.IsNoReplyExpected)
            {
                this.SendMessage(msg);
                return Promise.resolve(undefined);
            }
            else
            {
                return new Promise<TDBusMessage>((resolve, reject) =>
                {
                    const SN = this.SendMessage(msg);

                    if (! TypeInfo.Assigned(this.InvokeTimeoutId))
                        this.InvokeTimeoutId = setTimeout(() =>
                        {
                            console.error('DBus msg: ' + msg.Member + ' no reply!');
                            this.Close();
                        }, 5500);

                    this.InvokeHash.set(SN, {
                        resolve: msg =>
                        {
                            if (TypeInfo.Assigned(this.InvokeTimeoutId))
                            {
                                clearTimeout(this.InvokeTimeoutId);
                                this.InvokeTimeoutId = undefined;
                            }
                            resolve(msg);
                        },
                        reject: (err: Error) =>
                        {
                            if (TypeInfo.Assigned(this.InvokeTimeoutId))
                            {
                                clearTimeout(this.InvokeTimeoutId);
                                this.InvokeTimeoutId = undefined;
                            }
                            reject(err);
                        },
                        origin: msg
                    });
                });
            }
        }
        else
        {
            const Signal: DBusSignal<any> = args[0];
            const Signatures = args[1];

            const msg = new TDBusMessage(Type, Signal.ObjectPath, Signal.Interface, Signal.Name);

            if (TypeInfo.Assigned(Signatures))
            {
                args.splice(0, 2);
                msg.Append(Signatures, ...args);
            }

            this.SendMessage(msg);
            return Promise.resolve(undefined);
        }
    }

    private Mainloop(): void
    {
        this.RecvMessage().then(msg =>
        {
            if (TDBusMessage.Type.METHOD_RETURN === msg.Type ||
                TDBusMessage.Type.ERROR === msg.Type || TDBusMessage.Type.INVALID === msg.Type)
            {
                const Invoke = this.InvokeHash.get(msg.Reply!.SN);

                if (TypeInfo.Assigned(Invoke))
                {
                    this.InvokeHash.delete(msg.Reply!.SN);
                    msg.Origin = Invoke.origin;

                    switch (msg.Type)
                    {
                    case TDBusMessage.Type.METHOD_RETURN:
                        Invoke.resolve(msg);
                        break;
                    case TDBusMessage.Type.ERROR:
                        Invoke.reject(DBusError.CreateRemoteError(msg.Reply!.ErrorName!));
                        break;
                    case TDBusMessage.Type.INVALID: // should not happen
                        Invoke.reject(DBusError.CreateRemoteError(DBusError.Names.Failed));
                        break;
                    }
                }
                else
                {
                    const TYPE = msg.Type === TDBusMessage.Type.METHOD_RETURN ? 'METHOD_RETURN ' :
                        msg.Type === TDBusMessage.Type.ERROR ? 'ERROR' : 'INVALID';

                    console.log(`%cDBus received message ${TYPE} SN: ${msg.SN} has not invoker`, 'color:red');
                }
            }
            else if (! this.HandleStandardInterfaces(msg))
            {
                if (TDBusMessage.Type.SIGNAL === msg.Type)
                {
                    const Signal = this.GetSignal(msg.ObjectPath, msg.Interface, msg.Member);

                    if (TypeInfo.Assigned(Signal))
                    {
                        let obj = msg.Parse(Signal.Decl.Signature);
                        if (TypeInfo.Assigned(obj))
                            obj = DBusRegistry.CovertOutput(obj, Signal.Decl.OUT);

                        Signal.Instance.next(obj);
                    }
                }
                else // if (TDBusMessage.Type.METHOD_CALL === msg.Type)
                {
                    const reply = new TDBusMessage(TDBusMessage.Type.ERROR, msg, DBusError.Names.NotSupported, '');

                    setTimeout(() => this.SendMessage(reply));
                    console.log(`%cMethod Invoke: not implement yet.`, 'color:red');
                }
            }

            setTimeout(() => this.Mainloop());
        })
        .catch(err =>
        {
            for (const iter of this.InvokeHash)
                iter[1].reject(err);

            this.InvokeHash.clear();
        });
    }

    private HandleStandardInterfaces(Msg: TDBusMessage): boolean
    {
        if (TDBusMessage.Type.SIGNAL === Msg.Type)
        {
            if (freedesktop.DBUS_PATH_DBUS === Msg.ObjectPath && freedesktop.DBUS_INTERFACE_DBUS === Msg.Interface)
            {
                const Member = Msg.Member!;
                const Signal = (this as any)[Member];

                if (TypeInfo.Assigned(Signal) && Signal instanceof DBusSignalImpl)
                {
                    const SignalDecl = freedesktop.DBus.DBUS_DECL.Signals.get(Member);
                    if (TypeInfo.Assigned(SignalDecl))
                    try
                    {
                        let obj = Msg.Parse(SignalDecl.Signature);
                        if (TypeInfo.Assigned(obj))
                            obj = DBusRegistry.CovertOutput(obj, SignalDecl.OUT);

                        console.log(`%cDBus: Signal ${Msg.Interface}.${Member} ${obj}`, 'color:green');
                        Signal.next(obj);
                    }
                    catch (e)
                    {
                        const msg: string = e instanceof Error ?  e.message : (e as any).toString();
                        console.log(`%cDBus: message bus signal error: ${msg}`, 'color:red');
                    }
                    return true;
                }
                else
                {
                    console.log(`%cDBus: Signal ${Msg.Interface}.${Member} is unhandled`, 'color:yellow');
                    return false;
                }
            }
            else
                return false;

        }
        else if (freedesktop.DBUS_INTERFACE_INTROSPECTABLE === Msg.Interface)
        {
            // const reply = new TDBusMessage(TDBusMessage.Type.METHOD_RETURN, Msg);
            const reply = new TDBusMessage(TDBusMessage.Type.ERROR, Msg, DBusError.Names.NotSupported, '');
            setTimeout(() => this.SendMessage(reply));

            return true;
        }
        else if (freedesktop.DBUS_INTERFACE_PEER === Msg.Interface)
        {
            const reply = 'Ping' === Msg.Member ?
                new TDBusMessage(TDBusMessage.Type.METHOD_RETURN, Msg) :
                new TDBusMessage(TDBusMessage.Type.ERROR, Msg, DBusError.Names.NotSupported, '');

            setTimeout(() => this.SendMessage(reply));
            return true;
        }
        return false;
    }

    private GetSignal(ObjectPath: DBusObjectPath, Interface: string, Signal: string): ISignalInstance | undefined
    {
        const key = `${ObjectPath}:${Interface}.${Signal}`;
        let inst = this.SignalHash.get(key);

        if (! TypeInfo.Assigned(inst))
        {
            const IntfDecl = DBusRegistry.GetInterface(Interface);
            if (TypeInfo.Assigned(IntfDecl))
            {
                const SignalDecl = IntfDecl.Signals.get(Signal);

                if (TypeInfo.Assigned(SignalDecl))
                {
                    inst = {Instance: new DBusSignalImpl<any>(this, ObjectPath, Interface, Signal),
                        Decl: SignalDecl,
                    };

                    this.SignalHash.set(key, inst);
                }
            }
        }

        if (! TypeInfo.Assigned(inst))
            console.log(`%cDBus: Signal ${Interface}.${Signal} is not managed`, 'color:red');

        return inst;
    }

    private InvokeTimeoutId: any;
    private InvokeHash = new Map<number, {resolve: (msg: TDBusMessage) => void, reject: (reason?: any) => void, origin: TDBusMessage}>();
    private SignalHash = new Map<string, ISignalInstance>();

/* freedesktop.DBus */

    async Hello(): Promise<string>
    {
        const method_call = new TDBusMessage(TDBusMessage.Type.METHOD_CALL,
            freedesktop.DBUS_SERVICE_DBUS, freedesktop.DBUS_PATH_DBUS, freedesktop.DBUS_INTERFACE_DBUS, 'Hello');

        await this.SendMessage(method_call);
        return (await this.RecvMessage()).Parse();
    }

    async GetId(): Promise<string>
    {
        // GetId() must using Sender(Id), that is odd since we already have it.
        if (TypeInfo.Assigned(this.Id))
            return this.Id;
        else
            return Promise.reject(new DBusError.ENoConnection());

    }

    AddMatch(rule: string): Promise<void>
    {
        return this.ProxyMethodCall(freedesktop.DBus.InvokeContext, 'AddMatch', rule);
    }

    RemoveMatch(rule: string): Promise<void>
    {
        return this.ProxyMethodCall(freedesktop.DBus.InvokeContext, 'RemoveMatch', rule);
    }

    RequestName(name: string, flags: number): Promise<number>
    {
        return this.ProxyMethodCall(freedesktop.DBus.InvokeContext, 'RequestName', name, flags);
    }

    ReleaseName(name: string): Promise<number>
    {
        return this.ProxyMethodCall(freedesktop.DBus.InvokeContext, 'ReleaseName', name);
    }

    NameHasOwner(name: string): Promise<boolean>
    {
        return this.ProxyMethodCall(freedesktop.DBus.InvokeContext, 'NameHasOwner', name);
    }

    GetNameOwner(name: string): Promise<string>
    {
        return this.ProxyMethodCall(freedesktop.DBus.InvokeContext, 'GetNameOwner', name);
    }

    ListQueuedOwners(name: string): Promise<DBusArray<string>>
    {
        return this.ProxyMethodCall(freedesktop.DBus.InvokeContext, 'ListQueuedOwners', name);
    }

    ListNames(): Promise<DBusArray<string>>
    {
        return this.ProxyMethodCall(freedesktop.DBus.InvokeContext, 'ListNames');
    }

    ListActivatableNames(): Promise<DBusArray<string>>
    {
        return this.ProxyMethodCall(freedesktop.DBus.InvokeContext, 'ListActivatableNames');
    }

    StartServiceByName(name: string, flags: number): Promise<number>
    {
        return this.ProxyMethodCall(freedesktop.DBus.InvokeContext, 'StartServiceByName', name, flags);
    }

    readonly NameAcquired: DBusSignal<string>;
    readonly NameLost: DBusSignal<string>;
    readonly NameOwnerChanged: DBusSignal<[string, string, string]>;
}

class DBusSignalImpl<T> extends Subject<T> implements DBusSignal<T>
{
    constructor(MessageBus: TMessageBus, ObjectPath: DBusObjectPath, Interface: string, Signal: string)
    {
        super();
        this.MessageBus = MessageBus;

        const MatchPathNamespace = '*' === ObjectPath[ObjectPath.length - 1];

        this.ObjectPath = MatchPathNamespace ? ObjectPath.substring(0, ObjectPath.length - 1) : ObjectPath;
        this.Interface = Interface;
        this.Name = Signal;

        if (freedesktop.DBUS_PATH_DBUS !== this.ObjectPath)
        {
            if (MatchPathNamespace)
                this.MatchRules = `type='signal',interface='${this.Interface}',member='${this.Name}',path_namespace='${this.ObjectPath}'`;
            else
                this.MatchRules = `type='signal',interface='${this.Interface}',member='${this.Name}',path='${this.ObjectPath}'`;
        }
        else
            this.MatchRules = '';
    }

    Emit(...args: any[]): Promise<void>
    {
        return this.MessageBus.EmitSignal(this, ...args);
    }

    readonly ObjectPath: DBusObjectPath;
    readonly Interface: string;
    readonly Name: string;
    readonly MatchRules: string;

    protected OnActivate(): void
    {
        if (! TypeInfo.Assigned(this.OnMessageBusConnected))
        {
            this.OnMessageBusConnected = this.MessageBus.OnConnected.subscribe(next =>
                this.OnActivate());
        }

        if (this.MessageBus.IsConnected &&
            TypeInfo.Assigned(this.MatchRules) && this.observed)
        {
            this.MessageBus.AddMatch(this.MatchRules)
                .then(() => console.log(`%cDBus: AddMatch(${this.MatchRules})`, 'color:green'))
                .catch(err => console.log(`%cDBus: AddMatch failure: ${err.message}`, 'color:yellow'));
        }
    }

    protected OnDeactivate(): void
    {
        if (TypeInfo.Assigned(this.OnMessageBusConnected))
            this.OnMessageBusConnected.unsubscribe();
        this.OnMessageBusConnected = undefined;

        if (TypeInfo.Assigned(this.MatchRules))
        {
            this.MessageBus.RemoveMatch(this.MatchRules)
                .then(() => console.log(`%cDBus: RemoveMatch(${this.MatchRules})`, 'color:green'))
                .catch(err => console.log(`%cDBus: RemoveMatch failure: ${err.message}`, 'color:yellow'));
        }
    }

    protected readonly MessageBus: TMessageBus;
    private OnMessageBusConnected?: Subscription;

    /* Subject<T> */

    override subscribe(observer?: PartialObserver<T>): Subscription;
    override subscribe(next: (value: T) => void): Subscription;
    override subscribe(...args: any): Subscription
    {
        const Observer = new Observable(obs =>
        {
            const observed_before = this.observed;
            super.subscribe(obs);

            if (observed_before !== this.observed)
                this.OnActivate();

            return () =>
            {
                if (! this.observed)
                    this.OnDeactivate();
            };
        });
        return Observer.subscribe(...args);
    }

    override unsubscribe(): void
    {
        super.unsubscribe();
        this.OnDeactivate();
    }

    override error(err: any): void
    {
        console.log(`%cDBusSignal<T> should never do error()`, 'color:red');
    }

    override complete(): void
    {
        console.log(`%cDBusSignal<T> should never do complete()`, 'color:red');
    }
}
