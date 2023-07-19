import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {IonicModule, IonItemSliding} from '@ionic/angular';
import {TAssetService, TDiaperPeripheral, TThermobondPeripheral,TDemeterPeripheral} from 'services/asset';
import {PeripheralFactory, TPeripheral} from 'ultracreation/asset/peripheral';
import {TApplication} from 'services/application';
import {TranslateModule} from 'ultracreation/ngx/translate';
import {BluetoothTLV} from 'ultracreation/bluetooth/sig';
import {TLV} from 'ultracreation/core/tlv';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {TBluetoothPeripheral} from 'ultracreation/bluetooth';


@Component({
    templateUrl: './home.page.html', styleUrls: ['./home.page.scss'],
    standalone: true, imports: [
        CommonModule, IonicModule, TranslateModule,MatProgressBarModule
    ]
})
export class HomePage implements Ng.OnInit, Ng.OnDestroy
{
    constructor(private App: TApplication, private Asset: TAssetService)
    {
    }

    
    ngOnInit(): void
    {
        if (this.Asset.PeripheralList)
            this.PeripheralList = this.Asset.PeripheralList;
        
        console.log(this.PeripheralList)

        // cordova.platform.OnPause.subscribe(next =>
        //     PeripheralFactory.StopDiscovery());
        // cordova.platform.OnResume.subscribe(next =>
        //     PeripheralFactory.StartDiscovery(TBluetoothPeripheral));

        cordova.plugin.PowerManagement.Acquire();
        // PeripheralFactory.StartDiscovery(TBluetoothPeripheral);

        // setTimeout(() => this.DiscoverDevice(), 600);
    }

    ClassOf(dev: TBluetoothPeripheral): string
    {
        if (dev instanceof TDiaperPeripheral)
            return 'diaper';
        else if (dev instanceof TThermobondPeripheral)
            return 'thermobond';
        else if (dev instanceof TDemeterPeripheral)
            return 'belly';
        else 
            return '';
    }

    ngswitch(){
        
         for (let iter of this.PeripheralList)
        {
            if (iter instanceof TDiaperPeripheral){
                console.log(iter);

                console.log(iter instanceof TDiaperPeripheral)//ture        
            }
            
            
            if( iter instanceof TThermobondPeripheral){
                console.log(iter);
                
            }
        }
        

    }
    
     

    ngOnDestroy(): void
    {
        cordova.plugin.PowerManagement.Release();
    }

    Belly(Device: TPeripheral){
        this.App.NavPush('belly', {NavData:{Device}});
    }

    detail(Device: TPeripheral){
        this.App.NavPush('details', {NavData:{Device}});
    }

    Temperature(Device: TPeripheral){
        this.App.NavPush('temperature-detail', {NavData:{Device}});
    }

    

    DiscoverDevice()
    {
        this.App.NavPush('discover');
    }

    GetPictureValue(TLV:TLV[]){
        return TLV.find(iter => iter , BluetoothTLV.PostureTLV)
    }
 
    GetHumidityValue(TLV: TLV[])
    {
        return TLV.find(iter => iter instanceof BluetoothTLV.PercentageTLV)
    }

    GetThermometerValue(TLV: TLV[]){
        return TLV.find(iter => iter , BluetoothTLV.ThermometerTLV)
    }
    


    RemoveDevice(Device: TPeripheral, sliding: IonItemSliding)
    {
        this.App.ShowAlert(Translate('home_page.confirm_delete'),
            {
                buttons: [
                    {text: Translate('button.cancel'), role: 'cancel', handler: () => sliding.close()},
                    {text: Translate('button.ok'), role: 'ok', handler: (value) => this.ConfirmDelete(Device)},
                ]
            });
    }

    private async ConfirmDelete(Device: TPeripheral)
    {
        this.Asset.DeletePeripheral(Device);
        this.App.DismissAlert();
    }
    
    Editing = false;
    PeripheralList: Array<TPeripheral> = [];
}
