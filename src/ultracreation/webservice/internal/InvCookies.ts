import {TypeInfo } from '../../core/typeinfo';
import {InvHttp, InvCookies, InvCookie, InvCookieOptions} from '../inv.types';

@TypeInfo.Sealed()
export class TInvCookies implements InvCookies
{
    static Create(Headers: InvHttp.Headers): TInvCookies
    {
        const Cookies = new TInvCookies();

        if (TypeInfo.Assigned(Headers.cookie))
        {
            const Lines = Headers.cookie.split(';');
            for (const Line of Lines)
            {
                const Idx = Line.indexOf('=');
                const Key = Line.substring(0, Idx).trim();
                try
                {
                    const Value = decodeURIComponent(Line.substring(Idx + 1));

                    if (Value[0] === '{' && Value[Value.length - 1] === '}')
                        Cookies[Key] = JSON.parse(Value);
                    else
                        Cookies[Key] = Value;
                }
                catch (err)
                {
                }
            }
        }

        return Cookies;
    }

    private constructor()
    {
    }

    SetCookie(Name: string, Value: string | object): void;
    SetCookie(Name: string, Value: string | object, Timeout: number): void;
    SetCookie(Name: string, Value: string | object, Opts: InvCookieOptions): void;
    SetCookie(Name: string, Value: any, TimeoutOrOpts?: InvCookieOptions | number): void
    {
        if (Name === 'SetCookies@private')
            return;
        let Opts: InvCookieOptions;

        if (! TypeInfo.Assigned(TimeoutOrOpts))
            Opts = {};
        else if (TypeInfo.IsNumber(TimeoutOrOpts))
            Opts = {Age: TimeoutOrOpts};
        else
            Opts = TimeoutOrOpts;

        if (! TypeInfo.IsString(Value))
            Value = JSON.stringify(Value);

        this['SetCookies@private'].set(Name, {Name, Value, Opts});
    }

    Remove(Name: string): void
    {
        if (Name === 'SetCookies@private')
            return;
        if (TypeInfo.Assigned(this[Name]))
            this['SetCookies@private'].set(Name, {Name, Value: '', Opts: {Age: 0}});
    }

    Clear(): void
    {
        for (const Name of Object.keys(this))
        {
            if (Name === 'SetCookies@private')
                continue;
            this['SetCookies@private'].set(Name, {Name, Value: '', Opts: {Age: 0}});
        }
    }

    [Name: string]: string | object;
    'SetCookies@private' = new Map<string, InvCookie>();
}
