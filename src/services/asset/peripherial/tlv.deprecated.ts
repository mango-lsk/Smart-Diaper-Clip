import {TLV} from 'ultracreation/core/tlv';

export class BatteryTLV extends TLV.CUint16
{
    static override readonly TAG = 0x01 << 8 | super.TAG;
    override readonly Invisible = true;
}
TLV.Register(BatteryTLV);

/* TemperatureTLV */

export class TemperatureTLV extends TLV.CInt16
{
    static override readonly TAG = 0x02 << 8 | super.TAG;
    static override readonly Icon = 'temperature.svg';
    static override readonly Metric = '°C';
}
TLV.Register(TemperatureTLV);


export class ThermometerTLV extends TLV.CUint16
{
    static override readonly TAG = 0x02 << 8 | super.TAG;
    static override readonly Icon = 'thermometer.svg';
    static override readonly Metric = '°C';
}
TLV.Register(ThermometerTLV);   // deprecated using TemperatureTLV

/* HumidityTLV */

export class HumidityTLV extends TLV.CUint8
{
    static override readonly TAG = 0x11 << 8 | super.TAG;
    static override readonly Icon = 'humidity.svg';
    static override readonly Metric = '%';
}
TLV.Register(HumidityTLV);

/* PostureDeprecatedTLV */

export class PostureDeprecatedTLV extends TLV.CUint8
{
    static override readonly TAG = 0x60 << 8 | TLV.CUint8.TAG; /** @override */
    override readonly Invisible = true;

    override get Icon(): string
    {
        switch (this.Value)
        {
        case 1:
            return 'posture/stand.svg';
        case 2:
            return 'posture/stand.svg';
        case 3:
            return 'posture/lay.svg';
        case 4:
            return 'posture/lay_left.svg';
        case 5:
            return 'posture/lay_right.svg';
        case 6:
            return 'posture/prone.svg';
        default:
            return 'posture/unknown.svg';
        }
    }
}
TLV.Register(PostureDeprecatedTLV);

// deprecated ---------------------------------------------------------------------------
