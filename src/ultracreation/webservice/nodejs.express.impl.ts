import * as Express from 'express';
import * as Http from 'http';
import * as BodyParser from 'body-parser';

import {TypeInfo} from '../core/typeinfo';
import {EAbort, EInvalidArg, ENotImplemented} from '../core/exception';

import {InvHttp} from './inv.types';
import {InvError, EInvAbort, InvClientError, InvBaseRedirection} from './inv.error';
import {TInvokableClass} from './inv.context';
import {InvRegistry, InvClassMetadata, InvMethodMetadata} from './inv.registry';

/**
 *  globaly options
 */
Express.Router({caseSensitive: false});

/**
 *  express extension
 */
declare module './inv.context'
{
    interface TInvokableClass
    {
        Request: Express.Request;
        Response: Express.Response;
    }
}

/* TExpressPlugin */

export class TExpressPlugin
{
}

/* Types */

export type TMountPath = string | RegExp | (string | RegExp)[];

/* TExpressApplication */

@TypeInfo.Sealed()
export class TExpressApplication
{
    constructor(Instance?: Express.Express)
    {
        if (TypeInfo.Assigned(Instance))
            this.Instance = Instance;
        else
            this.Instance = Express();

        setTimeout(() => this.AfterContruct());
    }

    protected AfterContruct(): void
    {
        // final fallback error handler
        this.Instance.use((err: any, req: Express.Request, res: Express.Response, next: Express.NextFunction) =>
            this.ErrorHandler(err, res));
    }

    UsePlugin(Plugin: Express.RequestHandler): this
    {
        this.Instance.use(Plugin);
        return this;
    }

    Mount(Path: TMountPath, Module: TExpressApplication | Express.Application | Express.RequestHandler): this
    {
        if (Module instanceof TExpressApplication)
            this.Instance.use(Path, Module.Instance);
        else
            this.Instance.use(Path, Module);

        return this;
    }

    protected ErrorHandler(err: any, Response: Express.Response): void
    {
        (this.constructor as typeof TExpressApplication).ErrorHandler(err, Response);
    }

    protected static ErrorHandler(err: any, Response: Express.Response): void
    {
        if (err instanceof InvBaseRedirection)
        {
            if (TypeInfo.Assigned(err.message))
                Response.setHeader('Location', err.message);
            Response.status(err.Status).send();
        }
        else if (err instanceof EInvAbort)
            Response.status(err.Status).send({err: err.message});
        else if (err instanceof InvError)
            Response.status(err.Status).send({err: err.message});
        else if (err instanceof EAbort)
            Response.status(202).send();
        else if (err instanceof EInvalidArg)
            Response.status(400).send({err: err.message});
        else if (err instanceof ENotImplemented)
            Response.status(501).send({err: err.message});
        else if (err instanceof Error)
            Response.status(500).send({err: err.message});
        else
            Response.status(500).send();
    }

    protected Instance: Express.Express;
}

/* TExpressInvApplication */

class TExpressInvApplication extends TExpressApplication
{
    constructor(private metadata: InvClassMetadata)
    {
        super();
        console.log('Constructing Invokable Class: ' + metadata);

        for (const method_metadata of metadata.Methods)
            this.ImplementInvMethod(method_metadata);
    }

    private ImplementInvMethod(metadata: InvMethodMetadata): this
    {
        this.Instance.all('/' + metadata.Name, (req, res, next) =>
        {
            // http://www.restapitutorial.com/lessons/httpmethods.html
            try
            {
                switch (req.method)
                {
                case 'OPTIONS':
                case 'HEAD':
                    return res.status(200).send();
                case 'TRACE':
                case 'CONNECT':
                    throw new InvClientError.EForbidden();
                }

                metadata.InvokeCheck(req.headers, req.method as InvHttp.Method, req.query, req.body);

                const ObjectInstance = this.metadata.GetInstance(req.headers);
                let Ctx: TInvokableClass | undefined;

                if (ObjectInstance instanceof TInvokableClass)
                {
                    Ctx = ObjectInstance;

                    Ctx.Request = req;
                    Ctx.Response = res;

                    Ctx.Queries = req.query;
                    Ctx.Content = req.body;
                }

                const RetVal = metadata.Invoke(ObjectInstance, req.method as InvHttp.Method, req.query, req.body);
                this.ResolveInvRetVal(RetVal, res, Ctx);
            }
            catch (err)
            {
                return this.ErrorHandler(err, res);
            }
        });

        return this;
    }

    private async ResolveInvRetVal(RetVal: any, Response: Express.Response, Ctx?: TInvokableClass): Promise<void>
    {
        if (RetVal instanceof Promise)
        try
        {
            RetVal = await RetVal;
        }
        catch (err)
        {
            return this.ErrorHandler(err, Response);
        }

        if (RetVal instanceof Error)
            return this.ErrorHandler(RetVal, Response);

        if (TypeInfo.Assigned(Ctx))
        {
            const Cookies = Ctx.Cookies['SetCookies@private'].values();
            for (let Cookie = Cookies.next(); ! Cookie.done; Cookie = Cookies.next())
            {
                let opt: Express.CookieOptions;

                if (TypeInfo.Assigned(Cookie.value.Opts))
                {
                    opt = {};

                    if (TypeInfo.Assigned(Cookie.value.Opts.Domain))
                        opt.domain = Cookie.value.Opts.Domain;
                    if (TypeInfo.Assigned(Cookie.value.Opts.Path))
                        opt.path = Cookie.value.Opts.Path;
                    if (TypeInfo.Assigned(Cookie.value.Opts.Secure))
                        opt.secure = Cookie.value.Opts.Secure;
                    if (TypeInfo.Assigned(Cookie.value.Opts.HttpOnly))
                        opt.httpOnly = Cookie.value.Opts.HttpOnly;
                    if (TypeInfo.Assigned(Cookie.value.Opts.SameSite))
                        opt.sameSite = Cookie.value.Opts.SameSite;
                    if (TypeInfo.Assigned(Cookie.value.Opts.Expires))
                    {
                        if (Cookie.value.Opts.Expires >= new Date())
                            opt.expires = true;
                        else
                            opt.expires = Cookie.value.Opts.Expires;
                    }
                    if (TypeInfo.Assigned(Cookie.value.Opts.Age))
                        opt.expires = new Date(Date.now() + Cookie.value.Opts.Age);
                }

                Response.cookie(Cookie.value.Name, Cookie.value.Value, opt);
            }
        }

        if (TypeInfo.Assigned(RetVal))
        {
            if (! TypeInfo.IsString(RetVal))
            {
                if (TypeInfo.IsArrayLike(RetVal))
                {
                    if (RetVal.length > 0)
                        RetVal = JSON.stringify(RetVal, (RetVal[0] as IJsonMapper).JsonMap);
                    else
                        RetVal = JSON.stringify(RetVal);
                }
                else if (TypeInfo.IsObject(RetVal))
                    RetVal = JSON.stringify(RetVal, (RetVal as IJsonMapper).JsonMap);
                else
                    RetVal = JSON.stringify(RetVal);
            }

            // Response.setHeader('Content-Type', 'application/json');
            Response.status(200).send(RetVal);
        }
        else
            Response.status(200).send();
    }
}

/* TExpressRoot */

export class TExpressRoot extends TExpressApplication
{
    CreateServer(Port: number, HostName?: string)
    {
        this.Instance.all('/', (req, res) =>
        {
            res.status(200).send('It worked!');
        });

        try
        {
            this.UsePlugin(BodyParser.text());
            this.UsePlugin(BodyParser.json());
            this.MountInvClasses();
        }
        catch (err)
        {
            console.log('error: ' + err.message);
        }

        const http = Http.createServer(this.Instance as any).listen(Port, HostName, () =>
        console.log('server started at :' + http.address().port));
    }

    private MountInvClasses(): void
    {
        InvRegistry.ForEachInvokableClass(metadata =>
        {
            const InvApplication = new TExpressInvApplication(metadata);
            this.Mount('/' + metadata.ExportName, InvApplication);
        });
    }
}

export let Root = new TExpressRoot();
