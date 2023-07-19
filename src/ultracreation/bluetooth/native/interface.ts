import {Subject} from 'rxjs';

export interface IGapCentral
{
    Connect(Address: string): Promise<IGattConnection>;
}

export interface IGattConnection
{
    // readonly RSSI: number;

    Close(): Promise<void>;
    StartNotification(Service: string, Characteristic: string): ICharNotification;
}

export interface ICharNotification extends IAsyncWritable, Subject<ArrayBuffer | Uint8Array>
{
    readonly Connection: IGattConnection;
    StopNotification(): void;

    next(buf: ArrayBuffer | Uint8Array): void;
}
