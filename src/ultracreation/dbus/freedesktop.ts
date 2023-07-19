/**
 *  freedesktop standard interfaces
 *
 *  @refs
 *      https://dbus.freedesktop.org/doc/dbus-specification.html
 */
import {DBusRegistry, DBusType} from './registry';

export namespace freedesktop
{
    export const DBUS_SERVICE_DBUS = 'org.freedesktop.DBus';
    export const DBUS_PATH_DBUS = '/org/freedesktop/DBus';
    export const DBUS_INTERFACE_DBUS = 'org.freedesktop.DBus';
    export const DBUS_INTERFACE_MONITORING = 'org.freedesktop.DBus.Monitoring';
    export const DBUS_INTERFACE_INTROSPECTABLE = 'org.freedesktop.DBus.Introspectable';
    export const DBUS_INTERFACE_PROPERTIES = 'org.freedesktop.DBus.Properties';
    export const DBUS_INTERFACE_PEER = 'org.freedesktop.DBus.Peer';
    export const DBUS_INTERFACE_OBJECTMANAGER = 'org.freedesktop.DBus.ObjectManager';

    export namespace DBus
    {
        export const InvokeContext: IDBusObject = {
            Service: DBUS_SERVICE_DBUS,
            ObjectPath: DBUS_PATH_DBUS,
            Interface: DBUS_INTERFACE_DBUS
        };

        export const DBUS_DECL = DBusRegistry.RegisterInterface(DBUS_INTERFACE_DBUS)
            .AddMethod('Hello', {OUT: DBusType.STRING})
            .AddMethod('GetId', {OUT: DBusType.STRING})
            .AddMethod('AddMatch', {IN: DBusType.STRING})
            .AddMethod('RemoveMatch', {IN: DBusType.STRING})
            .AddMethod('RequestName', {IN: DBusType.STRING}, {OUT: DBusType.UINT32})
            .AddMethod('ReleaseName', {IN: DBusType.STRING}, {OUT: DBusType.UINT32})
            .AddMethod('NameHasOwner', {IN: DBusType.STRING}, {OUT: DBusType.BOOLEAN})
            .AddMethod('GetNameOwner', {IN: DBusType.STRING}, {OUT: DBusType.STRING})
            .AddMethod('ListQueuedOwners', {IN: DBusType.STRING}, {OUT: [DBusType.STRING]})
            .AddMethod('ListNames', {OUT: [DBusType.STRING]})
            .AddMethod('ListActivatableNames', {OUT: [DBusType.STRING]})
        // signals
            .AddSignal('NameAcquired', DBusType.STRING)
            .AddSignal('NameLost', DBusType.STRING)
            .AddSignal('NameOwnerChanged', DBusType.STRING, DBusType.STRING, DBusType.STRING)
        // properties
            .AddProperty('Features', [DBusType.STRING])
            .AddProperty('Interfaces', [DBusType.STRING])
        .End();
    }

    export interface DBus
    {
        Hello(): Promise<string>;
        GetId(): Promise<string>;

        AddMatch(rule: string): Promise<void>;
        RemoveMatch(rule: string): Promise<void>;

        RequestName(name: string, flags: number): Promise<number>;
        ReleaseName(name: string): Promise<number>;

        NameHasOwner(name: string): Promise<boolean>;
        GetNameOwner(name: string): Promise<string>;
        ListQueuedOwners(name: string): Promise<DBusArray<string>>;
        ListNames(): Promise<DBusArray<string>>;
        ListActivatableNames(): Promise<DBusArray<string>>;

        /*
        GetConnectionUnixUser(): Promise<{retval: number, bus_name: string}>;
        GetConnectionUnixProcessID(): Promise<{retval: number, bus_name: string}>;
        GetConnectionCredentials(): Promise<<{retval: Map<string, any>, bus_name: string}>;
        */

        StartServiceByName(name: string, flags: number): Promise<number>;
        // UpdateActivationEnvironment(env: DBusDict<string, string>): Promise<void>;

        readonly NameAcquired: DBusSignal<string>;
        readonly NameLost: DBusSignal<string>;
        readonly NameOwnerChanged: DBusSignal<[string, string, string]>;
    }

    export namespace DBus
    {
        export namespace Properties
        {
            export const DBUS_DECL = DBusRegistry.RegisterInterface(DBUS_INTERFACE_PROPERTIES)
                .AddMethod('Get', {IN: DBusType.STRING}, {IN: DBusType.STRING}, {OUT: DBusType.VARIANT})
                .AddMethod('Set', {IN: DBusType.STRING}, {IN: DBusType.STRING},  {IN: DBusType.VARIANT})
                .AddMethod('GetAll', {IN: DBusType.STRING}, {OUT: [DBusType.STRING, DBusType.VARIANT]})
                .AddSignal('PropertiesChanged', DBusType.STRING, [DBusType.STRING, DBusType.VARIANT], [DBusType.STRING])
            .End();
        }

        export interface Properties
        {
            Get(interface_name: string, property_name: string): Promise<DBusVariant>;
            Set(interface_name: string, property_name: string, value: DBusVariant): Promise<void>;
            GetAll(interface_name: string): Promise<DBusDict<string, DBusVariant>>;

            PropertiesChanged: DBusSignal<[string, DBusDict<string, DBusVariant>, string[]]>;
        }

        export namespace Introspectable
        {
            export const DBUS_DECL = DBusRegistry.RegisterInterface(DBUS_INTERFACE_INTROSPECTABLE)
                .AddMethod('Introspect', {OUT: DBusType.STRING})
            .End();
        }

        export interface Introspectable
        {
            Introspect(): Promise<string>;
        }

        export namespace Peer
        {
            export const DBUS_DECL = DBusRegistry.RegisterInterface(DBUS_INTERFACE_PEER)
                .AddMethod('Ping')
                .AddMethod('GetMachineId', {OUT: DBusType.STRING})
            .End();
        }

        export interface Peer
        {
            Ping(): Promise<void>;
            GetMachineId(): Promise<string>;
        }

        export namespace ObjectManager
        {
            export const _Decl = DBusRegistry.RegisterInterface(DBUS_INTERFACE_OBJECTMANAGER)
                .AddMethod('GetManagedObjects', {OUT: [DBusType.OBJECT_PATH, [DBusType.STRING, [DBusType.STRING, DBusType.VARIANT]]]})
                .AddSignal('InterfacesAdded', DBusType.OBJECT_PATH, [DBusType.STRING, [DBusType.STRING, DBusType.VARIANT]])
                .AddSignal('InterfacesRemoved', DBusType.OBJECT_PATH, [DBusType.STRING])
            .End();
        }

        export interface ObjectManager
        {
            GetManagedObjects(): Promise<DBusDict<DBusObjectPath, DBusDict<string ,DBusDict<string , DBusVariant>>>>;

            InterfacesAdded: DBusSignal<[DBusObjectPath, DBusDict<string, DBusDict<string, DBusVariant>>]>;
            InterfacesRemoved: DBusSignal<[DBusObjectPath, DBusArray<string>]>;
        }

        export namespace Monitoring
        {
            export const DBUS_DECL = DBusRegistry.RegisterInterface(DBUS_INTERFACE_MONITORING)
                .AddMethod('BecomeMonitor', {IN: [DBusType.STRING]}, {IN: DBusType.UINT32})
            .End();
        }

        export interface Monitoring
        {
            BecomeMonitor(Rule: DBusArray<string>, Flags: number): Promise<void>;
        }
    }
}
