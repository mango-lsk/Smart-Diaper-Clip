import {Subject, lastValueFrom} from 'rxjs';

import {TypeInfo} from '../typeinfo';
import {Exception} from '../exception';

import * as Header from './header';

/* Exceptions */

export class EHttpClient extends Exception
{
    constructor(ResponseOrStatus: THttpResponse | number)
    {
        super();

        if (ResponseOrStatus instanceof THttpResponse)
        {
            this.Response = ResponseOrStatus;
            this.Status = ResponseOrStatus.Status;

            this.message = this.Response.Content;
        }
        else
        {
            this.Status = ResponseOrStatus;

            // http server error
            if (this.Status >= 500 && this.Status < 600)
                this.message = `HTTP Server Error: ${this.Status}`;
            // http client error
            else if (this.Status >= 400)
                this.message = `HTTP Client Error: ${this.Status}`;
            // http redirection
            else if (this.Status >= 300)
                this.message = `HTTP Redirection:  ${this.Status}`;
            // http successful
            else if (this.Status >= 200)
                this.message = `HTTP Successful: ${this.Status}`;
            // http informational
            else if (this.Status >= 100)
                this.message = `HTTP Informational ${this.Status}`;
            else if (this.Status === -1)
                this.message = 'HTTP Request Error';
            else if (this.Status === -2)
                this.message = 'HTTP Request Timeout';
            else
                this.message = `HTTP Unknown Status: ${this.Status}`;
        }
    }

    Status: number;
    Response?: THttpResponse;
}

export class EHttpRequest extends EHttpClient
{
    constructor()
    {
        super(-1);
    }
}

export class EHttpRequestTimeout extends EHttpClient
{
    constructor()
    {
        super(-2);
        this.message = 'network_unavailable';
    }
}

/* THttpClient */

export class THttpClient
{
    static Get<T>(Path: string, ResponseType?: XMLHttpRequestResponseType): Promise<T>;
    static Get<T>(Path: string, Queries?: object, ResponseType?: XMLHttpRequestResponseType): Promise<T>;
    static Get<T>(Path: string, Queries?: object | XMLHttpRequestResponseType, ResponseType?: XMLHttpRequestResponseType): Promise<T>
    {
        if (! TypeInfo.Assigned(ResponseType) && TypeInfo.IsString(Queries))
        {
            ResponseType = Queries as XMLHttpRequestResponseType;
            Queries = undefined;
        }

        return new THttpClient(ResponseType).Get(Path, Queries).WaitFor()
            .then(req => req?.Content);
    }

    constructor(ResponseType?: XMLHttpRequestResponseType, BaseUrl?: string,
        ...headers: [Http.RequestHeaders, string][]);
    constructor(ResponseType?: XMLHttpRequestResponseType,
        ...headers: [Http.RequestHeaders, string][])
    constructor(ResponseType: XMLHttpRequestResponseType = '',
        UrlOrHeader?: string | [Http.RequestHeaders, string],
        ...headers: [Http.RequestHeaders, string][])
    {
        this.ResponseType = ResponseType;

        if (TypeInfo.Assigned(UrlOrHeader))
        {
            if (TypeInfo.IsString(UrlOrHeader))
                this.BaseUrl = UrlOrHeader;
            else
                this.Headers.Set(UrlOrHeader[0], UrlOrHeader[1]);
        }

        for (const header of headers)
            this.Headers.Set(header[0], header[1]);
    }

    Head(Path: string, Queries?: object | string): THttpRequest
    {
        return new THttpRequest(this, 'HEAD', this.BuildUri(Path, Queries));
    }

    Get(Path: string, Queries?: object | string): THttpRequest
    {
        return new THttpRequest(this, 'GET', this.BuildUri(Path, Queries));
    }

    Delete(Path: string, Queries?: object | string): THttpRequest
    {
        return new THttpRequest(this, 'DELETE', this.BuildUri(Path, Queries));
    }

    Post(Path: string, Content: any): THttpRequest;
    Post(Path: string, Quereis: object | string, Content: any): THttpRequest;
    Post(Path: string, ContentOrQueries?: object | string, Content?: any): THttpRequest
    {
        let Queries: any;

        if (TypeInfo.Assigned(Content))
            Queries = ContentOrQueries;
        else
            Content = ContentOrQueries;

        this.SetContentType(Content);
        return new THttpRequest(this, 'POST', this.BuildUri(Path, Queries), Content);
    }

    Put(Path: string, Content: any): THttpRequest;
    Put(Path: string, Quereis: object | string, Content: any): THttpRequest;
    Put(Path: string, ContentOrQueries?: any, Content?: any): THttpRequest
    {
        let Queries: object | undefined;

        if (TypeInfo.Assigned(Content))
            Queries = ContentOrQueries;
        else
            Content = ContentOrQueries;

        this.SetContentType(Content);
        return new THttpRequest(this, 'PUT', this.BuildUri(Path, Queries), Content);
    }

    // Connect()
    // {

    // }

    // Options()
    // {

    // }

    // Trace()
    // {

    // }

    // Patch()
    // {

    // }

    Authorization(Type: Http.Authroization, Token: string)
    {
        this.Headers.Set('Authorization', Type + ' ' + Token);
    }

    UrlEncode(Queries: TypeInfo.IndexSignature<string>): string
    {
        return (this.constructor as typeof THttpClient).UrlEncode(Queries);
    }

    static UrlEncode(Queries: TypeInfo.IndexSignature<string>): string
    {
        const Builder = new Array<string>();

        for (const Key of Object.keys(Queries))
        {
            // tslint:disable-next-line:ban-types
            const Value = (Queries as any)[Key] as Object;

            if (TypeInfo.IsPrimitive(Value))
                Builder.push(`${Key}=${encodeURIComponent(Value.toString())}`, '&');
            else
                Builder.push(`${Key}=${encodeURIComponent(JSON.stringify(Value))}`, '&');
        }
        // pop '&'
        Builder.pop();

        return Builder.join('');
    }

    protected SetContentType(Content?: any): void
    {
        // if set
        if (TypeInfo.Assigned(this.Headers.Get('Content-Type'))) {
            return;
        }

        const ContentType = typeof Content;
        switch (ContentType)
        {
        case TypeInfo.BOOLEAN:
        case TypeInfo.NUMBER:
        case TypeInfo.STRING:
            if (this.ResponseType === 'document')
                this.Headers.Set('Content-Type', 'text/html;charset=utf-8');
            else
                this.Headers.Set('Content-Type', 'text/plain;charset=utf-8');
            break;
        case TypeInfo.OBJECT:
            if (Content instanceof FormData)
            {
                // this.Headers.Set('Content-Type', 'multipart/form;charset=utf-8');
            }
            else
                this.Headers.Set('Content-Type', 'application/json;charset=utf-8');
            break;

        case TypeInfo.UNDEFINED:
        case TypeInfo.FUNCTION:
        default:
            break;
        }
    }

    protected BuildUri(Path: string, Queries?: object | string): string
    {
        const Builder = new Array<string>();

        if (TypeInfo.Assigned(this.BaseUrl))
        {
            if (this.BaseUrl.length > 1 && this.BaseUrl[this.BaseUrl.length - 1] !== '/' && Path[0] !== '/')
                Builder.push(`${this.BaseUrl}/${Path}`);
            else
                Builder.push(`${this.BaseUrl}${Path}`);
        }
        else
            Builder.push(Path);

        if (TypeInfo.Assigned(Queries))
        {
            Builder.push('?');

            if (! TypeInfo.IsString(Queries))
            {
                for (const Key of Object.keys(Queries))
                {
                    // TODO: test setter only properties
                    // tslint:disable-next-line:ban-types
                    const Value = (Queries as any)[Key] as Object;

                    if (TypeInfo.IsPrimitive(Value))
                        Builder.push(`${Key}=${encodeURIComponent(Value.toString())}`, '&');
                    else
                        Builder.push(`${Key}=${encodeURIComponent(JSON.stringify(Value))}`, '&');
                }
                // pop '?' or '&'
                Builder.pop();
            }
            else
                Builder.push(encodeURIComponent(Queries));
        }

        const RetVal = Builder.join('');

        if (RetVal.length > 1024)
            console.log('%crequest url is above 1024 length', 'color:red');

        return RetVal;
    }

    ResponseType: XMLHttpRequestResponseType = '';
    BaseUrl?: string;
    Headers = new Header.TRequestHeader();

    WithCredentials = false;
    Timeout = 8000;
}

/* THttpRequest */

export class THttpRequest extends Subject<THttpResponse>
{
    constructor(Owner: THttpClient, Method: Http.Method, Url: string, Content?: any)
    {
        super();

        this.xhr = new XMLHttpRequest();
        this.xhr.responseType = Owner.ResponseType;
        this.xhr.withCredentials = Owner.WithCredentials;
        this.xhr.timeout = Owner.Timeout;

        this.Response = new THttpResponse(this.xhr);
        THttpRequest.StartMonitor(this.xhr, this, this.Response);

        this.xhr.open(Method, Url);
        Owner.Headers.AssignTo(this.xhr, Method);

        /*
        for (let i = 0; i < Owner.customHeaders.length; i++) {
           this.xhr.setRequestHeader(Owner.customHeaders[i][0], Owner.customHeaders[i][1]);
        }
        */

        if (TypeInfo.Assigned(Content) && (Method === 'PUT' || Method === 'POST'))
        {
            if (TypeInfo.IsString(Content))
                this.xhr.send(Content);
            else if (TypeInfo.IsObject(Content))
            {
                if (Content instanceof FormData)
                    this.xhr.send(Content);
                else
                    this.xhr.send(JSON.stringify(Content));
            }
            else
                this.xhr.send(JSON.stringify(Content));
        }
        else
            this.xhr.send(null);
    }

    WaitFor(): Promise<THttpResponse>
    {
        return lastValueFrom(this);
    }

    Abort(): void
    {
        this.xhr.abort();
    }

    get Status(): number
    {
        return this.xhr.status;
    }

    get StatusText(): string
    {
        return this.xhr.statusText;
    }

    private static StartMonitor(xhr: XMLHttpRequest, Request: THttpRequest, Response: THttpResponse)
    {
        xhr.onabort = ev =>
        {
            Request.OnAbort.next();
        };

        xhr.onprogress = ev =>
        {
            Request.OnProgress.next(ev);
        };

        xhr.onload = ev =>
        {
            // console.log('XMLHttpRequest.onload: status ' + Request.status);
            if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0 /* ? ios bug */)
            {
                Request.next(Response);
                Request.complete();
            }
            else
                Request.error(new EHttpClient(xhr.status));
        };

        xhr.onerror = ev =>
        {
            Request.error(new EHttpRequest());
        };

        xhr.ontimeout = ev =>
        {
            Request.error(new EHttpRequestTimeout());
        };

        xhr.onreadystatechange = ev =>
        {
            Request.OnReadyStateChange.next(xhr.readyState);
        };
    }

    private Dispose()
    {
        this.OnReadyStateChange.complete();
        this.OnProgress.complete();
        this.OnAbort.complete();
    }

    OnReadyStateChange = new Subject<number>();
    OnProgress = new Subject<ProgressEvent>();
    OnAbort = new Subject<void>();

    private xhr: XMLHttpRequest;
    private Response: THttpResponse;

/* Subject */

    override complete(): void
    {
        this.Dispose();
        return super.complete();
    }

    override error(err: any)
    {
        this.Dispose();
        return super.error(err);
    }
}

/* THttpResponse */

export class THttpResponse
{
    constructor(public xhr: XMLHttpRequest)
    {
    }

    get Type(): XMLHttpRequestResponseType
    {
        return this.xhr.responseType;
    }

    get URL(): string
    {
        return this.xhr.responseURL;
    }

    get Status(): number
    {
        return this.xhr.status;
    }

    Header(Name: Http.ResponseHeaders): string | null
    {
        return this.xhr.getResponseHeader(Name);
    }

    get Content(): any
    {
        return this.xhr.response;
    }

    get Text(): string
    {
        return this.xhr.responseText;
    }
}
