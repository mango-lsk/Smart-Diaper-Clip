/**
 *  https://github.com/terikon/cordova-plugin-photo-library
 *      cordova plugin add cordova-plugin-photo-library --variable PHOTO_LIBRARY_USAGE_DESCRIPTION="<description>" --save
 */

import {TypeInfo} from '../core/typeinfo';
import {Observable, Subscriber} from 'rxjs';
import {TCordovaPlugin} from './cordova.plugin';

declare var window: any;

declare global
{
    namespace cordova.plugin
    {
        interface Album
        {
            id: string;
            title: string;
        }

        namespace Album
        {
            /// https://github.com/terikon/cordova-plugin-photo-library/blob/master/PhotoLibrary.d.ts
            interface PhotoLibrary
            {
                id: string;
                photoURL: string;
                thumbnailURL: string;
                fileName: string;
                width: number;
                height: number;
                creationDate: Date;
                latitude?: number;
                longitude?: number;
                albumIds?: string[];
            }

            interface PhotoLibraryOptions
            {
                thumbnailWidth?: number;
                thumbnailHeight?: number;
                quality?: number;
                itemsInChunk?: number;
                chunkTimeSec?: number;
                useOriginalFileNames?: boolean;
                includeImages?: boolean;
                includeAlbumData?: boolean;
                includeCloudData?: boolean;
                includeVideos?: boolean;
                maxItems?: number;
            }

            interface RequestAuthorizationOptions
            {
                read?: boolean;
                write?: boolean;
            }

            interface ThumbnailOptions
            {
                thumbnailWidth?: number;
                thumbnailHeight?: number;
                quality?: number;
            }

            // tslint:disable-next-line:no-empty-interface
            interface GetPhotoOptions
            {
            }
        }
    }
}

class NativeAlbum extends TCordovaPlugin
{
    static override readonly Name: string = 'photoLibrary';
    static override readonly Repository: string = 'cordova-plugin-photo-library';

    static IsAuthorized(): Promise<boolean>
    {
        return super.CallbackToPromise('isAuthorized');
    }

    static RequestAuthorization(write?: true): Promise<boolean>
    {
        const opt = {read: true, write: TypeInfo.Assigned(write)};
        return super.CallbackToPromise_RightParam('requestAuthorization', {opt});
    }

    static Libraries(opt?: cordova.plugin.Album.PhotoLibraryOptions): Observable<cordova.plugin.Album.PhotoLibrary>
    {
        function GetLibraryLoop(obs: Subscriber<cordova.plugin.Album.PhotoLibrary>): void
        {
            window.cordova.plugins.photoLibrary.getLibrary(
                (chunk: {library: cordova.plugin.Album.PhotoLibrary[], isLastChunk: boolean}) =>
                {
                    chunk.library.forEach(iter => obs.next(iter));

                    if (chunk.isLastChunk)
                    {
                        obs.complete();
                        console.log('getLibrary completed.');
                    }
                    else
                        setTimeout(() => GetLibraryLoop(obs));
                },
                (err: any) =>
                {
                    console.log(err);
                    obs.error(err);
                }, opt);
        }
        return new Observable(obs => GetLibraryLoop(obs));
    }

    static List(): Promise<Array<cordova.plugin.Album>>
    {
        return super.CallbackToPromise<Array<cordova.plugin.Album>>('getAlbums');
    }
}

declare global
{
    interface CordovaPlugins
    {
        Album: typeof NativeAlbum;
    }
}
TCordovaPlugin.Register(NativeAlbum, 'Album');
