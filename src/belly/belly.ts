import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {IonicModule} from '@ionic/angular';
import {MatSliderModule} from '@angular/material/slider';
// import {PeripheralFactory, TPeripheral} from 'ultracreation/asset/peripheral';
import {TApplication} from 'services/application';
import {TranslateModule} from 'ultracreation/ngx/translate';
import {TAssetService, TDiaperPeripheral} from 'services/asset';
import {BluetoothTLV} from 'ultracreation/bluetooth/sig';
import {TLV} from 'ultracreation/core/tlv';
// import {TBluetoothPeripheral} from 'ultracreation/bluetooth';
import {MatProgressBarModule} from '@angular/material/progress-bar';



@Component({
    templateUrl: './belly.html',
    styleUrls: ['./belly.scss'],
    standalone: true, imports: [
        CommonModule, IonicModule, TranslateModule, MatProgressBarModule, MatSliderModule
    ]
})





export class Bellypage{
    
    constructor(private App: TApplication, private Asset: TAssetService,)
    {
    }

    // ngOnInit(): void
    // {
    //     cordova.platform.OnPause.subscribe(next =>
    //         PeripheralFactory.StopDiscovery());
    //     cordova.platform.OnResume.subscribe(next =>
    //         PeripheralFactory.StartDiscovery(TBluetoothPeripheral));
    //     cordova.plugin.PowerManagement.Acquire();
    //     PeripheralFactory.StartDiscovery(TBluetoothPeripheral);      
    // }



    GetHumidityValue(TLV: TLV[])
    {
        return TLV.find(iter => iter instanceof BluetoothTLV.PercentageTLV)
    }

    GetPictureValue(TLV: TLV[])
    {
        return TLV.find(iter => iter, BluetoothTLV.PostureTLV)
    }

    time(){
        let timestamp = Date.parse(new Date().toString());
        return timestamp
    }



    back()
    {
        history.go(-1)
    }

    Editing = false;
    Device: TDiaperPeripheral = this.App.NavData['Device']
}