import {InvHttp, InvTokenContext, InvCookies} from './inv.types';
import {TInvCookies} from './internal';

/* TInvokableClass */

export class TInvokableClass
{
    constructor(Ref: TInvokableClass)
    constructor(Headers: InvHttp.Headers)
    constructor(HeadersOrRef: InvHttp.Headers | TInvokableClass)
    {
        if (HeadersOrRef instanceof TInvokableClass)
            Object.assign(this, HeadersOrRef);
        else
        {
            this.Auth = Authorization.Get(HeadersOrRef);
            this.Cookies = TInvCookies.Create(HeadersOrRef);
        }
    }

    Headers: InvHttp.Headers;
    Auth?: InvTokenContext;
    Cookies: InvCookies;
    Queries: InvHttp.Queries;
    Content: InvHttp.Content;
}
