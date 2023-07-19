import {CommonModule} from '@angular/common';
import {Component} from '@angular/core';
import {IonicModule} from '@ionic/angular';
import {Subscription} from 'rxjs';
import {TApplication} from 'services/application';
import {TAssetService, TDiaperPeripheral, TThermobondPeripheral,TDemeterPeripheral} from 'services/asset';
import {PeripheralFactory} from 'ultracreation/asset/peripheral';
import {TBluetoothPeripheral} from 'ultracreation/bluetooth';

@Component({
    templateUrl: './discover.html',
    styleUrls: ['./discover.scss'],
    standalone: true,
    imports: [IonicModule, CommonModule]
})

export class DiscoverPage implements Ng.OnInit, Ng.OnDestroy
{
    constructor(private App: TApplication, public Asset: TAssetService) { }

    ngOnInit(): void
    {
        if (!this.DiscoverList.length)
        {
            const diaperPer = PeripheralFactory.Create(
                '"08:7C:BE:84:CA:A3"', TDiaperPeripheral) as TDiaperPeripheral;
            const l = diaperPer.Id.split(':');
            const v = l.splice(l.length - 2).join('').toLowerCase();
            diaperPer.Name = `${diaperPer.ProductName} #${v}`;
            this.DiscoverList.push(diaperPer);

            const dht = PeripheralFactory.Create(
                '"08:7C:BE:84:CA:A4"', TThermobondPeripheral) as TDiaperPeripheral;
            const tl = diaperPer.Id.split(':');
            const tv = tl.splice(tl.length - 2).join('').toLowerCase();
            diaperPer.Name = `${diaperPer.ProductName} #${tv}`;
            this.DiscoverList.push(dht);

            const belly = PeripheralFactory.Create(
                '"08:7C:BE:84:CA:A5"', TDemeterPeripheral) as TDiaperPeripheral;
            const bl = belly.Id.split(':');
            const bv = bl.splice(bl.length - 2).join('').toLowerCase();
            belly.Name = `${belly.ProductName} #${bv}`;
            this.DiscoverList.push(belly);
        }

        this.Sub = PeripheralFactory.StartDiscovery(TBluetoothPeripheral)
            .subscribe({
                next: peri =>
                {
                    console.log(peri);
                    if (peri instanceof TBluetoothPeripheral && this.DiscoverList.indexOf(peri) === -1 && !peri.IsObjectSaved)
                    {
                        const l = peri.Id.split(':');
                        const v = l.splice(l.length - 2).join('').toLowerCase();
                        peri.Name = `${peri.ProductName} #${v}`;
                        this.DiscoverList.push(peri);
                    }
                }
            });
            

            console.log(this.DiscoverList)

    }

    ngOnDestroy(): void
    {
        if (this.Sub)
            this.Sub.unsubscribe();

        PeripheralFactory.StopDiscovery();
    }

    ClassOf(dev: TBluetoothPeripheral): string
    {
        if (dev instanceof TDiaperPeripheral)
            return 'diaper';
        else if (dev instanceof TThermobondPeripheral)
            return 'temperature';
            else if (dev instanceof TDemeterPeripheral)
            return 'belly';
        return ''

    }




    Select(ev: CustomEvent, iter: TBluetoothPeripheral)
    {
        if (ev.detail.checked)
            this.SelectedList.push(iter);
        else
        {
            const idx = this.SelectedList.indexOf(iter);
            this.SelectedList.splice(idx, 1);
        }
    }

    async Back()
    {
        if (this.SelectedList.length)
            for (let iter of this.SelectedList)
                await this.Asset.StorePeripheral(iter);

        this.App.NavPop();
        StorageEngine.StoreKV('Information', JSON.stringify([]))
    }







    back()
    {
        history.go(-1)
    }

    DiscoverList: Array<TBluetoothPeripheral> = [];
    SelectedList: Array<TBluetoothPeripheral> = [];

    Sub!: Subscription;
}
