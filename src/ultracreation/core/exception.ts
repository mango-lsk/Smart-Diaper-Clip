import {TypeInfo} from './typeinfo';

export class Exception extends Error
{
    static Throw(...args: any[]): void
    {
        throw this.Create(...args);
    }

    static Create(...args: any[]): Exception
    {
        return new (this as any)(...args);
    }

    constructor(message = '')
    {
        super();

        Object.setPrototypeOf(this, new.target.prototype);
        this.message = message;
    }

    override toString(): string
    {
        return `${this.name}: ${this.message}`;
    }
}

export class EAbort extends Exception
{
    constructor(message?: string)
    {
        if (TypeInfo.Assigned(message))
            super(message);
        else
            super('e_abort');
    }
}

export class ENotSupported extends EAbort
{
    constructor(message?: string)
    {
        if (TypeInfo.Assigned(message))
            super(message);
        else
            super('e_not_supported');
    }
}

export class EInvalidArg extends Exception
{
    constructor(message?: string)
    {
        if (TypeInfo.Assigned(message))
            super(message);
        else
            super('e_invalid_arg');
    }
}

export class ERange extends Exception
{
    constructor(message?: string)
    {
        if (TypeInfo.Assigned(message))
            super(message);
        else
            super('e_range');
    }
}

export class ENotImplemented extends Exception
{
    constructor(message?: string)
    {
        if (TypeInfo.Assigned(message))
            super(message);
        else
            super('e_not_implemented');
    }
}

export class EUsage extends Exception
{
    constructor(message?: string)
    {
        if (TypeInfo.Assigned(message))
            super(message);
        else
            super('e_usage');
    }
}

export class ETimedout extends EAbort
{
    constructor(message?: string)
    {
        if (TypeInfo.Assigned(message))
            super(message);
        else
            super('e_timed_out');
    }
}

export class EExists extends EAbort
{
    constructor(message?: string)
    {
        if (TypeInfo.Assigned(message))
            super(message);
        else
            super('e_exists');
    }
}

export class EEncoding extends Exception
{
    constructor(message?: string)
    {
        if (TypeInfo.Assigned(message))
            super(message);
        else
            super('e_encoding');
    }
}

export class ENoConnection extends EAbort
{
    constructor(message?: string)
    {
        if (TypeInfo.Assigned(message))
            super(message);
        else
            super('e_no_connection');
    }
}

export class EDisconnected extends EAbort
{
    constructor(message?: string)
    {
        if (TypeInfo.Assigned(message))
            super(message);
        else
            super('e_disconnected');
    }
}
