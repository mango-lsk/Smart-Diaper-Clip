import {TypeInfo} from '../core/typeinfo';
import * as Std from '../core/exception';

export namespace DBusError
{
    export enum Names
    {
        Failed = 'org.freedesktop.DBus.Error.Failed',
        NotSupported = 'org.freedesktop.DBus.Error.NotSupported',
        NoMemory = 'org.freedesktop.DBus.Error.NoMemory',
        IOError = 'org.freedesktop.DBus.Error.IOError',
        Timedout = 'org.freedesktop.DBus.Error.TimedOut',
        Disconnected = 'org.freedesktop.DBus.Error.Disconnected',
        InconsistentMessage = 'org.freedesktop.DBus.Error.InconsistentMessage',
        AuthFailed = 'org.freedesktop.DBus.Error.AuthFailed',
        AccessDenied = 'org.freedesktop.DBus.Error.AccessDenied',
        ObjectPathInUse = 'org.freedesktop.DBus.Error.ObjectPathInUse',
        PropertyReadOnly = 'org.freedesktop.DBus.Error.PropertyReadOnly',

        ServiceUnknown = 'org.freedesktop.DBus.Error.ServiceUnknown',
        NameHasNoOwner = 'org.freedesktop.DBus.Error.NameHasNoOwner',
        NoReply = 'org.freedesktop.DBus.Error.NoReply',
        InvalidArgs = 'org.freedesktop.DBus.Error.InvalidArgs',
        InvalidSignature = 'org.freedesktop.DBus.Error.InvalidSignature',

        UnknownObject = 'org.freedesktop.DBus.Error.UnknownObject',
        UnknownInterface = 'org.freedesktop.DBus.Error.UnknownInterface',
        UnknownMethod = 'org.freedesktop.DBus.Error.UnknownMethod',
        UnknownProperty = 'org.freedesktop.DBus.Error.UnknownProperty',

        MatchRuleNotFound = 'org.freedesktop.DBus.Error.MatchRuleNotFound',
        MatchRuleInvalid = 'org.freedesktop.DBus.Error.MatchRuleInvalid',

    /* no mapping:
        BadAddress = 'org.freedesktop.DBus.Error.BadAddress',
        LimitsExceeded = 'org.freedesktop.DBus.Error.LimitsExceeded',
        NoServer = 'org.freedesktop.DBus.Error.NoServer',
        NoNetwork = 'org.freedesktop.DBus.Error.NoNetwork',
        AddressInUse = 'org.freedesktop.DBus.Error.AddressInUse',
        FileNotFound = 'org.freedesktop.DBus.Error.FileNotFound',
        FileExists = 'org.freedesktop.DBus.Error.FileExists',

        InvalidFileContent = 'org.freedesktop.DBus.Error.InvalidFileContent',
        SELinuxSecurityContextUnknown = 'org.freedesktop.DBus.Error.SELinuxSecurityContextUnknown',
        AdtAuditDataUnknown = 'org.freedesktop.DBus.Error.AdtAuditDataUnknown',
        InteractiveAuthorizationRequired = 'org.freedesktop.DBus.Error.InteractiveAuthorizationRequired',
        NotContainer = 'org.freedesktop.DBus.Error.NotContainer',
    */
    }

    export class EInvalidPacket extends Std.EAbort
    {
    }

    export class EInvalidArg extends Std.EInvalidArg
    {
    }

    export class ETimedout extends Std.ETimedout
    {
    }

    export class ENoConnection extends Std.ENoConnection
    {
    }

    export class EDisconnected extends Std.EDisconnected
    {
    }

    export class EAuthroizationFailure extends Std.EAbort
    {
        constructor(message?: string)
        {
            if (TypeInfo.Assigned(message))
                super(message);
            else
                super('e_auth_fail');
        }
    }

    export class EUnknownInterface extends Std.EAbort
    {
        constructor(message?: string)
        {
            if (TypeInfo.Assigned(message))
                super(message);
            else
                super('e_unknown_interface');
        }
    }

    export class EUnknownMethod extends Std.EAbort
    {
        constructor(message?: string)
        {
            if (TypeInfo.Assigned(message))
                super(message);
            else
                super('e_unknown_method');
        }
    }

    export class EUnknownPrpoperty extends Std.EAbort
    {
        constructor(message?: string)
        {
            if (TypeInfo.Assigned(message))
                super(message);
            else
                super('e_unknown_property');
        }
    }

    export class EUnknownSignal extends Std.EAbort
    {
        constructor(message?: string)
        {
            if (TypeInfo.Assigned(message))
                super(message);
            else
                super('e_unknown_signal');
        }
    }

    export class EInvalidSignature extends Std.EAbort
    {
        constructor(message?: string)
        {
            if (TypeInfo.Assigned(message))
                super(message);
            else
                super('e_invalid_signature');
        }
    }

    export class EPropertyReadOnly extends Std.EAbort
    {
        constructor(message?: string)
        {
            if (TypeInfo.Assigned(message))
                super(message);
            else
                super('e_property_readonly');
        }
    }

    export class ENoReply extends Std.EAbort
    {
        constructor(message?: string)
        {
            if (TypeInfo.Assigned(message))
                super(message);
            else
                super('e_no_reply');
        }
    }

    export function CreateRemoteError(Id: string): Std.Exception
    {
        const Cls = Mapping.get(Id);

        if (TypeInfo.Assigned(Cls))
            return new Cls(Id);
        else
            return new Std.Exception(Id);
    }

    export function RegisterError(Id: string, Cls: typeof Std.Exception): void
    {
        if (TypeInfo.Assigned(Mapping.get(Id)))
            console.log(`%cDBus Error '${Id}' is already registered.`, 'color:yellow');
        else
            Mapping.set(Id, Cls);
    }

    const Mapping = new Map<string, typeof Std.Exception>();

/* possiable DBus Protocol mapping to Exceptions */
    RegisterError(Names.Failed, Std.Exception);
    RegisterError(Names.NotSupported, Std.ENotSupported);
    RegisterError(Names.NoMemory, Std.Exception);
    RegisterError(Names.IOError, Std.Exception);
    RegisterError(Names.Timedout, ETimedout);
    RegisterError(Names.Disconnected, EDisconnected);
    RegisterError(Names.InconsistentMessage, Std.Exception);
    RegisterError(Names.AuthFailed, EAuthroizationFailure);
    RegisterError(Names.AccessDenied, Std.EAbort);
    RegisterError(Names.ObjectPathInUse, Std.EAbort);
    RegisterError(Names.PropertyReadOnly, EPropertyReadOnly);

    RegisterError(Names.ServiceUnknown, Std.EAbort);
    RegisterError(Names.NameHasNoOwner, Std.EAbort);
    RegisterError(Names.InvalidArgs, Std.EInvalidArg);
    RegisterError(Names.InvalidSignature, EInvalidSignature);
    RegisterError(Names.NoReply, ENoReply);

    RegisterError(Names.UnknownObject, Std.EAbort);
    RegisterError(Names.UnknownInterface, EUnknownInterface);
    RegisterError(Names.UnknownMethod, EUnknownMethod);
    RegisterError(Names.UnknownProperty, EUnknownPrpoperty);

    RegisterError(Names.MatchRuleNotFound, Std.EAbort);
    RegisterError(Names.MatchRuleInvalid, Std.EAbort);
}
