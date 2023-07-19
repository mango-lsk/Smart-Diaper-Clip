/*
 *  Cordova AppVersion plugin
 *      cordova plugin add cordova-plugin-app-version --save
 *      https://github.com/whiteoctober/cordova-plugin-app-version
 */
import {TCordovaPlugin} from './cordova.plugin';

declare global
{
    interface CordovaPlugins
    {
        AppVersion: typeof NativeAppVersion;
    }
}

class NativeAppVersion extends TCordovaPlugin
{
    static override readonly Name: string = 'getAppVersion';
    static override readonly Repository: string = 'cordova-plugin-app-version';

    static AppName(): Promise<string>
    {
        return this.CallbackToPromise<string>('getAppName')
            .catch(err => '<APP NAME>');
    }

    static PackageName(): Promise<string>
    {
        return this.CallbackToPromise<string>('getPackageName')
            .catch(err => 'PACKAGE NAME');
    }

    static VersionCode(): Promise<string>
    {
        return this.CallbackToPromise<string>('getVersionCode')
            .catch(err => '<VERSION CODE>');
    }

    static VersionNumber(): Promise<string>
    {
        return this.CallbackToPromise<string>('getVersionNumber')
            .catch(err => '<VERSION NUMBER>');
    }
}
TCordovaPlugin.Register(NativeAppVersion, 'AppVersion');
