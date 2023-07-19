import {UnitConv} from '../core/conv';

declare module '../core/conv'
{
    export namespace UnitConv
    {
        export let MS_Length: string;
        export let MS_Temperature: string;
        export let MS_Humidity: string;
    }
}
UnitConv.MS_Length = 'length';
UnitConv.MS_Temperature = 'temperature';
UnitConv.MS_Humidity = 'relative_humidity';

/**
 *  temperature unit
 */
UnitConv.RegisterMetricSystem(UnitConv.MS_Temperature, {Name: 'celsius', Symbol: '°C'});
/**
 *  relative humidity unit
 */
UnitConv.RegisterMetricSystem(UnitConv.MS_Humidity, {Name: 'RH', Symbol: '%'});

/**
 *  length measure units
 */
UnitConv.RegisterMetricSystem(UnitConv.MS_Length, {Name: 'meter', Symbol: 'm'});
// converters
UnitConv.RegisterConverter(UnitConv.MS_Length, 'meter', [
    [{Name: 'centimeter',   Symbol: 'cm'}, (value: number) => value * 100],
    [{Name: 'millimeter',   Symbol: 'mm'}, (value: number) => value * 1000],
    [{Name: 'micrometer',   Symbol: 'µm'}, (value: number) => value * 1000000],
    [{Name: 'nanometer',    Symbol: 'nm'}, (value: number) => value * 1000000000],
    [{Name: 'kilometer',    Symbol: 'km'}, (value: number) => value / 1000]
]);
