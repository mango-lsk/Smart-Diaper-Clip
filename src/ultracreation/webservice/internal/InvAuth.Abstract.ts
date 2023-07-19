import {InvAuth, InvTokenContext, InvHttp} from '../inv.types';
import {} from '../inv.types';

// @TypeInfo.StaticImplements<InvAuthConstructor>()
export abstract class InvAbstractAuth implements InvAuth
{
    readonly Header: string = 'Authorization';
    readonly Type: string = 'Basic';

    constructor(protected Password: string, protected Algorithm: string)
    {
    }

    abstract Generate(Timeout: number, Ctx: InvTokenContext): string;

    abstract Get(Token: string): InvTokenContext;
    abstract Get(Headers: InvHttp.Headers): InvTokenContext;
    abstract Get(TokenOrHeaders: InvHttp.Headers | string): InvTokenContext;

    abstract Update(Timeout: number, Token: string): string;
    abstract Update(Timeout: number, Ctx: InvTokenContext): string;
    abstract Update(Timeout: number, CtxOrToken: InvTokenContext | string): string;
}
