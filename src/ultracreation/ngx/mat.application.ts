import {Injectable, Injector} from '@angular/core';
import {TNgxApplication, _Ngx} from './application';

@Injectable({providedIn: 'root'})
export class TMatApplication extends TNgxApplication
{
    constructor(injector: Injector)
    {
        super(injector);
        console.log('TMatApplication.construct');
    }

    IsPaused = false;

    override get IsLoading(): boolean
    {
      return false;
    }

    override ShowLoading(msg?: string, opts?: _Ngx.ILoadingOptions): Promise<HTMLElement>
    {
        return Promise.resolve(null as any);
    }

    override HideLoading(): Promise<void>
    {
        return Promise.resolve();
    }

    /* message abstracts */

    override ShowToast(msg: string, opts?: _Ngx.IToastOptions): Promise<HTMLElement>
    {
        return Promise.resolve(null as any);
    }

    override ShowAlert(msg: string, opts?: _Ngx.IAlertOptions): Promise<HTMLElement>
    {
        return Promise.resolve(null as any);
    }

    override ShowError(err: string | Error, opts?: _Ngx.IErrorOptions): Promise<HTMLElement | undefined>
    {
        return Promise.resolve(null as any);
    }

    override ShowModal(ComponentType: any, Properties: _Ngx.IModalProperties, Events: _Ngx.IModalEvents, opts?: _Ngx.IModalOptions): Promise<any>
    {
        return Promise.resolve(null as any);
    }
}
