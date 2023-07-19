/**
 *  https://github.com/TongZhangzt/cordova-plugin-native-ringtones
 *      cordova plugin add cordova-plugin-native-ringtones --save
 *
 *  dependency:
 *  https://github.com/apache/cordova-plugin-file for grap the ringto
 *      cordova plugin add cordova plugin add cordova-plugin-file --save
 */
import {TCordovaPlugin} from './cordova.plugin';

declare global
{
    interface CordovaPlugins
    {
        Ringtone: typeof NativeRingtone;
    }

    interface IRingtone
    {
        Name: string;
        Url: string;
    }
}

class NativeRingtone extends TCordovaPlugin implements IRingtone
{
    static override readonly Name: string = 'NativeRingtones';
    static override readonly Repository: string = 'cordova-plugin-native-ringtones';

    static List(): Promise<Array<IRingtone>>
    {
        return this.CallbackToPromise('getRingtone');
    }

    Name!: string;
    Url!: string;
}
TCordovaPlugin.Register(NativeRingtone, 'Ringtone');
