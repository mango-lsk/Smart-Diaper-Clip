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
import {MatProgressBarModule} from '@angular/material/progress-bar'
import {RangeCustomEvent} from '@ionic/angular';
import {RangeValue} from '@ionic/core';
import { NzIconModule } from 'ng-zorro-antd/icon';




@Component({
    templateUrl: './details.html', styleUrls: ['./details.scss'],
    standalone: true, imports: [
        CommonModule, IonicModule, TranslateModule, MatProgressBarModule, MatSliderModule,NzIconModule
    ]
})

export class DetailsPage implements Ng.OnInit, Ng.OnDestroy
{
    constructor(private App: TApplication, private Asset: TAssetService,)
    {
    }


    lastEmittedValue!: RangeValue;

    onIonChange(ev: Event)
    {
        this.lastEmittedValue = (ev as RangeCustomEvent).detail.value;
    }

    moveEnd!: RangeValue;

    onIonKnobMoveEnd(ev: Event)
    {
        this.moveEnd = (ev as RangeCustomEvent).detail.value as number;
        this.Device.MaxHumidity = this.moveEnd;
        if (this.GetHumidityValue(this.Device.TLV)?.Value)
        {
            if (this.Device.MaxHumidity <= (this.GetHumidityValue(this.Device.TLV)?.Value as number))
            {
                this.App.ShowAlert('湿度过高，宝宝处于难受状态', {
                    buttons: [
                        { text: Translate('button.ok'), role: 'ok', }
                    ],  
                }),


                cordova.plugins?.notification.local.schedule({

                    title: '智能尿布夹',
                
                    text: 'The humidity is too high and the baby is uncomfortable',
                
                    foreground: true
                
                },false);
                
            }
        }
        

    }

    changeBackgroundColor()
    {
        const nub = this.lastEmittedValue as number
        if (this.GetHumidityValue(this.Device.TLV)?.Value)
        {
            if (nub <= (this.GetHumidityValue(this.Device.TLV)?.Value as number))
            {
               return '#E2121F'
            }
            
        }
        return '#B5E3FE'
    }

    ngOnInit(): void
    {
        cordova.platform.OnPause.subscribe(next =>
            PeripheralFactory.StopDiscovery());
        cordova.platform.OnResume.subscribe(next =>
            PeripheralFactory.StartDiscovery(TBluetoothPeripheral));
        cordova.plugin.PowerManagement.Acquire();
        PeripheralFactory.StartDiscovery(TBluetoothPeripheral);

    }

    ngOnDestroy(): void
    {
        cordova.plugin.PowerManagement.Release();
    }

    back()
    {
        history.go(-1)
    }

    GetHumidityValue(TLV: TLV[])
    {
        return TLV.find(iter => iter instanceof BluetoothTLV.PercentageTLV)
    }

    GetPictureValue(TLV: TLV[])
    {
        return TLV.find(iter => iter, BluetoothTLV.PostureTLV)
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

    time(){
        let timestamp = Date.parse(new Date().toString());
        return timestamp
    }

    Editing = false;
    Device: TDiaperPeripheral = this.App.NavData['Device']
}

