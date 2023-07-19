import {fromEvent, map, Observable, Subject} from 'rxjs';

import {TypeInfo} from '../core/typeinfo';
import {Platform} from '../core/platform';
import {THttpClient} from '../core/http';

declare var window: any;
declare var navigator: any;

declare global
{
    var cordova: Cordova;

    interface Window
    {
        cordova: Cordova;
    }

    interface Document
    {
        /// android/ios/windows
        addEventListener(type: 'deviceready', listener: (ev: Event) => any, useCapture?: boolean): void;
        /// android/ios/windows
        addEventListener(type: 'pause', listener: (ev: Event) => any, useCapture?: boolean): void;
        /// android/ios/windows
        addEventListener(type: 'resume', listener: (ev: Event) => any, useCapture?: boolean): void;
        /// android only
        addEventListener(type: 'backbutton', listener: (ev: Event) => any, useCapture?: boolean): void;
        /// android only
        addEventListener(type: 'menubutton', listener: (ev: Event) => any, useCapture?: boolean): void;
        /// android only
        addEventListener(type: 'searchbutton', listener: (ev: Event) => any, useCapture?: boolean): void;
        /// ?
        addEventListener(type: 'startcallbutton', listener: (ev: Event) => any, useCapture?: boolean): void;
        /// ?
        addEventListener(type: 'endcallbutton', listener: (ev: Event) => any, useCapture?: boolean): void;
        /// android only
        addEventListener(type: 'volumedownbutton', listener: (ev: Event) => any, useCapture?: boolean): void;
        /// android only
        addEventListener(type: 'volumeupbutton', listener: (ev: Event) => any, useCapture?: boolean): void;
        /// windows only
        addEventListener(type: 'activated', listener: (ev: Event) => any, useCapture?: boolean): void;

        removeEventListener(type: 'deviceready', listener: (ev: Event) => any, useCapture?: boolean): void;
        removeEventListener(type: 'pause', listener: (ev: Event) => any, useCapture?: boolean): void;
        removeEventListener(type: 'resume', listener: (ev: Event) => any, useCapture?: boolean): void;
        removeEventListener(type: 'backbutton', listener: (ev: Event) => any, useCapture?: boolean): void;
        removeEventListener(type: 'menubutton', listener: (ev: Event) => any, useCapture?: boolean): void;
        removeEventListener(type: 'searchbutton', listener: (ev: Event) => any, useCapture?: boolean): void;
        removeEventListener(type: 'startcallbutton', listener: (ev: Event) => any, useCapture?: boolean): void;
        removeEventListener(type: 'endcallbutton', listener: (ev: Event) => any, useCapture?: boolean): void;
        removeEventListener(type: 'volumedownbutton', listener: (ev: Event) => any, useCapture?: boolean): void;
        removeEventListener(type: 'volumeupbutton', listener: (ev: Event) => any, useCapture?: boolean): void;
    }

    interface CordovaPlugins
    {
    }
}

/// modified from https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/cordova/index.d.ts
interface Cordova
{
    /** Invokes native functionality by specifying corresponding service name, action and optional parameters.
     * @param success A success callback function.
     * @param fail An error callback function.
     * @param service The service name to call on the native side (corresponds to a native class).
     * @param action The action name to call on the native side (generally corresponds to the native class method).
     * @param args An array of arguments to pass into the native environment.
     */
    exec(success: (data: any) => any, fail: (err: any) => any, service: string, action: string, args?: any[]): void;
    /** Gets the operating system name. */
    platformId: string;
    /** Gets Cordova framework version */
    version: string;
    /** Defines custom logic as a Cordova module. Other modules can later access it using module name provided. */
    define(moduleName: string, factory: (require: any, exports: any, module: any) => any): void;
    /** Access a Cordova module by name. */
    require(moduleName: string): any;

    /** @‌deprecated use cordova.plugin instead */
    plugins: {[key: string]: any};
    /** some plugin was direct installed into cordova object */
    // [key: string]: any;
    

    platform: typeof CordovaPlatform;
    plugin: CordovaPlugins;
}

declare var Cordova: {
    prototype: Cordova;
};


class CordovaPlatform extends Platform
{
    static get OnDeviceReady(): Promise<void>
    {
        if (! TypeInfo.Assigned(this._OnDeviceReady))
        {
            let DeviceOnReady: Promise<void>;

            if (this.IsCordova)
            {
                DeviceOnReady = new Promise<void>((resolve, reject) =>
                    document.addEventListener('deviceready', ev => resolve(), false));
            }
            else
            {
                if (! TypeInfo.Assigned(window.cordova))
                    window.cordova = {platformId: '', version: '', plugins: {}} as any;

                DeviceOnReady = Promise.resolve();
            }

            this._OnDeviceReady = DeviceOnReady.then(() =>
            {
                console.log('Cordova platform: OnDeviceReady');
                this.RedirectLocalFetch();
            });
        }

        return this._OnDeviceReady;
    }

    static Halt(): void
    {
        if (Platform.IsCordova)
            this.OnDeviceReady.then(() => navigator.app.exitApp());
    }

    static __NgZone(fn: (...args: any[]) => any, ...args: any[]): void
    {
        fn(...args);
    }

    static __EvZone: ((event: Subject<any>, arg: any) => void) = (ev, arg) =>
    {
        console.log(`%cCordovaPlatform.__EvZone was unwrapped with ngZone`, 'color:red');
        ev.next(arg);
    }

    static get OnPause(): Subject<void>
    {
        if (! TypeInfo.Assigned(this._OnPause))
        {
            this._OnPause = new Subject<void>();

            fromEvent<void>(document, 'pause').pipe(
                map(next =>
                {
                    console.log('%ccordova application: pause', 'color:cyan');
                    return next;
                })
            )
            .subscribe(next => this.__EvZone(this._OnPause!, next));
        }
        return this._OnPause;
    }

    static get OnResume(): Subject<void>
    {
        if (! TypeInfo.Assigned(this._OnResume))
        {
            this._OnResume = new Subject<void>();

            fromEvent<void>(document, 'resume').pipe(
                map(next =>
                {
                    console.log('%ccordova application: resume', 'color:cyan');
                    return next;
                })
            )
            .subscribe(next => this.__EvZone(this._OnResume!, next));
        }
        return this._OnResume;
    }

    static get OnBackButton(): Observable<Event>
    {
        if (! TypeInfo.Assigned(this._OnBackButton))
        {
            this._OnBackButton = new Subject<Event>();

            fromEvent<Event>(document, 'backbutton').pipe(
                map(next =>
                {
                    console.log('%ccordova application: backbutton', 'color:cyan');
                    return next;
                })
            )
            .subscribe(next => this.__EvZone(this._OnBackButton!, next));
        }
        return this._OnBackButton;
    }

    private static RedirectLocalFetch(): void
    {
        console.log('%cRedirect window.fetch() to XMLHttpRequest() for file:// scheme', 'color:orange');
        const OriginalFetch: any = window.fetch;

        window.fetch = (...args: any[]) =>
        {
            const [url] = args;

            if (TypeInfo.IsString(url))
                return THttpClient.Get<ArrayBuffer>(url).then(val => new Response(val));
            else
                return OriginalFetch(...args);
        };
    }

    private static _OnDeviceReady?: Promise<void>;
    private static _OnPause?: Subject<void>;
    private static _OnResume?: Subject<void>;
    private static _OnBackButton?: Subject<Event>;
}

if (! TypeInfo.Assigned(window.cordova))
    window.cordova = {platformId: '', version: '', plugin: {}};

window.cordova.platform = CordovaPlatform;
window.cordova.plugin = {};
