/**
 * @brief  AirConfig Process
 *
 * Frame Header
 * | Frame Control | Duration/ID | Address1 | Address2 | Address3 | Sequence Control | Address4 |
 *
 * send udp data encoded with frame length, str with ASCII code <---> len
 *
 * Len = base_len + val
 *
 * Leading code [{1, 2, 3, 4} loop 20]
 *   --> lock channel & calc base_len (received maybe (51, 52, 53, 54))
 *
 * data = ssid + (char RS(30)) + random char(0-128) + pwd
 * Prefix code [{total_len high, 0x10 | low, 0x20 | crc high, 0x30 low, 0x40 | checksum } loop 6]
 *    (As the len High may be 0, so add 0x1 to let len > 0)
 *
 * data str ---> base64 str --> Array<base64 index> --> Transfer
 *     ---> Array<idx> --> base64 str --> str
 *
 * Data (blocks = len / 4), one block [{0x60 | (index + 1), d1, d2, d3, d4, 0x80 | crc}]
 */

import {EEncoding} from '../../core/exception';
import {TBase64Encoding} from '../../core/encoding/base64';
import {TAsciiEncoding} from '../../core/encoding/ascii';
import {THashCrc8} from '../../hash/crc8';
import {TSocket} from './socket';
import {TUtf8Encoding} from 'ultracreation/core/encoding/utf8';

export namespace AirConfig
{
    export const ONE_CHANNEL_SCAN_TIME = 200; // ms
    export const SCAN_CHANNELS = 14;
    export const ALL_CHANNEL_SCAN_TIME = SCAN_CHANNELS * ONE_CHANNEL_SCAN_TIME;
    export const ONE_BLK_SEND_TIME = 100;

    export const LEADING_CODE_TIME = ALL_CHANNEL_SCAN_TIME;
    export const CHANNEL_LOCK_TIME = LEADING_CODE_TIME; // may catched with first, and make time enough

    export const CHANNEL_DATA_TIMEOUT = 800;

    export const MAX_SEND_STR = 255;
    export const BASE_LEN = 48;
    export const BLK_SIZE = 4;

    export const MULTI_CAST_PORT = 1900;
    export const MULTI_CAST = `239.255.255.250:${MULTI_CAST_PORT}`;
    export const BROAD_CAST_PORT = 10000;
    export const BROAD_CAST = `255.255.255.255:${BROAD_CAST_PORT}`;

    const SsdpRequest = ['M-SEARCH * HTTP/1.1',
            `Host: `,
            `Man: "ssdp:discover"`,
            `ST: urn:uc:air`].join('\r\n');
    const SsdpData = TAsciiEncoding.Encode(SsdpRequest);

    export async function Send(ssid: string, pwd: string, random_char: number)
    {
        console.log('Start send ' + ssid + ' pwd: ' + pwd.length + ' random: ' + random_char);
        const UdpSock = new TSocket(TSocketFamily.AF_INET, TSocketType.SOCK_DGRAM, 0);
        await UdpSock.BindIfaceLocalAddr('wlan', Inet.PORT_ANY)
            .then(async () =>
            {
                await UdpSock.SetBroadcast(true);

                await SendAirConfigCode(UdpSock, ssid, pwd, random_char, true);

                // await Delay(CHANNEL_DATA_TIMEOUT);
                await SendAirConfigCode(UdpSock, ssid, pwd, random_char, false);
            })
            .catch((err) =>
            {
                console.log(`%cAirConfig: broadcast canceled ${err.message}`, 'color:red');
                return Promise.reject(err);
            });
        UdpSock.Close();
    }

    export async function SendAirConfigCode(
            sock: TSocket,
            ssid: string, pwd: string, random_char: number,
            IsBroadcast: boolean = true)
    {
        const addr: string = IsBroadcast ? BROAD_CAST : MULTI_CAST ;
        const TimeCal = new TimeCalculator();

        console.log('Start airconfig----> ts: ' + Math.round((new Date()).getTime() / 1000) +
            ' base len: ' + SsdpData.length);
        const LeadingCode = MakeLeadingCode();
        const LeadingCodeLoops = Math.round(ALL_CHANNEL_SCAN_TIME / ONE_BLK_SEND_TIME);
        await SendWithLengthEncode(sock, addr, LeadingCode, LeadingCodeLoops, ONE_BLK_SEND_TIME);

        console.log('Sent Leading Code loops: ' + LeadingCodeLoops + ' time: ' +
            TimeCal.TimeFromNow() + 'ms' + ' ts: ' + Math.round((new Date()).getTime() / 1000));
        TimeCal.Update();

        const pwd_ary = EncodeToBase64Values(pwd, random_char);
        const PrefixCode = MakePrefixCode(ssid, pwd_ary.length);
        await SendWithLengthEncode(sock, addr, PrefixCode, 6, ONE_BLK_SEND_TIME);

        console.log('Sent Prefix Code time: ' + TimeCal.TimeFromNow() + 'ms' +
            ' ts: ' + Math.round((new Date()).getTime() / 1000));
        TimeCal.Update();

        const blks = MakeDataBlocks(pwd_ary);
        for (let i = 0; i < 3; i++)
        {
            for (const blk of blks)
                await SendWithLengthEncode(sock, addr, blk, 4, ONE_BLK_SEND_TIME);
        }
        console.log('Sent Data time: ' + TimeCal.TimeFromNow() + 'ms' +
            ' ts: ' + Math.round((new Date()).getTime() / 1000));
    }

    export function MakeLeadingCode(): Uint8Array
    {
        return new Uint8Array([1, 2, 3, 4]);
    }

    export function MakePrefixCode(ssid: string, pwd_len: number)
    {
        const ssid_ary = TUtf8Encoding.Encode(ssid);
        const crc = THashCrc8.Get(ssid_ary).Value();
        const buf = new Uint8Array(6);
        buf[0] = ((pwd_len >> 4) & 0x0F);
        buf[1] = 0x10 | (pwd_len & 0x0F);
        buf[2] = 0x20 | ((crc >> 4) & 0x0F);
        buf[3] = 0x30 | (crc & 0x0F);
        buf[4] = 0x40 | (ssid_ary.length & 0x0F);
        buf[5] = 0x50 | ((buf[0] + buf[1] + buf[2] + buf[3] + buf[4]) & 0x0F);

        console.log('pwd len: ' + pwd_len +
            ' ssid crc: ' + crc.toString(16) + ' len: ' + ssid_ary.length);
        let str = '';
        for (const val of buf)
            str += val.toString(16).padStart(2, '0') + ' ';
        console.log(str);
        return buf;
    }

    export function MakeDataBlocks(data: Uint8Array): Array<Uint8Array>
    {
        const blks: Array<Uint8Array> = [];
        const blk_num = data.length / BLK_SIZE;
        console.log('blks: ' + blk_num);
        for (let idx = 0; idx < blk_num; idx++)
        {
            const crc = THashCrc8.Update(0, data, BLK_SIZE, idx * BLK_SIZE);
            const blk = new Uint8Array(BLK_SIZE + 2);
            blk[0] = 0x80 | (idx & 0x1F);
            for (let i = 0; i < BLK_SIZE; i ++)
                blk[1 + i] = data[idx * BLK_SIZE + i];
            blk[BLK_SIZE + 1] = 0x60 | (crc & 0x1F);
            blks.push(blk);
            console.log('blk: ' + idx +   ' crc: ' + blk[BLK_SIZE + 1].toString(16));
        }
        return blks;
    }

    async function SendWithLengthEncode(sock: TSocket, addr: string,
            ary: Uint8Array, loop: number, blk_time: number)
    {
        const TimeCal = new TimeCalculator();
        while (loop--)
        {
            TimeCal.Update();
            for (const val of ary)
                await sock.SendTo(EncodeWithSSDP(val), addr);

            if (blk_time > 0)
            {
                let delay_time = blk_time - TimeCal.TimeFromNow();
                if (delay_time < 20)
                    delay_time = 20;
                await Delay(delay_time);
            }
        }
    }

    export function EncodeWithSSDP(val: number)
    {
        const buf = new Uint8Array(SsdpData.byteLength + val);
        buf.set(SsdpData, 0);
        return buf;
    }

    function ValueOf(base64: number)
    {
        if (base64 === 61)  // =
            return 64;

        if (base64 === 43)  // +
            return 62;
        if (base64 === 47)  // /
            return 63;

        if (base64 >= 65 && base64 < 91)    // A-Z, 0~25
            return base64 - 65;

        if (base64 >= 97 && base64 < 123)   // a~z, 26~51
            return base64 - 97 + 26;

        if (base64 >= 48 && base64 < 58)    // 0~9, 52~61
            return base64 - 48 + 52;

        throw new EEncoding('Corrupted base64: ' + base64);
    }

    export function EncodeToBase64Values(pwd: string, random_char: number): Uint8Array
    {
        const str = String.fromCharCode(random_char) + pwd;
        return TBase64Encoding.Encode(str).map((val) => ValueOf(val));
    }

    async function Delay(ms: number)
    {
        if (ms <= 0)
            return Promise.resolve();
        else
            return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
    }

    class TimeCalculator
    {
        CurrTS = (new Date()).getTime();

        Update() { this.CurrTS = (new Date()).getTime(); }
        TimeFromNow(): number { return (new Date()).getTime() - this.CurrTS; }
    }
}
