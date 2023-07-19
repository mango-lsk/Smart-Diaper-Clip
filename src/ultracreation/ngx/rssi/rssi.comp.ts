import {Component, Input} from '@angular/core';
import {TypeInfo} from '../../core/typeinfo';

declare global
{
    namespace Comp
    {
        export type RSSI = RssiComp;
    }
}

@Component({
    selector: 'rssi',
    template: `
    <svg xmlns="http://www.w3.org/2000/svg" height="1em" width="1em" viewBox="0 0 24.61 17.644" [ngClass]="Style">
        <g transform="translate(-572.446 -897.356)" *ngIf="undefined!==Value else no_rssi">
            <path *ngIf="Value>=-65" d="M-124.245-56.672a17.288,17.288,0,0,0-12.305,5.1l1.478,1.478a15.212,15.212,0,0,1,10.827-4.485A15.212,
                15.212,0,0,1-113.417-50.1l1.478-1.478A17.287,17.287,0,0,0-124.245-56.672Z"
                transform="translate(708.996 954.028)" />
            <path *ngIf="Value>=-80" d="M-117.234-25.8l1.478,1.477a9.975,9.975,0,0,1,7.1-2.94,9.973,9.973,0,0,1,7.1,2.94l1.478-1.477a12.05,12.05,0,0,
                0-8.577-3.553A12.049,12.049,0,0,0-117.234-25.8Z"
                transform="translate(693.408 931.984)" />
            <path *ngIf="Value>-100" d="M-98.289-.512-96.811.966a4.874,4.874,0,0,1,6.885,0l1.477-1.478A6.966,6.966,0,0,0-98.289-.512Z"
                transform="translate(678.12 910.35)" />
            <circle cx="1.5" cy="1.5" r="1.5"
                transform="translate(583 912)" />
        </g>
        <ng-template #no_rssi>
            <g transform="translate(-572.446 -897.356)">
                <path d="M-98.289-.512-96.811.966a4.874,4.874,0,0,1,6.885,0l1.477-1.478A6.966,6.966,0,0,0-98.289-.512Z"
                    transform="translate(678.12 910.35)" />
                <circle cx="1.5" cy="1.5" r="1.5"
                    transform="translate(583 912)" />
            </g>
            <text x="2" y="10">?</text>
        </ng-template>
    </svg>`,
    styleUrls: [`rssi.comp.scss`]
})
export class RssiComp
{
    @Input() Value: number | undefined;

    get Style()
    {
        if (!TypeInfo.Assigned(this.Value))
            return 'rssi_undefined';
        if (this.Value > -50)
            return 'rssi_full';
        if (this.Value > -70)
            return 'rssi_strong';
        if (this.Value > -90)
            return 'rssi_normal';

        return 'rssi_low';
    }
}
