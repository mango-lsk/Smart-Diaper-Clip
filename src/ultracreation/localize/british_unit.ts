import {UnitConv} from '../core/conv';
import './iso_measure_unit';

export namespace British_MetricSystem
{
    export function CelsiusToFahrenheit(Value: number): number
    {
        return Value * 1.8 + 32;
    }

    export function FahrenheitToCelsius(Value: number): number
    {
        return (Value - 32) / 1.8;
    }
}

UnitConv.RegisterMetricSystem(UnitConv.MS_Temperature, 'fahrenheit', '°F');

UnitConv.RegisterConverter(UnitConv.MS_Temperature, 'celsius', [
    ['fahrenheit',  British_MetricSystem.CelsiusToFahrenheit]
]);

UnitConv.RegisterConverter(UnitConv.MS_Temperature, 'fahrenheit', [
    ['celsius', British_MetricSystem.FahrenheitToCelsius]
]);
