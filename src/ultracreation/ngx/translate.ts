import {NgModule, Pipe, PipeTransform} from '@angular/core';
import {TypeInfo} from '../core/typeinfo';

declare var navigator: any;

declare global
{
    interface ITranslation
    {
        [Key: string]: string | string[] | ITranslation;
    }

    var Translate: (ident: string) => string;

    interface Window
    {
        Translate: (ident: string) => string;
    }
}
window.Translate = Translate;

export function Translate(ident: string): string
{
    return Translate.Get(ident);
}

export namespace Translate
{
    export const Languages = new Map<string, Map<string, string>>();

    export let LangId: string;
    export let FallbackLangId = 'en';

    let Curr: Map<string, string> | undefined;
    let Fallback: Map<string, string> | undefined;

    export function BrowserLanguage(): string
    {
        return (navigator.languages ? navigator.languages[0] :
            navigator.language || navigator.browserLanguage || navigator.userLanguage || 'en').toLowerCase();
    }

    export function AddLanguage(lang_id: string, trans: ITranslation): void
    {
        console.log(`%cLanguage added: ${lang_id}`, 'color:green');
        let BrowserLang = BrowserLanguage();

        let BrowserLangSub: string;
        let Lang, LangSub: string;

        if (BrowserLang.includes('-'))
        {
            const Lines = BrowserLang.split('-');

            BrowserLang = Lines[0];
            BrowserLangSub = Lines[1].toLowerCase();
        }
        else if (BrowserLang.includes('_'))
        {
            const Lines = BrowserLang.split('_');

            BrowserLang = Lines[0];
            BrowserLangSub = Lines[1].toLowerCase();
        }
        else
            BrowserLangSub = BrowserLang;

        if (lang_id.includes('-'))
        {
            const Lines = lang_id.split('-');

            Lang = Lines[0];
            LangSub = Lines[1].toLowerCase();
        }
        else
            Lang = LangSub = lang_id;

        let hash = Languages.get(Lang);

        if (!TypeInfo.Assigned(hash))
        {
            hash = new Map<string, string>();
            Languages.set(lang_id, hash);

            if (!TypeInfo.Assigned(Fallback))
            {
                FallbackLangId = Lang;
                LangId = Lang;

                Fallback = hash;
                Curr = hash;
            }
        }

        if (Lang === BrowserLang)
        {
            if (LangSub === BrowserLangSub || Lang === LangSub)
            {
                LangId = lang_id;
                Curr = hash;

                console.log(`%cLanguage default: ${lang_id}`, 'color:lightgreen');
            }
        }

        RecursiveTransId(trans, '');

        // tslint:disable-next-line:no-shadowed-variable
        function RecursiveTransId(trans: ITranslation, key_prefix = ''): void
        {
            for (const key of Object.keys(trans))
            {
                const value = trans[key];

                if (value instanceof Array)
                {
                    for (let idx = 0; idx < value.length; idx++)
                    {
                        const trans_id = '' === key_prefix ? `${key}.${idx}` : `${key_prefix}.${key}.${idx}`;
                        hash!.set(trans_id, value[idx]);
                    }
                }
                else if (TypeInfo.IsString(value))
                {
                    const trans_id = '' === key_prefix ? key : `${key_prefix}.${key}`;
                    hash!.set(trans_id, value);
                }
                else
                    RecursiveTransId(value, key);
            }
        }
    }

    export function SetLanguage(lang_id: string, fallback_lang_id?: string): void
    {
        const lang = Languages.get(lang_id);

        if (TypeInfo.Assigned(lang))
        {
            LangId = lang_id;
            Curr = lang;
        }

        if (TypeInfo.Assigned(fallback_lang_id))
        {
            const fallback_lang = Languages.get(fallback_lang_id);

            if (TypeInfo.Assigned(fallback_lang))
            {
                FallbackLangId = fallback_lang_id;
                Fallback = fallback_lang;
            }
        }
    }

    export function Get(ident: string): string
    {
        let value = Curr ?.get(ident);

        if (! TypeInfo.Assigned(value) && Curr !== Fallback)
            value = Fallback ?.get(ident);

        if (TypeInfo.Assigned(value))
            return value;
        else
            return ident;
    }
}

@Pipe({name: 'translate'})
export class TranslatePipe implements PipeTransform
{
    transform(ident: string): string
    {
        return Translate.Get(ident);
    }
}

@NgModule({
    declarations: [
        TranslatePipe
    ],
    exports: [
        TranslatePipe
    ]
}
)
export class TranslateModule
{
}
