import {NgModule, APP_INITIALIZER} from '@angular/core';

import {TApplication} from './application';
import {TAssetService} from './asset';
export * from './asset/peripherial/widget';


@NgModule({
    providers: [
        {
            provide: APP_INITIALIZER, multi: true, deps: [
                TApplication, TAssetService
            ],
            useFactory: (App: TApplication) => () => App.Initialize()
        },
    ],
})
export class ServiceModule
{
}
