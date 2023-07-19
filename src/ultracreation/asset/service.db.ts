import {Observable} from 'rxjs';

import {TypeInfo} from '../core/typeinfo';

import {TAsset} from './abstract';
import {TPeripheral} from './peripheral/abstract';

import {TBasicAssetService} from './service.basic';
import {PeripheralFactory} from './peripheral/factory';
import {TNgxApplication} from '../ngx/application';

/**
 *  TDbAssetService provider database service
 */
export class TDbAssetService extends TBasicAssetService
{
    constructor(App: TNgxApplication, Rev?: {Version: string, InitSql: string[]})
    {
        super(App);
        console.log('TDbAssetService construct.');

        App.RegisterInitializer(this, async () =>
        {
            if (! TypeInfo.Assigned(StorageEngine))
                return Promise.reject(new Error('StorageEngine not initialized.'));

            let InitSql: string[];
            let Version: string;

            if (TypeInfo.Assigned(Rev))
            {
                Version = Rev.Version;
                const tmp = Rev.InitSql;

                InitSql = new Array(...Init.SQL);
                InitSql.push(...tmp);
            }
            else
            {
                Version = '1.0';
                InitSql = Init.SQL;
            }
            await StorageEngine.ModuleRev('ASSET_MODULE_REV', Version, InitSql);

            const DataSet = await StorageEngine.ExecQuery(Queries.ListPeripheral);
            while (! DataSet.Eof)
            {
                const Peripheral = PeripheralFactory.Create(DataSet.Curr.Id, DataSet.Curr.ObjectName);

                if (TypeInfo.Assigned(Peripheral))
                {
                    Peripheral.Assign(DataSet.Curr, true);
                    this.PeripheralList.push(Peripheral);
                }
                else
                    console.log(`%cUnsupported Peripheral: ${DataSet.Curr.ObjectName}`, 'color:red');

                DataSet.Next();
            }
        });
    }

    StartDiscovery(Ancestor: typeof TPeripheral): Observable<TPeripheral>
    {
        return PeripheralFactory.StartDiscovery(Ancestor);
    }

    async Open(Id: string, AssetType: typeof TAsset): Promise<TAsset | undefined>
    {
        const peri = PeripheralFactory.Get<TPeripheral>(Id);
        if (! TypeInfo.Assigned(peri))
        {
            const DataSet = await StorageEngine.ExecQuery(Queries.Open, {Id});
            if (DataSet.RecordCount > 0)
            {
                const Asset = new AssetType(DataSet.Curr.ObjectName);
                Asset.Assign(DataSet.Curr);
                return Asset;
            }
            else
                return undefined;
        }
        else
            return peri;
    }

    async Store<T extends TAsset>(Obj: T): Promise<void>
    {
        if (Obj instanceof TPeripheral)
        {
            const peri = PeripheralFactory.Get(Obj.Id);
            if (! TypeInfo.Assigned(peri))
                throw new Error('Peripheral is not managed by PeripheralFactory');

            const stored = 0 !== Obj.Timestamp;
            await StorageEngine.StoreObject(Obj);

            if (! stored)
            {
                this.PeripheralList.push(Obj);
                this.HandleNewPeripherial(peri);
            }
        }
        else if (Obj instanceof TAsset)
            await StorageEngine.StoreObject(Obj);
        else
            throw new Error(`unknown object type ${typeof Obj}`);
    }

    StorePeripheral(peri: TPeripheral): Promise<void>
    {
        return this.Store(peri);
    }

    Delete(Id: string): Promise<void>;
    Delete<T extends TAsset>(Obj: T): Promise<void>;
    async Delete<T extends TAsset>(IdOrObj: string | T): Promise<void>
    {
        let peri: TPeripheral | undefined;

        if (TypeInfo.IsString(IdOrObj))
        {
            peri = PeripheralFactory.Get(IdOrObj);
            if (! TypeInfo.Assigned(peri))
                throw new Error('Peripheral is not managed by PeripheralFactory');
        }
        else
        {
            if (IdOrObj instanceof TPeripheral)
                peri = IdOrObj as TPeripheral;
        }

        if (TypeInfo.Assigned(peri))
        {
            await StorageEngine.DeleteObject(peri);
            PeripheralFactory.Release(peri.Id);

            if (peri.IsObjectSaved)
            {
                this.PeripheralList.splice(this.PeripheralList.indexOf(peri), 1);
                this.HandleRemovePeripheral(peri);
            }
            peri.Timestamp = 0;
        }
        else if (IdOrObj instanceof TAsset)
            await StorageEngine.DeleteObject(IdOrObj);
        else
            throw new Error(`unknown object type ${typeof IdOrObj}`);
    }

    DeletePeripheral(peri: TPeripheral): Promise<void>
    {
        return this.Delete(peri);
    }

    protected HandleNewPeripherial(Peripheral: TPeripheral): void
    {
    }

    protected HandleRemovePeripheral(Peripheral: TPeripheral): void
    {
    }

    PeripheralList = new Array<TPeripheral>();
    OnSignalLost = PeripheralFactory.OnSignalLost;
}

namespace Queries
{
    export const Open = 'SELECT * FROM Asset WHERE Id = :Id';
    export const ListPeripheral = 'SELECT * FROM Asset WHERE ObjectName LIKE "Peripheral.%" ORDER BY ObjectName, Name';
}

namespace Init
{
    export const SQL: string[] =
    [
        `CREATE TABLE Asset(
            Id VARCHAR(38) NOT NULL PRIMARY KEY,
            ObjectName VARCHAR(50) NOT NULL,
            Name VARCHAR(100) NOT NULL,
            Desc TEXT,
            ExtraProps TEXT,
            Timestamp INT);`,
        'CREATE INDEX IF NOT EXISTS IDX_Asset_ObjectName ON Asset(ObjectName, Name);',
        'CREATE INDEX IF NOT EXISTS IDX_Asset_Name ON Asset(Name);',
    ];
}
