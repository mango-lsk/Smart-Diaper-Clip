declare global
{
    type timeout_t = ReturnType<typeof setTimeout> | undefined;
    type interval_t = ReturnType<typeof setInterval> | undefined;
}

export namespace TypeInfo
{
    export type Primitive = string | number | boolean | undefined | null | symbol;
    export interface IndexSignature<T = any> { [Idx: string]: T;}

    export const UNDEFINED: string = typeof (void 0);
    export const BOOLEAN: string = typeof true;
    export const NUMBER: string = typeof 0;
    export const STRING: string = typeof '';
    export const OBJECT: string = typeof {};
    // tslint:disable-next-line:only-arrow-functions
    export const FUNCTION: string = typeof function() {};

    /** Returns true if the value Assigned (defined and not null) */
    // tslint:disable-next-line:ban-types
    export function Assigned(value?: any): value is Object
    {
        return (typeof value !== UNDEFINED) && (value !== null);
    }

    /** Returns true if the value defined */
    export function Defined(value?: any): value is undefined
    {
        return (typeof value !== UNDEFINED);
    }

    /** Returns true if the value is ture null */
    export function IsNull(value?: any): value is null
    {
        return (typeof value !== UNDEFINED) && (value === null);
    }

    /** Returns true if the value parameter is a true/false */
    export function IsBoolean(value: any): value is boolean
    {
        return typeof value === BOOLEAN;
    }

    /** Returns true if the value parameter is a number. */
    export function IsNumber(value: any, allowNaN: boolean = true): value is number
    {
        return typeof value === NUMBER && (allowNaN || ! isNaN(value));
    }

    /** Returns true if is a number and is NaN. */
    export function IsTrueNaN(value: any): value is number
    {
        return typeof value === NUMBER && isNaN(value);
    }

    /** Returns true if the value parameter is a string. */
    export function IsString(value: any): value is string
    {
        return typeof value === STRING;
    }

    /** Returns true if the value is a boolean, string, number, null, or undefined. */
    export function IsPrimitive(value: any): value is Primitive
    {
        switch (typeof value)
        {
        case BOOLEAN:
        case STRING:
        case NUMBER:
        case UNDEFINED:
            return true;
        case OBJECT:
            return value === null;

        default:
            return false;
        }
    }

    /** Returns true if the value parameter is an object. */
    export function IsObject(value: any, allowNull: boolean = false): value is object
    {
        return typeof value === OBJECT && (allowNull || null !== value);
    }

    /** Returns true if the value parameter is a function. */
    // tslint:disable-next-line:ban-types
    export function IsFunction(value: any): value is Function
    {
        return typeof value === FUNCTION;
    }

    export function IsArrayLike(value: any): value is Array<any>
    {
        /*
        * NOTE:
        *
        * Functions:
        * Enumerating a function although it has a .length property will yield nothing or unexpected results.
        * Effectively, a function is not like an array.
        *
        * Strings:
        * Behave like arrays but don't have the same exact methods.
        */
        return Assigned(value) && (
            (value instanceof Array) ||
            IsString(value) ||
            (! IsFunction(value) && HasMember(value, 'length'))
        );
    }

    /** Zero a numeric array */
    export type TArrayTypes = Array<number> | Int8Array | Uint8Array |
        Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array;

    export function ZeroArray(ary: TArrayTypes): void
    {
        if (Assigned(ary.fill))
        {
            ary.fill(0);
        }
        else
        {
            for (let I = 0; I < ary.length; I ++)
                ary[I] = 0;
        }
    }

    /** Generic Array Copy */
    export function ArrayCopy(Dst: TArrayTypes, Src: TArrayTypes,
        SrcOffset: number, Count: number, DstOffset: number = 0): void
    {
        if ((Src as any).subarray && (Dst as any).subarray)
        {
            (Dst as any).set((Src as any).subarray(SrcOffset, SrcOffset + Count), DstOffset);
        }
        // Fallback to ordinary array
        else
        {
            for (let i = 0; i < Count; i++)
            Dst[DstOffset + i] = Src[SrcOffset + i];
        }
    }

    /** Guarantees a number value or NaN instead. */
    export function NumberOrNaN(value: any): number
    {
        return isNaN(value) ? NaN : value;
    }

    export function HasMember(value: any, property: string): boolean
    {
        return Assigned(value) && ! IsPrimitive(value) && (property in value);
    }

    export function HasMemberOfType(instance: any, property: string, type: string): boolean
    {
        return HasMember(instance, property) && typeof(instance[property]) === type;
    }

    export function Create<T>(Creater: new (...args: any[]) => T, ...args: any[]): T
    {
        return new Creater(args);
    }

    /** get property Value */
    export function GetPropValue<T>(Obj: T, PropName: string): any
    {
        return (Obj as any)[PropName];
    }

    /** set property Value */
    export function SetPropValue<T>(Obj: T, PropName: string, PropValue: any)
    {
        (Obj as any)[PropName] = PropValue;
    }

/* Decorator */

    /**
     *  Class Decorator:
     *      seal class for futher extendion or add properties
     */
    // tslint:disable-next-line:ban-types
    export function Sealed(): Function
    {
        // tslint:disable-next-line:ban-types
        return (Cls: Function) =>
        {
            Object.seal(Cls);
            Object.seal(Cls.prototype);
        };
    }

    /**
     *  Class Decorator:
     *      static implements decorator
     *
     *      interface FooStatic
     *      {
     *          function bar();
     *      }
     *
     *      @StaticImplements<FooStatic>
     *      class Foo
     *      {
     *          static function bar() {};   // shows error if not implements this
     *      }
     */
    export function StaticImplements<T>()
    {
        return (constructor: T) => {};
    }
}
Object.freeze(TypeInfo);
