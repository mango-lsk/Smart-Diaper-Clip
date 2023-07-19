import {Component, ViewChild, AfterViewInit, ElementRef, Input, OnInit} from '@angular/core';
import {TypeInfo} from '../../core/typeinfo';

declare global
{
    namespace Comp
    {
        export type VerticalBatt = VerticalBattComp;
    }
}

@Component({
    selector: 'vert-batt',
    template: `
    <svg xmlns="http://www.w3.org/2000/svg" height="1em" width="1em" viewBox="0 0 100 100" [ngClass]="Style">
        <g>
            <rect height="9%" width="20%" y="1%" x="40%" stroke-width="3"
                fill-opacity="0.5"/>
            <rect height="88%" width="40%" y="10%" x="30%" stroke-width="3"
                fill-opacity="0.5"/>
            <rect height="82%" width="30%" y="13%" x="35%" stroke-width="0.5"
                fill="#fff" fill-opacity="0.5"/>
            <rect height="40%" width="30%" y="55%" x="35%" stroke-width="0.5"/>
        </g>
    </svg>`,
    styleUrls: [`batt.comp.scss`]
})
export class VerticalBattComp
{
    @Input() Value = 0;
    @Input() ValueTable = [4000, 3700, 3450, 3300];

    get Style()
    {
        if (!TypeInfo.Assigned(this.Value))
            return 'batt_undefined';

        if (this.Value >= this.ValueTable[0])
            return 'batt_full';

        if (this.Value >= this.ValueTable[1])
            return 'batt_normal';


        if (this.Value <= this.ValueTable[3])
            return 'batt_empty';

        if (this.Value <= this.ValueTable[2])
            return 'batt_warning';

        return 'batt_undefined';
    }
}

interface IBatteryConfig
{
    Stroke: string | null;
    Color: string;

    WarningColor: string;
    DangerColor: string;
}
