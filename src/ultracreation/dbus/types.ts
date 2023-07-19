import {Observable, Subject} from 'rxjs';

type DBusBasic = boolean | number | string | DBusObjectPath | DBusSignature;
type DBusContainer = DBusBasic | DBusVariant | DBusArray<any> | DBusDict<DBusBasic, any> | {};
type DBusSingleComplete = DBusBasic | DBusContainer;

declare global
{
    interface IDBusObject
    {
        readonly Service: string;
        readonly ObjectPath: DBusObjectPath;
        readonly Interface: string;
    }

    type DBusObjectPath = string;
    type DBusSignature = string;
    type DBusArray<T> = Array<T>;
    type DBusByteArray = Uint8Array;
    type DBusDict<DBusBasic, DBusSingleComplete> = Map<DBusBasic, DBusSingleComplete>;

    interface DBusVariant
    {
        Type: DBusSignature;
        Value: DBusSingleComplete;
    }

    interface DBusSignal<T> extends Subject<T>
    {
        Emit(...args: any[]): Promise<void>;

        readonly MatchRules: string;

        readonly ObjectPath: DBusObjectPath;
        readonly Interface: string;
        readonly Name: string;
    }

    interface DBusProperties
    {
        GetAll(): Promise<DBusDict<string, any>>;

        Get(property_name: string): Promise<any>;
        Set(property_name: string, value: any | DBusVariant): Promise<void>;

        OnChange: Observable<DBusDict<string, any>>;
    }
}
