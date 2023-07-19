import {TypeInfo} from '../core/typeinfo';
import {Platform} from '../core';
import {ENotImplemented} from '../core/exception';
import {TPersistable} from './persistable';

declare global
{
    let StorageEngine: IStorageEngine;

    interface Window
    {
        StorageEngine: IStorageEngine;
    }

    namespace NodeJS
    {
        interface Global
        {
            StorageEngine: IStorageEngine;
        }
    }
}
declare var global: any;

export class EStorageEngineNotInitialized extends ENotImplemented
{
    constructor()
    {
        super('StorageEngine not initialized...call InitializeStorage()');
    }
}

/* IKeyValueStorage */

export interface IKeyValueStorage
{
    GetKV(Key: string): string | null;
    StoreKV(Key: string, Value: string): void;

    DeleteKV(Key: string): void;
    ClearKV(): void;
}

/* IStorage */

export interface IStorage extends IKeyValueStorage
{
    StoreObject(Obj: TPersistable, Transaction?: any): Promise<void>;
    DeleteObject(Obj: TPersistable, Transaction?: any): Promise<void>;
}

/* IStorageEngine */

export interface IStorageEngine extends IStorage
{
    DebugTracing: boolean;

    StrictInsert: boolean;  // don't trying update when faiure
    StrictUpdate: boolean;
    StrictDelete: boolean;
}

/* InitializeStorage */

export function InitializeStorage(Engine: IStorageEngine): IStorageEngine
{
    console.log('%cinitialize StorageEngine as global variable', 'color:orange');

    if (Platform.IsNodeJS)
        (global as any).StorageEngine = Engine;
    else
        window.StorageEngine = Engine;

    return Engine;
}

/* TStorage */

export abstract class TStorage implements IStorage
{
    static get Engine(): IStorageEngine
    {
        if (TypeInfo.Assigned(StorageEngine))
            return StorageEngine;
        else
            throw new EStorageEngineNotInitialized();
    }

    constructor()
    {
    }

/* IKeyValueStorage */

    GetKV(Key: string): string | null
    {
        return localStorage.getItem(Key);
    }

    DeleteKV(Key: string): void
    {
        localStorage.removeItem(Key);
    }

    StoreKV(Key: string, Value: string): void
    {
        localStorage.setItem(Key, Value);
    }

    ClearKV(): void
    {
        localStorage.clear();
    }

/* IStorage: Persistable Object Support */

    async StoreObject(Obj: TPersistable, Transaction?: any): Promise<void>
    {
        const ObjEvent = (Obj as any) as TPersistable.BeforePersist & TPersistable.AfterPersist &
            TPersistable.BeforeInsert &  TPersistable.AfterInsert &
            TPersistable.BeforeUpdate & TPersistable.AfterUpdate;
        const Rules = TPersistable.GetRules(Obj.constructor as typeof TPersistable);

        if (TypeInfo.Assigned(ObjEvent.BeforePersist))
            await ObjEvent.BeforePersist(Transaction);

        if (! Obj.IsEditing)
        {
            if (TStorage.Engine.StrictInsert)
            {
                if (TypeInfo.Assigned(ObjEvent.BeforeInsert))
                    await ObjEvent.BeforeInsert(Transaction);

                await this.InsertByRules(Rules, Obj);

                if (TypeInfo.Assigned(ObjEvent.AfterInsert))
                    await ObjEvent.AfterInsert(Transaction);
            }
            else
            try
            {
                if (TypeInfo.Assigned(ObjEvent.BeforeInsert))
                    await ObjEvent.BeforeInsert(Transaction);

                await this.InsertByRules(Rules, Obj);

                if (TypeInfo.Assigned(ObjEvent.AfterInsert))
                    await ObjEvent.AfterInsert(Transaction);
            }
            catch (e)
            {
                console.log('%cStoreObject using INSERT failure, trying UPDATE', 'color:orange');

                if (TypeInfo.Assigned(ObjEvent.BeforeUpdate))
                    await ObjEvent.BeforeUpdate(Transaction);

                await this.UpdateByRules(Rules, Obj);

                if (TypeInfo.Assigned(ObjEvent.AfterUpdate))
                    await ObjEvent.AfterUpdate(Transaction);

                console.log('%cStoreObject using UPDATE successful.', 'color:lightgreen');
            }
        }
        else
        {
            if (TypeInfo.Assigned(ObjEvent.BeforeUpdate))
                await ObjEvent.BeforeUpdate(Transaction);

            await this.UpdateByRules(Rules, Obj);

            if (TypeInfo.Assigned(ObjEvent.AfterUpdate))
                await ObjEvent.AfterUpdate(Transaction);
        }

        if (TypeInfo.Assigned(ObjEvent.AfterPersist))
            await ObjEvent.AfterPersist(Transaction);

        Obj.MergeChanges();
    }

    async DeleteObject(Obj: TPersistable, Transaction?: any): Promise<void>
    {
        const ObjEvent = (Obj as any) as TPersistable.BeforeDelete & TPersistable.AfterDelete;
        const Rules = TPersistable.GetRules(Obj.constructor as typeof TPersistable);

        if (TypeInfo.Assigned(ObjEvent.BeforeDelete))
            await ObjEvent.BeforeDelete(Transaction);

        await this.DeleteByRules(Rules, Obj);

        if (TypeInfo.Assigned(ObjEvent.AfterDelete))
            await ObjEvent.AfterDelete(Transaction);
    }

    protected InsertByRules(Rules: Array<TPersistable.Rule>, Obj: object): Promise<void>
    {
        return Promise.reject(new ENotImplemented());
    }

    protected UpdateByRules(Rules: Array<TPersistable.Rule>, Obj: object): Promise<void>
    {
        return Promise.reject(new ENotImplemented());
    }

    protected DeleteByRules(Rules: Array<TPersistable.Rule>, Obj: object): Promise<void>
    {
        return Promise.reject(new ENotImplemented());
    }
}

/* TStorageEngine */

export abstract class TStorageEngine extends TStorage
{
    DebugTracing = false;
    StrictInsert = false;
    StrictDelete = false;
    StrictUpdate = false;
}

