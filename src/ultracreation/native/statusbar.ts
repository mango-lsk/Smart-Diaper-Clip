/**
 *  https://github.com/apache/cordova-plugin-statusbar
 *      cordova plugin add cordova-plugin-statusbar --save
 */
import {TCordovaPlugin} from './cordova.plugin';

declare global
{
    interface CordovaPlugins
    {
        StatusBar: typeof NativeStatusBar;
    }
}

class NativeStatusBar extends TCordovaPlugin
{
    static override readonly Name: string = 'StatusBar';
    static override readonly Repository: string = 'cordova-plugin-statusbar';

    /** iOS */
    static overlaysWebView(Overlay: boolean = true): void
    {
        return this.CallFunction<void>('overlaysWebView');
    }

    static styleDefault(): void
    {
        return this.CallFunction<void>('styleDefault');
    }

    /** iOS, WP */
    static styleLightContent(): void
    {
        return this.CallFunction<void>('styleLightContent');
    }

    /** iOS, WP */
    static styleBlackTranslucent(): void
    {
        return this.CallFunction<void>('styleBlackTranslucent');
    }

    /** iOS, WP */
    static styleBlackOpaque(): void
    {
        return this.CallFunction<void>('styleBlackOpaque');
    }

    /** iOS note: you must call StatusBar.overlaysWebView(false) to enable color changing. */
    static backgroundColorByName(colorName: 'black' | 'darkGray' | 'lightGray' | 'white' | 'gray' | 'red' | 'green' |
        'blue' | 'cyan' | 'yellow' | 'magenta' | 'orange' | 'purple' | 'brown'): void
    {
        return this.CallFunction<void>('backgroundColorByName', colorName);
    }

    /** iOS note: you must call StatusBar.overlaysWebView(false) to enable color changing. */
    static backgroundColorByHexString(hexString: string): void
    {
        return this.CallFunction<void>('backgroundColorByHexString', hexString);
    }

    static hide(): void
    {
        return this.CallFunction<void>('hide');
    }

    static show(): void
    {
        return this.CallFunction<void>('show');
    }

    static get isVisible(): boolean
    {
        return this.GetProperty<boolean>('isVisible');
    }
}
TCordovaPlugin.Register(NativeStatusBar);
