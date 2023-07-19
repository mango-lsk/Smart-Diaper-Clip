import {Observable, Subject} from 'rxjs';

import {TypeInfo} from '../core/typeinfo';
import {TGuid} from '../core/guid';
import {EDisconnected, ENoConnection} from '../core/exception';

import * as Mqtt from 'mqtt';

// https://github.com/mqttjs/MQTT.js

declare global
{
    var Mqtt: TMqttClient;

    interface Window
    {
        Mqtt: TMqttClient;
    }
}

class TMqttClient
{
    constructor()
    {
    }

    get IsConnected(): boolean
    {
        return TypeInfo.Assigned(this.Mqtt) && this.Mqtt.connected;
    }

    get ClientId(): string
    {
        if (! TypeInfo.Assigned(this.Options.clientId))
            this.Options.clientId = TGuid.Generate();

        return this.Options.clientId;
    }

    set ClientId(val: string)
    {
        this.Options.clientId = val;
    }

    AuthCredential(UserName: string, Password: string): void
    {
        this.Options.username = UserName;
        this.Options.password = Password;
    }

    AddServer(Host:string, Port: number, Protocol: 'ws' | 'wss' = 'ws')
    {
        this.Options.servers?.push({host: Host, port: Port, protocol: Protocol});
    }

    Connect(): Promise<void>
    {
        if (TypeInfo.Assigned(this.Connecting))
            return this.Connecting;
        if (TypeInfo.Assigned(this.Mqtt))
            return Promise.resolve();

        if (! TypeInfo.Assigned(this.Options.clientId))
            this.Options.clientId = TGuid.Generate();

        this.Connecting = new Promise<void>((resolve, reject) =>
        {
            this.Mqtt = Mqtt.connect(this.Options);
            const TimeoutTid = setTimeout(() => reject('Conn timedout'), 3500);

            this.Mqtt.once('connect', () =>
            {
                console.log(`Mqtt client connected: ${this.Options.clientId}`);
                clearTimeout(TimeoutTid);
                resolve();
            });

            this.Mqtt.once('error', err =>
            {
                console.log(`%cMqtt error: ${err.message}`, 'color:red');
                clearTimeout(TimeoutTid);
                reject(err);
            });
        })
        .then(() =>
        {
            this.Mqtt!.on('connect', () => console.log('Mqtt client online.'));

            this.Mqtt!.on('offline', () =>
            {
                for (const iter of this.Topics)
                    iter[1].error(new EDisconnected());

                console.log('%cMqtt client offline.', 'color:orange');
            });

            this.Mqtt!.on('error', err => console.log(`%cMqtt error: ${err.message}`, 'color:red'));

            this.Mqtt!.on('message', (topic, payload) =>
            {
                const TopicSubject = this.Topics.get(topic);

                if (TypeInfo.Assigned(TopicSubject))
                    TopicSubject.next(payload);
            });
        })
        .finally(() =>
            this.Connecting = undefined);

        return this.Connecting;
    }

    Disconnect(): void
    {
        for (const iter of this.Topics)
            iter[1].unsubscribe();

        if (TypeInfo.Assigned(this.Mqtt))
        {
            this.Mqtt.end();
            this.Mqtt = undefined;
        }
    }

    Listen(Topic: string, options?: Mqtt.IClientSubscribeOptions): Observable<Uint8Array>
    {
        return new Observable<Uint8Array>(obs =>
        {
            let TopicSubject = this.Topics.get(Topic);

            if (! TypeInfo.Assigned(TopicSubject))
            {
                TopicSubject = new Subject<Uint8Array>();
                this.Topics.set(Topic, TopicSubject);

                this.Connect();
                if (TypeInfo.Assigned(this.Mqtt))
                {
                    this.Mqtt.subscribe(Topic, options ? options : {qos: 0}, (err: any, granted: any) =>
                    {
                        if (TypeInfo.Assigned(err))
                            obs.error(err);
                        else
                            console.log(`%cMqtt listening Topic: ${Topic}`, 'color:lightgreen');
                        });
                }
                else
                    obs.error(new ENoConnection());
            }
            TopicSubject.subscribe(obs);

            return () =>
            {
                if (! TopicSubject?.observed)
                {
                    this.Topics.delete(Topic);

                    if (TypeInfo.Assigned(this.Mqtt))
                    {
                        if (this.Mqtt.connected)
                        {
                            this.Mqtt.unsubscribe(Topic, {}, (error, packet) =>
                            console.log(`%cMqtt unlistening Topic: ${Topic}`, 'color:lightgreen'));
                        }

                        if (0 === this.Topics.size)
                        {
                            this.Mqtt.end();
                            this.Mqtt = undefined;
                        }
                    }

                }
            };
        });
    }

    Publish(Topic: string, Message: string | Uint8Array | Buffer, opts?: Mqtt.IClientPublishOptions): Promise<void>
    {
        if (! (Message instanceof Buffer) && Message instanceof Uint8Array)
            Message = Buffer.from(Message);

        return this.Connect().then(() => new Promise<void>((resolve, reject) =>
        {
            if (TypeInfo.Assigned(this.Mqtt))
            {
                this.Mqtt.publish(Topic, Message as string | Buffer, opts ? opts : {qos: 0}, (err?: any, packet?: any) =>
                {
                    if (TypeInfo.Assigned(err))
                        reject(err);
                    else
                        resolve();
                });
            }
            else
                reject(new ENoConnection());
        }));
    }

    private Mqtt?: Mqtt.Client;
    private Options: Mqtt.IClientOptions = {reconnectPeriod: 30000, servers: []};
    private Connecting?: Promise<void>;

    private Topics = new Map<string, Subject<Uint8Array>>();
}

window.Mqtt = new TMqttClient();
