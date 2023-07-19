import {Subject, takeUntil} from 'rxjs';
import {EventEmitter, Injectable, Injector} from '@angular/core';

import {TypeInfo} from '../core/typeinfo';
import {EAbort} from '../core/exception';
import {Translate} from '../ngx/translate';

import {_Ngx, TNgxApplication} from '../ngx/application';

import {ModalOptions, AlertOptions, ToastOptions, LoadingOptions, ActionSheetOptions} from '@ionic/core';
import {NavController, ToastController, AlertController, ModalController, LoadingController, ActionSheetController} from '@ionic/angular';

import {FrameworkDelegate, AnimationBuilder} from '@ionic/core';
import {AnimationOptions} from '@ionic/angular/providers/nav-controller';

declare global
{
    namespace Ion
    {
        /**
         *  Runs when the page has loaded.
         *      This event only happens once per page being created.
         *      If a page leaves but is cached, then this event will not fire again on a subsequent viewing.
         *      The ionViewDidLoad event is good place to put your setup code for the page.
         */
        interface ViewDidLoad
        {
            ionViewDidLoad(): void;
        }

        /**
         *  Runs when the page is about to enter and become the active page.
         */
        interface ViewWillEnter
        {
            ionViewWillEnter(): void;
        }

        /**
         *  Runs when the page has fully entered and is now the active page. This event will fire, whether it was the first load or a cached page.
         */
        interface ViewDidEnter
        {
            ionViewDidEnter(): void;
        }

        /**
         *  Runs when the page is about to leave and no longer be the active page.
         */
        interface ViewWillLeave
        {
            ionViewWillLeave(): void;
        }

        /**
         *  Runs when the page has finished leaving and is no longer the active page.
         */
        interface ViewDidLeave
        {
            ionViewDidLeave(): void;
        }

        /**
         *  Runs when the page is about to be destroyed and have its elements removed.
         */
        interface ViewWillUnload
        {
            ionViewWillUnload(): void;
        }

        /**
         *  Runs before the view can enter.
         *      This can be used as a sort of "guard" in authenticated views where you need to check permissions before the view can enter
         */
        interface ViewCanEnter
        {
            ionViewCanEnter(): boolean | Promise<void>;
        }

        /**
         *  Runs before the view can leave.
         *      This can be used as a sort of 'guard' in authenticated views where you need to check permissions before the view can leave    * /;
         */
        interface ViewCanLeave
        {
            ionViewCanLeave(): boolean | Promise<void>;
        }
    }
}

declare module '../ngx/application'
{
    namespace _Ngx
    {
        interface INavExtras extends AnimationOptions
        {
        }

        interface ILoadingOptions extends LoadingOptions
        {
        }

        interface IToastOptions extends ToastOptions
        {
        }

        interface IAlertOptions extends AlertOptions
        {
        }

        interface IErrorOptions extends ToastOptions
        {
        }

        interface IModalOptions //  extends ModalOptions need to hide component
        {
            id?: string;

            animated?: boolean;
            backdropDismiss?: boolean;
            canDismiss?: boolean | (() => Promise<boolean>);
            componentProps?: TypeInfo.IndexSignature;
            delegate?: FrameworkDelegate;
            handle?: boolean;
            keyboardClose?: boolean;
            presentingElement?: HTMLElement;
            showBackdrop?: boolean;

            cssClass?: string | string[];
            mode?: 'ios' | 'md';

            initialBreakpoint?: number;
            backdropBreakpoint?: number;
            breakpoints?: number[];

            enterAnimation?: AnimationBuilder;
            leaveAnimation?: AnimationBuilder;
        }
    }
}

interface IonDismissible
{
    dismiss: (data?: any, role?: string | undefined) => Promise<boolean>;
}

@Injectable({providedIn: 'root'})
export class TIonicApplication extends TNgxApplication
{
    constructor(injector: Injector)
    {
        super(injector);
        console.log('TIonicApplication.construct');
    }

    /**
     *  @param url
     *      relative path or absolute path (starting with '/')
     */
    override NavPush(url: string, opts?: _Ngx.INavExtras): Promise<boolean>
    {
        if (TypeInfo.Assigned(opts) && TypeInfo.Assigned(opts.NavData))
            this.NavData = opts.NavData;
        else
            this.NavData = {};

        url = this.RelativeUrl(this.Router.url, url);
        // console.log('router: ' + this.Router.url + ' to: ' + url);
        this.NavStacks.push(this.Router.url);

        return this.Nav.navigateForward(url, opts).finally(async () =>
        {
            if (TypeInfo.Assigned(this._Loading))
                await this.HideLoading();
        });
    }

    override NavPop(opts?: _Ngx.INavExtras): Promise<void>
    {
        if (TypeInfo.Assigned(opts) && TypeInfo.Assigned(opts.NavData))
            this.NavData = opts.NavData;
        else
            this.NavData = {};

        const top = this.NavStacks.pop();
        let Routing: Promise<void>;

        if (TypeInfo.Assigned(top))
        {
            if (TypeInfo.IsString(top))
            {
                console.log(`navigate pop to ${top}`);
                Routing = this.Nav.navigateBack(top, opts).then(() => { });
            }
            else
                Routing = top.then(element => element.dismiss()).then(() => { });
        }
        else
            Routing = Promise.resolve();

        return Routing.finally(async () =>
        {
            this.NavData = {};

            if (TypeInfo.Assigned(this._Loading))
                await this.HideLoading();
        });
    }

    override NavPopToRoot(opts?: _Ngx.INavExtras): Promise<void>
    {
        console.log(`navigate pop to root`);

        if (TypeInfo.Assigned(opts) && TypeInfo.Assigned(opts.NavData))
            this.NavData = opts.NavData;
        else
            this.NavData = {};

        const stacks = this.NavStacks;
        this.NavStacks = [];

        const routing = new Array<Promise<boolean>>();
        while (true)
        {
            const top = stacks.pop();

            if (TypeInfo.Assigned(top))
            {
                if (TypeInfo.IsString(top))
                    routing.push(this.Nav.navigateBack(top, opts));
                else
                    routing.push(top.then(element => element.dismiss()));
            }
            else
                break;
        }

        return Promise.all(routing).then(() => { }).finally(() =>
        {
            this.NavData = {};

            if (TypeInfo.Assigned(this._Loading))
                this.HideLoading();
        });
    }

    override async NavRoot(url: string, opts?: _Ngx.INavExtras): Promise<boolean>
    {
        console.log(`navigate root ${url}`);
        this.NavStacks = [];

        if (TypeInfo.Assigned(opts) && TypeInfo.Assigned(opts.NavData))
            this.NavData = opts.NavData;
        else
            this.NavData = {};

        return this.Nav.navigateRoot(url, Object.assign({}, opts, {replaceUrl: true}))
            .finally(() =>
            {
                if (TypeInfo.Assigned(this._Loading))
                    this.HideLoading();
            });
    }

    /**
     *  @params PageType class of PageType
     *  @param opts: ModalOptions
     *      showBackdrop?: boolean;
     *      enableBackdropDismiss?: boolean;
     */
    override ShowModal(ComponentType: any, Properties: _Ngx.IModalProperties, Events: _Ngx.IModalEvents, opts?: _Ngx.IModalOptions): Promise<HTMLIonModalElement>
    {
        opts = Object.assign({}, opts, {component: ComponentType, componentProps: Properties});

        const EventNames = Object.keys(Events);
        let EventLifeCycle: Subject<void> | undefined;

        if (0 !== EventNames.length)
        {
            EventLifeCycle = new Subject<void>();

            /**
             *  TODO: can't resolve ionic dialogs component instance
             *      fake a EventEmitter to it
             */
            for (const iter of EventNames)
            {
                const ev = new EventEmitter<any>();
                opts.componentProps![iter] = ev;

                ev.pipe(takeUntil(EventLifeCycle)).subscribe(next =>
                    Events[iter](next));
            }
        }
        const modal = this.ModalCtrl.create(opts as ModalOptions);

        return modal.then(element =>
        {
            this.NavStacks.push(modal);

            element.onWillDismiss().then(data =>
            {
                if (TypeInfo.Assigned(EventLifeCycle))
                {
                    EventLifeCycle.next();
                    EventLifeCycle.complete();
                }

                const Idx = this.NavStacks.indexOf(modal);
                if (-1 !== Idx)
                    this.NavStacks.splice(Idx, 1);
            });

            element.present().then(() =>
            {
                /*
                REVIEW: its possiable to get component instance from ElementRef?
                const ref = new ElementRef(element.childNodes[0]);
                console.log(ref);
                */
            });

            return element;
        });
    }

    /**
     *  IsLoading
     */
    override get IsLoading(): boolean
    {
        return TypeInfo.Assigned(this._Loading);
    }

    /**
     *  @paramm opt: LoadingOptions
     *      spinner?: "ios" | "ios-small" | "bubbles" | "circles" | "crescent" | "dots"
     *      content?: string;
     *      cssClass?: string;
     *      showBackdrop?: boolean;
     *      dismissOnPageChange?: boolean = true;
     *      delay?: number = 0;
     *      duration?: number = 0;  // 0 = forever
     */
    override async ShowLoading(msg?: string, opt?: _Ngx.ILoadingOptions): Promise<HTMLIonLoadingElement>
    {
        if (!TypeInfo.Assigned(opt))
            opt = {};

        if (!TypeInfo.Assigned(this._Loading))
            this._Loading = this.LoadingCtrl.create(opt);

        const element = await this._Loading;
        element.onWillDismiss().then(() => this._Loading = undefined);

        if (TypeInfo.Assigned(opt.id))
            element.id = opt.id;
        if (TypeInfo.Assigned(opt.spinner))
            element.spinner = opt.spinner;
        if (TypeInfo.Assigned(opt.duration))
            element.duration = opt.duration;

        if (TypeInfo.Assigned(msg))
            element.message = msg;

        element.present();
        return element;
    }

    override async HideLoading(): Promise<void>
    {
        if (TypeInfo.Assigned(this._Loading))
        {
            const Loading = this._Loading;
            this._Loading = undefined;
            await Loading;

            return Loading.then(element => element.dismiss().then(() => { }).catch(() => { }));
        }
    }

    async ShowCallLoading(func: Promise<any>, msg?: string,
            ErrHandler?: (err: any) => any,
            opt?: _Ngx.ILoadingOptions): Promise<HTMLIonLoadingElement>
    {
        const ret = await this.ShowLoading(msg, opt);

        const duration = opt?.duration ? opt.duration : 10000;
        this.TimeoutWrapper(func, duration)
            .then(() => this.HideLoading())
            .catch((err) => ErrHandler ? ErrHandler(err) : this.ShowError(err));

        return ret;
    }

    TimeoutWrapper(p: Promise<void>, timeout: number)
    {
        const wait = new Promise((resolve, reject) =>
        {
            setTimeout(() => reject('Time out!'), timeout);
        });
        return Promise.race([p, wait]);
    }

    override async ShowError(err: string | Error, opt?: _Ngx.IErrorOptions): Promise<HTMLIonToastElement | undefined>
    {
        // hiding loading before error
        if (TypeInfo.Assigned(this._Loading))
            await this.HideLoading();

        if (!TypeInfo.Assigned(opt))
            opt = {message: '', position: 'middle', cssClass: 'toast', duration: 1500};

        if (this.IsDevMode)
        {
            if (err instanceof Error)
                console.error(err.stack);
            else
            {
                const trace = new Error();
                console.error(trace.stack);
            }
        }

        if (err instanceof EAbort)
        {
            console.log('%c' + err.message, 'color:yellow');
            return undefined;
        }

        let msg: string;

        if (TypeInfo.IsString(err))
            msg = err;
        else
            msg = err.message;

        console.error('%cError: ' + msg, 'color:red');
        opt.message = msg;
        return this.__ShowToast(opt, this.LangPrefixError);
    }

    /**
     *  Display an alert with a title, inputs, and buttons
     *
     *  @param opts: AlertOptions
     *      title?: string;
     *      subTitle?: string;
     *      message?: string;
     *      cssClass?: string;
     *      inputs?: Array<AlertInputOptions>;
     *      buttons?: Array<any>;
     *      enableBackdropDismiss?: boolean;
     *
     *  @param opts.inputs
     *      type?: string;
     *      name?: string;
     *      placeholder?: string;
     *      value?: string;
     *      label?: string;
     *      checked?: boolean;
     *      disabled?: boolean;
     *      id?: string;
     *
     *  @param opt.buttons
     *      text?: string;
     *      handler?: any;  // function false => dismiss
     *      cssClass: string;
     *      role: 'destructive' | 'cancel'
     */
    override async ShowAlert(msg: string, opts?: _Ngx.IAlertOptions): Promise<HTMLIonAlertElement>
    {
        if (TypeInfo.Assigned(this._Loading))
            await this.HideLoading();

        if (!TypeInfo.Assigned(opts))
            opts = {message: msg};
        else
            opts.message = msg;

        if (TypeInfo.Assigned(opts.Buttons))    // adapt _Ngx.IAlertOptions
        {
            opts.buttons = [];

            for (const iter of opts.Buttons)
            {
                if (TypeInfo.IsString(iter))
                    opts.buttons.push({text: iter});
                else
                    opts.buttons.push({text: iter.Text, handler: iter.Callback});
            }
        }

        return this.__ShowAlert(opts, this.LangPrefixError);
    }

    DismissAlert(): Promise<void>
    {
        if (TypeInfo.Assigned(this.Alert))
            return this.Alert.then(ion => ion.dismiss()).then(() => { });
        else
            return Promise.resolve();
    }

    protected async __ShowAlert(opts: AlertOptions, lang_prefix: string): Promise<HTMLIonAlertElement>
    {
        if (TypeInfo.Assigned(opts.message))
        {
            let lang_id: string;
            let message: string;

            if (TypeInfo.IsString(opts.message))
                message = opts.message;
            else // is IonicSafeString
                message = opts.message.value;

            if (lang_prefix.length !== 0)
                lang_id = lang_prefix + '.' + message;
            else
                lang_id = message;

            const localize_msg = Translate(lang_id);

            if (localize_msg !== lang_id)
                opts.message = localize_msg;
        }

        const OldAlert = this.Alert;
        this.Alert = this.AlertCtrl.create(opts).then(async element =>
        {
            element.onDidDismiss().then(() =>
            {
                this.Alert = undefined;
                console.log('alert dismissed');
            });

            if (TypeInfo.Assigned(OldAlert))
                (await OldAlert).dismiss();

            await element.present();
            return element;
        });

        return this.Alert;
    }

    /** @param opt: ToastOptions
     *      message?: string;
     *      cssClass?: string;
     *      duration?: number;  // default by platform
     *      showCloseButton?: boolean = false;
     *      closeButtonText?: string = false;
     *      dismissOnPageChange?: boolean = true;
     *      position?: "top" | "bottom" | "middle"; // default by platform
     */
    override async ShowToast(opt: _Ngx.IToastOptions | string): Promise<HTMLIonToastElement>
    {
        if (TypeInfo.IsString(opt))
            opt = {message: opt, position: 'middle', cssClass: 'toast', duration: 1500};

        return this.__ShowToast(opt, this.LangPrefixHint);
    }

    protected async __ShowToast(opts: ToastOptions, lang_prefix: string): Promise<HTMLIonToastElement>
    {
        if (TypeInfo.Assigned(opts.message))
        {
            let message: string;

            if (TypeInfo.IsString(opts.message))
                message = opts.message;
            else // is IonicSafeString
                message = opts.message.value;

            opts.message = undefined;

            if (lang_prefix.length !== 0)
            {
                const lang_id = lang_prefix + '.' + message;
                const localize_msg = Translate(lang_id);

                if (localize_msg !== lang_id)
                    opts.message = localize_msg;
            }

            if (!TypeInfo.Assigned(opts.message))
            {
                const localize_msg = Translate(message);

                if (localize_msg !== message)
                    opts.message = localize_msg;
                else
                    opts.message = message;
            }
        }

        const Toast = await this.ToastCtrl.create(opts);
        Toast.present();
        return Toast;
    }

    /**
     *  @param opt: ActionSheetOptions
     *      title?: string;
     *      subTitle?: string;
     *      cssClass?: string;
     *      buttons?: Array<any>;
     *      enableBackdropDismiss?: boolean;
     *
     *  @param opt.buttons
     *      text?: string;
     *      icon?: icon;
     *      handler?: any;  // function false => dismiss
     *      cssClass: string;
     *      role: 'destructive' | 'cancel'
     */
    async ShowActionSheet(opts?: ActionSheetOptions): Promise<HTMLIonActionSheetElement>
    {
        if (!TypeInfo.Assigned(opts))
            opts = {buttons: []};

        const actionSheet = await this.ActionSheetCtrl.create(opts);
        await actionSheet.present();
        return actionSheet;
    }

    protected get Nav(): NavController
    {
        if (!TypeInfo.Assigned(this._Nav))
            this._Nav = this.Injector.get<NavController>(NavController);
        return this._Nav;
    }
    private _Nav?: NavController;
    private NavStacks: Array<string | Promise<IonDismissible>> = [];

    protected get ToastCtrl(): ToastController
    {
        if (!TypeInfo.Assigned(this._ToastCtrl))
            this._ToastCtrl = this.Injector.get<ToastController>(ToastController);
        return this._ToastCtrl!;
    }
    private _ToastCtrl?: ToastController;

    protected get AlertCtrl(): AlertController
    {
        if (!TypeInfo.Assigned(this._AlertCtrl))
            this._AlertCtrl = this.Injector.get<AlertController>(AlertController);
        return this._AlertCtrl;
    }
    private _AlertCtrl?: AlertController;
    private Alert?: Promise<HTMLIonAlertElement>;

    protected get ModalCtrl(): ModalController
    {
        if (!TypeInfo.Assigned(this._ModalCtrl))
            this._ModalCtrl = this.Injector.get<ModalController>(ModalController);
        return this._ModalCtrl;
    }
    private _ModalCtrl?: ModalController;

    protected get LoadingCtrl(): LoadingController
    {
        if (!TypeInfo.Assigned(this._LoadingCtrl))
            this._LoadingCtrl = this.Injector.get<LoadingController>(LoadingController);
        return this._LoadingCtrl;
    }
    private _LoadingCtrl?: LoadingController;
    private _Loading?: Promise<HTMLIonLoadingElement>;

    protected get ActionSheetCtrl(): ActionSheetController
    {
        if (!TypeInfo.Assigned(this._ActionSheetCtrl))
            this._ActionSheetCtrl = this.Injector.get<ActionSheetController>(ActionSheetController);
        return this._ActionSheetCtrl;
    }
    private _ActionSheetCtrl?: ActionSheetController;
}
