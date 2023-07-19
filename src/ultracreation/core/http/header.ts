import {TypeInfo} from '../typeinfo';

/* TGeneralHeader */
/**
 *  for more detail
 *      https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers
 *
 *      TODO: group header by reference
 */
declare global
{
    namespace Http
    {
        type Authroization = 'Basic' | 'Bearer' | 'Digest' | 'HOBA' | 'Mutual' | 'Negotiate' | 'OAuth' | 'SCRAM-SHA-1' | 'SCRAM-SHA-256' | 'vapid';
        type Method = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE' | 'PATCH';

        type EntityHeaders = keyof EntityHeader;
        type RequestHeaders = EntityHeaders | keyof RequestHeader;
        type ResponseHeaders = keyof ResponseHeader | EntityHeaders;

        interface GeneralHeader
        {
            Get(Name: string): string | undefined;
            Set(Name: string, Value: string): void;
            Delete(Name: string): void;

            /**
             *  .CORS-safelisted response-header
             *
             *  ## Cache request directives
             *      Cache-Control: max-age=<seconds>
             *      Cache-Control: max-stale[=<seconds>]
             *      Cache-Control: min-fresh=<seconds>
             *      Cache-Control: no-cache
             *      Cache-Control: no-store
             *      Cache-Control: no-transform
             *      Cache-Control: only-if-cached
             *
             *  ## Cache response directives
             *      Cache-Control: must-revalidate
             *      Cache-Control: no-cache
             *      Cache-Control: no-store
             *      Cache-Control: no-transform
             *      Cache-Control: public
             *      Cache-Control: private
             *      Cache-Control: proxy-revalidate
             *      Cache-Control: max-age=<seconds>
             *      Cache-Control: s-maxage=<seconds>
             *
             *  ## Extension Cache-Control directives
             *      Cache-Control: immutable
             *      Cache-Control: stale-while-revalidate=<seconds>
             *      Cache-Control: stale-if-error=<seconds>
             */
            'Cache-Control'?: string;

            /**
             *  ## Syntax
             *      Connection: keep-alive
             *      Connection: close
             */
            'Connection'?: 'keep-alive' | 'close';


            /**
             *  ## Syntax
             *      Date: <day-name>, <day> <month> <year> <hour>:<minute>:<second> GMT
             */
            'Date'?: string;
        }

        interface EntityHeader extends GeneralHeader
        {
            Get(Name: Http.EntityHeaders): string | undefined;
            Set(Name: Http.EntityHeaders, Value: string): void;
            Delete(Name: Http.EntityHeaders): void;

            /**
             *  ## Syntax
             *      Allow: <http-methods>
             */
            'Allow'?: string;

            /**
             *  ## Syntax
             *  ### As a response header for the main body
             *      Content-Disposition: inline
             *      Content-Disposition: attachment
             *      Content-Disposition: attachment; filename='filename.jpg'
             *  ### As a header for a multipart body
             *      Content-Disposition: form-data
             *      Content-Disposition: form-data; name='fieldName'
             *      Content-Disposition: form-data; name='fieldName'; filename='filename.jpg'
             */
            'Content-Disposition'?: string;

            /**
             *  ## Syntax
             *      Content-Encoding: gzip
             *      Content-Encoding: compress
             *      Content-Encoding: deflate
             *      Content-Encoding: identity
             *      Content-Encoding: br
             */
            'Content-Encoding'?: string;

            /**
             *  CORS-safelisted response-header
             *  CORS-safelisted request-header
             *
             *  Syntax
             *      Content-Language: de-DE
             *      Content-Language: en-US
             *      Content-Language: de-DE, en-CA
             */
            'Content-Language'?: string;

            /**
             *  Syntax
             *      Content-Length: <length>
             */
            'Content-Length'?: string;

            /**
             *  Syntax
             *      Content-Location: <url>
             */
            'Content-Location'?: string;

            /**
             *  CORS-safelisted response-header
             *
             *  Syntax
             *      Content-Type: text/html; charset=utf-8
             *      Content-Type: multipart/form-data; boundary=something
             */
            'Content-Type'?: string;

            /**
             *  Syntax
             *      Via: [ <protocol-name> "/" ] <protocol-version> <host> [ ":" <port> ]
             *      or
             *      Via: [ <protocol-name> "/" ] <protocol-version> <pseudonym>
             */
            'Via'?: string;
        }

        interface RequestHeader extends EntityHeader
        {
            Get(Name: Http.RequestHeaders): string | undefined;
            Set(Name: Http.RequestHeaders, Value: string): void;
            Delete(Name: Http.RequestHeaders): void;

            /**
             *  CORS-safelisted request-header
             *
             *  Syntax
             *      <MIME_type>/<MIME_subtype>
             *      <MIME_type>/*
             *  Multiple types, weighted with the quality value syntax:
             *  Accept: text/html, application/xhtml+xml, application/xml;q=0.9, * /*;q=0.8
             */
            'Accept'?: '*' | '*/*' | string;

            /**
             *  Multiple types, weighted with the quality value syntax:
             *  Accept-Charset: utf-8, iso-8859-1;q=0.5
             */
            'Accept-Charset'?: string;

            /**
             *  Syntax
             *      gzip, compress, deflate, br, identity, *
             *  Multiple algorithms, weighted with the quality value syntax:
             *  Accept-Encoding: deflate, gzip;q=1.0, *;q=0.5
             */
            'Accept-Encoding'?: '*' | string;

            /**
             *  CORS-safelisted request-header
             *  Syntax
             *      Accept-Language: <language>
             *      Accept-Language: <locale>
             *      Accept-Language: *
             *      Multiple types, weighted with the quality value syntax:
             *      Accept-Language: fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5
             */
            'Accept-Language'?: '*' | string;

            /**
             *  Syntax
             *      Access-Control-Request-TGeneralHeader: <header-name>, <header-name>, ...
             */
            'Access-Control-Request-TGeneralHeader'?: string;

            /**
             *  Syntax
             *      Access-Control-Request-Method: <method>
             */
            'Access-Control-Request-Method'?: string;

            /**
             *  Syntax
             *      Authorization: <type> <credentials>
             */
            'Authorization'?: string;

            /**
             *  Syntax
             *      Cookie: <cookie-list>
             *      Cookie: name=value
             *      Cookie: name=value; name2=value2; name3=value3
             */
            'Cookie'?: string;

            /**
             *   Obsolete
             */
            'Cookie2'?: string;

            /**
             *  (DNT)Do Not Track
             *
             *  Syntax
             *      DNT: 0
             *      DNT: 1
             */
            'DNT'?: '0' | '1';

            /**
             *  Syntax
             *      Expect: 100-continue
             */
            'Expect'?: string;

            /**
             *  Syntax
             *      Forwarded: by=<identifier>; for=<identifier>; host=<host>; proto=<http|https>
             */
            'Forwarded'?: string;

            /**
             *  Syntax
             *      From: <email>
             */
            'From'?: string;

            /**
             *  Syntax
             *      Host: <host>:<port>
             */
            'Host'?: string;

            /**
             *  Syntax
             *      If-Match: <etag_value>
             *      If-Match: <etag_value>, <etag_value>, …
             */
            'If-Match'?: string;

            /**
             *  Syntax
             *      If-Modified-Since: <day-name>, <day> <month> <year> <hour>:<minute>:<second> GMT
             */
            'If-Modified-Since'?: string;

            /**
             *  Syntax
             *      If-None-Match: <etag_value>
             *      If-None-Match: <etag_value>, <etag_value>, …
             *      If-None-Match: *
             */
            'If-None-Match'?: string;

            /**
             *  Syntax
             *      If-Range: <day-name>, <day> <month> <year> <hour>:<minute>:<second> GMT
             *      If-Range: <etag>
             */
            'If-Range'?: string;

            /**
             *  Syntax
             *      If-Unmodified-Since: <day-name>, <day> <month> <year> <hour>:<minute>:<second> GMT
             */
            'If-Unmodified-Since'?: string;

            /**
             *  Syntax
             *      Origin: ""
             *      Origin: <scheme> "://" <host> [ ":" <port> ]
             */
            'Origin'?: '' | string;

            /**
             *  Syntax
             *      Proxy-Authorization: <type> <credentials>
             */
            'Proxy-Authorization'?: string;

            /**
             *  Syntax
             *      Range: <unit> <range-start>-
             *      Range: <unit> <range-start>-<range-end>
             *      Range: <unit> <range-start>-<range-end>, <range-start>-<range-end>
             *      Range: <unit> <range-start>-<range-end>, <range-start>-<range-end>, <range-start>-<range-end>
             */
            'Range'?: string;

            /**
             *  Syntax
             *      Referer: <url>
             */
            'Referer'?: string;

            /**
             *  Syntax
             *      TE: compress
             *      TE: deflate
             *      TE: gzip
             *      TE: trailers
             *
             *  Multiple directives, weighted with the quality value syntax:
             *      TE: trailers, deflate;q=0.5
             */
            'TE'?: string;

            /**
             *  Syntax
             *      Upgrade-Insecure-Requests: 1
             */
            'Upgrade-Insecure-Requests'?: '1';

            /**
             *  Syntax
             *      User-Agent: <product> / <product-version> <comment>
             *
             *  Common format for web browsers:
             *      User-Agent: Mozilla/<version> (<system-information>) <platform> (<platform-details>) <extensions>
             */
            'User-Agent'?: string;

            /**
             *  General header
             *
             *  Syntax
             *      Warning: <warn-code> <warn-agent> <warn-text> [<warn-date>]
             */
            'Warning'?: string;

            /**
             *  Syntax
             *      X-Forwarded-For: <client>, <proxy1>, <proxy2>
             */
            'X-Forwarded-For'?: string;

            /**
             *  Syntax
             *      X-Forwarded-Host: <host>
             */
            'X-Forwarded-Host'?: string;

            /**
             *  Syntax
             *      X-Forwarded-Proto: <protocol>
             */
            'X-Forwarded-Proto'?: string;
        }

        interface ResponseHeader extends EntityHeader
        {
            Get(Name: Http.ResponseHeaders): string | undefined;
            Set(Name: Http.ResponseHeaders, Value: string): void;
            Delete(Name: Http.ResponseHeaders): void;

            /**
             *  Syntax
             *      Accept-Ranges: bytes
             *      Accept-Ranges: none
             */
            'Accept-Ranges'?: 'bytes' | 'none';

            /**
             *  Syntax
             *      Access-Control-Allow-Credentials: true
             */
            'Access-Control-Allow-Credentials'?: 'true';

            /**
             *  Syntax
             *      Access-Control-Allow-TGeneralHeader: <header-name>, <header-name>, ...
             */
            'Access-Control-Allow-TGeneralHeader'?: string;

            /**
             *  Syntax
             *      Access-Control-Allow-Methods: <method>, <method>, ...
             */
            'Access-Control-Allow-Methods'?: string;

            /**
             *  Syntax
             *      Access-Control-Allow-Origin: *
             *      Access-Control-Allow-Origin: <origin>
             */
            'Access-Control-Allow-Origin:'?: string;

            /**
             *  Syntax
             *      Access-Control-Expose-TGeneralHeader: <header-name>, <header-name>, ...
             */
            'Access-Control-Expose-TGeneralHeader'?: string;

            /**
             *  Syntax
             *      Access-Control-Max-Age: <delta-seconds>
             */
            'Access-Control-Max-Age'?: string;

            /**
             *  Syntax
             *      Age: <delta-seconds>
             */
            'Age'?: string;

            /**
             *  Syntax
             *      Content-Range: <unit> <range-start>-<range-end>/<size>
             *      Content-Range: <unit> <range-start>-<range-end>/*
             *      Content-Range: <unit> * /<size>
             */
            'Content-Range'?: string;

            /**
             *  Syntax
             *      Content-Security-Policy: <policy-directive>; <policy-directive>
             */
            'Content-Security-Policy'?: string;

            /**
             *  Syntax
             *      Content-Security-Policy-Report-Only: <policy-directive>; <policy-directive>
             */
            'Content-Security-Policy-Report-Only'?: string;

            /**
             *  Syntax
             *      ETag: W/"<etag_value>"
             *      ETag: "<etag_value>"
             */
            'ETag'?: string;

            /**
             *  Syntax
             *      Last-Modified: <day-name>, <day> <month> <year> <hour>:<minute>:<second> GMT
             */
            'Last-Modified'?: string;

            /**
             *  Syntax
             *      Location: <url>
             */
            'Location'?: string;

            /**
             *  Syntax
             *      Proxy-Authenticate: <type> realm=<realm>
             */
            'Proxy-Authenticate'?: string;

            /**
             *  Syntax
             *      Public-Key-Pins: pin-sha256="<pin-value>";
             *          max-age=<expire-time>;
             *          includeSubDomains;
             *          report-uri="<uri>"
             */
            'Public-Key-Pins'?: string;

            /**
             *  Syntax
             *      Public-Key-Pins-Report-Only: pin-sha256="<pin-value>";
             *          max-age=<expire-time>;
             *          includeSubDomains;
             *          report-uri="<uri>"
             */
            'Public-Key-Pins-Report-Only'?: string;

            /**
             *  Syntax
             *      Referrer-Policy: no-referrer
             *      Referrer-Policy: no-referrer-when-downgrade
             *      Referrer-Policy: origin
             *      Referrer-Policy: origin-when-cross-origin
             *      Referrer-Policy: same-origin
             *      Referrer-Policy: strict-origin
             *      Referrer-Policy: strict-origin-when-cross-origin
             *      Referrer-Policy: unsafe-url
             */
            'Referrer-Policy'?: string;

            /**
             *  Syntax
             *      Retry-After: <http-date>
             *      Retry-After: <delay-seconds>
             */
            'Retry-After'?: string;

            /**
             *  Syntax
             *      Server: <product>
             */
            'Server'?: string;

            /**
             *  Syntax
             *      Set-Cookie: <cookie-name>=<cookie-value>
             *      Set-Cookie: <cookie-name>=<cookie-value>; Expires=<date>
             *      Set-Cookie: <cookie-name>=<cookie-value>; Max-Age=<non-zero-digit>
             *      Set-Cookie: <cookie-name>=<cookie-value>; Domain=<domain-value>
             *      Set-Cookie: <cookie-name>=<cookie-value>; Path=<path-value>
             *      Set-Cookie: <cookie-name>=<cookie-value>; Secure
             *      Set-Cookie: <cookie-name>=<cookie-value>; HttpOnly
             *      Set-Cookie: <cookie-name>=<cookie-value>; SameSite=Strict
             *      Set-Cookie: <cookie-name>=<cookie-value>; SameSite=Lax
             *
             *  Multiple directives are also possible, for example:
             *      Set-Cookie: <cookie-name>=<cookie-value>; Domain=<domain-value>; Secure; HttpOnly
             */
            'Set-Cookie'?: string;

            /**
             *   Obsolete
             */
            'Set-Cookie2'?: string;

            /**
             *  Syntax
             *      SourceMap: <url>
             *      X-SourceMap: <url> (deprecated)
             */
            'SourceMap:'?: string;

            /**
             *  Syntax
             *      Strict-Transport-Security: max-age=<expire-time>
             *      Strict-Transport-Security: max-age=<expire-time>; includeSubDomains
             *      Strict-Transport-Security: max-age=<expire-time>; preload
             */
            'Strict-Transport-Security'?: string;

            /**
             *  Syntax
             *      Tk: !  (under construction)
             *      Tk: ?  (dynamic)
             *      Tk: G  (gateway or multiple parties)
             *      Tk: N  (not tracking)
             *      Tk: T  (tracking)
             *      Tk: C  (tracking with consent)
             *      Tk: P  (potential consent)
             *      Tk: D  (disregarding DNT)
             *      Tk: U  (updated)
             */
            'Tk'?: '!' | '?' | 'G' | 'N' | 'T' | 'C' | 'P' | 'D' | 'U';

            /**
             *  Syntax
             *      Trailer: header-names
             */
            'Trailer'?: string;

            /**
             *  Syntax
             *      Transfer-Encoding: chunked
             *      Transfer-Encoding: compress
             *      Transfer-Encoding: deflate
             *      Transfer-Encoding: gzip
             *      Transfer-Encoding: identity
             *
             *  Several values can be listed, separated by a comma
             *      Transfer-Encoding: gzip, chunked
             */
            'Transfer-Encoding'?: string;

            /**
             *  Syntax
             *      Vary: *
             *      Vary: <header-name>, <header-name>, ...
             */
            'Vary'?: '*' | string;

            /**
             *  Syntax
             *      WWW-Authenticate: <type> realm=<realm>
             */
            'WWW-Authenticate:'?: string;

            /**
             *  Syntax
             *      X-Content-Type-Options: nosniff
             */
            'X-Content-Type-Options'?: string;

            /**
             *  Syntax
             *      X-DNS-Prefetch-Control: on
             *      X-DNS-Prefetch-Control: off
             */
            'X-DNS-Prefetch-Control'?: 'on' | 'off';

            /**
             *  Syntax
             *      X-Frame-Options: DENY
             *      X-Frame-Options: SAMEORIGIN
             *      X-Frame-Options: ALLOW-FROM https://example.com/
             */
            'X-Frame-Options'?: string;

            /**
             *  Syntax
             *      X-XSS-Protection: 0
             *      X-XSS-Protection: 1
             *      X-XSS-Protection: 1; mode=block
             *      X-XSS-Protection: 1; report=<reporting-uri>
             */
            'X-XSS-Protection'?: string;
        }
    }
}

/* TGeneralHeader */

class TGeneralHeader implements Http.GeneralHeader
{
    Get(Name: string): string | undefined
    {
        if (['Get', 'Set', 'Delete'].includes(Name))
            return undefined;

        const Value = (this as any)[Name];
        if (TypeInfo.Assigned(Value))
            return Value.toString();

        // case-insensitive search
        const Keys = Object.keys(this);

        for (const iter of Keys)
        {
            if (iter.toLowerCase() === Name.toLowerCase())
                return (this as any)[iter];
        }
        return undefined;
    }

    Set(Name: string, Value: string): void
    {
        if (['Get', 'Set', 'Delete'].includes(Name))
            (this as any)[Name] = Value;
    }

    Delete(Name: string): void
    {
        if (['Get', 'Set', 'Delete'].includes(Name))
            delete (this as any)[Name];
    }
}

/* TEntityHeader */

class TEntityHeader extends TGeneralHeader implements Http.EntityHeader
{
    // nothing to implement
}

/* TRequestHeader */

export class TRequestHeader extends TEntityHeader implements Http.RequestHeader
{
    AssignTo(Dst: XMLHttpRequest, _Method: Http.Method)
    {
        const Keys = Object.keys(this);

        for (const key of Keys)
        {
            const value = this.Get(key);

            if (TypeInfo.Assigned(value))
                Dst.setRequestHeader(key, value);
        }
    }
}

/* TResponseHeader */

export class TResponseHeader extends TEntityHeader implements Http.ResponseHeader
{
}
