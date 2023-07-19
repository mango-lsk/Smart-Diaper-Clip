import {TypeInfo} from '../core/typeinfo';

declare global
{
    interface ObjectConstructor
    {
        Clone(o: object, Recursive?: true): any;
    }
}

Object.Clone = function Clone(o: object): any
{
    const v = new (o.constructor as any)();

    AssignProperties(v, o, {Merge: true});
    return v;
};

/* TAssignable */

interface IAssignOptions
{
    Merge?: boolean;

    /**
     *  AssignProperties() to recursive copy Array/Set/Map values
     *      default: false
     */
    NoRecursive?: boolean;

    /**
     *  AssignProperties() to recursive copy unknown Objects
     *      default: false
     */
    RecursiveObject?: boolean;
}

export function AssignProperties(dst: any, src: any, opts?: IAssignOptions): any
{
    let Merge = false;
    let NoRecursive = false;
    let RecursiveObject = false;

    if (TypeInfo.Assigned(opts))
    {
        if (! TypeInfo.IsBoolean(opts))
        {
            Merge = opts.Merge || false;
            NoRecursive = opts.NoRecursive || false;
            RecursiveObject = opts.RecursiveObject || false;
        }
        else
            Merge = opts;
    }

    for (const key of Object.keys(src))
    {
        if (! Merge)
        {
            if (! (key in dst))
                continue;
        }
        const PropValue = src[key];
        try
        {
            if (TypeInfo.IsPrimitive(PropValue))
            {
                if ((typeof dst[key] !== typeof PropValue) && dst instanceof TPersistable)
                    dst.UnmarshallingProp(key, PropValue);  // type mismatch: try to use Unmarshalling
                else
                    dst[key] = PropValue;

                continue;
            }

            if (PropValue instanceof Date)
            {
                dst[key] = new Date(PropValue);
                continue;
            }

            // Generic Array
            if (PropValue instanceof Array)
            {
                let ary: Array<any> = dst[key];

                if (ary === PropValue || ! TypeInfo.Assigned(ary))
                    ary = new (PropValue.constructor as any)();
                else
                    ary.slice(0, ary.length);

                for (const iter of PropValue)
                {
                    if (NoRecursive || ! TypeInfo.IsPrimitive(iter))
                    {
                        const clone = Object.create(iter);
                        AssignProperties(clone, iter, opts);

                        ary.push(clone);
                    }
                    else
                        ary.push(iter);
                }

                dst[key] = ary;
                continue;
            }

            // Set
            if (PropValue instanceof Set)
            {
                let set: Set<any> = dst[key];

                if (set === PropValue || ! TypeInfo.Assigned(set))
                    set = new (PropValue.constructor as any)();
                else
                    set.clear();

                for (const iter of PropValue)
                {
                    if (NoRecursive || ! TypeInfo.IsPrimitive(iter))
                    {
                        const clone = Object.create(iter);
                        AssignProperties(clone, iter, opts);

                        set.add(clone);
                    }
                    else
                        set.add(iter);
                }

                dst[key] = set;
                continue;
            }

            // Map
            if (PropValue instanceof Map)
            {
                let map: Map<any, any> = dst[key];

                if (map === PropValue || ! TypeInfo.Assigned(map))
                    map = new (PropValue.constructor as any)();
                else
                    map.clear();

                for (const iter of PropValue)
                {
                    if (NoRecursive || ! TypeInfo.IsPrimitive(iter[1]))
                    {
                        const clone = Object.create(iter[1]);
                        AssignProperties(clone, iter[1], opts);

                        map.set(iter[0], Object.Clone(iter[1]));
                    }
                    else
                        map.set(iter[0], iter[1]);
                }

                dst[key] = map;
                continue;
            }

            /*
            // TypedArray: need to clone copy ?
            if (PropValue instanceof Int8Array || PropValue instanceof Uint8Array ||
                PropValue instanceof Int16Array || PropValue instanceof Uint16Array ||
                PropValue instanceof Int32Array || PropValue instanceof Uint32Array ||
                PropValue instanceof Float32Array || PropValue instanceof Float64Array)
            {
                if (! NoRecursive)
                    console.log(`%cObject has TypedArray(Int8/16/32 etc.) which is not clone copy`, 'color:yellow');

                dst[key] = PropValue;
                continue;
            }
            */

            // Object...
            if (TypeInfo.IsObject(PropValue))
            {
                let v: any;

                if (RecursiveObject)
                {
                    v = Object.create(PropValue);
                    AssignProperties(v, PropValue, opts);
                }
                else
                    v = PropValue;

                dst[key] = v;
                continue;
            }
        }
        catch (e)
        {
            // PropValue maybe comes from getter
            // but dst[key] may not have setter, this can not be decided
            // console.log(e.message);
        }
    }

    return dst;
}


export abstract class TAssignable
{
    Assign(src: any): this;
    Assign(src: any, merge: boolean): this;
    Assign(src: any, opts: IAssignOptions): this;
    Assign(src: any, opts?: boolean | IAssignOptions): this
    {
        return AssignProperties(this, src, opts as any);
    }

    AssignTo(dst: any): void;
    AssignTo(dst: any, merge: boolean): void;
    AssignTo(dst: any, opts: IAssignOptions): void;
    AssignTo(dst: any, opts?: boolean |IAssignOptions): void
    {
        if (dst instanceof TAssignable)
            dst.Assign(this, opts as any);
        else
            AssignProperties(dst, this, opts as any);
    }

    Clone(): this
    {
        const v = Object.create(null) as this;
        Object.setPrototypeOf(v, Object.getPrototypeOf(this));

        return v.Assign(this, {Merge: true});
    }
}

/* TPersistable */

export abstract class TPersistable extends TAssignable
{
/* IPersistable */

    get IsEditing(): boolean
    {
        return TypeInfo.Assigned(this.OldValue);
    }

    Edit(): this
    {
        if (! TypeInfo.Assigned(this.OldValue))
            this.OldValue = this.Clone();

        return this;
    }

    RevertChanges(): void
    {
        if (TypeInfo.Assigned(this.OldValue))
        {
            this.Assign(this.OldValue, {Merge: true});
            delete this.OldValue;
        }
    }

    MergeChanges(): void
    {
        this.OldValue = undefined;
    }

    OldValue?: this;

/* prop value <==> storage mapping */

    MarshallingProp(PropName: string): TypeInfo.Primitive | Date
    {
        const v = TypeInfo.GetPropValue(this, PropName);

        if (! TypeInfo.IsPrimitive(v))
        {
            if (! (v instanceof Date))
            {
                console.log(`%c${typeof this}.${PropName} is not a Primitive/Date type. override MarshallingProp() to resolve`, 'color:red');
                return JSON.stringify(v);
            }
            else
                return v;
        }
        else
            return v;
    }

    UnmarshallingProp(PropName: string, Value: TypeInfo.Primitive)
    {
        if (TypeInfo.Assigned(Value))
            TypeInfo.SetPropValue(this, PropName, Value);
    }

/* static */

    static GetRules(ObjType: typeof TPersistable): TPersistable.Rule[]
    {
        let rules = this.RuleRepository.get(ObjType);

        if (! TypeInfo.Assigned(rules))
        {
            rules = new Array<TPersistable.Rule>();
            ObjType.DefineRules(rules);

            this.RuleRepository.set(ObjType, rules);
        }

        return rules;
    }

    protected static DefineRules(Rules: Array<TPersistable.Rule>): void
    {
    }

    static RuleRepository = new Map<typeof TPersistable, TPersistable.Rule[]>();
}
Object.freeze(TPersistable.GetRules);
Object.freeze(TPersistable.RuleRepository);

export namespace TPersistable
{
    export const enum UpdateRule {WhereKeyOnly, WhereChanged, WhereAll}

    export interface Rule
    {
        Name: string;
        KeyProps: string[];
        Props: string[];

        UpdateRule: UpdateRule;
        NoUpdateKeyProps?: boolean;
    }

    export interface ValueMap
    {
        ToStorage: (PropValue: any) => TypeInfo.Primitive;
        ToObject: (FieldValue: TypeInfo.Primitive) =>  any;
    }
}

export namespace TPersistable
{
    export interface BeforePersist
    {
        BeforePersist(Transaction: any): Promise<void>;
    }

    export interface BeforeInsert
    {
        BeforeInsert(Transaction: any): Promise<void>;
    }

    export interface BeforeUpdate
    {
        BeforeUpdate(Transaction: any): Promise<void>;
    }

    export interface BeforeDelete
    {
        BeforeDelete(Transaction: any): Promise<void>;
    }

    export interface AfterPersist
    {
        AfterPersist(Transaction: any): Promise<void>;
    }

    export interface AfterInsert
    {
        AfterInsert(Transaction: any): Promise<void>;
    }

    export interface AfterUpdate
    {
        AfterUpdate(Transaction: any): Promise<void>;
    }

    export interface AfterDelete
    {
        AfterDelete(Transaction: any): Promise<void>;
    }
}
