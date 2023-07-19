import {TypeInfo} from '../core/typeinfo';
import {Exception} from '../core/exception';

export class EHash extends Exception
{
}

export class EHashIsFinalize extends EHash
{
    constructor()
    {
        super('e_hash_is_finalize');
    }
}

export class EHashIsNotFinalize extends EHash
{
    constructor()
    {
        super('e_hash_is_not_finalize');
    }
}

/* IHashStatic */

export interface IHashStatic<T>
{
    Get(In: T): THash;
}

/* THash */

export abstract class THash
{
    constructor ()
    {
    }

    abstract Reset(): this;
    abstract Update(Buf: Uint8Array, Count?: number, Pos?: number): this;
    abstract Final(): this;

    abstract get ProcessedBytes(): number
    abstract Value(): any;
    abstract Print(...argv: any[]): string;

/* Object */

    valueOf(): any
    {
        const v = this.Value();

        if (TypeInfo.IsPrimitive(v))
            return v;
        else
            return this.Print();
    }

    toString()
    {
        return this.Print();
    }
}
