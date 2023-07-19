/**
 *  Native UltraCreation USBtoSerial OTG support
 */
import {TypeInfo} from '../../core/typeinfo';
import {EPlugin, TUsbConnection} from './connection';

/** OTG */

export class OTG
{
    static IsSupported(): Promise<boolean>
    {
        if (! TypeInfo.Assigned((window as any).usb))
            return Promise.resolve(false);

        return new Promise((resolve, reject) =>
        {
            (window as any).usb.isSupportOTG((supported: number) => resolve(supported !== 0));
        });
    }

    static Start(VendorId: number, ProductId: number, MTU: number, Latency: number): Promise<void>
    {
        if (! TypeInfo.Assigned((window as any).usb))
            return Promise.reject(new EPlugin());

        const SelfType = this;
        RequestPermission();

        (window as any).usb.registerUsbStateCallback({vid: VendorId, pid: ProductId},
            (msg: string) =>
            {
                console.log('attach callback: ' + msg);
                Detached();
                setTimeout(() => RequestPermission());
            },
            (msg: string) =>
            {
                console.log('detach callback: ' + msg);
                Detached();
            }
        );

        return Promise.resolve();

        function RequestPermission()
        {
            (window as any).usb.requestPermission({vid: VendorId, pid: ProductId},
                () => Attach(),
                (err: string) => console.log(err));
        }

        function Attach()
        {
            SelfType.Connection = new TUsbConnection(VendorId, ProductId, MTU, Latency);
        }

        function Detached()
        {
            if (TypeInfo.Assigned(SelfType.Connection))
            {
                SelfType.Connection.complete();
                SelfType.Connection = undefined;
            }
        }
    }

    static get IsAttached(): boolean
    {
        return TypeInfo.Assigned(this.Connection);
    }

    static AttachedDevice(): TUsbConnection | undefined
    {
        return this.Connection;
    }

    private constructor()
    {
    }

    static Instance: OTG = new OTG();
    private static Connection: TUsbConnection | undefined;
}
