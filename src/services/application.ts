import {Injectable, Injector} from '@angular/core';
import {TIonicApplication} from 'ultracreation/ion';

@Injectable({providedIn: 'root'})
export class TApplication extends TIonicApplication
{
    constructor(injector: Injector)
    {
        super(injector);
        console.log('TIonicApplication.construct');

        cordova.platform.__EvZone = (ev, arg) => this.NgZone(() => ev.next(arg));
    }

    override async Initialize(): Promise<void>
    {
        await cordova.platform.OnDeviceReady;
        return super.Initialize();
    }
}
