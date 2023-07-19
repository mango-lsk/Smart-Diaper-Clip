import {TUtf8Encoding} from './utf8';
import {TBase64Encoding} from './base64';
import {TAsciiEncoding} from './ascii';

export namespace Encoding
{
    export const ASCII = TAsciiEncoding;
    export const Utf8 = TUtf8Encoding;
    export const Base64 = TBase64Encoding;
}
