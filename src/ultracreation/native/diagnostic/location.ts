import {Subject} from 'rxjs';

import {TypeInfo} from '../../core/typeinfo';
import {TCordovaPlugin} from '../cordova.plugin';

class NativeLocationService extends TCordovaPlugin
{
    static override readonly Name: string = 'diagnostic';
    static override readonly Repository: string = 'cordova.plugins.diagnostic.modules "LOCATION"';

    static get HIGH_ACCURACY(): string
    {
        return this.Instance.locationMode.HIGH_ACCURACY;
    }

    static get BATTERY_SAVING(): string
    {
        return this.Instance.locationMode.BATTERY_SAVING;
    }

    static get DEVICE_ONLY(): string
    {
        return this.Instance.locationMode.DEVICE_ONLY;
    }

    static get LOCATION_OFF(): string
    {
        return this.Instance.locationMode.LOCATION_OFF;
    }

    static get Status(): {[Idx: string]: string}
    {
        if (this.Platform.IsAndroid)
            return this.Instance.locationMode;
        else if (this.Platform.IsiOS)
            return this.Instance.permissionStatus;
        else
            return {};
    }

    static IsEnabled(): Promise<boolean>
    {
        return this.CallbackToPromise_LeftParam<boolean>('isLocationEnabled').catch(err => false);
    }

    static GoSetting(): void
    {
        this.CallFunction<void>('switchToLocationSettings');
    }

    static async WaitForEnable(): Promise<void>
    {
        if (! await this.IsEnabled())
        {
            await new Promise<void>((resolve, reject) =>
            {
                const sub = this.OnStateChange.subscribe(next =>
                {
                    if (next !== this.Instance.locationMode.LOCATION_OFF)
                    {
                        sub.unsubscribe();
                        resolve();
                    }
                },
                err => { sub.unsubscribe(); },
                () => { sub.unsubscribe(); });
            });
        }
    }

    static get OnStateChange(): Subject<string>
    {
        if (! TypeInfo.Assigned(this._OnStateChange))
        {
            console.log('Location Service: registerLocationStateChangeHandler');
            this._OnStateChange = new Subject<string>();

            const Instance = this.Instance;
            if (TypeInfo.Assigned(Instance))
            {
                Instance.registerLocationStateChangeHandler((state: string) =>
                {
                    console.log('Location Service state change: ' + state);
                    this._OnStateChange.next(state);
                });
            }
        }
        return this._OnStateChange;
    }

    private static _OnStateChange: Subject<string>;
}

declare global
{
    interface CordovaPlugins
    {
        LocationService: typeof NativeLocationService;
    }
}
TCordovaPlugin.Register(NativeLocationService, 'LocationService');
