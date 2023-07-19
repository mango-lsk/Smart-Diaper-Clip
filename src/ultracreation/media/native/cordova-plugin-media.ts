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
import {ENotSupported, TypeInfo} from '../../core';
import {TCordovaPlugin} from '../../native/cordova.plugin';
import '../../native/file';

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

export class NativeMedia extends TCordovaPlugin
{
    static override readonly Name: string = 'Media';
    static override readonly Repository: string = 'cordova-plugin-media';

    static GetAudioRecorder(): MediaRecorder
    {
        return new TAudioRecorder();
    }
}

class TAudioRecorder extends EventTarget implements MediaRecorder
{
    constructor()
    {
        super();
    }

    get audioBitsPerSecond(): number
    {
        return 0;
    }

    get mimeType(): string
    {
        return 'mp3';
    }

    get state(): RecordingState
    {
        return 'inactive';
    }

    get stream(): MediaStream
    {
        throw new ENotSupported();
    }

    get videoBitsPerSecond(): number
    {
        return 0;
    }

    start(timeslice?: number): void
    {
    }

    stop(): void
    {
    }

    pause(): void
    {
    }

    resume(): void
    {
    }

    requestData(): void
    {
    }

    get ondataavailable()
    {
        return this._ondataavailable;
    }

    set ondataavailable(handler: ((this: MediaRecorder, ev: BlobEvent) => any) | null)
    {
        if (TypeInfo.Assigned(handler))
            super.addEventListener('dataavailable', ev => this._ondataavailable);
        else
            super.addEventListener('dataavailable', handler);
    }
    private _ondataavailable: ((this: MediaRecorder, ev: BlobEvent) => any) | null = null;

    onerror: ((this: MediaRecorder, ev: MediaRecorderErrorEvent) => any) | null = null;
    onpause: ((this: MediaRecorder, ev: Event) => any) | null = null;
    onresume: ((this: MediaRecorder, ev: Event) => any) | null = null;
    onstart: ((this: MediaRecorder, ev: Event) => any) | null = null;
    onstop: ((this: MediaRecorder, ev: Event) => any) | null = null;

    override addEventListener<K extends keyof MediaRecorderEventMap>(type: K, listener: (this: MediaRecorder, ev: MediaRecorderEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    override addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void
    {
        return super.addEventListener(type, listener, options);
    }

    override removeEventListener<K extends keyof MediaRecorderEventMap>(type: K, listener: (this: MediaRecorder, ev: MediaRecorderEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    override removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void
    {
        return super.removeEventListener(type, listener, options);
    }

    // private Instance?: Media;
}
