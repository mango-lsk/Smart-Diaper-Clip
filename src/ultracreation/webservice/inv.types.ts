import {TypeInfo} from '../core/typeinfo';
import '../core/http/header';

/** Cookie Manager */

export interface InvCookies
{
    readonly [Name: string]: string | object;

    SetCookie(Name: string, Value: string | object): void;
    SetCookie(Name: string, Value: string | object, Timeout: number): void;
    SetCookie(Name: string, Value: string | object, Opts: InvCookieOptions): void;

    Remove(Name: string): void;
    Clear(): void;
}

/** Cookie */

export interface InvCookieOptions
{
    Domain?: string;
    Path?: string;
    Expires?: Date;
    Age?: number;
    Secure?: true;
    HttpOnly?: true;
    SameSite?: string;
}

export interface InvCookie
{
    Name: string;
    Value: string;
    Opts?: InvCookieOptions;
}

/** Authorization */

declare global
{
/* extends StorageEngine to window global variable */

    let Authorization: InvAuth | undefined;

    namespace NodeJS
    {
        interface Global
        {
            Authorization: InvAuth | undefined;
        }
    }
}
declare var global: any;

export type InvAuthConstructor = new (Password: string, Algorithm: string) => InvAuth;

export interface InvAuth
{
    readonly Header: string;
    readonly Type: string;

    Generate(Timeout: number, Ctx: InvTokenContext): string;

    Get(Token: string): InvTokenContext;
    Get(Headers: InvHttp.Headers): InvTokenContext | undefined;

    Update(Timeout: number, Token: string): string;
    Update(Timeout: number, Ctx: InvTokenContext): string;
}

export namespace InvAuth
{
    export function Initialize(AuthorizeType: InvAuthConstructor,
        Password: string, Algorithm: string = 'aes128'): void
    {
        global.Authorization = new AuthorizeType(Password, Algorithm);
        console.log('Authorization Initialized: ' + global.Authorization.Type);
    }
}

export interface InvTokenContext
{
    Id: string;
    [Name: string]: TypeInfo.Primitive;
}

export namespace InvHttp
{
    export enum InvSuccess
    {
        OK                              = 200,
        Created                         = 201,
        Accepted                        = 202,
        // Non-Authoritative Information (since HTTP/1.1)   203
        NoContent                       = 204,
        ResetContent                    = 205,  // plus to 204, this response requires that the requester reset the document view.
        PartialContent                  = 206,
        MultiStatus                     = 207,
        AlreadyReported                 = 208,
        IMUsed                          = 226
    }

    export type Headers = TypeInfo.IndexSignature;
    export type Queries = TypeInfo.IndexSignature<string> | undefined;
    export type ContentType = XMLHttpRequestResponseType;
    export type Content = string | Document | object | undefined;

    export type Method = Http.Method;
    export type Methods = 'ALL' | Method | Method[];

    export function ParseRequestContentType(_ContentType: string): ContentType
    {
        let Types = _ContentType.toLowerCase().split(';');
        if (! TypeInfo.Assigned(Types))
            return '';

        /** todo deal with Optional */
        /*
        let Optional: string;
        if (Types.length > 1)
            Optional = Types[1].trim();
        else
            Optional = '';
        */

        Types = Types[0].split('/');
        if (! TypeInfo.Assigned(Types))
            return '';

        const Type = Types[0].trim();
        const SubType = Types[1].trim();

        if (Type === 'text')
        {
            if (SubType === 'html')
                return 'document';
            else
                return 'text';
        }

        if (Type === 'application')
        {
            switch (SubType)
            {
            case 'json':
                return 'json';
            case 'xml':
                return 'document';

            default:
                return 'arraybuffer';
            }
        }

        if (Type === 'audio' || Type === 'video')
            return 'blob';
        else
            return 'arraybuffer';
    }
}
