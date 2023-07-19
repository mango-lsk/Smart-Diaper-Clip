import {DBusRegistry, DBusType} from '../../dbus/registry';

export namespace Bluetooth
{
    export const InvokeContext: IDBusObject = {
        Service: 'ultracreation.Bluetooth',
        ObjectPath: '/ultracreation/Bluetooth',
        Interface: 'ultracreation.Bluetooth.Admin',
    };

    DBusRegistry.RegisterInterface(InvokeContext.Interface)
        .AddMethod('Enable')
        .AddMethod('Disable')
        .AddMethod('IsEnabled', {OUT: DBusType.BOOLEAN})
    .End();
}

export interface Bluetooth
{
    IsEnabled(): Promise<boolean>;
    Enable(): Promise<void>;
    Disable(): Promise<void>;
}

export namespace Bluetooth
{
    export namespace Classic
    {
        /// todo: bluetooth classic
    }
}

export namespace Bluetooth
{
    export interface IScanDiscoverBase64
    {
        Id: string;
        RSSI: number;
        Adv: string;
    }

    /*
    export interface IScanDiscover
    {
        Id: string;
        RSSI: number;
        Adv: Uint8Array;
    }
    */

    const DBUS_ScanDiscoverBase64= DBusRegistry.RegisterStruct('IScanDiscoverBase64', {
        Id: DBusType.STRING,
        RSSI: DBusType.INT32,
        Adv: DBusType.STRING
    });

    export namespace Central
    {
        export const InvokeContext: IDBusObject = {
            Service: 'ultracreation.Bluetooth',
            ObjectPath: '/ultracreation/Bluetooth',
            Interface: 'ultracreation.Bluetooth.Central',
        };

        DBusRegistry.RegisterInterface(InvokeContext.Interface)
            .AddMethod('IsScanning', {OUT: DBusType.BOOLEAN})
            .AddMethod('StartScan', {IN: DBusType.UINT32}, {OUT: DBusType.INT32})
            .AddMethod('StopScan', {IN: DBusType.UINT32})
            .AddMethod('Connect', {IN: DBusType.STRING}, {OUT: DBusType.INT32}, {OUT: DBusType.UINT16})
            .AddMethod('Disconnect', {IN: DBusType.INT32})
            .AddSignal('OnScanExpired', DBusType.UINT32)
            .AddSignal('OnDiscoverBase64', DBUS_ScanDiscoverBase64)
            .AddSignal('OnDisconnect', DBusType.INT32)
        .End();
    }

    export interface Central
    {
        IsScanning(): Promise<boolean>;
        StartScan(Timeout: number): Promise<number>;
        StopScan(Token: number): Promise<void>;

        Connect(Id: string): Promise<[number, number]>;
        Disconnect(Fd: number): Promise<void>;

        OnScanExpired: DBusSignal<number>;
        OnDiscoverBase64: DBusSignal<IScanDiscoverBase64>;
        OnDisconnect: DBusSignal<number>;
    }

    export namespace Gatt
    {
        export const InvokeContext: IDBusObject = {
            Service: 'ultracreation.Bluetooth',
            ObjectPath: '/ultracreation/Bluetooth',
            Interface: 'ultracreation.Bluetooth.Gatt',
        };

        export interface ICharInformation
        {
            Fd: number;
            Service: string;
            Name: string;
        }

        const DBUS_CharInformation = DBusRegistry.RegisterStruct('TCharInformation', {
            Fd: DBusType.INT32,
            Service: DBusType.STRING,
            Name: DBusType.STRING,
        });

        DBusRegistry.RegisterInterface(InvokeContext.Interface)
            .AddMethod('ReadCharBase64', {IN: DBUS_CharInformation}, {OUT: DBusType.STRING})
            .AddMethod('WriteCharBase64', {IN: DBUS_CharInformation}, {IN: DBusType.STRING}, {OUT: DBusType.INT32})
            .AddMethod('WriteCharNoRespBase64', {IN: DBUS_CharInformation}, {IN: DBusType.STRING}, {IN: DBusType.UINT32})
            .AddMethod('StartNotification', {IN: DBUS_CharInformation})
            .AddMethod('StopNotification', {IN: DBUS_CharInformation})
            .AddSignal('OnNotificationBase64', DBUS_CharInformation, DBusType.STRING)
        .End();
    }

    export interface Gatt
    {
        ReadCharBase64(Char: Gatt.ICharInformation): Promise<string>;
        WriteCharBase64(Char: Gatt.ICharInformation, Value: string): Promise<number>;
        WriteCharNoRespBase64(Char: Gatt.ICharInformation, Value: string, FlowControl: number): Promise<void>;

        StartNotification(Char: Gatt.ICharInformation): Promise<number>;
        StopNotification(Char: Gatt.ICharInformation): Promise<void>;

        OnNotificationBase64: DBusSignal<[Gatt.ICharInformation, string]>;
    }
}
