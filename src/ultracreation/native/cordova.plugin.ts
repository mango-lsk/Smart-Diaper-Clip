/**
 *  Cordova Plugins Abstract
 *      npm i @types/cordova -D
 */
import {TypeInfo} from '../core/typeinfo';
import {EAbort} from '../core/exception';

import './cordova.platform';

 declare var window: any;
 declare var navigator: any;
 declare var cordova: any;

 export class ECordovaPlugin extends EAbort
 {
     constructor(msg?: string)
     {
         if (TypeInfo.Assigned(msg))
             super(msg);
         else
             super('e_cordova_plugin');
     }
 }

 export class ECordovaPluginNotInstalled extends ECordovaPlugin
 {
     constructor(Cls: typeof TCordovaPlugin)
     {
         super(`e_${Cls.Name}_plugin_not_installed`);
     }
 }

 /* TCordovaPlugin base class */

 export class TCordovaPlugin
 {
    static readonly Platform = cordova.platform;
    static readonly Name: string = '';
    static readonly Repository?: string;

    static get IsPluginInstalled(): boolean
    {
        return TypeInfo.Assigned(this.Instance);
    }

    static get Instance(): any
    {
        if (this.Name === '')
        {
            console.log(`%c${this.name.toString()} has no Name defined.`, 'color:red');
            return undefined;
        }
        if (TypeInfo.IsNull(this._Instance))
            return undefined;

        if (! TypeInfo.Assigned(this._Instance))
        {
            this._Instance = this._GetInstance(this.Name);

            if (! TypeInfo.Assigned(this._Instance))
                this._Instance = null;
        }

        return this._Instance;
    }

    protected static GetProperty<T>(propname: string): T
    {
        const Instance = this.Instance;

        if (TypeInfo.Assigned(Instance))
            return Instance[propname];
        else
            return undefined as any;
    }

    protected static CallFunction<T>(func: string, ...argv: any[]): T
    {
        const Instance = this.Instance;

        if (TypeInfo.Assigned(Instance))
        {
            const PluginFunction = Instance[func];
            return PluginFunction.call(Instance, ...argv);
        }
        else
            return undefined as any;
    }

    protected static CallbackToPromise<T>(func: string): Promise<T>
    {
        const Instance = this.Instance;

        if (TypeInfo.Assigned(Instance))
        {
            return new Promise<T>((resolve, reject) =>
            {
                const PluginFunction = Instance[func];
                PluginFunction.call(this, succ, err);

                function succ(msg: any): void
                {
                    resolve(msg);
                }

                function err(msg: any): void
                {
                    if (TypeInfo.IsString(msg))
                    {
                        console.log(`%ccordova plugin error: ${msg}`, 'color:red');
                        reject(new ECordovaPlugin(msg));
                    }
                    else if (msg instanceof Error)
                    {
                        console.log(`%ccordova plugin error: ${msg.message} error class: ${typeof msg}`, 'color:red');
                        reject(msg);
                    }
                }
            });
        }
        else
            return Promise.reject(new ECordovaPluginNotInstalled(this));
    }

    protected static CallbackToPromise_RightParam<T>(func: string, ...argv: any[]): Promise<T>
    {
        const Instance = this.Instance;

        if (TypeInfo.Assigned(Instance))
        {
            return new Promise<T>((resolve, reject) =>
            {
                function succ(msg: any): void
                {
                    resolve(msg);
                }

                function err(msg: any): void
                {
                    if (TypeInfo.IsString(msg))
                    {
                        console.log(`%ccordova plugin error: ${msg}`, 'color:red');
                        reject(new ECordovaPlugin(msg));
                    }
                    else if (msg instanceof Error)
                    {
                        console.log(`%ccordova plugin error: ${msg.message} error class: ${typeof msg}`, 'color:red');
                        reject(msg);
                    }
                }

                argv = [succ, err].concat(argv);
                const PluginFunction = Instance[func];

                if (TypeInfo.Assigned(PluginFunction))
                    PluginFunction.call(this, ...argv);
                else
                    reject(new ECordovaPlugin(`"${func}" is not a function`));
            });
        }
        else
            return Promise.reject(new ECordovaPluginNotInstalled(this));
    }

    protected static async CallbackToPromise_LeftParam<T>(func: string, ...argv: any[]): Promise<T>
    {
        const Instance = this.Instance;

        if (TypeInfo.Assigned(Instance))
        {
            return new Promise<T>((resolve, reject) =>
            {
                function succ(msg: any): void
                {
                    resolve(msg);
                }

                function err(msg: any): void
                {
                    if (TypeInfo.IsString(msg))
                    {
                        console.log(`%ccordova plugin error: ${msg}`, 'color:red');
                        reject(new ECordovaPlugin(msg));
                    }
                    else if (msg instanceof Error)
                    {
                        console.log(`%ccordova plugin error: ${msg.message} error class: ${typeof msg}`, 'color:red');
                        reject(msg);
                    }
                }

                argv.push(succ, err);
                const PluginFunction = Instance[func];

                if (TypeInfo.Assigned(PluginFunction))
                    PluginFunction.call(this, ...argv);
                else
                    reject(new ECordovaPlugin(`"${func}" is not a function`));
            });
        }
        else
            return Promise.reject(new ECordovaPluginNotInstalled(this));
    }

    protected static _GetInstance(PluginName: string): any
    {
        if (! TypeInfo.Assigned(window.cordova))
            return undefined;

        let Plugin: any;

        if (TypeInfo.Assigned(window.cordova.plugins))
            Plugin = cordova.plugins[PluginName];
        if (! TypeInfo.Assigned(Plugin))
            Plugin = cordova[PluginName];
        if (! TypeInfo.Assigned(Plugin))
            Plugin = window[PluginName];
        if (! TypeInfo.Assigned(Plugin))
            Plugin = navigator[PluginName];

        return Plugin;
    }

    private static _Instance: any = undefined;

    protected constructor()
    {
    }
}

export namespace TCordovaPlugin
{
 /**
  *  RegisterPlugin into cordova.plugin.Name
  */
    export function Register(Cls: typeof TCordovaPlugin, Name?: string): void
    {
        const PluginName = TypeInfo.Assigned(Name) ? Name : Cls.Name;

        cordova.platform.OnDeviceReady.then(() =>
        {
            if (! Cls.IsPluginInstalled)
            {
                if (TypeInfo.Assigned(Cls.Repository))
                    console.log(`%ccordova plugin: ${Cls.Repository} is not installed.`, 'color:red');
                else
                    console.log(`%ccordova plugin: ${Cls.Name} is not installed.`, 'color:red');
            }

            cordova.plugin[PluginName] = Cls;
        });
    }
}
