/*
 * Native Phone Call Trapper support
 *      cordova plugin add cordova-plugins-market --save
 *      https://github.com/xmartlabs/cordova-plugin-market
 */
import {TCordovaPlugin} from './cordova.plugin';

declare global
{
    interface CordovaPlugins
    {
        AppMarket: typeof NativeAppMarket;
    }
}

class NativeAppMarket extends TCordovaPlugin
{
    static override readonly Name: string = 'market';
    static override readonly Repository: string = 'cordova-plugins-market';

    static Open(AppId: string): Promise<void>
    {
        return this.CallbackToPromise_LeftParam<void>('open', AppId).catch(err => {});
    }
}
TCordovaPlugin.Register(NativeAppMarket, 'AppMarket');
