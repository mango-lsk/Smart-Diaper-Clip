import {lastValueFrom} from 'rxjs';
import {TShellRequest} from 'ultracreation/asset/peripheral/shell';

export class TCatFile extends TShellRequest<number>
{
    constructor(private FileName: string, private Buf: Uint8Array)
    {
        super();
    }

    override Abort(): Promise<void>
    {
        return Promise.resolve();
    }

    override _Start(): void
    {
        const cmd = `>cat ${this.FileName} -l=${this.Buf.byteLength}`;
        console.log(cmd);

        this.ShellStream.WriteLn(cmd).then(async () =>
        {
            await new Promise<void>(resolve => setTimeout(() => resolve(), 100));
            const obs = this.ShellStream.WriteBuf(this.Buf,  {FlowControl: {PageSize: 1024, PageInterval: 100}});

            obs.subscribe(next =>
            {
                console.log(next);
                this.next(next);
            });
            return lastValueFrom(obs);
        })
        .catch(err => this.error(err));
    }

    override _HandleResponse(Line: string): void
    {
        const Lines = Line.split(':');

        if (Lines.length > 1)
        {
            const state = parseInt(Lines[0], 10);

            switch (state)
            {
            case 3:
                setTimeout(() => this.complete());
                break;
            default:
                setTimeout(() => this.error('e_download_failure'));
                break;
            }
        }
    }
}
