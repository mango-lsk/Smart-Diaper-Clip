import {lastValueFrom, Subject} from 'rxjs';
import {TypeInfo} from '../../core/typeinfo';
import {EAbort} from '../../core/exception';

import {TConnectablePeripheral} from './abstract';

export namespace TShellPeripheral
{
    export interface IConnection extends TConnectablePeripheral.Connection
    {
        Close(): Promise<void>;
    }

    export interface IShellStream extends Subject<string>, IAsyncWritable
    {
        Close(): Promise<void>;
    }
}

type ShellRequestConstructor = new (...args: any[]) => TShellRequest<any>;

export abstract class TShellRequest<T> extends Subject<T>
{
    constructor(...args: any[])
    {
        super();
    }

    abstract _Start(): void; /* @internal */
    abstract _HandleResponse(Line: string): void; /* @internal */

    Abort(): Promise<void>
    {
        // default nothing to do
        return Promise.resolve();
    }

    ShellStream!: TShellPeripheral.IShellStream;
}

export class TSimpleShellRequest extends TShellRequest<string>
{
    constructor(private Cmd: string)
    {
        super();
    }

    _Start(): void
    {
        console.log(this.Cmd);

        this.ShellStream.WriteLn(this.Cmd)
            .catch(err => this.error(err));
    }

    override _HandleResponse(Line: string): void
    {
        this.next(Line);
        setTimeout(() => this.complete());
    }
}

/* TShellPeripheral */

export abstract class TShellPeripheral extends TConnectablePeripheral
{
    protected abstract CreateShellStream(Connection: TShellPeripheral.IConnection): TShellPeripheral.IShellStream | undefined;

    ShellSend(Cmd: string): Promise<void>
    {
        if (TypeInfo.Assigned(this.ShellStream))
            return this.ShellStream.WriteLn(Cmd);
        else
            return Promise.resolve();
    }

    ShellExecute<T extends TShellRequest<any>>(Creater: ShellRequestConstructor, ...args: any[]): Promise<T>;
    ShellExecute(Cmd: string): Promise<string>;
    ShellExecute(CmdOrCreater: string | ShellRequestConstructor, ...args: any[]): Promise<any>
    {
        if (TypeInfo.IsString(CmdOrCreater))
        {
            return this.CreateShellRequest(TSimpleShellRequest, CmdOrCreater)
                .then(request => lastValueFrom(request));
        }
        else
            return this.CreateShellRequest(CmdOrCreater, ...args);
    }

    protected async CreateShellRequest<T extends TShellRequest<any>>(Creater: ShellRequestConstructor, ...args: any[]): Promise<T>
    {
        await this.Connect();

        if (TypeInfo.Assigned(this.ShellStream))
        {
            const Request = new Creater(...args);
            this.ShellRequests.push(Request);

            if (! TypeInfo.Assigned(this.ShellRequestingTimerId))
                this.ShellRequestingTimerId = setTimeout(() => this.HandleNextShellRequest());

            return Request as T;
        }
        else
        {
            console.log(`%cShellStream is undefined: this may caused by HandleConntected() override not visit super.`, 'color:yellow');
            return Promise.reject(new EAbort('Shell channel was disposed.'));
        }
    }

    protected override async HandleConntected(): Promise<void>
    {
        await super.HandleConntected();
        this.ShellStream = this.CreateShellStream(this.Connection!);

        if (TypeInfo.Assigned(this.ShellStream))
            this.ShellStream.subscribe(next => this.HandleDataIn(next));
    }

    protected override HandleDisconnect(err?: Error): void
    {
        // aborting unexecuted request
        //  the request current executing will cause error by connection lost
        err = TypeInfo.Assigned(err) ? err : new EAbort();

        for (const iter of this.ShellRequests)
            iter.error(err);
        if (TypeInfo.Assigned(this.ShellRequesting))
            this.ShellRequesting.error(err);

        this.ShellStream = undefined;
        this.ShellRequests = [];
        this.Connection = undefined;

        super.HandleDisconnect(err);
    }

    protected override HandleDataIn(Line: string): void
    {
        if (TypeInfo.Assigned(this.ShellStream) && TypeInfo.IsString(Line))
        {
            if (TypeInfo.Assigned(Line))
                this.HandleShellResponse(Line);
        }
        else
            console.log(`%cunexpected data in ${Line}`, 'color:red');
    }

    protected HandleNextShellRequest(): void
    {
        if (this.ShellRequests.length > 0)
            this.ShellRequesting = this.ShellRequests.splice(0, 1)[0];

        if (TypeInfo.Assigned(this.ShellRequesting))
        {
            lastValueFrom(this.ShellRequesting).catch(err => {}).then(() =>
            {
                this.ShellRequesting = undefined;

                if (this.ShellRequests.length > 0)
                    this.ShellRequestingTimerId = this.HandleNextShellRequest();
                else
                    this.ShellRequestingTimerId = undefined;
            });

            if (TypeInfo.Assigned(this.ShellStream))
            {
                this.ShellRequesting.ShellStream = this.ShellStream;
                this.ShellRequesting._Start();
            }
            else
                this.ShellRequesting.error(new EAbort());
        }
    }

    protected HandleShellResponse(Line: string): void
    {
        // compatiable bluetooth shell starting with '$'
        if (1 < Line.length && '$' === Line[0])
            Line = Line.substring(1).trim();

        console.log(Line);

        if (TypeInfo.Assigned(this.ShellRequesting))
            this.ShellRequesting._HandleResponse(Line);
    }

    protected ShellStream: TShellPeripheral.IShellStream | undefined;
    protected ShellRequests = new Array<TShellRequest<any>>();
    protected ShellRequesting: TShellRequest<any> | undefined;
    protected ShellRequestingTimerId: any;
}
