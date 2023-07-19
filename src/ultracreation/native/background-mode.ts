/*
 *  Cordova background plugin
 *      cordova plugin add cordova-plugin-background-mode
 *      https://github.com/katzer/cordova-plugin-background-mode
 *
 *  original is unmainted, using this instead
 *      https://github.com/leonardo-fernandes/cordova-plugin-background-mode
 *      cordova plugin add https://github.com/leonardo-fernandes/cordova-plugin-background-mode.git
 *
 */
import {TCordovaPlugin} from './cordova.plugin';

declare global
{
    interface CordovaPlugins
    {
        BackgroundMode: typeof NativeBackgroundMode;
    }
}

class NativeBackgroundMode extends TCordovaPlugin
{
    static override readonly Name: string = 'backgroundMode';
    static override readonly Repository: string = 'cordova-plugin-background-mode';

    /*
    static GetDefaults(): BackgroundMode.Options
    {
        return this.CallFunction<IBackgroundModeOpt>('getDefaults');
    }

    static SetDefaults(opt: IBackgroundModeOpt): void
    {
        this.CallFunction('setDefaults', opt);
    }

    static Configure(opt: IBackgroundModeOpt): void
    {
        this.CallFunction('configure', opt);
    }
    */

    static Enable(): void
    {
        this.CallFunction('enable');
    }

    static Disable(): void
    {
        this.CallFunction('disable');
    }

    static MoveToForeground(): void
    {
        this.CallFunction('moveToForeground');
    }

    static MoveToBackground(): void
    {
        this.CallFunction('moveToBackground');
    }

    static IsScreenOff(): Promise<boolean>
    {
        return this.CallbackToPromise('isScreenOff');
    }

    static WakeupScreen(): void
    {
        this.CallFunction('wakeUp');
    }

    static UnlockScreen(): void
    {
        this.CallFunction('unlock');
    }

    static OverrideAndroidBackButton()
    {
        this.CallFunction('overrideBackButton');
    }
}
TCordovaPlugin.Register(NativeBackgroundMode, 'BackgroundMode');
