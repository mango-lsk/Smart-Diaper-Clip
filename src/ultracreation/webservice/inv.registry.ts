import {TypeInfo} from '../core/typeinfo';
import {EInvalidArg} from '../core/exception';

import {TInvokableClass} from './inv.context';
import {InvError, InvClientError} from './inv.error';
import {InvHttp} from './inv.types';

/* basic types */

export type TInvGetMethod = (Queries: InvHttp.Queries, Content?: InvHttp.Content) => any | Promise<any>;
export type TInvDeleteMethod = (Queries: InvHttp.Queries, Content?: InvHttp.Content) => any | Promise<any>;

export type TInvPostMethod = (Content: InvHttp.Content, Queries?: InvHttp.Queries) => any | Promise<any>;
export type TInvPutMethod = (Content: InvHttp.Content, Queries?: InvHttp.Queries) => any | Promise<any>;
export type TInvPatchMethod = (Content: InvHttp.Content, Queries?: InvHttp.Queries) => any | Promise<any>;

export type TInvMethod = TInvGetMethod | TInvDeleteMethod | TInvPostMethod | TInvPutMethod | TInvPatchMethod;

/* class metadata */

export interface InvOptions
{
    /** force using ContentType overrides request/response's Content-Type */
    ContentType?: InvHttp.ContentType;
}

const DefaultInvOptions: InvOptions =
{
};

export interface InvClassMetadata
{
    readonly ExportName?: string;
    readonly IsExported: boolean;

    readonly Options: InvOptions;
    readonly Methods: Array<InvMethodMetadata>;

    GetInstance(Headers: InvHttp.Headers): TInvokableClass;
    toString(): string;
}

class TInvClassMetadata implements InvClassMetadata
{
    constructor(private Creator: typeof TInvokableClass)
    {
    }

    GetMethodMetadata(Name: string): TInvMethodMetadata
    {
        let metadata = this._Methods.get(Name);

        if (! TypeInfo.Assigned(metadata))
        {
            metadata = new TInvMethodMetadata(this, Name);
            this._Methods.set(Name, metadata);
        }

        return metadata;
    }

    RequiredHeaders?: Map<string, typeof InvError>;

/* InvClassMetadata */

    ExportName?: string;

    get IsExported(): boolean
    {
        return TypeInfo.Assigned(this.ExportName) && this._Methods.size > 0;
    }

    Options: InvOptions;

    get Methods(): Array<InvMethodMetadata>
    {
        const ary = new Array<InvMethodMetadata>();

        const Methods = this._Methods.values();
        for (let iter = Methods.next(); ! iter.done; iter = Methods.next())
            ary.push(iter.value);

        return ary;
    }

    GetInstance(Headers: InvHttp.Headers): TInvokableClass
    {
        return new this.Creator(Headers);
    }

    toString(): string
    {
        return this.ExportName;
    }

    private _Methods = new Map<string, TInvMethodMetadata>();
}

/* method metadata */

export interface InvMethodMetadata
{
    readonly Name: string;

    InvokeCheck(Headers: InvHttp.Headers, Method: InvHttp.Method, Queries: InvHttp.Queries, Content: InvHttp.Content): void;
    Invoke(Instance: any, Method: InvHttp.Method, Queries: InvHttp.Queries, Content: InvHttp.Content): any | Promise<any>;
}

class TInvMethodMetadata implements InvMethodMetadata
{
    constructor(private Owner: TInvClassMetadata, public Name: string)
    {
    }

    Entry: TInvMethod;

    get Implements(): InvHttp.Methods
    {
        if (this._Implements.has('ALL'))
            return 'ALL';
        else
            return Array.from(this._Implements.values()) as InvHttp.Methods;
    }

    set Implements(value: InvHttp.Methods)
    {
        if (this._Implements.has('ALL'))
            return;

        if (TypeInfo.IsString(value))
        {
            if (value === 'ALL')
                this._Implements.clear();

            this._Implements.add(value);
        }
        else
            value.forEach(v => this._Implements.add(v));
    }

    RequiredParams?: string[];
    RequiredHeaders?: Map<string, typeof InvError>;

    InvokeCheck(Headers: InvHttp.Headers, Method: InvHttp.Method, Queries: InvHttp.Queries, Content: InvHttp.Content): void
    {
        if (! this._Implements.has('ALL') && ! this._Implements.has(Method.toUpperCase()))
            throw new InvClientError.EMethodNotAllowed();

        let HeaderNames: string[];

        if (TypeInfo.Assigned(this.Owner.RequiredHeaders))
        {
            HeaderNames = Object.keys(Headers);
            const Requires = this.Owner.RequiredHeaders.entries();

            for (let Required = Requires.next(); ! Required.done; Required = Requires.next())
            {
                if (HeaderNames.indexOf(Required.value[0]) === -1)
                    throw new Required.value[1]();
            }
        }

        if (TypeInfo.Assigned(this.RequiredHeaders))
        {
            if (! TypeInfo.Assigned(HeaderNames))
                HeaderNames = Object.keys(Headers);
            const Requires = this.RequiredHeaders.entries();

            for (let Required = Requires.next(); ! Required.done; Required = Requires.next())
            {
                if (HeaderNames.indexOf(Required.value[0]) === -1)
                    throw new Required.value[1]();
            }
        }

        if (TypeInfo.Assigned(this.RequiredParams))
        {
            let QueryKeys: Array<string>;
            let ContentKeys: Array<string>;

            if (TypeInfo.Assigned(Queries))
                QueryKeys = Object.keys(Queries);
            else
                QueryKeys = [];

            if (TypeInfo.Assigned(Content))
                ContentKeys = Object.keys(Content);
            else
                ContentKeys = [];

            for (const Required of this.RequiredParams)
            {
                if (QueryKeys.indexOf(Required) === -1 && ContentKeys.indexOf(Required) === -1)
                    throw new EInvalidArg();
            }
        }
    }

    Invoke(Instance: any, Method: InvHttp.Method, Queries: InvHttp.Queries, Content: InvHttp.Content): any | Promise<any>
    {
        if (this._Implements.has('ALL'))
            return this.Entry.bind(Instance)(Queries, Content, Method);

        switch (Method)
        {
        case 'GET':
        case 'DELETE':
            return this.Entry.bind(Instance)(Queries, Content);

        case 'POST':
        case 'PUT':
        case 'PATCH':
            return this.Entry.bind(Instance)(Content, Queries);
        }
    }

    private _Implements = new Set<string>();
}

/* Registry */

export namespace InvRegistry
{
    export function ForEachInvokableClass(cb: (metadata: InvClassMetadata) => void): void
    {
        const InvClasses = _InvRegistry.values();
        for (let iter = InvClasses.next(); ! iter.done; iter = InvClasses.next())
            cb(iter.value);
    }
}

const _InvRegistry = new Map<object, InvClassMetadata>();

function GetClassMetadata(constructor: any): TInvClassMetadata
{
    let metadata = _InvRegistry.get(constructor) as TInvClassMetadata;
    if (! TypeInfo.Assigned(metadata))
    {
        metadata = new TInvClassMetadata(constructor as typeof TInvokableClass);
        _InvRegistry.set(constructor, metadata);
    }

    return metadata;
}

/* Decorators */

/**
 *  Register a Class to WebService
 *      example: 'http://host/rest/exported_class/...<methods>'
 *
 */
export function Invokable(ExportName: string, Opts?: InvOptions)
{
    return (constructor: any) =>
    {
        const metadata = GetClassMetadata(constructor) as TInvClassMetadata;

        metadata.ExportName = ExportName;
        metadata.Options = Object.assign({}, DefaultInvOptions, Opts);
    };
}

/**
 *  Implement Invokable Class's method
 *      example: 'http://host/rest/exported_class/method'
 *
 *  @param Implements
 *      implements HTTP methods 'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE' | ['GET' | 'POST' | 'PUT' | 'DELETE']
 *      sending InvClientError.EMethodNotAllowed(status 405) if client use HTTP method not inside Implements
 *
 *  @param RequiredParams
 *      require parameters persistent in requiest.query
 *      sending EInvalidArg(suggest status 400) when error
 *
 *  @param IsDefault
 *      mount method to path root
 */
export function Implement(Implements: InvHttp.Methods, RequiredParams?: string[], IsDefault?: true): any
{
    return (Cls: object, Key: string, Descriptor: PropertyDescriptor) =>
    {
        const metadata = GetClassMetadata(Cls.constructor) as TInvClassMetadata;
        const method_metadata = metadata.GetMethodMetadata(Key);

        if (IsDefault)
            method_metadata.Name = '';  // change to implement as '/'

        method_metadata.Entry = Descriptor.value;
        method_metadata.Implements = Implements;

        if (TypeInfo.Assigned(RequiredParams))
        {
            if (TypeInfo.Assigned(method_metadata.RequiredParams))
                method_metadata.RequiredParams = RequiredParams.concat(method_metadata.RequiredParams);
            else
               method_metadata.RequiredParams = RequiredParams;
        }
    };
}

/**
 *  Implement Invokable Class's method as root
 *      example: 'http://host/rest/export_class/'
 *
 *  same as Implement(Implements, RequiredParams, true)
 *
 *  @param Implements
 *      implements HTTP methods 'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE' | ['GET' | 'POST' | 'PUT' | 'DELETE']
 *      sending InvClientError.EMethodNotAllowed(status 405) if client use HTTP method not inside Implements
 *
 *  @param RequiredParams
 *      require parameters persistent in requiest.query
 *      sending EInvalidArg(suggest status 400) when error
 */
export function DefaultImplement(Implements: InvHttp.Methods, RequiredParams?: string[]): any
{
    return Implement(Implements, RequiredParams, true);
}

export function RequireHeader(Headers: string[], ErrorType: typeof InvError = InvClientError.EBadRequest): any
{
    return (Cls: any, Key: string, Descriptor: PropertyDescriptor) =>
    {
        // register into classes's RequiredHeaders
        if (TypeInfo.IsFunction(Cls))
        {
            const metadata = GetClassMetadata(Cls) as TInvClassMetadata;

            if (! TypeInfo.Assigned(metadata.RequiredHeaders))
                metadata.RequiredHeaders = new Map<string, typeof InvError>();

            for (const Header of Headers)
                metadata.RequiredHeaders.set(Header.toLowerCase(), ErrorType);
        }
        // register into method's RequiredHeaders
        else
        {
            const metadata = GetClassMetadata(Cls.constructor) as TInvClassMetadata;
            const method_metadata = metadata.GetMethodMetadata(Key);

            if (! TypeInfo.Assigned(method_metadata.RequiredHeaders))
                method_metadata.RequiredHeaders = new Map<string, typeof InvError>();

            for (const Header of Headers)
                method_metadata.RequiredHeaders.set(Header.toLowerCase(), ErrorType);
        }
    };
}

/**
 *  require 'Authorization' in HTTP header
 *      response InvClientError.EUnauthorized(401) if 'Authorization' not persistent
 */
export function RequireAuth(): any
{
    if (TypeInfo.UNDEFINED !== typeof Authorization)
        return RequireHeader([Authorization.Header], InvClientError.EUnauthorized);
    else
        console.log('%cRequireAuth failured: use InvAuth.Initialize first.', 'color:red');
}

/**
 *  Indicated exported function is deprecated
 *
 *  @param RedirectTo
 *      send redirect to client
 */
export function Deprecated(RedirectTo?: string): any
{
}
