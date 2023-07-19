/**
 *  https://github.com/apache/cordova-plugin-splashscreen
 *      cordova plugin add cordova-plugin-splashscreen --save
 */
import {TCordovaPlugin} from './cordova.plugin';

declare global
{
    interface CordovaPlugins
    {
        SplashScreen: typeof NativeSplashScreen;
    }
}

class NativeSplashScreen extends TCordovaPlugin
{
    static override readonly Name: string = 'splashscreen';
    static override readonly Repository: string = 'cordova-plugin-splashscreen';

    static show(): void
    {
        return this.CallFunction<void>('show');
    }

    static hide(): void
    {
        return this.CallFunction<void>('hide');
    }
}
TCordovaPlugin.Register(NativeSplashScreen, 'SplashScreen');
