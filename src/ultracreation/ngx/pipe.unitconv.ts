import {NgModule} from '@angular/core';
import {Pipe, PipeTransform} from '@angular/core';

import {UnitConv} from '../core/conv';

@Pipe({name: 'conv', pure: false})
export class TUnitDefConvertPipe implements PipeTransform
{
    transform(value: number, Subject: UnitConv.TUnitName, To?: string): number | undefined
    {
        return UnitConv.Convert(Subject, value, To);
    }
}

@Pipe({name: 'conv_name', pure: false})
export class TUnitDefConvertNamePipe implements PipeTransform
{
    transform(Subject: UnitConv.TUnitName): string
    {
        return UnitConv.MetricDefault(Subject).Name;
    }
}

@Pipe({name: 'conv_sym', pure: false})
export class TUnitDefConvertSymbolPipe implements PipeTransform
{
    transform(Subject: UnitConv.TUnitName): string
    {
        return UnitConv.MetricDefault(Subject).Symbol;
    }
}

@Pipe({name: 'convertiables', pure: false})
export class TUnitConvertiablesPipe implements PipeTransform
{
    transform(Subject: UnitConv.TUnitName, Base?: UnitConv.TUnitName): Array<UnitConv.IMetric>
    {
        return UnitConv.Convertibles(Subject, Base);
    }
}

@NgModule({
    declarations: [
        TUnitDefConvertPipe,
        TUnitDefConvertNamePipe,
        TUnitDefConvertSymbolPipe,
        TUnitConvertiablesPipe,
    ],
    exports: [
        TUnitDefConvertPipe,
        TUnitDefConvertNamePipe,
        TUnitDefConvertSymbolPipe,
        TUnitConvertiablesPipe,
    ]
})
export class UnitConvertPipeModule
{
}
