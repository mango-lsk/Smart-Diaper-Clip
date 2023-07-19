/**
 *  RandromSource
 *
 *  polyFillFunction of RandromSource:
 *      .priority use window.crypto, then require('crypto'),
 *      .falling back to Math.random() when everyting is unusable
 *
 *  *Note* Must calling RandromSource.Initialize() before use it
 */
import {TypeInfo} from './typeinfo';
import {TAsciiEncoding} from './encoding/ascii';

export namespace RandomSource
{
    export function Fill(ary: Uint8Array, Offset?: number, Count?: number): void
    {
        Initialize();
        FillFunction(ary, Offset, Count);
    }

    export function RandomString(Length: number): string
    {
        Initialize();

        const ary = new Uint8Array(Length);
        FillFunction(ary);

        // to visable characters
        for (let Idx = 0; Idx < ary.byteLength; Idx ++)
            ary[Idx] = (ary[Idx]) % 94 + 32;

        return TAsciiEncoding.Decode(ary);
    }

    /**
     *  generate a Uint32 random value
     */
    export function Generate(): number
    {
        Initialize();

        const ary = new Uint8Array(4);
        FillFunction(ary);

        return new Uint32Array(ary.buffer)[0];
    }

    declare var window: any;
    let Instance: any;
    let FillFunction: (ary: Uint8Array, Offset?: number, Count?: number) => void;

    function Initialize()
    {
        if (TypeInfo.Assigned(Instance))
            return;

        if (TypeInfo.UNDEFINED !== typeof window)
        {
            console.log('initialize randrom source using window.crypto');
            Instance = window.crypto || window.msCrypto;

            FillFunction = (ary, Offset?, Count?) =>
            {
                if (! TypeInfo.Assigned(Offset))
                    Offset = 0;
                if (! TypeInfo.Assigned(Count))
                    Count = ary.byteLength - Offset;

                if (Offset !== 0 || ary.length !== Count)
                    ary = new Uint8Array(ary.buffer, ary.byteOffset + Offset, Count);

                Instance.getRandomValues(ary);
            };
        }
        else if (TypeInfo.FUNCTION === typeof window.require)
        {
            const _require = window.require;
            console.log('initialize randrom source using reuire("crypto")');
            Instance = _require('crypto');

            FillFunction = (ary, Offset, Count) =>
                Instance.randomFillSync(ary, Offset, Count);
        }
        else
        {
            console.log('%cCrypto not usable...randrom source downto using Math.random()', 'color:red');

            FillFunction = (ary, Offset, Count) =>
            {
                if (! TypeInfo.Assigned(Offset))
                    Offset = 0;
                if (! TypeInfo.Assigned(Count))
                    Count = ary.byteLength - Offset;

                for (let i = Offset; i < Offset + Count; i++)
                    ary[i] = Math.random() * 256;
            };
        }
    }
}
