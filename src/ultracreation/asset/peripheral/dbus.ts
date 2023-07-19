import {Observable, filter, map, merge} from 'rxjs';
import {TypeInfo} from '../../core/typeinfo';
import {ENoConnection} from '../../core/exception';

import {TConnectablePeripheral, TPeripheral} from './abstract';
import {TMessageBus} from '../../dbus';
import {PeripheralFactory} from './factory';

import {DBusRegistry} from '../../dbus/registry';
import {TDBusMqttTransport} from '../../bluetooth/dbus/mqtt.transport';
import '../../native/upnp';

const WEBSOCKET_CONNECT_TIMEOUT  = 1500;

export class TDBusPeripheral extends TConnectablePeripheral
{
    constructor()
    {
        super();
        this.MessageBus = new TMessageBus();

        this.MessageBus.OnDisconnected.subscribe(() =>
        {
            if (! this.IsConnecting)
                this.HandleDisconnect();
        });
    }

    protected override async ConnectAdapter(): Promise<TConnectablePeripheral.Connection>
    {
        let Transport: DBusRegistry.ITransport | undefined;

        if (TypeInfo.Assigned(this.ConnectId))
        {
            Transport = DBusRegistry.GetTransport('wss');
            if (! TypeInfo.Assigned(Transport))
                Transport = DBusRegistry.GetTransport('ws');
            if (! TypeInfo.Assigned(Transport))
                Transport = DBusRegistry.GetTransport('*');
        }

        if (TypeInfo.Assigned(Transport))
        {
            const ConnectTimeoutId = setTimeout(() =>
            {
                Transport!.Close().catch(err => {});
                Transport = undefined;
            }, WEBSOCKET_CONNECT_TIMEOUT);

            console.log('connecting ' + this.Name + ' with ws: ' + this.ConnectId);
            await Transport.Connect(`${this.ConnectId}:8080`).catch(err => {
                clearTimeout(ConnectTimeoutId);
                Transport = undefined;
            });
            clearTimeout(ConnectTimeoutId);
        }

        // fallback to Mqtt
        if (! TypeInfo.Assigned(Transport))
        {
            Transport = new TDBusMqttTransport();

            console.log('connecting ' + this.Name + ' with mqtt: ' + this.Id);
            await Transport.Connect(this.Id).catch(() =>
                Transport = undefined);
            /*
            send WebRTC => this.MessageBus.UsingTransport()
            fallback => connect Mqtt => this.MessageBus.UsingTransport()
            */
        }

        console.log('connected '  + this.Name + ' with ' + (TypeInfo.Assigned(Transport) ?
            Transport instanceof TDBusMqttTransport ? 'mqtt' : 'ws' : 'none!'));

        if (TypeInfo.Assigned(Transport))
            return Transport;
        else
            throw new ENoConnection();
    }

    protected override async HandleConntected(): Promise<void>
    {
        this.RetryConn = 0;
        await super.HandleConntected();

        // some Transport like Qqtt can always connect, but it never reachs the Device
        return this.MessageBus.UsingTransport(this.Connection as DBusRegistry.ITransport);
    }

    protected override HandleDisconnect(err?: Error): void
    {
        super.HandleDisconnect();

        setTimeout(() => this.Connect());
    }

    /**
     *  triggered when SSDP discovered in local network
     */
    protected HandleLocalDiscover(): void
    {
        /*
        if (! this.MessageBus.IsConnected)
            this.MessageBus.Open(`${this.ConnectId}:8080`).catch(err => {});
        */
        this.Connect().catch(err => {});
    }

/* static */

    static override StartDiscovery(SubCls?: typeof TDBusPeripheral): Observable<TPeripheral>
    {
        const ary = TypeInfo.Assigned(SubCls) ? PeripheralFactory.DescendantOf(SubCls) :
            PeripheralFactory.DescendantOf(TDBusPeripheral);

        if (0 === ary.length)
        {
            return new Observable<TPeripheral>(obs =>
            {
                console.log(`%cSSDP scan canceled: no registered DBus peripherials`, 'color:green');
                setTimeout(() => obs.complete());
            });
        }
        else
        {
            const obs_ary = new Array<Observable<cordova.plugin.SSDP.ISearchReponse>>();
            for (const iter of ary)
                obs_ary.push(cordova.plugin.SSDP.Search(iter.ClassName));

            return merge(...obs_ary).pipe(
                map(rsp =>
                {
                    const peri = this.Identify(rsp);
                    console.log(peri);

                    // if (TypeInfo.Assigned(peri))
                    //     setTimeout(() => peri.HandleLocalDiscover());
                    return peri;
                }),
                filter(peri =>
                    TypeInfo.Assigned(peri))
            ) as Observable<TPeripheral>;
        }
    }

    private static Identify(rsp: cordova.plugin.SSDP.ISearchReponse): TDBusPeripheral | undefined
    {
        if (! TypeInfo.Assigned(rsp.Location) || ! TypeInfo.Assigned(rsp.USN))
        {
            console.log(`%cSSDP least need LOCATION & USN`, 'color:red');
            return undefined;
        }

        const Lines = rsp.USN.split('::');
        if (! Lines[0].startsWith('uuid:'))
        {
            console.log(`%cInvalid SSDP result\r\n${rsp}`, 'color:red');
            return undefined;
        }
        if (! Lines[1].startsWith('urn:'))
        {
            console.log(`%cInvalid SSDP result\r\n${rsp}`, 'color:red');
            return undefined;
        }

        const Id = Lines[0].substring(5);
        let Peripheral = PeripheralFactory.Get(Id);

        if (! TypeInfo.Assigned(Peripheral))
        {
            const AdName = Lines[1].substring(4, Lines[1].lastIndexOf(':'));
            Peripheral = PeripheralFactory.CreateByDiscovery(Id, AdName);
        }

        if (Peripheral instanceof TConnectablePeripheral)
            Peripheral.ConnectId = rsp.Location;
        if (Peripheral instanceof TDBusPeripheral && TypeInfo.IsString(rsp['RNG']))
            Peripheral.RNG = parseInt(rsp['RNG'], 10);

        return Peripheral as TDBusPeripheral;
    }

    RNG?: number;
    RetryConn = 0;
    readonly MessageBus: TMessageBus;
}
