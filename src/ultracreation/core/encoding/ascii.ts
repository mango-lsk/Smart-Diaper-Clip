import {TypeInfo} from '../typeinfo';
import {EEncoding} from '../exception';

export class EInvalidAscii extends EEncoding
{
}

export class TAsciiEncoding
{
    static Encode(Str: string, Start = 0, End?: number): Uint8Array
    {
        if (! TypeInfo.Assigned(Str) || Str.length === 0)
            End = Start;
        else if (! TypeInfo.Assigned(End) || End > Str.length)
            End = Str.length;

        const buf = new Uint8Array(End - Start);

        for (let I = Start; I < End; I ++)
        {
            const c = Str.charCodeAt(I);
            if (c > 0x7F)
                throw new EInvalidAscii();

            buf[I] = c;
        }
        return buf;
    }

    static Decode(buf: Uint8Array, Start = 0, End?: number): string
    {
        if (! TypeInfo.Assigned(End) || End > buf.byteLength)
            End = buf.byteLength;

        let RetVal = '';

        for (let I = Start; I < End; I ++)
        {
            const c = buf[I];
            if (c > 0x7F) continue;
            /*
            if (c > 0x7F)
                throw new EInvalidAscii();
            */

            RetVal += String.fromCharCode(c);
        }
        return RetVal;
    }
}

/**
 *  ASCII / ISO 8859-1 (Latin-1) Table with HTML Entity Names
 *      https://cs.stanford.edu/people/miles/iso8859.html
 */
export namespace TAsciiEncoding
{
    /** Null char */
    export const NUL = 0;
    /** Start of Heading */
    export const SOH = 1;
    /** Start of Text */
    export const STX = 2;
    /** End of Text */
    export const ETX = 3;
    /** End of Transmission */
    export const EOT = 4;
    /** Enquiry */
    export const ENQ = 5;
    /** Acknowledgment */
    export const ACK = 6;
    /** Bell */
    export const BEL = 7;
    /** Back Space */
    export const BS = 8;
    /** Horizontal Tab */
    export const HT = 9;
    /** Line Feed */
    export const LF = 10;
    /** Vertical Tab */
    export const VT = 11;
    /** Form Feed */
    export const FF = 12;
    /** Carriage Return */
    export const CR = 13;
    /** Shift Out / X-On */
    export const SO = 14;
    /** Shift In / X-Off */
    export const SI = 15;
    /** Data Line Escape */
    export const DLE = 16;
    /** Device Control 1 (oft. XON) */
    export const DC1 = 17;
    /** Device Control 2 */
    export const DC2 = 18;
    /** Device Control 3 (oft. XOFF) */
    export const DC3 = 19;
    /** Device Control 4 */
    export const DC4 = 20;
    /** Negative Acknowledgement */
    export const NAK = 21;
    /** Synchronous Idle */
    export const SYN = 22;
    /** End of Transmit Block */
    export const ETB = 23;
    /** Cancel */
    export const CAN = 24;
    /** End of Medium */
    export const EM = 25;
    /** Substitute */
    export const SUB = 26;
    /** Escape */
    export const ESC = 27;
    /** File Separator */
    export const FS = 28;
    /** Group Separator */
    export const GS = 29;
    /** Record Separator */
    export const RS = 30;
    /** Unit Separator */
    export const US = 31;

    export const Space = 32;
    /** ! */
    export const Exclamation = 33;
    /** " */
    export const DoubleQuotes = 34;
    /** # */
    export const NumberSign = 35;
    /** $ */
    export const Dollar = 36;
    /** % */
    export const Percent = 37;
    /** & */
    export const Ampersand = 38;
    /** ' */
    export const SingleQuote = 39;
    /** ( */
    export const LeftParenthesis = 40;
    /** ) */
    export const RightParenthesis = 41;
    /** * */
    export const Asterik = 42;
    /** + */
    export const Plus = 43;
    /** ; */
    export const Comma = 44;
    /** - */
    export const Minus = 45;
    /** . */
    export const Period = 46;
    /** / */
    export const Divide = 47;

    /** 0 ~ 9 */
    export const Zero = 48;
    export const One = 49;
    export const Two = 50;
    export const Three = 51;
    export const Four = 52;
    export const Five = 53;
    export const Six = 54;
    export const Seven = 55;
    export const Eight = 56;
    export const Nine = 57;

    /** : */
    export const Colon = 58;
    /** ; */
    export const Semicolon = 59;
    /** < */
    export const LessThan = 60;
    /** = */
    export const Equality = 61;
    /** > */
    export const GreaterThan = 62;
    /** ? */
    export const Question = 63;
    /** @ */
    export const At = 64;

    export const UPPER_A = 65;   // A~Z
    export const UPPER_B = 66;
    export const UPPER_C = 67;
    export const UPPER_D = 68;
    export const UPPER_E = 69;
    export const UPPER_F = 70;
    export const UPPER_G = 71;
    export const UPPER_H = 72;
    export const UPPER_I = 73;
    export const UPPER_J = 74;
    export const UPPER_K = 75;
    export const UPPER_L = 76;
    export const UPPER_M = 77;
    export const UPPER_N = 78;
    export const UPPER_O = 79;
    export const UPPER_P = 80;
    export const UPPER_Q = 81;
    export const UPPER_R = 82;
    export const UPPER_S = 83;
    export const UPPER_T = 84;
    export const UPPER_U = 85;
    export const UPPER_V = 86;
    export const UPPER_W = 87;
    export const UPPER_X = 88;
    export const UPPER_Y = 89;
    export const UPPER_Z = 90;

    /** [ */
    export const LeftSquareBracket = 91;
    /** \ */
    export const Backslash = 92;
    /** ] */
    export const RightSquareBracket = 93;
    /** ^ */
    export const Circumflex = 94;
    /** _ */
    export const Underscore = 95;
    /** ` */
    export const Accent = 96;

    export const LOWER_A = 97;   // a~z
    export const LOWER_B = 98;
    export const LOWER_C = 99;
    export const LOWER_D = 100;
    export const LOWER_E = 101;
    export const LOWER_F = 102;
    export const LOWER_G = 103;
    export const LOWER_H = 104;
    export const LOWER_I = 105;
    export const LOWER_J = 106;
    export const LOWER_K = 107;
    export const LOWER_L = 108;
    export const LOWER_M = 109;
    export const LOWER_N = 110;
    export const LOWER_O = 111;
    export const LOWER_P = 112;
    export const LOWER_Q = 113;
    export const LOWER_R = 114;
    export const LOWER_S = 115;
    export const LOWER_T = 116;
    export const LOWER_U = 117;
    export const LOWER_V = 118;
    export const LOWER_W = 119;
    export const LOWER_X = 120;
    export const LOWER_Y = 121;
    export const LOWER_Z = 122;

    /** { */
    export const LeftBrace = 123;
    /** | */
    export const VerticalBar = 124;
    /** } */
    export const RightBrace = 125;
    /** ~ */
    export const Tidle = 126;
    /** DEL */
    export const Delete = 127
}
