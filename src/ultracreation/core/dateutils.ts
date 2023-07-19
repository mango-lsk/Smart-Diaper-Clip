import {TypeInfo} from './typeinfo';

/*
export namespace DateLocalize
{
    export let WeekdayAbvNames =
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    export let WeekdayNames =
        ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    export let MonthAbvNames =
    [
        'JAN',
        'FEB',
        'MAR',
        'APR',
        'MAY',
        'JUN',
        'JUL',
        'AUG',
        'SEP',
        'OCT',
        'NOV',
        'DEC'
    ];

    export let MonthNames =
    [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ];
}
*/

declare global
{
/****************************************************************************
 *  Date extension
 */
    const enum TDatePart
    {
        Day,
        Hour,
        Minute,
        Second,
        Millisecond,
    }

    interface Date
    {
        readonly WeekDay: TWeekDay;

        /**
         *  YYYYMMDD: date without time as number format
         */
        DateAT: number;

        /**
         *   HHmm: military time format of Date()
         */
        TimeAT: number;

        /**
         *  to IEEE double DateTime
         */
        ToIEEE(): number;

        Add(Part: TDatePart, Value: number): Date;
        Sub(Part: TDatePart, Value: number): Date;
        Diff(value: Date, Part: TDatePart ): number;

        Format(fmt: string): string;
    }

    interface DateConstructor
    {
        Today(): Date;

        FromDateTimeAT(DT: Date, TimeAT?: number): Date;
        FromDateTimeAT(DateAT: number, TimeAT?: number): Date;
        FromDateTimeAT(DT: number | Date, TimeAT?: number): Date;

        /**
         *  construct Date from IEEE double DateTime
         */
        FromIEEE(v: number): Date;

        FromISO8601(str: string, TZ?: string): Date;
    }

/****************************************************************************
 *  DayHour / HourMinutes pseudo definition
 */
    type TDayHour =
        0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
        13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23;

    type THourMinute =
        0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
        13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 |
        25 | 26 | 26 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 |
        37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 |
        49 | 50 | 51 | 52 | 53 | 54 | 55 | 56 | 57 | 58 | 59;

/****************************************************************************
 *  TWeekDays extends Set<TWeekDay>
 */
    const enum TWeekDay
    {
        Sunday                      = 0,
        Monday,
        Tuesday,
        Wednesday,
        Thursday,
        Firday,
        Saturday
    }

    interface TWeekDays extends Set<TWeekDay>
    {
        AsInteger: number;
    }

    interface TWeekDaysConstructor {
        new (...Days: TWeekDay[]): TWeekDays;
        readonly prototype: TWeekDays;

        FromInteger(v: number): TWeekDays;
    }

    var TWeekDays: TWeekDaysConstructor;

/****************************************************************************
 *  TYearMonths extends Set<TYearMonth>
 */
     const enum TYearMonth
    {
        January                     = 0,
        February,
        March,
        April,
        May,
        June,
        July,
        August,
        September,
        October,
        November,
        December,
    }

    interface TYearMonths extends Set<TYearMonth>
    {
        AsInteger: number;
    }

    interface TYearMonthsConstructor
    {
        new (...Days: TYearMonth[]): TYearMonths;
        readonly prototype: TYearMonths;
    }

    var TYearMonths: TYearMonthsConstructor;

    namespace Milliseconds
    {
        const enum Per
        {
            Second                  = 1000,
            Minute                  = 60000,
            Hour                    = 3600000,
            Day                     = 86400000,
            Week                    = 604800000,
        }
    }

    namespace Seconds
    {
        const enum Per
        {
            Minute                   = 60,
            Hour                     = 3600,
            Day                      = 86400,
            Week                     = 604800,
        }
    }

    namespace Minutes
    {
        const enum Per
        {
            Hour                     = 60,
            Day                      = 1440,
            Week                     = 10080,
        }
    }

    namespace Hours
    {
        const enum Per
        {
           Day                      = 24,
           Week                     = 168,
        }
    }
}

/*
 *  Date extension
 */
    Object.defineProperties(Date.prototype, {
        WeekDay: {
            get(): number
            {
                return this.getDay();
            }
        },
        DateAT: {
            get(): number
            {
                return this.getFullYear() * 10000 + (this.getMonth() + 1) * 100 + this.getDate();
            },
            set(val: number)
            {
                this.setFullYear(Math.trunc(val / 10000),
                    Math.trunc((val % 10000) / 100) - 1,
                    val % 100
                );
            }
        },
        TimeAT: {
            get(): number
            {
                return this.getHours() * 100 + this.getMinutes();
            },
            set(val: number)
            {
                this.setHours(Math.trunc(val / 100),
                    val % 100,
                    0
                );
            }
        },
    });

    Date.Today = function Today(): Date
    {
        const dt = new Date();
        return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    };

    Date.FromDateTimeAT = function FromDateTimeAT(DT: number | Date, TimeAT?: number): Date
    {
        TimeAT = 0 | TimeAT!;

        if (DT instanceof Date)
        {
            return new Date(DT.getFullYear(), DT.getMonth(), DT.getDate(),
                Math.trunc(TimeAT / 100), TimeAT % 100, 0, 0);
        }
        else
        {
            return new Date(Math.trunc(DT / 10000), Math.trunc((DT % 10000) / 100) - 1, DT % 100,
                Math.trunc(TimeAT / 100), TimeAT % 100, 0, 0);
        }
    };

    Date.FromIEEE = function FromIEEE (v: number): Date
    {
        return new Date(Math.trunc(v * 86400000));
    };

    Date.FromISO8601 = function FromISO8601(str: string, TZ?: string): Date
    {
        if (TypeInfo.Assigned(TZ))
        {
            // todo: FromISO() checking TZ is invalidate
        }
        else
            TZ = 'Z';

        return new Date(str.replace(/\s(?=\d+)/, 'T') + TZ);
    };

    Date.prototype.ToIEEE = function ToIEEE(): number
    {
        return this.getTime() / 86400000;
    };

    Date.prototype.Add = function Add(Part: TDatePart, Value: number): Date
    {
        switch (Part)
        {
        case TDatePart.Millisecond:
            return new Date(this.getTime() + Value);
        case TDatePart.Second:
            return new Date(this.getTime() + Value * Milliseconds.Per.Second);
        case TDatePart.Minute:
            return new Date(this.getTime() + Value * Milliseconds.Per.Minute);
        case TDatePart.Hour:
            return new Date(this.getTime() + Value * Milliseconds.Per.Hour);
        case TDatePart.Day:
            return new Date(this.getTime() + Value * Milliseconds.Per.Day);
        }
        return this;
    };

    Date.prototype.Sub = function Sub(Part: TDatePart, Value: number): Date
    {
        return this.Add(Part, -Value,);
    };

    Date.prototype.Diff = function Diff(value: Date, Part: TDatePart): number
    {
        const _Diff = this.getTime() - value.getTime();

        switch (Part)
        {
        default:
        case TDatePart.Millisecond:
            return _Diff;
        case TDatePart.Second:
            return Math.trunc(_Diff / Milliseconds.Per.Second);
        case TDatePart.Minute:
            return Math.trunc(_Diff / Milliseconds.Per.Minute);
        case TDatePart.Hour:
            return Math.trunc(_Diff / Milliseconds.Per.Hour);
        case TDatePart.Day:
            return Math.trunc(_Diff / Milliseconds.Per.Day);
        }
    };

    Date.prototype.Format = function Format(fmt: string): string
    {
        const o: any = {
            'm+': this.getMonth() + 1,
            'M+': this.getMonth() + 1,
            'd+': this.getDate(),
            'D+': this.getDate(),
            'h+': this.getHours() % 12,
            'H+': this.getHours(),
            'n+': this.getMinutes(),
            'N+': this.getHours(),
            's+': this.getSeconds(),
            'S+': this.getSeconds(),
            'q+': Math.floor((this.getMonth() + 3) / 3),
            'Q+': Math.floor((this.getMonth() + 3) / 3),
            'z+': this.getMilliseconds(),
            'Z+': this.getMilliseconds(),
            'a/p': this.getHours() / 12 > 1 ? 'PM' : 'AM'
        };

        if (/(y+)/.test(fmt))
            fmt = fmt.replace(RegExp.$1, (this.getFullYear() + '').substring(4 - RegExp.$1.length));
        if (/(Y+)/.test(fmt))
            fmt = fmt.replace(RegExp.$1, (this.getFullYear() + '').substring(4 - RegExp.$1.length));

        for (const k in o)
        {
            if (new RegExp('(' + k + ')').test(fmt))
            {
                if (k[0] === 'z' || k[0] === 'Z')
                    fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('000' + o[k]).substring(('' + o[k]).length)));
                else
                    fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substring(('' + o[k]).length)));
            }
        }
        return fmt;
    };


class TWeekDays extends Set<TWeekDay>
{
    constructor(...Days: TWeekDay[])
    {
        super();
        Days.forEach(Day => this.add(Day));
    }

    static FromInteger(v: number): TWeekDays
    {
        const RetVal = new TWeekDays();
        RetVal.AsInteger = v;
        return RetVal;
    }

    get AsInteger(): number
    {
        let retval = 0;
        for (const iter of this)
            retval |= 1 << iter;
        return retval;
    }

    set AsInteger(v: number)
    {
        this.clear();
        for (let Day = TWeekDay.Sunday; Day <= TWeekDay.Saturday; Day ++)
        {
            if (v & (1 << Day))
                this.add(Day);
        }
    }
}
global.TWeekDays = TWeekDays;

class TYearMonths extends Set<TYearMonth>
{
    constructor (...Days: TYearMonth[])
    {
        super();
        Days.forEach(Day => this.add(Day));
    }

    get AsInteger(): number
    {
        let retval = 0;
        for (const iter of this)
            retval |= 1 << iter;
        return retval;
    }

    set AsInteger(v: number)
    {
        this.clear();
        for (let Month = TYearMonth.January; Month <= TYearMonth.December; Month ++)
        {
            if (v & (1 << Month))
                this.add(Month);
        }
    }
}
global.TYearMonths = TYearMonths;

/*
export namespace DateUtils
{
    export function To12H(hour: number)
    {
        if (hour > 12)
            return hour % 12;
        else if (hour > 0)
            return hour;
        else
            return 12;
    }

    export function FormatTimeTick(Tick: number, fmt: string): string
    {
        if (isNaN(Tick))
            Tick = 0;

        const o: any = {
            'h+': To12H(Math.trunc(Tick / Milliseconds.Per.Hour)),
            'H+': Math.trunc(Tick / Milliseconds.Per.Hour),
            'n+': Math.trunc((Tick % Milliseconds.Per.Hour) / Milliseconds.Per.Minute),
            'N+': Math.trunc((Tick % Milliseconds.Per.Hour) / Milliseconds.Per.Minute),
            's+': Math.trunc(Tick % Milliseconds.Per.Minute / Milliseconds.Per.Second),
            'S+': Math.trunc(Tick % Milliseconds.Per.Minute / Milliseconds.Per.Second),
            'z+': Tick % Milliseconds.Per.Second,
            'Z+': Tick % Milliseconds.Per.Second,
            'a/p': Math.trunc(Tick / Milliseconds.Per.Hour) >= 12 ? 'PM' : 'AM'
        };

        for (const k in o)
        {
            if (new RegExp('(' + k + ')').test(fmt))
            {
                if (k[0] === 'z' || k[0] === 'Z')
                    fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('000' + o[k]).substring(('' + o[k]).length)));
                else
                    fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (('00' + o[k]).substring(('' + o[k]).length)));
            }
        }
        return fmt;
    }
}
*/
