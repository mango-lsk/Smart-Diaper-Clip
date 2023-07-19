/**
 *  BlueZ interface
 */
import {DBusError} from '../error';
import {DBusRegistry, DBusType} from '../registry';

declare global
{
}

export namespace bluez  // adapter-api
{
    export const DBUS_SERVICE_BLUEZ = 'org.bluez';
    export const DBUS_PATH_BLUEZ = '/org/bluez';
    export const BLUEZ_INTERFACE_ADAPTER = 'org.bluez.Adapter1';

    export function InvokeContextHCI(HCI: number, Interface: string): IDBusObject
    {
        return {Service: DBUS_SERVICE_BLUEZ, ObjectPath: `${DBUS_PATH_BLUEZ}/hci${HCI}`, Interface};
    }

    export namespace Adapter1
    {
        /*
            Service		org.bluez
            Interface	org.bluez.Adapter1
            Object path	[variable prefix]/{hci0,hci1,...}
        */
        export const InvokeContext = InvokeContextHCI(0, BLUEZ_INTERFACE_ADAPTER);

        export class DiscoverFilter extends Map<string, DBusVariant | string | number | boolean>
        {
            override set(key: 'UUIDs', value: string): this;
            override set(key: 'RSSI', value: number): this;
            override set(key: 'Pathloss', value: number): this;
            override set(key: 'Transport', value: 'auto' | 'bredr' | 'le'): this;
            override set(key: 'DuplicateData', value: false): this;
            override set(key: 'Discoverable', value: true): this;
            override set(key: 'Pattern', value: string): this;
            override set(key: string, Value: any): this
            {
                switch (key)
                {
                case 'UUIDs':
                case 'Transport':
                case 'Pattern':
                    return super.set(key, {Type: DBusType.STRING, Value});
                case 'RSSI':
                    return super.set(key, {Type: DBusType.INT16, Value});
                case 'Pathloss':
                    return super.set(key, {Type: DBusType.UINT16, Value});
                case 'DuplicateData':
                case 'Discoverable':
                    return super.set(key, {Type: DBusType.BOOLEAN, Value});

                default:
                    if (DBusType.IsVariantLike(Value))
                        return super.set(key, Value);
                    else
                        throw new DBusError.EInvalidArg();
                }
            }
        }

        export const DBUS_DECL = DBusRegistry.RegisterInterface(BLUEZ_INTERFACE_ADAPTER)
            .AddMethod('StartDiscovery')
            .AddMethod('StopDiscovery')
            .AddMethod('RemoveDevice', {IN: DBusType.OBJECT_PATH})
            .AddMethod('SetDiscoveryFilter', {IN: [DBusType.STRING, DBusType.VARIANT]})
            .AddMethod('GetDiscoveryFilters', {OUT: [DBusType.STRING]})
        // ---properties
            .AddProperty('Address', DBusType.STRING)
            .AddProperty('AddressType', DBusType.STRING)
            .AddProperty('Powered', DBusType.BOOLEAN)
            .AddProperty('Discovering', DBusType.BOOLEAN)
            .AddProperty('Name', DBusType.STRING)
            .AddProperty('Alias', DBusType.STRING)
            .AddProperty('Class', DBusType.UINT32)
            .AddProperty('Discoverable', DBusType.BOOLEAN)
            .AddProperty('DiscoverableTimeout', DBusType.UINT32)
            .AddProperty('Pairable', DBusType.BOOLEAN)
            .AddProperty('PairableTimeout', DBusType.UINT32)
            .AddProperty('UUIDs', [DBusType.STRING])
            .AddProperty('Modalias', DBusType.STRING)
        .End();

        export interface Properties extends DBusProperties
        {
            Get(property_name: 'Address'): Promise<string>;
            Get(property_name: 'AddressType'): Promise<string>;
            Get(property_name: 'Powered'): Promise<boolean>;
            Get(property_name: 'Discovering'): Promise<boolean>;
            Get(property_name: 'Name'): Promise<string>;
            Get(property_name: 'Alias'): Promise<string>;
            Get(property_name: 'Class'): Promise<number>;
            Get(property_name: 'Discoverable'): Promise<boolean>;
            Get(property_name: 'DiscoverableTimeout'): Promise<number>;
            Get(property_name: 'Pairable'): Promise<boolean>;
            Get(property_name: 'PairableTimeout'): Promise<number>;
            Get(property_name: 'UUIDs'): Promise<string[]>;
            Get(property_name: 'Modalias'): Promise<string>;

            Set(property_name: 'Powered', val: boolean): Promise<void>;
            Set(property_name: 'Alias', val: string): Promise<void>;
            Set(property_name: 'Discoverable', val: boolean): Promise<void>;
            Set(property_name: 'DiscoverableTimeout', val: number): Promise<void>;
            Set(property_name: 'Pairable', val: boolean): Promise<void>;
            Set(property_name: 'PairableTimeout', val: number): Promise<void>;
        }
    }

    export interface Adapter1
    {
        StartDiscovery(): Promise<void>;
        StopDiscovery(): Promise<void>;

        RemoveDevice(device: DBusObjectPath): Promise<void>;

        SetDiscoveryFilter(filter: Adapter1.DiscoverFilter): Promise<void>;
        GetDiscoveryFilters(): Promise<DBusArray<string>>;

        Properties: Adapter1.Properties;
    }
}

export namespace bluez  // admin-policy-api
{
    export const BLUEZ_INTERFACE_ADMIN_POLICY_SET = 'org.bluez.AdminPolicySet1';

    export namespace AdminPolicySet1
    {
        /*
            Service		org.bluez
            Interface	org.bluez.AdminPolicySet1
            Object path	[variable prefix]/{hci0,hci1,...}
        */
        export const InvokeContext = InvokeContextHCI(0, BLUEZ_INTERFACE_ADMIN_POLICY_SET);

        export const DBUS_DECL = DBusRegistry.RegisterInterface(BLUEZ_INTERFACE_ADMIN_POLICY_SET)
            .AddMethod('SetServiceAllowList', {IN: [DBusType.STRING]})
        .End();
    }

    export interface AdminPolicySet1
    {
        SetServiceAllowList(UUIDs: DBusArray<string>): Promise<void>;
    }
}

export namespace bluez  // advertising-api
{
    export const BLUEZ_INTERFACE_LE_ADVERTISEMENT = 'org.bluez.LEAdvertisement1';
    export const BLUEZ_INTERFACE_LE_ADVERTISEMENT_MANAGER = 'org.bluez.LEAdvertisingManager1';

    export namespace LEAdvertisement1
    {
        /*
            Service		org.bluez
            Interface	org.bluez.LEAdvertisement1
            Object path	freely definable
        */

        export const DBUS_DECL = DBusRegistry.RegisterInterface(BLUEZ_INTERFACE_LE_ADVERTISEMENT)
            .AddMethod('Release')
        // properties
            .AddProperty('Type', DBusType.STRING)
            .AddProperty('ServiceUUIDs', [DBusType.STRING])
            .AddProperty('ManufacturerData', [DBusType.UINT16, DBusType.BYTE_ARRAY])  // todo: LEAdvertisement1.ManufacturerData tododict<?, 'ay'>
            .AddProperty('SolicitUUIDs', [DBusType.STRING])
            .AddProperty('ServiceData', [DBusType.STRING, DBusType.BYTE_ARRAY])
            .AddProperty('Data', [DBusType.BYTE, DBusType.BYTE_ARRAY])                // todo: LEAdvertisement1.Data? dict<?, 'ay'>
            .AddProperty('Discoverable', DBusType.BOOLEAN)
            .AddProperty('DiscoverableTimeout', DBusType.UINT16)
            .AddProperty('Includes', [DBusType.STRING])
            .AddProperty('LocalName', DBusType.STRING)
            .AddProperty('Appearance', DBusType.UINT16)
            .AddProperty('Duration', DBusType.UINT16)
            .AddProperty('Timeout', DBusType.UINT16)
            .AddProperty('SecondaryChannel', DBusType.STRING)
            .AddProperty('MinInterval', DBusType.UINT32)
            .AddProperty('MaxInterval', DBusType.UINT32)
            .AddProperty('TxPower', DBusType.INT16)
        .End();

        export interface Properties extends DBusProperties
        {
            Get(property_name: 'Type'): Promise<string>;
            Get(property_name: 'ServiceUUIDs'): Promise<string[]>;
            Get(property_name: 'ManufacturerData'): Promise<DBusDict<number, DBusByteArray>>;
            Get(property_name: 'SolicitUUIDs'): Promise<string[]>;
            Get(property_name: 'ServiceData'): Promise<DBusDict<number, DBusByteArray>>;
            Get(property_name: 'Data'): Promise<DBusDict<number, DBusByteArray>>;
            Get(property_name: 'Discoverable'): Promise<boolean>;
            Get(property_name: 'DiscoverableTimeout'): Promise<number>;
            Get(property_name: 'Includes'): Promise<string[]>;
            Get(property_name: 'LocalName'): Promise<string>;
            Get(property_name: 'Appearance'): Promise<number>;
            Get(property_name: 'Duration'): Promise<number>;
            Get(property_name: 'Timeout'): Promise<number>;
            Get(property_name: 'SecondaryChannel'): Promise<string>;
            Get(property_name: 'MinInterval'): Promise<number>;
            Get(property_name: 'MaxInterval'): Promise<number>;
            Get(property_name: 'TxPower'): Promise<number>;

            Set(property_name: 'Type', val: string): Promise<void>;
            Set(property_name: 'ServiceUUIDs', val: string[]): Promise<void>;
            Set(property_name: 'ManufacturerData', val: DBusDict<number, DBusByteArray>): Promise<void>;
            Set(property_name: 'SolicitUUIDs', val: string[]): Promise<void>;
            Set(property_name: 'ServiceData', val: DBusDict<number, DBusByteArray>): Promise<void>;
            Set(property_name: 'Data', val: DBusDict<number, DBusByteArray>): Promise<void>;
            Set(property_name: 'Discoverable', val: boolean): Promise<void>;
            Set(property_name: 'DiscoverableTimeout', val: number): Promise<void>;
            Set(property_name: 'Includes', val: string[]): Promise<void>;
            Set(property_name: 'LocalName', val: string): Promise<void>;
            Set(property_name: 'Appearance', val: number): Promise<void>;
            Set(property_name: 'Duration', val: number): Promise<void>;
            Set(property_name: 'Timeout', val: number): Promise<void>;
            Set(property_name: 'SecondaryChannel', val: string): Promise<void>;
            Set(property_name: 'MinInterval', val: number): Promise<void>;
            Set(property_name: 'MaxInterval', val: number): Promise<void>;
            Set(property_name: 'TxPower', val: number): Promise<void>;
        }
    }

    export interface LEAdvertisement1
    {
        Release(): Promise<void>;

        Properties: LEAdvertisement1.Properties;
    }

    export namespace LEAdvertisingManager1
    {
        /*
            Service		org.bluez
            Interface	org.bluez.LEAdvertisingManager1
            Object path	/org/bluez/{hci0,hci1,...}
        */
        export const InvokeContext = InvokeContextHCI(0, BLUEZ_INTERFACE_LE_ADVERTISEMENT_MANAGER);

        export const DBUS_DECL = DBusRegistry.RegisterInterface(BLUEZ_INTERFACE_LE_ADVERTISEMENT_MANAGER)
            .AddMethod('RegisterAdvertisement', {IN: DBusType.OBJECT_PATH}, {IN: [DBusType.STRING, DBusType.VARIANT]})
        // properties
            .AddProperty('ActiveInstances', DBusType.BYTE)
            .AddProperty('SupportedInstances', [DBusType.STRING])
            .AddProperty('SupportedSecondaryChannels', [DBusType.STRING])
            .AddProperty('SupportedCapabilities', [DBusType.STRING, DBusType.VARIANT])
            .AddProperty('SupportedFeatures', [DBusType.STRING])
        .End();

        export interface Properties extends DBusProperties
        {
            Get(property_name: 'ActiveInstances'): Promise<string>;
            Get(property_name: 'SupportedInstances'): Promise<string[]>;
            Get(property_name: 'SupportedSecondaryChannels'): Promise<string[]>;
            Get(property_name: 'SupportedCapabilities'): Promise<DBusDict<string, DBusVariant>>;
            Get(property_name: 'SupportedFeatures'): Promise<string[]>;

            Set(property_name: 'ActiveInstances', val: string): Promise<void>;
            Set(property_name: 'SupportedInstances', val: string[]): Promise<void>;
            Set(property_name: 'SupportedSecondaryChannels', val: string[]): Promise<void>;
            Set(property_name: 'SupportedCapabilities', val: DBusDict<string, DBusVariant>): Promise<void>;
            Set(property_name: 'SupportedFeatures', val: string[]): Promise<void>;
        }
    }

    export interface LEAdvertisingManager1
    {
        RegisterAdvertisement(advertisement: DBusObjectPath, opts: DBusDict<string, DBusVariant>): Promise<void>;

        Properties: LEAdvertisingManager1.Properties;
    }
}

export namespace bluez  // device-api.txt
{
    export const BLUEZ_INTERFACE_DEVICE = 'org.bluez.Device1';

    export namespace Device1
    {
        /*
            Service		org.bluez
            Interface	org.bluez.Device1
            Object path	[variable prefix]/{hci0,hci1,...}/dev_XX_XX_XX_XX_XX_XX
        */

        export const DBUS_DECL = DBusRegistry.RegisterInterface(BLUEZ_INTERFACE_DEVICE)
            .AddMethod('Connect')
            .AddMethod('Disconnect')
            .AddMethod('ConnectProfile', {IN: DBusType.STRING})
            .AddMethod('DisconnectProfile', {IN: DBusType.STRING})
            .AddMethod('Pair')
            .AddMethod('CancelPairing')
        // properties
            .AddProperty('Address', DBusType.STRING)
            .AddProperty('Name', DBusType.STRING)
            .AddProperty('Icon', DBusType.STRING)
            .AddProperty('Class', DBusType.STRING)
            .AddProperty('Appearance', DBusType.STRING)
            .AddProperty('UUIDs', [DBusType.STRING])
            .AddProperty('Paired', DBusType.BOOLEAN)
            .AddProperty('Connected', DBusType.BOOLEAN)
            .AddProperty('Trusted', DBusType.BOOLEAN)
            .AddProperty('Blocked', DBusType.BOOLEAN)
            .AddProperty('WakeAllowed', DBusType.BOOLEAN)
            .AddProperty('Alias', DBusType.STRING)
            .AddProperty('Adapter', DBusType.OBJECT_PATH)
            .AddProperty('LegacyPairing', DBusType.BOOLEAN)
            .AddProperty('Modalias', DBusType.STRING)
            .AddProperty('RSSI', DBusType.INT16)
            .AddProperty('TxPower', DBusType.INT16)
            .AddProperty('ManufacturerData', [DBusType.STRING, DBusType.BYTE_ARRAY])
            .AddProperty('ServiceData', [DBusType.STRING, DBusType.STRING])
            .AddProperty('ServicesResolved', DBusType.BOOLEAN)
            .AddProperty('AdvertisingFlags', DBusType.BYTE_ARRAY)
            .AddProperty('AdvertisingData', [DBusType.BYTE, DBusType.BYTE_ARRAY])
        .End();

        export interface Properties extends DBusProperties
        {
            Get(property_name: 'Address'): Promise<string>;
            Get(property_name: 'Name'): Promise<string | undefined>;
            Get(property_name: 'Icon'): Promise<string | undefined>;
            Get(property_name: 'Class'): Promise<string | undefined>;
            Get(property_name: 'Appearance'): Promise<string | undefined>;
            Get(property_name: 'UUIDs'): Promise<string[] | undefined>;
            Get(property_name: 'Paired'): Promise<boolean>;
            Get(property_name: 'Connected'): Promise<boolean>;
            Get(property_name: 'Trusted'): Promise<boolean>;
            Get(property_name: 'Blocked'): Promise<boolean>;
            Get(property_name: 'WakeAllowed'): Promise<boolean>;
            Get(property_name: 'Alias'): Promise<string>;
            Get(property_name: 'Adapter'): Promise<DBusObjectPath>;
            Get(property_name: 'LegacyPairing'): Promise<boolean>;
            Get(property_name: 'Modalias'): Promise<string>;
            Get(property_name: 'RSSI'): Promise<number>;
            Get(property_name: 'TxPower'): Promise<number>;
            Get(property_name: 'ManufacturerData'): Promise<DBusDict<string, DBusByteArray>>;
            Get(property_name: 'ServiceData'): Promise<DBusDict<string, string>>;
            Get(property_name: 'ServicesResolved'): Promise<boolean>;
            Get(property_name: 'AdvertisingFlags'): Promise<DBusByteArray>;
            Get(property_name: 'AdvertisingData'): Promise<DBusDict<number, DBusByteArray>>;

            Set(property_name: 'Trusted', val: boolean): Promise<void>;
            Set(property_name: 'Blocked', val: boolean): Promise<void>;
            Set(property_name: 'WakeAllowed', val: boolean): Promise<void>;
            Set(property_name: 'Alias', val: string): Promise<void>;
        }
    }

    export interface Device1
    {
        Connect(): Promise<void>;
        Disconnect(): Promise<void>;

        ConnectProfile(uuid: string): Promise<void>;
        DisconnectProfile(uuid: string): Promise<void>;

        Pair(): Promise<void>;
        CancelPairing(): Promise<void>;

        Properties: Device1.Properties;
    }
}

export namespace bluez  // gatt-api
{
    export const BLUEZ_INTERFACE_GATT_SERVICE = 'org.bluez.GattService1';
    export const BLUEZ_INTERFACE_GATT_CHARACTERISTIC = 'org.bluez.GattService1';
    export const BLUEZ_INTERFACE_GATT_DESCRIPTOR = 'org.bluez.GattDescriptor1';
    export const BLUEZ_INTERFACE_GATT_PROFILE = 'org.bluez.GattProfile1';
    export const BLUEZ_INTERFACE_GATT_MANAGER = 'org.bluez.GattManager1';

    export namespace GattService1
    {
        /*
            Service		org.bluez
            Interface	org.bluez.GattService1
            Object path	[variable prefix]/{hci0,hci1,...}/dev_XX_XX_XX_XX_XX_XX/serviceXX
        */

        export const DBUS_DECL = DBusRegistry.RegisterInterface(BLUEZ_INTERFACE_GATT_SERVICE)
            .AddProperty('Primary', DBusType.BOOLEAN)
            .AddProperty('Device', DBusType.OBJECT_PATH)
            .AddProperty('Includes', [DBusType.OBJECT_PATH])
            .AddProperty('Handle', DBusType.UINT16)
        .End();

        export interface Properties extends DBusProperties
        {
            Get(property_name: 'Primary'): Promise<boolean>;
            Get(property_name: 'Device'): Promise<DBusObjectPath | undefined>;
            Get(property_name: 'Includes'): Promise<DBusArray<DBusObjectPath> | undefined>;
            Get(property_name: 'Handle'): Promise<number>;

            Set(property_name: 'Handle', val: number): Promise<void>;
        }
    }

    export interface GattService1
    {
        Properties: GattService1.Properties;
    }

    export namespace Characteristic1
    {
        /*
            Service		org.bluez
            Interface	org.bluez.GattCharacteristic1
            Object path	[variable prefix]/{hci0,hci1,...}/dev_XX_XX_XX_XX_XX_XX/serviceXX/charYYYY
        */

        export class ReadOptions extends Map<string, DBusVariant | number | string | DBusObjectPath>
        {
            override set(opt: 'offset', value: number): this;
            override set(opt: 'mtu', value: number): this;
            override set(opt: 'device', value: DBusObjectPath): this;
            override set(opt: string, Value: any): this
            {
                switch (opt)
                {
                case 'offset':
                case 'mtu':
                    return super.set(opt, {Type: DBusType.UINT16, Value});
                case 'device':
                    return super.set(opt, {Type: DBusType.OBJECT_PATH, Value});

                default:
                    if (DBusType.IsVariantLike(Value))
                        return super.set(opt, Value);
                    else
                        throw new DBusError.EInvalidArg();
                }
            }
        }

        export class WriteOptions extends Map<string, DBusVariant | number | DBusObjectPath | string>
        {
            override set(opt: 'offset', Value: number): this;
            override set(opt: 'mtu', Value: number): this;
            override set(opt: 'device', Value: DBusObjectPath): this;
            override set(opt: 'type', Value: 'command' | 'request' | 'reliable'): this;
            override set(opt: 'link', Value: string): this;
            override set(opt: 'prepare-authorize', Value: boolean): this;
            override set(opt: string, Value: any): this
            {
                switch (opt)
                {
                case 'offset':
                case 'mtu':
                    return super.set(opt, {Type: DBusType.UINT16, Value});
                case 'device':
                    return super.set(opt, {Type: DBusType.OBJECT_PATH, Value});
                case 'type':
                case 'link':
                    return super.set(opt, {Type: DBusType.STRING, Value});
                case 'prepare-authorize':
                    return super.set(opt, {Type: DBusType.BOOLEAN, Value});

                default:
                    if (DBusType.IsVariantLike(Value))
                        return super.set(opt, Value);
                    else
                        throw new DBusError.EInvalidArg();
                }
            }
        }

        export const DBUS_DECL = DBusRegistry.RegisterInterface(BLUEZ_INTERFACE_GATT_CHARACTERISTIC)
            .AddMethod('ReadValue', {IN: [DBusType.STRING, DBusType.VARIANT]}, {OUT: DBusType.BYTE_ARRAY})
            .AddMethod('WriteValue', {IN: DBusType.BYTE_ARRAY}, {IN: [DBusType.STRING, DBusType.VARIANT]})
            .AddMethod('StartNotify')
            .AddMethod('StopNotify')
            // .AddMethod('Confirm')    // comfirm of what? and its no reply?
        // properties
            .AddProperty('UUID', DBusType.STRING)
            .AddProperty('Service', DBusType.OBJECT_PATH)
            .AddProperty('Value', DBusType.BYTE_ARRAY)
            .AddProperty('WriteAcquired', DBusType.BOOLEAN)
            .AddProperty('NotifyAcquired', DBusType.BOOLEAN)
            .AddProperty('Notifying', DBusType.BOOLEAN)
            .AddProperty('Flags', [DBusType.STRING])
            .AddProperty('MTU', DBusType.UINT16)
        .End();

        export type Flags = 'broadcast' | 'read' | 'write-without-response' | 'write' | 'notify' | 'indicate' |
            'authenticated-signed-writes' | 'extended-properties' | 'reliable-write' | 'writable-auxiliaries' | 'encrypt-read' |
            'encrypt-write' | 'encrypt-notify' | 'encrypt-indicate' | 'encrypt-authenticated-read' | 'encrypt-authenticated-write' |
            'encrypt-authenticated-notify' | 'encrypt-authenticated-indicate' | 'secure-read' |  'secure-write' | 'secure-notify' |
            'secure-indicate' | 'authorize';

        export interface Properties extends DBusProperties
        {
            Get(property_name: 'UUID'): Promise<string>;
            Get(property_name: 'Service'): Promise<DBusObjectPath>;
            Get(property_name: 'Value'): Promise<DBusByteArray | undefined>;
            Get(property_name: 'WriteAcquired'): Promise<boolean | undefined>;
            Get(property_name: 'NotifyAcquired'): Promise<boolean | undefined>;
            Get(property_name: 'Notifying'): Promise<boolean | undefined>;
            Get(property_name: 'Flags'): Promise<DBusArray<Flags>>;
            Get(property_name: 'MTU'): Promise<number>;
        }
    }

    export interface Characteristic1
    {
        ReadValue(opts: Characteristic1.ReadOptions): Promise<DBusByteArray>;
        WriteValue(value: DBusByteArray, opts: Characteristic1.WriteOptions): Promise<void>;

        StartNotify(): Promise<void>;
        StopNotify(): Promise<void>;

        Properties: Characteristic1.Properties;
    }

    export namespace GattDescriptor1
    {
        /*
            Service		org.bluez
            Interface	org.bluez.GattDescriptor1
            Object path	[variable prefix]/{hci0,hci1,...}/dev_XX_XX_XX_XX_XX_XX/serviceXX/charYYYY/descriptorZZZ
        */

        export class ReadOptions extends Map<string, DBusVariant | number | DBusObjectPath>
        {
            override set(opt: 'offset', Value: number): this;
            override set(opt: 'device', Value: DBusObjectPath): this;
            override set(opt: 'link', Value: string): this;
            override set(opt: string, Value: any): this
            {
                switch (opt)
                {
                case 'offset':
                    return super.set(opt, {Type: DBusType.UINT16, Value});
                case 'device':
                    return super.set(opt, {Type: DBusType.OBJECT_PATH, Value});
                case 'link':
                    return super.set(opt, {Type: DBusType.STRING, Value});

                default:
                    if (DBusType.IsVariantLike(Value))
                        return super.set(opt, Value);
                    else
                        throw new DBusError.EInvalidArg();
                }
            }
        }

        export class WriteOptions extends Map<string, DBusVariant>
        {
            Append(opt: 'offset', Value: number): this;
            Append(opt: 'device', Value: DBusObjectPath): this;
            Append(opt: 'link', Value: string): this;
            Append(opt: 'prepare-authorize', Value: boolean): this;
            Append(opt: 'offset' | 'device' | 'link' | 'prepare-authorize', Value: number | string | boolean): this
            {
                switch (opt)
                {
                case 'offset':
                    return super.set(opt, {Type: DBusType.UINT16, Value});
                case 'device':
                    return super.set(opt, {Type: DBusType.OBJECT_PATH, Value});
                case 'link':
                    return super.set(opt, {Type: DBusType.STRING, Value});
                case 'prepare-authorize':
                    return super.set(opt, {Type: DBusType.BOOLEAN, Value});
                }
            }
        }

        export const DBUS_DECL = DBusRegistry.RegisterInterface(BLUEZ_INTERFACE_GATT_DESCRIPTOR)
            .AddMethod('ReadValue', {IN: [DBusType.STRING, DBusType.VARIANT]}, {OUT: DBusType.BYTE_ARRAY})
            .AddMethod('WriteValue', {IN: DBusType.BYTE_ARRAY}, {IN: [DBusType.STRING, DBusType.VARIANT]})
        // properties
            .AddProperty('UUID', DBusType.STRING)
            .AddProperty('Characteristic', DBusType.OBJECT_PATH)
            .AddProperty('Value', DBusType.BYTE_ARRAY)
            .AddProperty('Flags', [DBusType.STRING])
        .End();

        export type Flags = 'read' | 'write' | 'encrypt-read' | 'encrypt-write' |
            'encrypt-authenticated-read' | 'encrypt-authenticated-write' |
            'secure-read'  | 'secure-write' | 'authorize';

        export interface Properties
        {
            Get(property_name: 'UUID'): Promise<string>;
            Get(property_name: 'Characteristic'): Promise<DBusObjectPath>;
            Get(property_name: 'Value'): Promise<DBusByteArray | undefined>;
            Get(property_name: 'Flags'): Promise<DBusArray<Flags>>;
        }
    }

    export interface GattDescriptor1
    {
        ReadValue(opts: GattDescriptor1.ReadOptions): Promise<DBusByteArray>;
        WriteValue(value: DBusByteArray, opts: GattDescriptor1.WriteOptions): Promise<void>;

        Properties: GattDescriptor1.Properties;
    }

    export namespace Profile1
    {
        /*
            Service		<application dependent>
            Interface	org.bluez.GattProfile1
            Object path	<application dependent>
        */

        export const DBUS_DECL = DBusRegistry.RegisterInterface(BLUEZ_INTERFACE_GATT_PROFILE)
            .AddMethod('Release')
        // properties
            .AddProperty('UUIDs', [DBusType.STRING])
        .End();

        export interface Properties extends DBusProperties
        {
            Get(property_name: 'UUIDs'): Promise<string[]>;
        }
    }

    export interface Profile1
    {
        Release(): Promise<void>;

        Properties: Profile1.Properties;
    }

    export namespace GattManager1
    {
        /*
            Service		org.bluez
            Interface	org.bluez.GattManager1
            Object path	[variable prefix]/{hci0,hci1,...}
        */

        export const DBUS_DECL = DBusRegistry.RegisterInterface(BLUEZ_INTERFACE_GATT_MANAGER)
            .AddMethod('RegisterApplication', {IN: DBusType.OBJECT_PATH}, {IN: [DBusType.STRING, DBusType.VARIANT]})
            .AddMethod('UnregisterApplication', {IN: DBusType.OBJECT_PATH})
        .End();

    }

    export interface GattManager1
    {
        RegisterApplication(application: DBusObjectPath, opts: DBusDict<string, DBusVariant>): Promise<void>;
        UnregisterApplication(application: DBusObjectPath): Promise<void>;
    }
}
