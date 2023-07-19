import {Observable} from 'rxjs';
import {TShellRequest} from 'ultracreation/asset/peripheral/shell';
import {TypeInfo} from 'ultracreation/core';
import {THashCrcitt} from 'ultracreation/hash/crccitt';

const OTA_SPLIT_PACKET_SIZE = 16;
const OTA_PACKET_SIZE = OTA_SPLIT_PACKET_SIZE + 4;

export class TBluetoothOTA extends TShellRequest<number>
{
    constructor(private Cmd: string, private Firmware: ArrayBuffer, private FlowControl?: IStreamFlowControl)
    {
        super();
    }

    _Start(): void
    {
        const CRC = this.SplitPacket(this.Firmware);
        console.log(`split package size: ${this.PacketBuffer.byteLength}`);

        const Size = this.PacketBuffer.byteLength / 20 * 16;

        const cmd = `${this.Cmd} -s=${Size} -c=${CRC}`;
        console.log(cmd);

        this.ShellStream.WriteLn(cmd).catch(err => this.error(err));
    }

    _HandleResponse(Line: string): void
    {
        /// for early 2016 production
        if (Line === 'crc error')
        {
            this.ShellStream.Close().catch(err => {});
            this.error(new Error('e_ota_failure'));
        }

        const Lines = Line.split(':');
        const status = parseInt(Lines[0], 10);

        // 0: ok to continue send firmware
        if (0 === status && ! TypeInfo.Assigned(this.Downloading))
        {
            this.Ticking = performance.now();
            this.Downloading = this.ShellStream.WriteBuf(this.PacketBuffer, {FlowControl: this.FlowControl});

            this.Downloading.subscribe({
                next: sent =>
                {
                    console.log(`writing ${sent}, ticking: ${Math.trunc(performance.now() - this.Ticking)}`);
                    this.next(sent / this.PacketBuffer.byteLength);
                },
                error: err => this.error(err),
                complete: () => this.complete()
            });
        }
        /// anything else should break the procedure
        else
        {
            console.log(`%cOTA error ${status}`, 'color:red');
            this.error(new Error('e_ota_failure'));
        }
    }

    private SplitPacket(Firmware: ArrayBuffer): number
    {
        const Count = Math.trunc((Firmware.byteLength + OTA_SPLIT_PACKET_SIZE - 1) / OTA_SPLIT_PACKET_SIZE);
        this.PacketBuffer = new ArrayBuffer(Count * OTA_PACKET_SIZE);

        const CRC = new THashCrcitt();
        for (let i = 0; i < Count; i ++)
        {
            const fw_offset = i * OTA_SPLIT_PACKET_SIZE;

            let ViewSrc: Uint8Array;
            if (Firmware.byteLength - fw_offset > OTA_SPLIT_PACKET_SIZE)
                ViewSrc = new Uint8Array(Firmware, fw_offset, OTA_SPLIT_PACKET_SIZE);
            else
                ViewSrc = new Uint8Array(Firmware, fw_offset, Firmware.byteLength - fw_offset);

            const pkt_offset = i * OTA_PACKET_SIZE;
            const DataView = new Uint8Array(this.PacketBuffer,  pkt_offset + 4, OTA_SPLIT_PACKET_SIZE);
            DataView.fill(0);
            DataView.set(ViewSrc);
            CRC.Update(DataView);

            const HeadView = new Uint16Array(this.PacketBuffer, pkt_offset, 2);
            if (this.Firmware.byteLength > 0xFFFF)
                HeadView[0] = i;
            else
                HeadView[0] = i * OTA_SPLIT_PACKET_SIZE;
            HeadView[1] = THashCrcitt.Get(DataView).Value();
        }

        CRC.Final();
        return CRC.Value();
    }

    private PacketBuffer!: ArrayBuffer;
    private Ticking!: number;
    private Downloading!: Observable<number>;
}
