/*
 *  Cordova notification plugin
 *      origin: https://github.com/katzer/cordova-plugin-local-notifications
 *          cordova plugin add cordova-plugin-local-notifications
 *
 *      newest pull, which is fixed Android 10 etc.
 *           https://github.com/timkellypa/cordova-plugin-local-notifications
 *
 *  this plugin auto add dependency:
 *      https://github.com/katzer/cordova-plugin-badge
 */
import {Subject} from 'rxjs';
import {TypeInfo} from '../core/typeinfo';
import {TCordovaPlugin} from './cordova.plugin';

declare var window: any;

/** NativeBadge */

/*
// TODO: badge not working on Android 8+

class NativeBadge extends TCordovaPlugin
{
    static override readonly Name: string = 'notification.badge';
    static override readonly Repository: string = 'cordova-plugin-badge';

    static Set(badge: number): void
    {
        this.CallFunction('set', badge);
    }

    static Increase(badge: number): Promise<number>
    {
        return this.CallbackToPromise_LeftParam<number>('increase', badge);
    }

    static Decrease(badge: number): Promise<number>
    {
        return this.CallbackToPromise_LeftParam<number>('decrease', badge);
    }

    static Clear(): void
    {
        return this.CallFunction('clear');
    }

    protected static override _GetInstance(PluginName: string): any
    {
        if (TypeInfo.Assigned(window.cordova) &&
            TypeInfo.Assigned(window.cordova.plugins) &&
            TypeInfo.Assigned(window.cordova.plugins.notification)
        )
        {
            return window.cordova.plugins.notification.badge;
        }
        else
            return undefined;
    }
}
TCordovaPlugin.Register(NativeBadge, 'Badge');
*/

/** NativeLocalNotification */

declare global
{
    interface CordovaPlugins
    {
        LocalNotification: typeof NativeLocalNotification;
    }

    namespace cordova.plugin
    {
        namespace LocalNotification
        {
            interface Options
            {
                id?: number;
                title?: string;
                summary?: string;
                trigger?: LocalNotification.Trigger;

                icon?: string;
                smallIcon?: string;         // not sure platform
                data?: any;
                text?: string;

                group?: string;
                groupSummary?: boolean;

                attachments?: Array<string>;
                actions?: Array<LocalNotification.Action>;
                // progressBar?: {value: number};

                autoClear?: boolean;
                launch?: boolean;
                lockscreen?: boolean;
                priority?: number;
                silent?: boolean;
                sound?: boolean;
                vibrate?: boolean;
                wakeup?: boolean;

                foreground?: boolean;
                /*
                    channel
                    timeoutAfter
                    clock
                    defaults
                    sticky
                    mediaSession
                */
                /*
                useless
                    led
                */
                /*
                not support, since Android 8+
                    color
                    number
                    badge
                */
                channelId?: string;
                wakeLockTimeout?: number;
                fullScreenIntent?: boolean;
                triggerInApp?: boolean;
            }

            type Trigger = 'now' | TiggerDate | TriggerTimespan | TriggerMatch;

            interface TiggerDate
            {
                at: Date;
            }

            interface TriggerMatch
            {
                every: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year' | {
                    second?: number;
                    minute?: number;
                    hour?: number;
                    day?: number;
                    weekday?: number;
                    week?: number;
                    month?: number;
                    year?: number;
                };

                count?: number;
            }

            interface TriggerTimespan
            {
                in: number;
                unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
            }

            /*
            not supported by Android

            interface TriggerLocation
            {
                center: [number, number];
                radius: number;
                notifyOnEntry: boolean;
                notifyOnExit: boolean;
                single: boolean;
            }
            */

            interface Action
            {
                id?: string;
                title?: string;
                launch?: string;
                emptyText?: string;

                /*
                not cross all platforms:
                    ui
                    needsAuth
                    icon
                    submitTitle
                    editable
                    choices
                    defaultValue
                */
            }
        }
    }
}

class NativeLocalNotification extends TCordovaPlugin
{
    static override readonly Name: string = 'notification.local';
    static override readonly Repository: string = 'cordova-plugin-local-notification-12';

    static Push(Id: number, Title: string, Trigger: cordova.plugin.LocalNotification.Trigger,
        opts?: cordova.plugin.LocalNotification.Options): Promise<void>
    {
        const obj: cordova.plugin.LocalNotification.Options = {id: Id,
            title: Title,
            trigger: 'now' !== Trigger ? Trigger : undefined
        };
        Object.assign(obj, opts);

        if (TypeInfo.Assigned(this.Instance))
            return new Promise<void>(resolve =>
                this.CallFunction('schedule', obj, () => resolve(), this));
        else
            return Promise.resolve();
    }

    static Cancel(Id: number | number[]): Promise<void>
    {
        if (TypeInfo.Assigned(this.Instance))
            return new Promise<void>(resolve =>
                this.CallFunction('cancel', Id, resolve()));
        else
            return Promise.resolve();
    }

    static CancelAll(): Promise<void>
    {
        if (TypeInfo.Assigned(this.Instance))
            return new Promise<void>(resolve =>
                this.CallFunction('cancelAll', resolve()));
        else
            return Promise.resolve();
    }

    protected static override _GetInstance(PluginName: string): any
    {
        if (TypeInfo.Assigned(window.cordova) &&
            TypeInfo.Assigned(window.cordova.plugins) &&
            TypeInfo.Assigned(window.cordova.plugins.notification)
        )
        {
            return window.cordova.plugins.notification.local;
        }
        else
            return undefined;
    }

    static get OnAdd(): Subject<cordova.plugin.LocalNotification.Options>
    {
        return this.GetSubject('add');
    }

    static get OnTrigger(): Subject<cordova.plugin.LocalNotification.Options>
    {
        return this.GetSubject('trigger');
    }

    static get OnClick(): Subject<cordova.plugin.LocalNotification.Options>
    {
        return this.GetSubject('click');
    }

    static get OnClear(): Subject<any>
    {
        return this.GetSubject('clear');
    }

    static get OnClearAll(): Subject<any>
    {
        return this.GetSubject('clearall');
    }

    static get OnCancel(): Subject<any>
    {
        return this.GetSubject('cancel');
    }

    static get OnCancelAll(): Subject<any>
    {
        return this.GetSubject('cancelall');
    }

    static get OnUpdate(): Subject<any>
    {
        return this.GetSubject('update');
    }

    private static GetSubject(event: string): Subject<any>
    {
        let subject = this.BindedEvents.get(event);

        if (! TypeInfo.Assigned(subject))
        {
            subject = new Subject<any>();

            if (TypeInfo.Assigned(this.Instance))
            {
                this.Instance.on(event, (cb: any) =>
                    this.Platform.__EvZone(subject!, cb), this);
            }

            this.BindedEvents.set(event, subject);
        }
        return subject;
    }

    private static BindedEvents = new Map<string, Subject<any>>();
}
TCordovaPlugin.Register(NativeLocalNotification, 'LocalNotification');
