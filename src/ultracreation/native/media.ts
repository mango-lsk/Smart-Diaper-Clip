/**
 *  Cordova native media plugin
 *      https://github.com/apache/cordova-plugin-media
 *      cordova plugin add cordova-plugin-media
 *
 *  Add the tag in config.xml for iOS permission
 *      <edit-config target="NSMicrophoneUsageDescription" file="*-Info.plist" mode="merge">
 *          <string>need microphone access to record sounds</string>
 *      </edit-config>
 *
 *  dependency:
 *      https://github.com/apache/cordova-plugin-file
 */
import {Subject} from 'rxjs';
import {TypeInfo} from '../core/typeinfo';
import {TCordovaPlugin} from './cordova.plugin';

import './file';

declare global
{
    interface CordovaPlugins
    {
        Media: typeof NativeMedia;
    }
}

/**
 * This plugin provides the ability to record and play back audio files on a device.
 * NOTE: The current implementation does not adhere to a W3C specification for media capture,
 * and is provided for convenience only. A future implementation will adhere to the latest
 * W3C specification and may deprecate the current APIs.
 */
interface Media
{
    /**
     * Releases the underlying operating system's audio resources. This is particularly important
     * for Android, since there are a finite amount of OpenCore instances for media playback.
     * Applications should call the release function for any Media resource that is no longer needed.
     */
    release(): void;

    /**
     * Returns the current amplitude within an audio file.
     * @param mediaSuccess The callback that is passed the current amplitude (0.0 - 1.0).
     * @param mediaError   The callback to execute if an error occurs.
     */
    getCurrentAmplitude(
        mediaSuccess: (amplitude: number) => void,
        mediaError?: (error: MediaError) => void): void;

    /**
     * Returns the current position within an audio file. Also updates the Media object's position parameter.
     * @param mediaSuccess The callback that is passed the current position in seconds.
     * @param mediaError   The callback to execute if an error occurs.
     */
    getCurrentPosition(
        mediaSuccess: (position: number) => void,
        mediaError?: (error: MediaError) => void): void;

    /** Returns the duration of an audio file in seconds. If the duration is unknown, it returns a value of -1. */
    getDuration(): number;

    /**
     * Starts or resumes playing an audio file.
     * @param iosPlayOptions: iOS options quirks
     */
    play(iosPlayOptions?: IosPlayOptions): void;
    /** Pauses playing an audio file. */
    pause(): void;

    /** Stops playing an audio file. */
    stop(): void;

    /**
     * Sets the current position within an audio file.
     * @param position Position in milliseconds.
     */
    seekTo(position: number): void;

    /**
     * Set the volume for an audio file.
     * @param volume The volume to set for playback. The value must be within the range of 0.0 to 1.0.
     */
    setVolume(volume: number): void;

    /** Starts recording an audio file. */
    startRecord(): void;

    /** Stops recording an audio file. */
    stopRecord(): void;

    /**
     * The position within the audio playback, in seconds.
     * Not automatically updated during play; call getCurrentPosition to update.
     */
    position: number;

    /** The duration of the media, in seconds. */
    duration: number;
}

interface MediaContructor
{
    new (src: string, mediaSuccess: () => void, mediaError?: (error: MediaError) => any,
        mediaStatus?: (status: number) => void): Media;

    // Media statuses
    MEDIA_NONE: number;
    MEDIA_STARTING: number;
    MEDIA_RUNNING: number;
    MEDIA_PAUSED: number;
    MEDIA_STOPPED: number;
}

declare var Media: MediaContructor;

/**
 *  iOS optional parameters for media.play
 *  See https://github.com/apache/cordova-plugin-media#ios-quirks
 */
interface IosPlayOptions
{
    numberOfLoops?: number;
    playAudioWhenScreenIsLocked?: boolean;
}

class NativeMedia extends TCordovaPlugin
{
    static override readonly Name: string = 'Media';
    static override readonly Repository: string = 'cordova-plugin-media';

    static OnPlayState = new Subject<number>();
    static OnRecordState = new Subject<number>();

    static PlayStat = 0;
    static RecordStat = 0;

    static async Play(url: string)
    {
        if (TypeInfo.Assigned(this.NativePlayer))
        {
            if (url === this.PlayingUrl)
            {
                if (this.PlayStat !== Media.MEDIA_PAUSED)
                    this.NativePlayer.seekTo(1); // 0 is not valid
                this.NativePlayer.play();
                return;
            }
            else
                this.Stop();
        }

        return new Promise<void>(async (resolve, reject) =>
        {
            this.PlayingUrl = url;

            if (this.Platform.IsAndroid)
            {
                const MediaFile = await cordova.plugin.File.ResovleLocalFileSystemURL(url);
                url = MediaFile.nativeURL;
            }
            else if (this.Platform.IsiOS)
            {
                if (url.toLocaleLowerCase().includes('/temporary/'))
                    url = 'cdvfile://localhost/temporary/' + this.ParseName(url);
                else if (url.toLocaleLowerCase().includes('/documents/'))
                    url = 'cdvfile://localhost/documents/' + this.ParseName(url);
            }
            console.log('play: ' + url);
            this.NativePlayer = new Media(url, resolve, reject,
                (stat) =>
                {
                    console.log('native player stat: ' + stat);
                    this.PlayStat = stat;
                    this.OnPlayState.next(stat);
                });

            this.NativePlayer.play();
        });
    }

    static Pause()
    {
        if (TypeInfo.Assigned(this.NativePlayer))
            this.NativePlayer.pause();
    }

    static Stop()
    {
        if (TypeInfo.Assigned(this.NativePlayer))
        {
            this.NativePlayer.stop();
            this.NativePlayer.release();
        }

        this.NativePlayer = undefined;
        this.PlayingUrl = undefined;
    }

    static get IsRecording(): boolean
    {
        return TypeInfo.Assigned(this.RecordingPromise);
    }

    static StartRecord(timeout: number = -1): Promise<Blob>
    {
        if (TypeInfo.Assigned(this.StopRecordTimer))
            clearTimeout(this.StopRecordTimer);

        if (timeout > 0)
            this.StopRecordTimer = setTimeout(() => this.StopRecord(), timeout);

        if (!TypeInfo.Assigned(this.RecordingPromise))
        {
            if (this.Platform.IsAndroid || this.Platform.IsiOS)
                this.RecordingPromise = this.RecordingWithNative();
            else
                this.RecordingPromise = this.RecordingWithWeb();

            this.RecordingPromise
                .catch(err => console.error(err))
                .then(() => {this.RecordingPromise = undefined;});
        }

        // const audiodata = await this.Recording;
        // return {data: audiodata, duration: this.RecordDuration, wrapper: this.AudioWrapper};
        return this.RecordingPromise;
    }

    static StopRecord(): void
    {
        if (TypeInfo.Assigned(this.StopRecordTimer))
            clearTimeout(this.StopRecordTimer);

        if (TypeInfo.Assigned(this.NativeRecorder))
        {
            // when stop too fast, it will fail to stop
            if (this.RecordDuration < 500)
                this.StopRecordTimer = setTimeout(() => this.NativeRecorder?.stopRecord(), 500 - this.RecordDuration);
            else
                this.NativeRecorder.stopRecord();
        }

        if (TypeInfo.Assigned(this.WebRecorder))
        {
            this.WebRecorder.stop();
            this.WebRecorder = undefined;
        }
    }

    static get AudioWrapper(): string
    {
        if (this.Platform.IsAndroid)
            return 'aac';
        else if (this.Platform.IsiOS)
            return 'm4a';
        else
            return 'wav';
    }

    // millisecond
    static get RecordDuration(): number
    {
        if (this.RecordStat === Media.MEDIA_RUNNING)
            return Date.now() - this.RecordStartDT.getTime();
        else
            return this.RecordStopDT.getTime() - this.RecordStartDT.getTime();
    }

    private static RecordingWithNative(): Promise<Blob>
    {
        return new Promise<Blob>((resolve, reject) =>
        {
            const dir = this.Platform.IsAndroid ? cordova.plugin.File.cacheDirectory : 'cdvfile://localhost/temporary';
            const src = dir + '/recording.' + this.AudioWrapper;
            this.NativeRecorder = new Media(src,
                () =>
                {
                    // cordova.plugin.File.ReadAsArrayBuffer(src)
                    //     .then((buf) =>
                    //     {
                    //         console.log('recorded sucess: ' + buf.byteLength + 'bytes');
                    //         const blob = new Blob([new Uint8Array(buf)], {type: 'audio/aac'});
                    //         resolve(blob);
                    //     })
                    //     .catch((err) => reject(err));
                    cordova.plugin.File.ToFile(src).then(resolve).catch(reject);
                },
                reject,
                (stat) =>
                {
                    this.RecordStat = stat;
                    if (stat === Media.MEDIA_RUNNING)
                    {
                        console.log('record running...');
                        this.RecordStartDT = new Date();
                    }
                    else if (stat === Media.MEDIA_STOPPED)
                    {
                        console.log('record stopped!');
                        this.RecordStopDT = new Date();
                        this.NativeRecorder = undefined;
                    }

                    this.OnRecordState.next(stat);
                });

            this.NativeRecorder.startRecord();
        });
    }

    private static async RecordingWithWeb(): Promise<Blob>
    {
        if (!TypeInfo.Assigned(navigator.mediaDevices) || !TypeInfo.Assigned(navigator.mediaDevices.getUserMedia))
            return Promise.reject('No usermedia');

        const stream = await navigator.mediaDevices.getUserMedia({audio: true});
        this.WebRecorder = new MediaRecorder(stream);
        return new Promise<Blob>((resolve, reject) =>
        {
            this.WebRecorder?.addEventListener('dataavailable', (ev) =>
            {
                resolve((ev as BlobEvent).data);
            });

            this.WebRecorder?.addEventListener('error', (err) =>
            {
                reject(err);
            });
            this.WebRecorder?.start();
        });
    }

    private static ParseName(Path: string)
    {
        if (Path.includes('/'))
            return Path.substring(Path.lastIndexOf('/') + 1).trim();
        else
            return Path.trim();
    }

    private static PlayingUrl: string | undefined;
    private static NativePlayer: Media | undefined;

    private static NativeRecorder: Media | undefined;
    private static WebRecorder: MediaRecorder | undefined;
    private static RecordingPromise: Promise<Blob> | undefined;

    private static RecordStartDT = new Date();
    private static RecordStopDT = new Date();
    private static StopRecordTimer: any;
}
TCordovaPlugin.Register(NativeMedia, 'Media');
