/**
 *  Install Cordova Network Manager Plugin for Enable/Disable Wifi
 *      cordova plugin add wifiwizard2
 *      https://github.com/tripflex/wifiwizard2
 */

 import {TypeInfo} from '../core/typeinfo';
 import {EAbort} from '../core/exception';
 import {Platform} from '../core/platform';
 import {TCordovaPlugin} from './cordova.plugin';

declare global
{
    type TWifiAlgorithm = 'WPA' | 'WEP';

    interface CordovaPlugins
    {
        Wifi: typeof WifiWizard2;
    }
}

// const WIFI_CONNECT_TIMEOUT = 5000;

export class EWifi extends EAbort
{
}

export class EWifiConnectTimeout extends EWifi
{
}

class WifiWizard2 extends TCordovaPlugin
{
    static override readonly Name: string = 'WifiWizard2';
    static override readonly Repository: string = 'https://github.com/tripflex/wifiwizard2';

    static async IsWifiEnabled(): Promise<boolean>
    {
        return this.CallFunction<Promise<boolean>>('isWifiEnabled');
    }

    static async GetConnectedSSID(): Promise<string | undefined>
    {
        return this.CallFunction<Promise<string>>('getConnectedSSID')
            .catch((err: string) => Promise.resolve(undefined));
    }

    static async GetConnectedBSSID(): Promise<string | undefined>
    {
        return this.CallFunction<Promise<string>>('getConnectedBSSID')
            .catch((err: string) => Promise.resolve(undefined));
    }

    /*Not supported by iOS */
    static async GetWifiIP(): Promise<string | undefined>
    {
        return this.CallFunction<Promise<string>>('getWifiIP')
            .catch((err: string) => Promise.resolve(undefined));
    }

    static async LoopConnect(ssid: string, pwd: string, try_times: number = 2)
    {
        return new Promise<void>((resolve, reject) =>
        {
            function LoopConnect(self: any, times: number)
            {
                times--;
                cordova.plugin.Wifi.Connect(ssid, pwd)
                    .then(async () =>
                    {
                        await (new Promise<void>(resolve => setTimeout(() => resolve(), 1000)));
                        if (self.Platform.IsAndroid)
                        {
                            const curr_ip = await cordova.plugin.Wifi.GetWifiIP();
                            if (! TypeInfo.Assigned(curr_ip))
                                await (new Promise<void>(resolve => setTimeout(() => resolve(), 200)));

                            console.log('connected ' + ssid + ' ip: ' + curr_ip);
                        }
                        resolve();
                    })
                    .catch((err) =>
                    {
                        console.error(err);
                        if (times > 0)
                            setTimeout(() => LoopConnect(self, times));
                        else
                            reject('Connect Wifi: ' + ssid +  ' timedout!');
                    });
            }
            LoopConnect(this, try_times);
        });
    }

    static async TryLoopConnect(ssid: string, pwd: string, times: number = 2): Promise<boolean>
    {
        return new Promise<boolean>(resolve =>
        {
            this.LoopConnect(ssid, pwd, times)
                .then(() => resolve(true))
                .catch(() => resolve(false));
        });
    }

    static Connect(ssid: string, hidden?: true): Promise<void>;
    static Connect(ssid: string, password: string, hidden?: true): Promise<void>;
    static Connect(ssid: string, password: string, algorithm: TWifiAlgorithm, hidden?: true): Promise<void>;
    static async Connect(ssid: string, PwdOrHidden?: string | boolean, AlgorithmOrHidden?: TWifiAlgorithm | boolean, hidden?: boolean): Promise<void>
    {
        let algorithm = 'WPA';
        let password = '';

        if (TypeInfo.Assigned(PwdOrHidden))
        {
            if (TypeInfo.IsString(PwdOrHidden))
            {
                password = PwdOrHidden;

                if (TypeInfo.Assigned(AlgorithmOrHidden))
                {
                    if (TypeInfo.IsString(AlgorithmOrHidden))
                        algorithm = AlgorithmOrHidden;
                    else
                       hidden = AlgorithmOrHidden;
                }
                else
                    hidden = TypeInfo.Assigned(hidden) && hidden;
            }
            else
                hidden = PwdOrHidden;
        }

        if (ssid !== await this.GetConnectedSSID())
        {
            console.log(`Wifi Connecting:${ssid} Pwd:${password} Algorithm:${algorithm} Hidden: ${hidden}`);

            if (this.Platform.IsAndroid)
            {
                return this.CallFunction<Promise<string>>('connect', ssid, true, password, algorithm, hidden)
                    .then(retval =>
                    {
                        console.log(`connect: ${retval}`);
                    })
                    .catch(err =>
                    {
                        if ('CONNECT_FAILED_TIMEOUT' === err)
                            throw new EWifiConnectTimeout();
                        else
                            throw new EWifi(err);
                    });
            }
            else if (this.Platform.IsiOS)
            {
                return this.CallFunction<Promise<any>>('iOSConnectNetwork', ssid, password).then(retval =>
                {
                    console.log(`iOSConnectNetwork: ${retval}`);
                });
            }
            else
                throw new EWifi('unsupported platform');
        }
        else
            console.log('Wifi: already connected');
    }

    static async Disconnect(ssid?: string, AndroidRemove = false): Promise<void>
    {
        if (Platform.IsAndroid)
        {
            if (AndroidRemove)
            {
                // the remove api deprecated
                await this.CallFunction<Promise<string>>('disconnect', ssid)
                    .then(str => console.log(`Wifi disconnected: ${str}`))
                    .catch(err => new EWifi(err));
            }
            else
            {
                await this.CallFunction<Promise<string>>('disable', ssid)
                    .then(str => console.log(`Wifi Disconnect: ${str}`))
                    .catch(err => new EWifi(err));
            }
        }
        else if (Platform.IsiOS)
        {
            await this.CallFunction<Promise<void>>('iOSDisconnectNetwork', ssid)
                .catch((err: string) => Promise.reject(new EWifi(err)));
        }
        else
            throw new EWifi('unsupported platform');
    }

    static GoSetting(): void
    {
        return this.CallFunction<void>('switchToWifiSettings');
    }

/** Android Only */
    static async AndroidRemoveSSID(ssid: string): Promise<void>
    {
        return this.CallFunction<Promise<void>>('remove', ssid);
    }
}
TCordovaPlugin.Register(WifiWizard2, 'Wifi');
