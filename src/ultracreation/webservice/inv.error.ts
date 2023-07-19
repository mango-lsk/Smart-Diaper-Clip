import {TypeInfo} from '../core/typeinfo';
import {Exception, EAbort} from '../core/exception';

/** InvError */

export class InvError extends Exception
{
    constructor(Message?: string, Status?: number)
    {
        super(Message);
        this.Status = Status;
    }

    Status?: number;
}

/** InvAbort */

export class EInvAbort extends EAbort
{
    constructor(Message?: string, Status?: number)
    {
        super(Message);
        this.Status = Status;
    }

    Status?: number;
}

/** HTTP status codes
 *      https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
 *      https://github.com/metosin/ring-http-response/blob/master/dev/user.clj
 */

/** 3xx redirection */

export class InvBaseRedirection extends EInvAbort
{
    constructor(Status: number, URL?: string)
    {
        super(URL, Status);
    }
}

export class EInvRedirect extends InvBaseRedirection
{
    constructor(URL: string)
    {
        super(301, URL);
    }
}

export class EInvNotModified extends InvBaseRedirection
{
    constructor()
    {
        super(304);
    }
}

/** 4xx client errors */

export namespace InvClientError
{
    /* 400 BadRequest */

    export class EBadRequest extends InvError
    {
        constructor(Message?: string)
        {
            if (! TypeInfo.Assigned(Message))
                Message = 'e_bad_request';

            super(Message, 400);
        }
    }

    /* 401 Unauthorized  */

    export class EUnauthorized extends InvError
    {
        constructor(Message?: string)
        {
            if (! TypeInfo.Assigned(Message))
                Message = 'e_unauthorized';

            super(Message, 401);
        }
    }

    /* 403 Forbidden  */

    export class EForbidden extends InvError
    {
        constructor(Message?: string)
        {
            if (! TypeInfo.Assigned(Message))
                Message = 'e_forbidden';

            super(Message, 403);
        }
    }

    /* 404 Not Found  */

    export class ENotFound extends InvError
    {
        constructor(Message?: string)
        {
            if (! TypeInfo.Assigned(Message))
                Message = 'e_not_found';

            super(Message, 404);
        }
    }

    /* 405 Method Not Allowed */

    export class EMethodNotAllowed extends InvError
    {
        constructor(Message?: string)
        {
            if (! TypeInfo.Assigned(Message))
                Message = 'e_method_not_allowed';

            super(Message, 405);
        }
    }

    /* 406 Not Acceptable */

    export class ENotAcceptable extends InvError
    {
        constructor(Message?: string)
        {
            if (! TypeInfo.Assigned(Message))
                Message = 'e_method_not_allowed';

            super(Message, 406);
        }
    }

    /* 409 Conflict */

    export class EConflict extends EInvAbort
    {
        constructor(Message?: string)
        {
            if (! TypeInfo.Assigned(Message))
                Message = 'e_conflict';

            super(Message, 409);
        }
    }

    /* 423 Locked */

    export class ELocked extends EInvAbort
    {
        constructor(Message?: string)
        {
            if (! TypeInfo.Assigned(Message))
                Message = 'e_locked';

            super(Message, 423);
        }
    }

    export class EPreconditionFailed extends EInvAbort
    {
        constructor(Message?: string)
        {
            if (! TypeInfo.Assigned(Message))
                Message = 'e_precondition_failed ';

            super(Message, 412);
        }
    }

    export class EPreconditionRequired extends EInvAbort
    {
        constructor(Message?: string)
        {
            if (! TypeInfo.Assigned(Message))
                Message = 'e_precondition_required';

            super(Message, 428);
        }
    }
}

/*
export namespace InvServerError
{
}
*/

/**
 *  EInvInvalidToken
 *      for Authorization got invalid token
 */
export class EInvInvalidToken extends InvClientError.EBadRequest
{
    constructor(Message?: string)
    {
        if (! TypeInfo.Assigned(Message))
            Message = 'e_invalid_token';

        super(Message);
    }
}

/**
 *  EInvTokenExpired
 *      for Authorization token expired
 */
export class EInvTokenExpired extends InvClientError.EUnauthorized
{
    constructor(Message?: string)
    {
        if (! TypeInfo.Assigned(Message))
            Message = 'e_token_expired';

        super(Message);
    }
}
