/**
 *  !! DEPRECATED !!
 *      .has no function/property to change the ringtone
 *      .add weekly event too many difference on Android/iOS
 *
 *      also Android calendar has too many bugs, it heavy depends on the cloud
 *      iOS never tested since the Android issue.
 */

/**
 *  https://github.com/EddyVerbruggen/Calendar-PhoneGap-Plugin
 *      cordova plugin add cordova-plugin-calendar --variable CALENDAR_USAGE_DESCRIPTION=""
 */
import {TypeInfo} from '../core/typeinfo';
import {TCordovaPlugin} from './cordova.plugin';

/*
    Operation                                  Comment  iOS Android Windows
-------------------------------------------------------------------------------
    createCalendar                                      yes   yes               ✔
    deleteCalendar                                      yes   yes               ✔

    createEvent                                 silent  yes   yes*  yes**
    createEventWithOptions                      silent  yes   yes*  yes**       ✔
    createEventInteractively               interactive  yes   yes   yes**
    createEventInteractivelyWithOptions    interactive  ye    yes   yes**

    findEvent                                           yes   yes
    findEventWithOptions                                yes   yes
    findAllEventsInNamedCalendars                       yes

    listEventsInRange                                   yes   yes               ✔
    listCalendars                                       yes   yes               ✔, must using this to get calendar id

    modifyEvent                                         yes
    modifyEventWithOptions                              yes

    deleteEvent                                         yes   yes
    deleteEventFromNamedCalendar                        yes
    deleteEventById                                     yes   yes               ✔

    openCalendar                                        yes   yes               ✖, this only open the 'today' or Date
*/

declare global
{
    interface CordovaPlugins
    {
        Calendar: typeof NativeCalendar;
    }

    namespace cordova.plugin.Calendar
    {
        interface Handle
        {
            id: string;     // Android
            name: string;   // iOS
        }

        interface ListNames
        {
            id: string;
            name: string;
            displayname: string;
            isPrimary: boolean;
        }

        type TCalendarRecurrence = 'daily' | 'weekly' | 'monthly' | 'yearly';

        interface CreateEventOptions
        {
            firstReminderMinutes?: number;
            secondReminderMinutes?: number;

            recurrence?: TCalendarRecurrence;
            recurrenceInterval?: number;
            recurrenceCount?: number;
            recurrenceEndDate?: Date;

            /* Android only?
            recurrenceByDay?: number;
            recurrenceByMonthDay?: number;
            recurrenceWeekstart?: 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';
            */

            url?: string;
        }
    }
}

declare var window: any;

class NativeCalendar extends TCordovaPlugin
{
    static override readonly Name: string = 'calendar';
    static override readonly Repository: string = 'cordova-plugin-calendar';

    /**
     *  list all calendars
     */
    static List(): Promise<Array<cordova.plugin.Calendar.ListNames>>
    {
        return this.CallbackToPromise('listCalendars');
    }

    /**
     *  create the calendar
     *      harmless when Name already exists
     *
     *  @returns
     *      Calendar.Handle
     */
    static Create(Name: string, Color?: string): Promise<cordova.plugin.Calendar.Handle>
    {
        const opts: any = this.CallFunction('getCreateCalendarOptions');
        opts.calendarName = Name;

        if (TypeInfo.Assigned(Color))
            opts.calendarColor = Color;

        return this.CallbackToPromise_LeftParam('createCalendar', opts).then(async () =>
        {
            for (const iter of await this.List())
            {
                if (Name === iter.name)
                    return {id: iter.id, name: Name};
            }

            return {id: '',     // Android should not happen, iOS?
                name: Name
            };
        });
    }

    /**
     *  delete the calendar by name
     */
    static Delete(Name: string): Promise<void>
    {
        return this.CallbackToPromise_LeftParam('deleteCalendar', Name);
    }

    /**
     *  add a event into calendar
     *      @param CalendarId from Create()
     */
    static CreateEvent(hdl: cordova.plugin.Calendar.Handle, AT: Date): void   // Promise<string>
    {
        let opts: cordova.plugin.Calendar.CreateEventOptions = window.plugins.calendar.getCalendarOptions();
        opts = Object.assign(opts, hdl);

        /*
        calOptions.firstReminderMinutes = 120; // default is 60, pass in null for no reminder (alarm)
        calOptions.secondReminderMinutes = 5;

        // Added these options in version 4.2.4:
        calOptions.recurrence = "monthly"; // supported are: daily, weekly, monthly, yearly
        calOptions.recurrenceEndDate = new Date(2016,10,1,0,0,0,0,0); // leave null to add events into infinity and beyond

        // This is new since 4.2.7:
        calOptions.recurrenceInterval = 2; // once every 2 months in this case, default: 1

        // And the URL can be passed since 4.3.2 (will be appended to the notes on Android as there doesn't seem to be a sep field)
        calOptions.url = "https://www.google.com";

        // on iOS the success handler receives the event ID (since 4.3.6)
        window.plugins.calendar.createEventWithOptions(title,eventLocation,notes,startDate,endDate,calOptions,success,error);
        */
    }

    /**
     *  remove event by id
     */
    static DeleteEvent(EventId: string): Promise<void>
    {
        return this.CallbackToPromise_LeftParam('deleteEventById', EventId, undefined);
    }

    // this plugin installed at window.plugins.calendar
    protected static override _GetInstance(PluginName: string): any
    {
        if (TypeInfo.Assigned(window.plugins))
            return window.plugins.calendar;
        else
            return undefined;
    }
}
TCordovaPlugin.Register(NativeCalendar, 'Calendar');
