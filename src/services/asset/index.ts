import {Injectable} from '@angular/core';
import {TBasicAssetService, TPeripheral} from 'ultracreation/asset';
import {TApplication} from '../application';
import {TDbAssetService} from 'ultracreation/asset/service.db';
export {TPeripheral};
export * from './peripherial/widget';

declare global
{
}

@Injectable({providedIn: 'root'})
export class TAssetService extends TDbAssetService
{
    constructor(protected readonly App: TApplication)
    {
        super(App);

        App.RegisterInitializer(this, async () =>
        {
            await this.AddLanguage('en');
            await this.AddLanguage('zh');
        });
        
    }
}
