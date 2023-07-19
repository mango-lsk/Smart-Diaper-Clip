import {NgModule} from '@angular/core';
import {Pipe, PipeTransform} from '@angular/core';
import {TypeInfo} from '../core/typeinfo';

@Pipe({name: 'round'})
export class TMathRoundPipe implements PipeTransform
{
    transform(value: number, Precision?: number): string
    {
        if (TypeInfo.Assigned(Precision))
        {
            const length = Precision;
            Precision = Math.pow(10, Precision);

            return (Math.round(value * Precision) / Precision).toFixed(length);
        }
        else
            return Math.round(value).toString(10);
    }
}

@Pipe({name: 'trunc'})
export class TMathTruncPipe implements PipeTransform
{
    transform(value: number, Precision?: number): string
    {
        if (TypeInfo.Assigned(Precision))
        {
            const length = Precision;
            Precision = Math.pow(10, Precision);

            return (Math.trunc(value * Precision) / Precision).toFixed(length);
        }
        else
            return Math.trunc(value).toString(10);
    }
}

@NgModule({
    declarations: [
        TMathRoundPipe,
        TMathTruncPipe,
    ],
    exports: [
        TMathRoundPipe,
        TMathTruncPipe
    ]
})
export class MathPipeModule
{
}
