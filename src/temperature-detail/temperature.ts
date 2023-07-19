import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {IonicModule} from '@ionic/angular';
import {MatSliderModule} from '@angular/material/slider';
import {PeripheralFactory, TPeripheral} from 'ultracreation/asset/peripheral';
import {TApplication} from 'services/application';
import {TranslateModule} from 'ultracreation/ngx/translate';
import {TAssetService, TDiaperPeripheral} from 'services/asset';
import {BluetoothTLV} from 'ultracreation/bluetooth/sig';
import {TLV} from 'ultracreation/core/tlv';
import {TBluetoothPeripheral} from 'ultracreation/bluetooth';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
    templateUrl: './temperature.html',
    styleUrls: ['./temperature.scss'],
    standalone: true, imports: [
        CommonModule, IonicModule, TranslateModule, MatProgressBarModule, MatSliderModule,NzIconModule
    ]
})





export class Temperaturepage
{

    constructor(private App: TApplication, private Asset: TAssetService,)
    {
    }

    ngOnInit(): void
    {
        cordova.platform.OnPause.subscribe(next =>
            PeripheralFactory.StopDiscovery());
        cordova.platform.OnResume.subscribe(next =>
            PeripheralFactory.StartDiscovery(TBluetoothPeripheral));
        cordova.plugin.PowerManagement.Acquire();
        PeripheralFactory.StartDiscovery(TBluetoothPeripheral);
        this.Arr = JSON.parse(StorageEngine.GetKV('Information') as string);  
    }
   
    Arr = new Array();
    Add()
    {
        const obj = {temperature: '', time: ''};
        obj.time = this.time();
        obj.temperature =(this.GetThermometerValue(this.Device.TLV)?.Value !== undefined ? this.GetThermometerValue(this.Device.TLV)?.Value : '--') as string;
        this.Arr.push(obj);
        StorageEngine.StoreKV('Information', JSON.stringify(this.Arr))
    }

    del(idx: number)
    {
        this.Arr.splice(idx,1)
        StorageEngine.StoreKV('Information', JSON.stringify(this.Arr))
    }

   

    EditDevice(Device: TPeripheral)
    {
        this.App.ShowAlert('是否修改设备的名称？',
            {
                inputs: [
                    {
                        placeholder: 'Name',
                        value: Device.Name,
                    }
                ],
                buttons: [
                    {text: Translate('button.cancel'), role: 'cancel', },
                    {
                        text: Translate('button.ok'), role: 'ok',
                        handler: (val) =>
                        {
                            Device.Edit();
                            Device.Name = val[0];
                            this.Asset.Store(Device);
                        }
                    },
                ]
            });
    }

    time()
    {
        let timestamp = Date.parse(new Date().toString());
        var date = new Date(timestamp); //获取一个时间对象
        const h = date.getHours() + ':';
        const m = date.getMinutes() + ':';
        const s = date.getSeconds();
        return h + m + s
    }
    times(){
        let timestamp = Date.parse(new Date().toString());
        return timestamp
    }

    ChangeTemperatureLValue()
    {
        const number = this.GetThermometerValue(this.Device.TLV)?.Value as number
        if (number <= 50)
        {
            return 'rotate(' + (45 + 3.6 * number) + 'deg)'
        }
        if (number == undefined)
        {
            return 'rotate(45deg)'
        }
        return 'rotate(' + (45 + 3.6 * 50) + 'deg)'
    }

    ChangeTemperatureRValue()
    {
        const number = this.GetThermometerValue(this.Device.TLV)?.Value as number
        if (number >= 50)
        {
            return 'rotate(' + (45 + 3.6 * (number - 50)) + 'deg)'
        }
        return 'rotate(45deg)'


    }

    GetThermometerValue(TLV: TLV[])
    {
        return TLV.find(iter => iter, BluetoothTLV.ThermometerTLV)
    }





    back()
    {
        history.go(-1)
    }

    Editing = false;
    Device: TDiaperPeripheral = this.App.NavData['Device']
}