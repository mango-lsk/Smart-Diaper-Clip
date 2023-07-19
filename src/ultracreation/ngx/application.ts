import {ApplicationRef, Injectable, Injector, isDevMode, NgZone, Renderer2} from '@angular/core';

import {Location} from '@angular/common';
import {Router, UrlTree, NavigationExtras} from '@angular/router';

import {TypeInfo} from '../core/typeinfo';
import {ENotImplemented} from '../core/exception';

// life cycle import alias
import {OnInit as ngOnInit, OnDestroy as ngOnDestroy} from '@angular/core';
import {AfterViewInit as ngAfterViewInit, AfterViewChecked as ngAfterViewChecked} from '@angular/core';
import {AfterContentInit as ngAfterContentInit, AfterContentChecked as ngAfterContentChecked} from '@angular/core';
import {OnChanges as ngOnChanges, DoCheck as ngDoCheck} from '@angular/core';

let GlobalInjectApp: TNgxApplication;

declare global
{
    function ShowError(err: string | Error, opts?: _Ngx.IErrorOptions): Promise<any>;
    function ShowAlert(msg: string, opts?: _Ngx.IAlertOptions): Promise<any>;
    function ShowToast(msg: string, opts?: _Ngx.IToastOptions): Promise<any>;

    interface Window
    {
        ShowError(err: string | Error, opts?: _Ngx.IErrorOptions): Promise<any>;
        ShowAlert(msg: string, opts?: _Ngx.IAlertOptions): Promise<any>;
        ShowToast(msg: string, opts?: _Ngx.IToastOptions): Promise<any>;
    }

    namespace Ng
    {
        /**
         *  Initialize the directive or component after Angular first displays the data-bound properties and
         *      sets the directive or component's input properties. See details in Initializing a component or
         *      directive in this document.
         */
        interface OnInit extends ngOnInit
        {
        }

        /**
         *  Cleanup just before Angular destroys the directive or component. Unsubscribe Observables and detach
         *      event handlers to avoid memory leaks.
         */
        interface OnDestroy extends ngOnDestroy
        {
        }

        /**
         *  Respond after Angular initializes the component's views and child views, or the view that contains
         *      the directive.
         */
        interface AfterViewInit extends ngAfterViewInit
        {
        }

        /**
         *  Respond after Angular checks the component's views and child views, or the view that contains
         *      the directive.
         */
        interface AfterViewChecked extends ngAfterViewChecked
        {
        }

        /**
         *  Respond after Angular projects external content into the component's view, or into the view that a
         *      directive is in.
         */
        interface AfterContentInit extends ngAfterContentInit
        {
        }

        /**
         *  Respond after Angular checks the content projected into the directive or component.
         */
        interface AfterContentChecked extends ngAfterContentChecked
        {
        }

        /**
         *  Respond when Angular sets or resets data-bound input properties.
         *      The method receives a SimpleChanges object of current and previous property values.
         *  NOTE:
         *      This happens very frequently, so any operation you perform here impacts performance significantly.
         */
        interface OnChanges extends ngOnChanges
        {
        }

        /**
         *  Detect and act upon changes that Angular can't or won't detect on its own.
         */
        interface DoCheck extends ngDoCheck
        {
        }
    }
}

export namespace _Ngx
{
    export interface INavExtras extends NavigationExtras
    {
        NavData?: INavData;
    }

    export interface INavData
    {
        [key: string]: any;
    }

    export interface ILoadingOptions
    {
    }

    export interface IErrorOptions
    {
    }

    export interface IToastOptions
    {
    }

    export interface IModalOptions
    {
    }

    export interface IModalProperties
    {
        [Name: string]: any;
    }

    export interface IModalEvents
    {
        [Name: string]: (ev: any) => void;
    }

    export interface IAlertButton
    {
        Text: string;
        // Role?: 'cancel';
        Callback?: (...args: any[]) => (boolean | void);
    }

    export interface IAlertOptions
    {
        Buttons?: Array<IAlertButton | string>;
    }
}

Window.prototype.ShowError = function ShowError(err: string | Error, opts?: _Ngx.IErrorOptions): any
{
    if (! TypeInfo.Assigned(GlobalInjectApp))
        throw new ENotImplemented('TApplication has no injected');
    else
        return GlobalInjectApp.ShowError(err, opts);
};

Window.prototype.ShowAlert = function ShowAlert(msg: string, opts?: _Ngx.IAlertOptions): any
{
    if (! TypeInfo.Assigned(GlobalInjectApp))
        throw new ENotImplemented('TApplication has no injected');
    else
        return GlobalInjectApp.ShowAlert(msg, opts);
};

Window.prototype.ShowToast = function ShowToast(msg: string, opts?: _Ngx.IToastOptions): any
{
    if (! TypeInfo.Assigned(GlobalInjectApp))
        throw new ENotImplemented('TApplication has no injected');
    else
        return GlobalInjectApp.ShowToast(msg, opts);
};

@Injectable({providedIn: 'root'})
export abstract class TNgxApplication
{
    // tslint:disable-next-line:no-shadowed-variable
    constructor(public readonly Injector: Injector)
    {
        console.log('TNgxApplication.construct');

        if (TypeInfo.Assigned(GlobalInjectApp))
            console.log('%cTNgxApplication perfer to inject globally.', 'color:orange');
        else
            GlobalInjectApp = this;

        const r = document.documentElement.getBoundingClientRect();
        this.ClientRect = r;
        const px = Math.round(Math.sqrt(r.width * r.height) * 96 / 72 / 36);

        console.log(`%ccalculating font size: 1 rem (portrait) = ${px} px`, 'color:lightgreen');
        document.documentElement.style.fontSize = `${px.toString(10)}px`;
        console.log(`%cscreen: width ${r.width}px, height ${r.height}px, ratio ${window.devicePixelRatio}`, 'color:lightgreen');
    }

    async Initialize(): Promise<void>
    {
        for (const iter of this.Initializers)
            await iter.fn.bind(iter.inst)(...iter.args);
    }

    RegisterInitializer(inst: object, fn: (...args: any[]) => Promise<void>, ...args: any[]): void
    {
        if (this.Initialized)
        {
            this.Initialized = true;
            fn.bind(inst)(...args);
        }
        else
            this.Initializers.push({inst, fn, args});
    }

    private Initialized?: true;
    private Initializers = new Array<{inst: object, fn: (...args: any[]) => Promise<void>, args: any[]}>();

    get IsDevMode(): boolean
    {
        return isDevMode();
    }

/** NgZone */
    NgZone<T>(fn: (...args: any[]) => T, applyThis?: any, applyArgs?: any[]): T
    {
        if (! TypeInfo.Assigned(this._Zone))
            this._Zone = this.Injector.get<NgZone>(NgZone);

        return this._Zone.run(fn, applyThis, applyArgs);
    }
    private _Zone?: NgZone;

/** navigator abstracts */

    NavData: _Ngx.INavData = {};

    NavTo(url: string | UrlTree, opt?: _Ngx.INavExtras): Promise<boolean>
    {
        return this.Router.navigateByUrl(url, opt);
    }

    NavPush(url: string | UrlTree, opts?: _Ngx.INavExtras): Promise<boolean>
    {
        if (TypeInfo.Assigned(opts) && TypeInfo.Assigned(opts.NavData))
            this.NavData = opts.NavData;
        else
            this.NavData = {};

        if (TypeInfo.IsString(url))
            return this.Router.navigate([this.RelativeUrl(this.Router.url, url)], opts);
        else if (Array.isArray(url))
            return this.Router.navigate(url, opts);
        else
            return Promise.resolve(false);
    }

    NavPop(opts?: _Ngx.INavExtras): Promise<void>
    {
        if (TypeInfo.Assigned(opts) && TypeInfo.Assigned(opts.NavData))
            this.NavData = opts.NavData;
        else
            this.NavData = {};

        this.Location.back();
        return Promise.resolve();
    }

    NavPopToRoot(opts?: _Ngx.INavExtras): Promise<void>
    {
        if (TypeInfo.Assigned(opts) && TypeInfo.Assigned(opts.NavData))
            this.NavData = opts.NavData;
        else
            this.NavData = {};

        return this.NavRoot('/', opts).then(() => {});
    }

    NavRoot(url: string | UrlTree, opts?: _Ngx.INavExtras): Promise<boolean>
    {
        if (TypeInfo.Assigned(opts) && TypeInfo.Assigned(opts.NavData))
            this.NavData = opts.NavData;
        else
            this.NavData = {};

        return this.Router.navigateByUrl(url, opts);
    }

    protected RelativeUrl(BaseUrl: string, RelativeUrl: string): string
    {
        if (0 === RelativeUrl.length || '/' === RelativeUrl[0])
            return RelativeUrl;

        const Uris = BaseUrl.split('/');
        const RelTree = RelativeUrl.split('/');

        while (RelTree.length > 0)
        {
            if ('..' === RelTree[0])
            {
                if (Uris.length > 0)
                    Uris.splice(UrlTree.length - 1);

                RelTree.splice(0, 1);
                continue;
            }

            if ('.' === RelTree[0])
            {
                RelTree.splice(0, 1);
                continue;
            }

            Uris.push(...RelTree);
            break;
        }

        const Url = Uris.join('/');
        if (0 < Url.length)
            console.log(`relative navigate to ${Url}`);
        return Url;
    }

    /** loading abstracts */

    abstract get IsLoading(): boolean;
    abstract ShowLoading(msg?: string, opts?: _Ngx.ILoadingOptions): Promise<any>;
    abstract HideLoading(): Promise<void>;

    /* message abstracts */

    abstract ShowToast(msg: string, opts?: _Ngx.IToastOptions): Promise<any>;
    abstract ShowAlert(msg: string, opts?: _Ngx.IAlertOptions): Promise<any>;
    abstract ShowError(err: string | Error, opts?: _Ngx.IErrorOptions): Promise<any>;

    /** modal abstracts */

    abstract ShowModal(ComponentType: any, Properties: _Ngx.IModalProperties, Events: _Ngx.IModalEvents, opts?: _Ngx.IModalOptions): Promise<any>;

    get Ref(): ApplicationRef
    {
        if (! TypeInfo.Assigned(this._Ref))
            this._Ref = this.Injector.get<ApplicationRef>(ApplicationRef);
        return this._Ref;
    }
    private _Ref?: ApplicationRef;

    get Router(): Router
    {
        if (! TypeInfo.Assigned(this._Router))
            this._Router = this.Injector.get<Router>(Router);
        return this._Router;
    }
    private _Router?: Router;

    get Location(): Location
    {
        if (! TypeInfo.Assigned(this._Location))
            this._Location = this.Injector.get<Location>(Location);
        return this._Location;
    }
    private _Location?: Location;

    get Renderer(): Renderer2
    {
        if (! TypeInfo.Assigned(this._Renderer))
            this._Renderer = this.Injector.get<Renderer2>(Renderer2);
        return this._Renderer;
    }
    private _Renderer?: Renderer2;

    readonly ClientRect: DOMRect;

    protected LangPrefixError = 'error';
    protected LangPrefixHint = 'hint';
}
