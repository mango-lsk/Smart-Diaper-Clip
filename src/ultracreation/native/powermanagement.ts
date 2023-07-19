/**
 *  Native PowerManagement support
 *      .Cordova PowerManagement plugin
 *          cordova plugin add cordova-plugin-powermanagement --save
 *          https://github.com/cranberrygame/cordova-plugin-powermanagement
 */
import {TCordovaPlugin} from './cordova.plugin';

declare global
{
    interface CordovaPlugins
    {
        PowerManagement: typeof NativePowerManagement;
    }
}

class NativePowerManagement extends TCordovaPlugin
{
    static override readonly Name: string = 'powermanagement';
    static override readonly Repository: string = 'cordova-plugin-powermanagement';

    static Acquire(): void
    {
        if (1 === ++ this.RefCount)
        {
            console.log('powermanagement.acquire()');
            this.CallFunction<void>('acquire');
        }
    }

    static Release(): void
    {
        if (0 === -- this.RefCount)
        {
            console.log('powermanagement.release()');
            this.CallFunction<void>('release');
        }
    }

    private static RefCount = 0;
}
TCordovaPlugin.Register(NativePowerManagement, 'PowerManagement');
