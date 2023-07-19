declare var process: any;
declare var window: any;

export class Platform
{
    static get IsBrowser(): boolean
    {
        return 'undefined' !== typeof window;
    }

    static get IsCordova(): boolean
    {
        return this.IsBrowser && ('undefined' !== typeof window.cordova) &&
            ('' !== window.cordova.platformId && '' !== window.cordova.version);
    }

    static get IsNodeJS(): boolean
    {
        return (typeof process !== 'undefined') &&
            typeof (process as any).release !== 'undefined' &&
            typeof (process as any).release.name !== 'undefined' &&
            (process as any).release.name === 'node';
    }

    static get Name(): string | undefined
    {
        if (typeof this._Name === 'undefined')
        {
            if (this.IsBrowser)
            {
                const userAgent = navigator.userAgent || navigator.vendor || window.opera;

                // Windows Phone must come first because its UA also contains "Android"
                if (/windows phone/i.test(userAgent))
                    this._Name = 'Windows Phone';
                else if (/android/i.test(userAgent))
                    this._Name = 'Android';
                // iOS detection from: http://stackoverflow.com/a/9039885/177710
                else if (/iPad|iPhone|iPod/.test(userAgent) && ! window.MSStream)
                    this._Name =  'iOS';
                else
                    this._Name = 'unknown';
            }
            else if (this.IsNodeJS)
            {
                this._Name = 'NodeJS';
            }
        }

        return this._Name;
    }

/* Mobile */

    static get IsMoble(): boolean
    {
        return this.IsAndroid || this.IsiOS || this.IsWindowsPhone;
    }

    static get IsAndroid(): boolean
    {
        return 'Android' === this.Name;
    }

    static get IsiOS(): boolean
    {
        return 'iOS' === this.Name;
    }

    static get IsWindowsPhone(): boolean
    {
        return 'Windows Phone' === this.Name;
    }

    private static _Name: string | undefined = undefined;

/* Instance */

    get IsBrowser(): boolean
    {
        return (this.constructor as typeof Platform).IsBrowser;
    }

    get IsCordova(): boolean
    {
        return (this.constructor as typeof Platform).IsCordova;
    }

    get IsMoble(): boolean
    {
        return this.IsAndroid || this.IsiOS || this.IsWindowsPhone;
    }

    get IsAndroid(): boolean
    {
        return (this.constructor as typeof Platform).IsAndroid;
    }

    get IsiOS(): boolean
    {
        return (this.constructor as typeof Platform).IsiOS;
    }

    get IsWindowsPhone(): boolean
    {
        return (this.constructor as typeof Platform).IsWindowsPhone;
    }
}
