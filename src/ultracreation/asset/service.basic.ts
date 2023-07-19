import {TypeInfo} from '../core/typeinfo';
import {THttpClient} from '../core/http';
import {Translate} from '../ngx/translate';
import {TNgxApplication} from '../ngx/application';

declare global
{
    var StaticConfig: IStaticConfig;

    interface Window
    {
        StaticConfig: IStaticConfig | undefined;
    }

    interface IStaticConfig
    {
        [Name: string]: any;

        PATH_ASSETS: string;
        PATH_TRANSLATE: string;
        PATH_IMG: string;
        PATH_SVG: string;
    }
}

window.StaticConfig = {
    PATH_ASSETS: '',
    PATH_TRANSLATE: 'i18n/',
    PATH_IMG: 'img/',
    PATH_SVG: 'svg/',
} as any;

/**
 *  TBasicAssetService provide static file service
 */
export class TBasicAssetService
{
    constructor(App: TNgxApplication)
    {
        App.RegisterInitializer(this, async () =>
        {
            console.log(`%cWebView language detected: ${Translate.BrowserLanguage()}`, 'color:lightgreen');
            const static_config = await this.LoadStaticFile('static_config.json', 'json');

            window.StaticConfig = Object.assign(window.StaticConfig, static_config);
        });
    }

    async AddLanguage(LangId: string, FileName?: string): Promise<void>
    {
        const path = TypeInfo.Assigned(FileName) ?
            `${StaticConfig.PATH_TRANSLATE}${LangId.replace('-', '/')}/${FileName}` : `${StaticConfig.PATH_TRANSLATE}${LangId}.json`;

        return THttpClient.Get<ITranslation>(path, 'json')
            .then(trans => Translate.AddLanguage(LangId, trans))
            .catch(err => {});
    }

    LoadStaticFile(FileName: string, ResponseType: XMLHttpRequestResponseType, Path?: string): Promise<any>
    {
        if (! TypeInfo.Assigned(Path))
            Path = StaticConfig.PATH_ASSETS;

        const Http = new THttpClient(ResponseType, Path);
        return Http.Get(FileName).WaitFor().then(res => res?.Content);
    }

    LoadTranslation(FileName: string, Lang?: string): Promise<string | object>
    {
        let Fmt: XMLHttpRequestResponseType;
        if (FileName.endsWith('.html'))
            Fmt = 'text';
        else
            Fmt = 'json';

        if (! TypeInfo.Assigned(Lang))
            Lang = Translate.LangId.replace('-', '/');

        // load current lang translation error...fallback to local
        return this.LoadStaticFile(FileName, Fmt, StaticConfig.PATH_TRANSLATE + Lang).catch(err =>
        {
            // lang translation not exists...fallback to english
            if (Lang !== Translate.FallbackLangId)
                return this.LoadStaticFile(FileName, Fmt, StaticConfig.PATH_TRANSLATE + Translate.FallbackLangId);
            else
                return Promise.reject(err);
        });
    }
}
