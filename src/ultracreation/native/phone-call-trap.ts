/**
 *  Native Phone Call Trapper support
 *      Cordova plugin github: https://github.com/ElieSauveterre/cordova-phone-call-trap.git
 */
import {Subject} from 'rxjs';
import {TypeInfo} from '../core/typeinfo';

declare var window: any;

export enum TPhoneCallState
{
    RINGING,
    OFFHOOK, // user have connect the call
    IDLE
}

export class TPhoneCallTrap extends Subject<TPhoneCallState>
{
    static Get(): TPhoneCallTrap
    {
        if (! TypeInfo.Assigned(this.Singleton))
            this.Singleton = new TPhoneCallTrap();

        return this.Singleton;
    }

    private constructor()
    {
        super();
        if (! TypeInfo.Assigned(window.PhoneCallTrap))
        {
            console.log('PhoneCallTrap plugin is not installed.');
            return;
        }

        window.PhoneCallTrap.onCall(
            (state: any) => this.successCallback(state),
            (err: any) =>  this.errorCallback(err));
    }

    private successCallback(state: string)
    {
        switch (state)
        {
            case 'RINGING':
                console.log('Phone is ringing');
                super.next(TPhoneCallState.RINGING);
                break;
            case 'OFFHOOK':
                console.log('Phone is off-hook');
                super.next(TPhoneCallState.OFFHOOK);
                break;
            case 'IDLE':
                console.log('Phone is idle');
                super.next(TPhoneCallState.IDLE);
                break;
        }
    }

    private errorCallback(err: any)
    {
        console.log(err);
        super.error('phone call err');
    }

    private static Singleton: TPhoneCallTrap;
}
