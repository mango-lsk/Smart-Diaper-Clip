import {catchError, NEVER, Observable, Subject, Subscription} from 'rxjs';
import {TypeInfo} from '../../core/typeinfo';
import {EExists, EInvalidArg} from '../../core/exception';

import {TPeripheral} from './abstract';

export namespace PeripheralFactory
{
    export function Register(PeripheralCls: typeof TPeripheral): void
    {
        if (! TypeInfo.Assigned(PeripheralCls.ClassName) || '' === PeripheralCls.ClassName)
            throw new EInvalidArg('Peripheral has static ClassName overrided');

        const ObjectName = 'Peripheral.' + PeripheralCls.ClassName;
        if (Repository.get(ObjectName))
            throw new EExists(`Peripheral Factory: ${ObjectName} already registered`);

        for (const AdName of PeripheralCls.AdName)
        {
            if (KnownAdNames.has(AdName))
                throw new EExists(`PeripheralFactory: ${AdName} already registered`);
            else
                KnownAdNames.add(AdName);
        }

        for (const iter of Repository)
        {
            if (TypeInfo.Assigned(PeripheralCls.AdNameExpr) && iter[1].AdNameExpr === PeripheralCls.AdNameExpr)
                throw new EExists(`PeripheralFactory: ${PeripheralCls.AdNameExpr} already registered`);
        }

        Repository.set(ObjectName, PeripheralCls);
        console.log('%cPeripheralFactory: ' + PeripheralCls.ProductName + ' registered', 'color:lightgreen');
    }

    export function Unregister(PeripheralCls: typeof TPeripheral): void
    {
        if (! TypeInfo.Assigned(PeripheralCls.ClassName) || '' === PeripheralCls.ClassName)
            return;

        const ObjectName = 'Peripheral.' + PeripheralCls.ClassName;
        if (Repository.delete(ObjectName))
        {
            // remove class instances
            for (let idx = ManagedList.length - 1; idx >= 0; idx --)
            {
                // keep stored?
                if (! ManagedList[idx].IsObjectSaved  && ManagedList[idx] instanceof PeripheralCls)
                {
                    const deleted = ManagedList.splice(idx, 1);
                    MangedHash.delete(deleted[0].Id);
                }
            }
            console.log('%cPeripheralFactory: ' + PeripheralCls.ProductName + ' unregistered', 'color:orange');
        }
    }

    export function DescendantOf(Ancestor: typeof TPeripheral): Array<typeof TPeripheral>
    {
        const ary = new Array<typeof TPeripheral>();

        for (const iter of Repository)
        {
            if (Ancestor === iter[1] || iter[1].prototype instanceof Ancestor)
                ary.push(iter[1]);
        }
        return ary;
    }

    export function StartDiscovery(Ancestor: typeof TPeripheral): Observable<TPeripheral>
    {
        const ScanCls = DescendantOf(Ancestor);

        for (const iter of ScanCls)
        {
            if (! Discoverers.has(iter.StartDiscovery))
            {
                const scan_inst = iter.StartDiscovery(Ancestor).pipe(
                    catchError((err, caught) =>
                    {
                        Discoverers.delete(iter.StartDiscovery);

                        if (0 === Discoverers.size)
                            console.log(`%cPeripheralFactory: all outgoing Discovery scanner is stopped, discover stopped`, 'color:lightgreen');
                        return NEVER;
                    }),
                );

                Discoverers.set(iter.StartDiscovery, scan_inst.subscribe({
                    next: val => OnDiscover.next(val), complete: () =>
                    {
                        Discoverers.delete(iter.StartDiscovery);

                        /*
                        if (0 === Discoverers.size)
                        {
                            OnDiscover.complete();
                            OnDiscover = new Subject<TPeripheral>();
                        }
                        */
                    }
                }));
            }
        }
        return OnDiscover;
    }

    export function StopDiscovery(): void
    {
        for (const iter of Discoverers)
            iter[1].unsubscribe();

        Discoverers.clear();
    }

    export function Create(Id: string, PeripheralCls: typeof TPeripheral): TPeripheral | undefined;
    export function Create(Id: string, ObjectName: string): TPeripheral | undefined;
    export function Create(Id: string, NameOrCls: string | typeof TPeripheral): TPeripheral | undefined
    {
        if ('' === Id)
            return undefined;

        const Peripheral = MangedHash.get(Id);
        if (TypeInfo.Assigned(Peripheral))
        {
            console.log(`%cPeripherial Factory: create Peripherial Id: ${Id} already exists`, 'color:yellow');
            return Peripheral;
        }

        const ObjectName = TypeInfo.IsString(NameOrCls) ? NameOrCls : 'Peripheral.' + NameOrCls.ClassName;
        const PeripheralCls = Repository.get(ObjectName);

        if (TypeInfo.Assigned(PeripheralCls))
        {
            const retval = new PeripheralCls();
            retval.Id = Id;
            retval.Name = PeripheralCls.ProductName;

            ManagedList.push(retval);
            MangedHash.set(retval.Id, retval);

            return retval;
        }
        else
        {
            console.log(`%cPeripherial Factory: ${ObjectName} is not registered`, 'color:red');
            return undefined;
        }
    }

    export function CreateByDiscovery(Id: string, AdName: string): TPeripheral | undefined
    {
        if ('' === Id)
            return undefined;

        let Peripheral = MangedHash.get(Id);
        if (! TypeInfo.Assigned(Peripheral))
        {
            for (const iter of Repository)
            {
                const PeripheralClass = iter[1];

                if (PeripheralClass.ClassName === AdName ||
                    PeripheralClass.AdName.includes(AdName) ||
                    (TypeInfo.Assigned(PeripheralClass.AdNameExpr) && AdName.match(PeripheralClass.AdNameExpr)))
                {
                    Peripheral = new PeripheralClass();
                    Peripheral.Id = Id;
                    Peripheral.Name = PeripheralClass.ProductName;
                    Peripheral.LastActivity = Date.now();

                    ManagedList.push(Peripheral);
                    MangedHash.set(Peripheral.Id, Peripheral);
                    break;
                }
            }
        }

        if (TypeInfo.Assigned(Peripheral))
            StartSignalUpdate();

        return Peripheral;
    }

    export function Get<T extends TPeripheral>(Id: string): T | undefined
    {
        const Peripherial = MangedHash.get(Id) as T;

        if (TypeInfo.Assigned(Peripherial) && 0 < Peripherial.Timeout)
            StartSignalUpdate();

        return Peripherial;
    }

    export function Release(Id: string): void;
    export function Release<T extends TPeripheral>(Peripheral: T): void;
    export function Release<T extends TPeripheral>(Peripheral: T | string): void
    {
        let found: TPeripheral | undefined;

        if (TypeInfo.IsString(Peripheral))
            found = MangedHash.get(Peripheral);
        else if (TypeInfo.Assigned(Peripheral.Id))
            found = MangedHash.get(Peripheral.Id);

        if (TypeInfo.Assigned(found))
        {
            ManagedList.splice(ManagedList.indexOf(found), 1);
            MangedHash.delete(found.Id);
        }
    }

    export const KnownAdNames = new Set<string>();
    export const ManagedList = new Array<TPeripheral>();

    const MangedHash = new Map<string, TPeripheral>();

    export const OnDiscover = new Subject<TPeripheral>();
    export const OnSignalLost = new Subject<TPeripheral>();

    const Repository = new Map<string, typeof TPeripheral>();
    const Discoverers = new Map<typeof TPeripheral.StartDiscovery, Subscription>();


    function StartSignalUpdate()
    {
        if (! TypeInfo.Assigned(SignaIntvId))
        {
            SignaIntvId = setInterval(() =>
            {
                const now = Date.now();
                let clear = true;

                for (let idx = ManagedList.length - 1; idx >= 0; idx --)
                {
                    const iter = ManagedList[idx];
                    iter.SignalIntvUpdate();

                    if (0 < iter.Timeout && 0 < iter.LastActivity)
                    {
                        if (now - iter.LastActivity > iter.Timeout)
                        {
                            iter.LastActivity = 0;
                            iter.SignalLost();
                            OnSignalLost.next(iter);

                            if (! iter.IsObjectSaved)
                            {
                                ManagedList.splice(idx, 1);
                                MangedHash.delete(iter.Id);
                            }
                        }
                        else
                            clear = false;
                    }
                }

                if (clear)
                {
                    clearInterval(SignaIntvId!);
                    SignaIntvId = undefined;
                }
            }, 1000);
        }
    }

    let SignaIntvId: timeout_t;
}
