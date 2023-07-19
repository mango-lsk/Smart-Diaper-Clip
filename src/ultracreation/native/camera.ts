/**
 *  https://github.com/apache/cordova-plugin-camera
 *      cordova plugin add cordova-plugin-camera --save
 */
import {TCordovaPlugin} from './cordova.plugin';

declare global
{
    interface CordovaPlugins
    {
        Camera: typeof NativeCamera;
    }

/// modified from https://github.com/apache/cordova-plugin-camera/blob/master/types/index.d.ts
    // Camera constants, defined in Camera plugin
    namespace cordova.plugin.Camera
    {
        interface DestinationType
        {
            DATA_URL: number;
            FILE_URI: number;
            NATIVE_URI: number;
        }

        interface Direction
        {
            BACK: number;
            FRONT: number;
        }

        interface EncodingType
        {
            JPEG: number;
            PNG: number;
        }

        interface MediaType
        {
            PICTURE: number;
            VIDEO: number;
            ALLMEDIA: number;
        }

        interface PictureSourceType
        {
            PHOTOLIBRARY: number;
            CAMERA: number;
            SAVEDPHOTOALBUM: number;
        }

        // Used only on iOS
        interface PopoverArrowDirection
        {
            ARROW_UP: number;
            ARROW_DOWN: number;
            ARROW_LEFT: number;
            ARROW_RIGHT: number;
            ARROW_ANY: number;
        }

        /**
         * iOS-only parameters that specify the anchor element location and arrow direction
         * of the popover when selecting images from an iPad's library or album.
         */
        interface PopoverOptions
        {
            x: number;
            y: number;
            width: number;
            height: number;
            /**
             * Direction the arrow on the popover should point. Defined in Camera.PopoverArrowDirection
             * Matches iOS UIPopoverArrowDirection constants.
             *      ARROW_UP : 1,
             *      ARROW_DOWN : 2,
             *      ARROW_LEFT : 4,
             *      ARROW_RIGHT : 8,
             *      ARROW_ANY : 15
             */
            arrowDir: number;
            popoverWidth: number;
            popoverHeight: number;
        }

        interface Options
        {
            /** Picture quality in range 0-100. Default is 50 */
            quality?: number;
            /**
             * Choose the format of the return value.
             * Defined in navigator.camera.DestinationType. Default is FILE_URI.
             *      DATA_URL : 0,   Return image as base64-encoded string
             *      FILE_URI : 1,   Return image file URI
             *      NATIVE_URI : 2  Return image native URI
             *          (e.g., assets-library:// on iOS or content:// on Android)
             */
            destinationType?: number;
            /**
             * Set the source of the picture.
             * Defined in navigator.camera.PictureSourceType. Default is CAMERA.
             *      PHOTOLIBRARY : 0,
             *      CAMERA : 1,
             *      SAVEDPHOTOALBUM : 2
             */
            sourceType?: number;
            /** Allow simple editing of image before selection. */
            allowEdit?: boolean;
            /**
             * Choose the returned image file's encoding.
             * Defined in navigator.camera.EncodingType. Default is JPEG
             *      JPEG : 0    Return JPEG encoded image
             *      PNG : 1     Return PNG encoded image
             */
            encodingType?: number;
            /**
             * Width in pixels to scale image. Must be used with targetHeight.
             * Aspect ratio remains constant.
             */
            targetWidth?: number;
            /**
             * Height in pixels to scale image. Must be used with targetWidth.
             * Aspect ratio remains constant.
             */
            targetHeight?: number;
            /**
             * Set the type of media to select from. Only works when PictureSourceType
             * is PHOTOLIBRARY or SAVEDPHOTOALBUM. Defined in nagivator.camera.MediaType
             *      PICTURE: 0      allow selection of still pictures only. DEFAULT.
             *          Will return format specified via DestinationType
             *      VIDEO: 1        allow selection of video only, WILL ALWAYS RETURN FILE_URI
             *      ALLMEDIA : 2    allow selection from all media types
             */
            mediaType?: number;
            /** Rotate the image to correct for the orientation of the device during capture. */
            correctOrientation?: boolean;
            /** Save the image to the photo album on the device after capture. */
            saveToPhotoAlbum?: boolean;
            /**
             * Choose the camera to use (front- or back-facing).
             * Defined in navigator.camera.Direction. Default is BACK.
             *      FRONT: 0
             *      BACK: 1
             */
            cameraDirection?: number;
            /** iOS-only options that specify popover location in iPad. Defined in CameraPopoverOptions. */
            popoverOptions?: PopoverOptions;
        }

        /**
         * A handle to the popover dialog created by navigator.camera.getPicture. Used on iOS only.
         */
        interface CameraPopoverHandle
        {
            /**
             * Set the position of the popover.
             * @param popoverOptions the CameraPopoverOptions that specify the new position.
             */
            setPosition(popoverOptions: PopoverOptions): void;
        }
    }
}

class NativeCamera extends TCordovaPlugin
{
    static override readonly Name: string = 'camera';
    static override readonly Repository: string = 'cordova-plugin-camera';

    static get DefaultOptions(): cordova.plugin.Camera.Options
    {
        const options = {
            quality: 50,
            destinationType: this.DestinationType.FILE_URI,
            sourceType: this.PictureSourceType.SAVEDPHOTOALBUM,
            encodingType: this.EncodingType.JPEG,
            mediaType: this.MediaType.PICTURE,
            allowEdit: false,
            correctOrientation: true
        };
        return options;
    }

    // base64 encoded image or uri, If it's base64 (DATA_URL)
    static GetPicture(opt?: cordova.plugin.Camera.Options): Promise<string>
    {
        opt = Object.assign(opt, this.DefaultOptions, opt);
        return super.CallbackToPromise_RightParam<string>('getPicture', opt);
    }

    static get DestinationType(): cordova.plugin.Camera.DestinationType
    {
        return this.GetProperty('DestinationType');
    }

    static get Direction(): cordova.plugin.Camera.Direction
    {
        return this.GetProperty('Direction');
    }

    static get EncodingType(): cordova.plugin.Camera.EncodingType
    {
        return this.GetProperty('EncodingType');
    }

    static get MediaType(): cordova.plugin.Camera.MediaType
    {
        return this.GetProperty('MediaType');
    }

    static get PictureSourceType(): cordova.plugin.Camera.PictureSourceType
    {
        return this.GetProperty('PictureSourceType');
    }

    static get PopoverArrowDirection(): cordova.plugin.Camera.PopoverArrowDirection
    {
        return this.GetProperty('PopoverArrowDirection');
    }
}
TCordovaPlugin.Register(NativeCamera, 'Camera');
