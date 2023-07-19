import {TypeInfo} from '../core/typeinfo';
import {Exception, EAbort} from '../core/exception';
import {TPersistable} from './persistable';
import {IStorage, TStorage, TStorageEngine} from './storage';

const KV_STORAGE_INIT = 'CREATE TABLE IF NOT EXISTS _kv (key TEXT NOT NULL PRIMARY KEY, value TEXT)';
const KV_STORAGE_LIST = 'SELECT * FROM _kv';
const KV_STORAGE_SET = 'INSERT OR REPLACE INTO _kv(key, value) VALUES(:key, :value)';
const KV_STORAGE_REMOVE = 'DELETE FROM _kv WHERE key = ":key"';
const KV_STORAGE_CLEAR = 'DELETE FROM _kv';

/* Exceptions */

export class EKeyNotExists extends EAbort
{
    constructor()
    {
        super('e_key_not_exists');
    }
}

export class SqlError extends Exception
{
}

export class ENoRecoredChanged extends SqlError
{
    constructor()
    {
        super('e_no_record_changed');
    }
}

export class EMultiRecordChanged extends SqlError
{
    constructor()
    {
        super('e_multi_record_changed');
    }
}

/* ISqlEngineSupport */

export interface ISqlEngineSupport
{
    /**
     *  Generate a GUID
     */
    GenerateGUID(): Promise<string>;

    /**
     *  checking the sql is insert or update
     */
    IsInsertOrUpdate(sql: string): boolean;
    /**
     *  Support for ? params
     *      SELECT * FROM table WHERE FIELD = ?
     *  params as any[]
     *
     *  Support for :variable params
     *      SELECT * FROM table WHERE FIELD > :var
     *  params as {var: 'foo'}, use RegExpr to replace
     */
    AssignParams(sql: string, params: any[]): string;
    AssignParams(sql: string, params: object): string;
    AssignParams(sql: string, ObjOrAry: object | any[]): string;

    /**
     *  JSP value convert to Sql
     */
    ParamValue(v: any): string;

    /**
     *  JSP value convert to INSERT/UPDATE Sql
     */
    FieldValue(v: any): string;

    /**
     *  JSP Date convert to Sql
     */
    DateTimeValue(dt: Date): string;
}

/* ISqlStorage */

export interface ISqlStorage
{
    ExecSQL(Sql: string, params?: any[] | object): Promise<number>;
    ExecSQL(Sql: string[], params?: any[] | object): Promise<number>;
    ExecSQL(Sql: string | string[], params?: any[] | object): Promise<number>;

    ExecQuery(Sql: string, params?: any[] | object): Promise<TDataSet>;
    ExecQuery(Sql: string[], params?: any[] | object): Promise<Array<TDataSet>>;
    ExecQuery(Query: TSqlQuery, params?: any[] | object): Promise<TDataSet>;
    ExecQuery(Queries: Array<TSqlQuery>, params?: any[] | object): Promise<Array<TDataSet>>;
    ExecQuery(Queries: string | TSqlQuery | Array<TSqlQuery>, params?: any[] | object): Promise<TDataSet | Array<TDataSet>>;

    // generate INSERT INTO TableName VALUES(values)
    Insert(TableName: string, Values: object): Promise<void>;
    Update(TableName: string, Key: string[] | string, Values: object): Promise<void>;
    Delete(TableName: string, Values: object): Promise<void>;
}

/* ITransactionSupport */

export interface ITransactionSupport extends ISqlStorage
{
    readonly InTransaction: boolean;

    BeginTrans(): Promise<void>;
    Commit(): Promise<void>;
    Rollback(): Promise<void>;
}

/* ISqlConnection */

export interface ISqlConnection extends IStorage, ISqlStorage, ITransactionSupport
{
    /**
     *  Release the connection
     */
    Release(): void;

    /**
     *  CLose/Destroy the connection
     */
    Close(): void;
}

/* ISqlConnectionPool */

export interface ISqlConnectionPool
{
    /**
     *  Get a free connection or Create new connection
     */
    GetConnection(): Promise<ISqlConnection>;

    /**
     *  Release the connection
     */
    ReleaseConnection(Conn: ISqlConnection): void;

    /**
     *  try GetConnection...Callback...finally ReleaseConnection
     */
    Execute<TRetVal>(Callback: (conn: ISqlConnection, ...args: any[]) => Promise<TRetVal>, ...args: any[]): Promise<TRetVal>;
}

/* extends IStorageEngine to Sql like Engine and export it */

declare module './storage'
{
    interface IStorageEngine extends ISqlEngineSupport, ISqlConnectionPool, ISqlStorage
    {
    }
}

/* TSqlEngine */

export abstract class TSqlEngine extends TStorageEngine implements ISqlEngineSupport, ISqlConnectionPool, ISqlStorage
{
    /* ISqlEngineSupport */

    abstract GenerateGUID(): Promise<string>;

    IsInsertOrUpdate(sql: string): boolean
    {
        const test = sql.trim().substring(0, 7).toUpperCase().trim();
        return ['INSERT', 'UPDATE', 'REPLACE'].indexOf(test) !== -1;
    }

    AssignParams(sql: string, params: any[]): string;
    AssignParams(sql: string, params: object): string;
    AssignParams(sql: string, ObjOrAry: object | any[]): string
    {
        const IsInsertOrUpdate = this.IsInsertOrUpdate(sql);

        if (0 !== Object.keys(ObjOrAry).length)
        {
            /**
             *  NOTE: string.replace changes original string
             *      copy string to avoid it
             */
            sql = ` ${sql.trim()}`.substring(1);

            if (TypeInfo.IsArrayLike(ObjOrAry))
            {
                const params: any[] = ObjOrAry as any[];

                if (IsInsertOrUpdate)
                {
                    for (const param of params)
                        sql = sql.replace('?', this.FieldValue(param));
                }
                else
                {
                    for (const param of params)
                        sql = sql.replace('?', this.ParamValue(param));
                }
                return sql;
            }
            else
            {
                const Obj = ObjOrAry as any;

                return sql.replace(/\:(\w+)/g, (txt, key) =>
                {
                    const value = Obj[key];

                    if (IsInsertOrUpdate)
                        return this.FieldValue(value);
                    else
                        return this.ParamValue(value);
                });
            }
        }
        else
            return sql;
    }

    ParamValue(v: any): string
    {
        if (!TypeInfo.Assigned(v))
            return 'NULL';
        else if (TypeInfo.IsString(v))
            return v;
        else if (v instanceof Date)
            return this.DateTimeValue(v);
        else if (v instanceof Map || v instanceof Set)
            return JSON.stringify([...v]);
        else
            return v.toString();
    }

    FieldValue(v: any): string
    {
        if (! TypeInfo.Assigned(v))
            return 'NULL';
        // primitive types: string
        else if (TypeInfo.IsString(v))
            return '"' + v.split('"').join('""') + '"';
        // primitive types: number & boolean
        else if (TypeInfo.IsNumber(v) || TypeInfo.IsBoolean(v))
            return v.toString();
        // date types
        else if (v instanceof Date)
            return this.DateTimeValue(v);
        // Map/Set
        else if (v instanceof Map || v instanceof Set)
            return `"${JSON.stringify([...v])}"`;
        // all other unknowns
        else
            return `"${JSON.stringify(v)}"`;
    }

    abstract DateTimeValue(dt: Date): string;

    /* ISqlConnectionPool */

    async Execute<TRetVal>(Callback: (conn: ISqlConnection) => Promise<TRetVal>): Promise<TRetVal>
    {
        const conn = await this.GetConnection();
        try
        {
            await conn.BeginTrans();
            const retval = await Callback(conn);

            await conn.Commit();
            return retval;
        }
        catch (e)
        {
            await conn.Rollback();
            throw e;
        }
        finally
        {
            this.ReleaseConnection(conn);
        }
    }

    abstract GetConnection(): Promise<ISqlConnection>;
    abstract ReleaseConnection(Conn: ISqlConnection): void;

    /* ISqlStorage */

    ExecSQL(Sql: string, params?: any[] | object): Promise<number>;
    ExecSQL(Sql: string[], params?: any[] | object): Promise<number>;
    ExecSQL(Sql: string | string[], params?: any[] | object): Promise<number>
    {
        return this.Execute(conn => conn.ExecSQL(Sql as any, params));
    }

    ExecQuery(Sql: string, params?: any[] | object): Promise<TDataSet>;
    ExecQuery(Sql: string[], params?: any[] | object): Promise<Array<TDataSet>>;
    ExecQuery(Query: TSqlQuery, params?: any[] | object): Promise<TDataSet>;
    ExecQuery(Queries: Array<TSqlQuery>, params?: any[] | object): Promise<Array<TDataSet>>;
    ExecQuery(Queries: string | string[] | TSqlQuery | Array<TSqlQuery>, params?: any[] | object): Promise<TDataSet | Array<TDataSet>>
    {
        return this.Execute(conn => conn.ExecQuery(Queries as any, params));
    }

    Insert(TableName: string, Values: object): Promise<void>
    {
        return this.Execute(conn => conn.Insert(TableName, Values));
    }

    Update(TableName: string, Key: string[] | string, Values: object): Promise<void>
    {
        return this.Execute(conn => conn.Update(TableName, Key, Values));
    }

    Delete(TableName: string, Values: object): Promise<void>
    {
        return this.Execute(conn => conn.Delete(TableName, Values));
    }

    /* IStorage */

    override StoreObject(Obj: TPersistable): Promise<void>;
    override StoreObject(Obj: TPersistable, Transaction: any): Promise<void>;
    override StoreObject(Obj: TPersistable, Transaction?: any): Promise<void>
    {
        if (TypeInfo.Assigned(Transaction))
            return Transaction.StoreObject(Obj, Transaction);
        else
            return this.Execute<void>(conn => conn.StoreObject(Obj, conn));
    }

    override DeleteObject(Obj: TPersistable): Promise<void>;
    override DeleteObject(Obj: TPersistable, Transaction: any): Promise<void>;
    override DeleteObject(Obj: TPersistable, Transaction?: any): Promise<void>
    {
        if (TypeInfo.Assigned(Transaction))
            return Transaction.DeleteObject(Obj, Transaction);
        else
            return this.Execute<void>(conn => conn.DeleteObject(Obj, conn));
    }

    /* IKeyValueStorage */

    protected async InitKeyValueStorage(Conn: ISqlConnection): Promise<void>
    {
        if (! TypeInfo.Assigned((this._KeyValueHash as Map<string, string>)))
        {
            (this._KeyValueHash as Map<string, string>) = new Map<string, string>();
            await Conn.ExecSQL(KV_STORAGE_INIT);

            const DataSet = await Conn.ExecQuery(KV_STORAGE_LIST);
            while (! DataSet.Eof)
            {
                (this._KeyValueHash as Map<string, string>).set(DataSet.Curr.key, DataSet.Curr.value);
                DataSet.Next();
            }
        }
    }

    override GetKV(Key: string): string | null
    {
        const RetVal = (this._KeyValueHash as Map<string, string>).get(Key);

        if (TypeInfo.Assigned(RetVal))
            return RetVal;
        else
            return null;
    }

    override StoreKV(Key: string, Value: string): void
    {
        (this._KeyValueHash as Map<string, string>).set(Key, Value);
        setTimeout(() => this.ExecSQL(KV_STORAGE_SET, {key: Key, value: Value}));
    }

    override DeleteKV(Key: string): void
    {
        if (((this._KeyValueHash as Map<string, string>) as Map<string, string>).delete(Key))
            setTimeout(() => this.ExecSQL(KV_STORAGE_REMOVE, {key: Key}));
    }

    override ClearKV(): void
    {
        setTimeout(() => this.ExecSQL(KV_STORAGE_CLEAR));
    }

    private _KeyValueHash: Map<string, string> | undefined;
}

/* TSqlConnection */

export abstract class TSqlConnection extends TStorage implements ISqlConnection
{
    /* ISqlConnection */

    abstract Close(): void;
    abstract Release(): void;

    /* ITransactionSupport */

    get InTransaction(): boolean
    {
        return this._InTransaction;
    }

    abstract BeginTrans(): Promise<void>;
    abstract Commit(): Promise<void>;
    abstract Rollback(): Promise<void>;

    protected _InTransaction = false;

    /* ISqlStorage */

    Insert(TableName: string, Values: object): Promise<void>
    {
        const rule = {
            Name: TableName,
            KeyProps: [],
            Props: Object.keys(Values),
            UpdateRule: TPersistable.UpdateRule.WhereKeyOnly
        };
        return this.InsertByRules([rule], Values);
    }

    Update(TableName: string, Key: string[] | string, Values: object): Promise<void>
    {
        const rule = {
            Name: TableName,
            KeyProps: TypeInfo.IsString(Key) ? [Key] : Key,
            Props: Object.keys(Values),
            UpdateRule: TPersistable.UpdateRule.WhereKeyOnly
        };
        return this.UpdateByRules([rule], Values);
    }

    Delete(TableName: string, Values: object): Promise<void>
    {
        const rule = {
            Name: TableName,
            KeyProps: Object.keys(Values),
            Props: [],
            UpdateRule: TPersistable.UpdateRule.WhereKeyOnly
        };
        return this.DeleteByRules([rule], Values);
    }

    /**
     *  Execute SQL in a transaction and Promise a Raw SQL result
     *  Mutiple SQLs execution only Promise error or success
     */
    ExecSQL(Sql: string, params?: any[] | object): Promise<number>;
    ExecSQL(Sql: string[], params?: any[] | object): Promise<number>;
    ExecSQL(Sql: string | string[], params?: any[] | object): Promise<number>
    {
        if (TypeInfo.IsString(Sql))
        {
            if (TypeInfo.Assigned(params))
                Sql = TStorage.Engine.AssignParams(Sql, params);

            if (TStorage.Engine.DebugTracing)
                console.log(`%cExecSQL:${Sql}`, 'color:cyan');

            return this.InternalExecSQL(Sql)
                .catch(err =>
                {
                    console.log(`%c${err.message}`, 'color:red');
                    throw err;
                });

        }
        else
        {
            if (TypeInfo.Assigned(params))
            {
                Sql = Array.from(Sql);

                for (let i = 0; i < Sql.length; i ++)
                    Sql[i] = TStorage.Engine.AssignParams(Sql[i], params);
            }

            if (TStorage.Engine.DebugTracing)
            {
                for (const iter of Sql)
                    console.log(`%cExecSQL:${iter}`, 'color:cyan');
            }

            return this.InternalExecSQLs(Sql)
                .catch(err =>
                {
                    console.log(`%c${err.message}`, 'color:red');
                    throw err;
                });
        }
    }

    protected abstract InternalExecSQL(Sql: string): Promise<number>;
    protected abstract InternalExecSQLs(Sql: string[]): Promise<number>;

    /**
     *  Execute Query object transaction and Promise a DataSet Result
     *  the Error handling was passed to TSqlQuery and it's derived classes for more Transaction Control
     */
    ExecQuery(Sql: string, params?: any[] | object): Promise<TDataSet>;
    ExecQuery(Sql: string[], params?: any[] | object): Promise<Array<TDataSet>>;
    ExecQuery(Query: TSqlQuery, params?: any[] | object): Promise<TDataSet>;
    ExecQuery(Queries: Array<TSqlQuery>, params?: any[] | object): Promise<Array<TDataSet>>;
    ExecQuery(Queries: string | string[] | TSqlQuery | Array<TSqlQuery>, params?: any[] | object): Promise<TDataSet> | Promise<Array<TDataSet>>
    {
        if (TypeInfo.IsString(Queries))
        {
            const qry = new TSqlQuery(Queries, params);

            if (TStorage.Engine.DebugTracing)
                console.log(`%cExecQuery:${qry.Sql}`, 'color:cyan');

            return this.InternalExecQuery(qry)
                .catch(err =>
                {
                    console.log(`%c${err.message}`, 'color:red');
                    throw err;
                });
        }
        else if (Queries instanceof TSqlQuery)
        {
            if (TypeInfo.Assigned(params))
                Queries.Params = params;

            if (TStorage.Engine.DebugTracing)
                console.log(`%cExecQuery:${Queries.Sql}`, 'color:cyan');

            return this.InternalExecQuery(Queries)
                .catch(err =>
                {
                    console.log(`%c${err.message}`, 'color:red');
                    throw err;
                });
        }
        else
        {
            const ary = Array<TSqlQuery>();

            for (const iter of Queries)
            {
                if (! TypeInfo.IsString(iter))
                {
                    if (TypeInfo.Assigned(params))
                        iter.Params = params;

                    if (TStorage.Engine.DebugTracing)
                        console.log(`%cExecQuery:${iter.Sql}`, 'color:cyan');

                    ary.push(iter);
                }
                else
                {
                    const qry = new TSqlQuery(iter, params);

                    if (TStorage.Engine.DebugTracing)
                        console.log(`%cExecQuery:${qry.Sql}`, 'color:cyan');

                    ary.push(qry);
                }
            }

            return this.InternalExecQuerys(ary)
                .catch(err =>
                {
                    console.log(`%c${err.message}`, 'color:red');
                    throw err;
                });
        }
    }

    protected abstract InternalExecQuery(Query: TSqlQuery): Promise<TDataSet>;
    protected abstract InternalExecQuerys(Queries: Array<TSqlQuery>): Promise<Array<TDataSet>>;

    /* IStorage */

    override InsertByRules(Rules: Array<TPersistable.Rule>, Obj: object): Promise<void>
    {
        // const Instance: any = Obj;
        const Queries = new Array<TSqlQuery>();

        for (const Rule of Rules)
        {
            const Sql = new Array<string>();
            const Fields = new Array<string>();
            const Values = new Array<any>();

            // INSERT INTO table()
            Sql.push('INSERT INTO ', Rule.Name, '(');
            // KeyProps
            if (Rule.KeyProps.length > 0)
            {
                for (const str of Rule.KeyProps)
                {
                    if (-1 === Fields.indexOf(str))
                    {
                        Fields.push(str);
                        Values.push(Obj instanceof TPersistable ? Obj.MarshallingProp(str) : TypeInfo.GetPropValue(Obj, str));

                        Sql.push(str, ', ');
                    }
                }
            }
            // Props
            for (const str of Rule.Props)
            {
                if (-1 === Fields.indexOf(str))
                {
                    const PropValue = Obj instanceof TPersistable ? Obj.MarshallingProp(str) : TypeInfo.GetPropValue(Obj, str);

                    if (TypeInfo.Assigned(PropValue))
                    {
                        Sql.push(str, ', ');
                        Values.push(PropValue);
                    }
                }
            }
            Sql.pop(), Sql.push(')', ' VALUES(');

            if (Values.length > 0)
            {
                // VALUES()
                for (const Value of Values)
                    Sql.push(TStorage.Engine.FieldValue(Value), ',');

                Sql.pop(), Sql.push(')');

                Queries.push(new TSqlQuery(Sql.join('')));
            }
        }

        if (0 === Queries.length)
            return Promise.reject(new Error('Nothing to Append'));  // everything is null? must be an error
        else
            return this.ExecQuery(Queries).then(() => { });
    }

    override UpdateByRules(Rules: Array<TPersistable.Rule>, Obj: object): Promise<void>
    {
        const OldObj = Obj instanceof TPersistable ? (TypeInfo.Assigned(Obj.OldValue) ? Obj.OldValue : Obj) : Obj;
        const Queries = new Array<TSqlQuery>();

        for (const Rule of Rules)
        {
            const Sql = new Array<string>();
            const Fields = new Array<string>();
            const UpdateValues = new Array<any>();
            let Wheres: Array<string>;   // init later
            const WhereValues = new Array<any>();

            if (Rule.UpdateRule !== TPersistable.UpdateRule.WhereKeyOnly)
            {
                Wheres = new Array<string>();
                Object.assign(Wheres, Rule.KeyProps);
            }
            else
                Wheres = Rule.KeyProps;

            // Key Fields
            for (const str of Rule.KeyProps)
            {
                const OldValue = OldObj instanceof TPersistable ? OldObj.MarshallingProp(str) : TypeInfo.GetPropValue(OldObj, str);
                const NewValue = Obj instanceof TPersistable ? Obj.MarshallingProp(str) : TypeInfo.GetPropValue(Obj, str);

                // KeyProps in where of any case
                WhereValues.push(OldValue);

                // KeyProps in updates
                if (! Rule.NoUpdateKeyProps && -1 === Fields.indexOf(str))
                {
                    if (! this.FieldValueEqual(NewValue, OldValue))
                    {
                        Fields.push(str);
                        UpdateValues.push(NewValue);
                    }
                }
            }

            // Other Fields
            for (const str of Rule.Props)
            {
                const OldValue = OldObj instanceof TPersistable ? OldObj.MarshallingProp(str) : TypeInfo.GetPropValue(OldObj, str);
                const NewValue = Obj instanceof TPersistable ? Obj.MarshallingProp(str) : TypeInfo.GetPropValue(Obj, str);

                if (Rule.UpdateRule === TPersistable.UpdateRule.WhereAll)
                {
                    Wheres.push(str);
                    WhereValues.push(OldValue);
                }

                // updates when changed
                if ((OldObj === Obj || ! this.FieldValueEqual(NewValue, OldValue)) &&
                    -1 === Fields.indexOf(str))
                {
                    Fields.push(str);

                    if (TypeInfo.Defined(NewValue))
                        UpdateValues.push(NewValue);
                    else
                        UpdateValues.push(null);

                    if (Rule.UpdateRule === TPersistable.UpdateRule.WhereChanged &&
                        TypeInfo.Assigned(OldValue) && -1 === Wheres.indexOf(str))
                    {
                        Wheres.push(str);
                        WhereValues.push(OldValue);
                    }
                }
            }

            if (Fields.length > 0 && Wheres.length > 0)
            {
                Sql.push('UPDATE ', Rule.Name, ' SET ');
                for (let i = 0; i < Fields.length; i ++)
                {
                    Sql.push(Fields[i] + '=');
                    Sql.push(TStorage.Engine.FieldValue(UpdateValues[i]));
                    Sql.push(',');
                }
                Sql.pop();

                Sql.push(' WHERE ');
                for (let i = 0; i < Wheres.length; i ++)
                {
                    Sql.push(Wheres[i] + '=');
                    Sql.push(TStorage.Engine.FieldValue(WhereValues[i]));
                    Sql.push(' AND ');
                }
                Sql.pop();

                if (TStorage.Engine.StrictUpdate)
                    Queries.push(new TSqlStrictQuery(Sql.join('')));
                else
                    Queries.push(new TSqlQuery(Sql.join('')));
            }
        }

        if (0 === Queries.length)
            return Promise.resolve();   // nothing changed..it cool, no error
        else
            return this.ExecQuery(Queries).then(() => {});
    }

    override DeleteByRules(Rules: Array<TPersistable.Rule>, Obj: object): Promise<void>
    {
        const OldObj = Obj instanceof TPersistable ? (TypeInfo.Assigned(Obj.OldValue) ? Obj.OldValue : Obj) : Obj;
        const Queries = new Array<TSqlQuery>();

        for (let i = Rules.length; i > 0; i --)
        {
            const Sql = new Array<string>();
            const Rule = Rules[i - 1];
            let Wheres: Array<string>;   // init later

            if (Rule.UpdateRule !== TPersistable.UpdateRule.WhereKeyOnly)
            {
                Wheres = new Array<string>();
                Object.assign(Wheres, Rule.KeyProps);

                for (const str of Rule.Props)
                {
                    if (-1 === Wheres.indexOf(str))
                        Wheres.push(str);
                }
            }
            else
                Wheres = Rule.KeyProps;

            // DELETE FROM table
            Sql.push('DELETE FROM ', Rule.Name, ' WHERE ');
            for (const str of Wheres)
            {
                Sql.push(str, '=');

                Sql.push(
                    TStorage.Engine.FieldValue(OldObj instanceof TPersistable ? OldObj.MarshallingProp(str) : TypeInfo.GetPropValue(OldObj, str)),
                    ' AND '
                );
            }
            Sql.pop();

            if (TStorage.Engine.StrictDelete)
                Queries.push(new TSqlStrictQuery(Sql.join('')));
            else
                Queries.push(new TSqlQuery(Sql.join('')));
        }

        if (0 === Queries.length)
            return Promise.reject(new Error('Nothing to Delete'));  // everything is null? it must be an error
        else
            return this.ExecQuery(Queries).then(() => {});
    }

    /* IKeyValueStorage */

    override GetKV(Key: string): string | null
    {
        // redirect to single instance StorageEngine
        return TStorage.Engine.GetKV(Key);
    }

    override DeleteKV(Key: string): void
    {
        // redirect to single instance StorageEngine
        TStorage.Engine.DeleteKV(Key);
    }

    override StoreKV(Key: string, Value: string): void
    {
        // redirect to single instance StorageEngine
        TStorage.Engine.StoreKV(Key, Value);
    }

    override ClearKV(): void
    {
        // redirect to single instance StorageEngine
        TStorage.Engine.ClearKV();
    }

    private FieldValueEqual(L: any, R: any): boolean
    {
        if (TypeInfo.IsPrimitive(L) || TypeInfo.IsPrimitive(R))
            return L === R;
        else if ((L instanceof Date) || (R instanceof Date))
            return L.valueOf() === R.valueOf();
        else
            return TStorage.Engine.FieldValue(L) === TStorage.Engine.FieldValue(R);
    }
}

export abstract class TSqlResult
{
    constructor(protected _SqlResult: any)
    {
    }

    get SqlResult(): any
    {
        return this._SqlResult;
    }

    get IsDataSet(): boolean
    {
        return this.GetIsDataSet();
    }

    get EffectRows(): number
    {
        return this.GetEffectRows();
    }

    protected abstract GetIsDataSet(): boolean;
    protected abstract GetEffectRows(): number;
}

/* TDataSet */

export abstract class TDataSet extends TSqlResult
{
    constructor(SqlResult: any)
    {
        super(SqlResult);

        if (this.IsDataSet)
            this.GotoRecord(0);
    }

    /*
    ToArray<T extends TPersistable>(ObjType: typeof TPersistable): Array<T>
    {
        const retval = new Array<any>();
        const rules = StorageEngine.PersistRules(ObjType);

        const RecNo = this.RecNo;
        this.First();

        while (! this.Eof)
        {
            const Obj: TPersistable = new (ObjType as any)(); // override abstract
            const Curr = this.Curr;

            if (TypeInfo.Assigned(rules.))

            Obj.Assign(this.Curr);
            retval.push(Obj);

            this.Next();
        }
        this.RecNo = RecNo;

        return retval;
    }
    */

    get Bof(): boolean
    {
        return this._Bof;
    }

    get Eof(): boolean
    {
        return this._Eof;
    }

    get IsEmpty(): boolean
    {
        return this._Bof === true && this._Eof === true;
    }

    /**
     *  Cursors
     */
    First(): any
    {
        return this.GotoRecord(0);
    }

    Last(): any
    {
        return this.GotoRecord(this.RecordCount);
    }

    Next(): any
    {
        return this.GotoRecord(this._RecNo + 1);
    }

    Piror(): any
    {
        return this.GotoRecord(this._RecNo - 1);
    }

    get RecNo(): number
    {
        return this._RecNo;
    }

    set RecNo(value: number)
    {
        this.GotoRecord(value);
    }

    get Curr(): any
    {
        return this.GotoRecord(this._RecNo);
    }

    get RecordCount(): number
    {
        return this.GetRecordCount();
    }

    protected _RecNo = 0;
    protected _Bof = true;
    protected _Eof = true;

    // abstracts
    protected abstract GetRecordCount(): number;
    protected abstract GotoRecord(RecNo: number): any;
}

/* TSqlQuery */

export class TSqlQuery
{
    /**
     *  '?' in sql segement
     *  *INSERT OR UPDATE:
     *      new TSqlQuery('update table set field1=?, field2=? where key=?', ['abcd', 1234, 'key'])
     *          => update table set field1="abcd", field2=1234 where key="key"
     *
     *  SELECT:
     *      new TSqlQuery('select * from table where field1=?, field2=?', ['abcd', 1234])
     *          => select * from table where field1=abcd and field2=1234
     *                                              ^^^^ error
     *  :param in sql segement
     *      new TSqlQuery('select * from table where field1=:param', {param: 'test'})
     */

    constructor(sql: string, params?: object | any[])
    {
        this._Sql = sql;
        this.Params = params;
    }

    get Sql(): string
    {
        let RetVal: string;

        if (TypeInfo.Assigned(this.Params))
            RetVal = TStorage.Engine.AssignParams(this._Sql, this.Params);
        else
            RetVal = this._Sql;

        return RetVal;
    }

    /**
     *  Handle a Successful Result. Throw a exception to rollback Transaction
     */
    HandleResult(Result: any, EffectRows: number): void
    {
    }

    /**
     *  Returns Is the Error can be Handled. also indicate the Transaction should continues or rollback
     *  or throw a exception to rollback Transaction
     */
    HandleError(Error: any): boolean
    {
        return false;
    }

    private _Sql: string;
    Params: object | any[] | undefined;
}

/* TSqlStrictQuery */

export class TSqlStrictQuery extends TSqlQuery
{
    override HandleResult(Result: any, EffectRows: number): void
    {
        super.HandleResult(Result, EffectRows);

        if (0 ===  EffectRows)
            throw new ENoRecoredChanged();
        else if (1 !== EffectRows)
            throw new EMultiRecordChanged();
    }
}
