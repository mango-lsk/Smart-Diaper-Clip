// tslint:disable-next-line:no-reference
/// <reference path= "./websql.d.ts" />
// WebSQL to W3C is deprecated so this is no very unlikely to update further more

/**
 *  Sqlite extension of Storage
 *  support for:
 *      .https://github.com/litehelpers/Cordova-sqlite-storage
 *          cordova plugin add cordova-sqlite-storage --save
 *      .or alternate cordova-plugin-sqlite-2
 *          cordova plugin add cordova-plugin-sqlite-2 --save
 *      .downto WebSQL when native sqlite not available
 *          but WebSQL was only native suppoerted by chrome
 */
import {TypeInfo} from '../../core/typeinfo';
import {EAbort} from '../../core/exception';
import {TGuid} from '../../core/guid';

import {TSqlEngine, TSqlConnection, TSqlQuery, TDataSet} from '../storage.sql';

export {InitializeStorage} from '../storage';

/* extends TSqlConnection */

declare module '../storage'
{
    interface IStorageEngine
    {
        Pragma(Text: string, conn?: TSqlConnection): Promise<void>;
        EnableForeignKeysConstraint(conn?: TSqlConnection): Promise<void>;
        DisableForeignKeysConstraint(conn?: TSqlConnection): Promise<void>;

        ModuleRev(Name: string, Rev: string, InitSQL: string[]): Promise<boolean>;
    }
}

/* TSqliteEngine */

export class TSqliteEngine extends TSqlEngine
{
    constructor(public DBName: string)
    {
        super();
    }

    private static OpenDatabase(Name: string): Database | undefined
    {
        let Conn: Database;

        // globally open the database first time.
        if (! TypeInfo.Assigned(this.OpenDBFuncPtr))
        {
            try
            {
                if (TypeInfo.Assigned((window as any).sqlitePlugin))
                {
                    try
                    {
                        // support for cordova-sqlite-storage
                        Conn = OpenDBSqliteStorage(Name);
                        console.log('cordova-sqlite-storage for Sqlite');
                        this.OpenDBFuncPtr = OpenDBSqliteStorage;
                    }
                    catch (err)
                    {
                        // support for cordova-plugin-sqlite-2
                        Conn = OpenDBSqlite(Name);
                        console.log('cordova-plugin-sqlite-2 for Sqlite');
                        this.OpenDBFuncPtr = OpenDBSqlite;
                    }
                }
                else
                {
                    Conn = OpenDBWebSql(Name);
                    console.log('%cwindow.sqlitePlugin is undefined, using WebSQL instead', 'color:orange');
                    this.OpenDBFuncPtr = OpenDBWebSql;
                }

                return Conn;
            }
            catch (err)
            {
                this.OpenDBFuncPtr = undefined;
                return undefined;
            }
        }
        else
        {
            const OpenDBFuncPtr = this.OpenDBFuncPtr;
            if (TypeInfo.Assigned(OpenDBFuncPtr))
            {
                Conn = OpenDBFuncPtr(Name);
                return Conn;
            }
            else
                return undefined;
        }

        function OpenDBSqlite(_Name: string): any
            { return (window as any).sqlitePlugin.openDatabase(_Name, '1.0', _Name, 0);  }
        function OpenDBSqliteStorage(_Name: string): any
            { return  (window as any).sqlitePlugin.openDatabase({name: _Name, location: 'default'}); }
        function OpenDBWebSql(_Name: string)
            { return (window as any).openDatabase(_Name, '1.0', _Name, 5 * 1024 * 1024);  }
    }

    private static OpenDBFuncPtr: ((Name: string) => any) | undefined;

/* storage module IStorageEngine extension */

    EnableForeignKeysConstraint(conn?: TSqlConnection): Promise<void>
    {
        return this.Pragma('foreign_keys=ON', conn).catch(err => console.log('%c' + err.message, 'color:red'));
    }

    DisableForeignKeysConstraint(conn?: TSqlConnection): Promise<void>
    {
        return this.Pragma('foreign_keys=OFF', conn).catch(err => console.log('%c' + err.message, 'color:red'));
    }

    async ModuleRev(Name: string, Rev: string, InitSQL: string[]): Promise<boolean>
    {
        const tracing = this.DebugTracing;
        this.DebugTracing = false;

        const conn = await this.GetConnection();
        try
        {
            console.log(`Module: ${Name} Rev: ${Rev}`);

            let tables: string[] | undefined;
            let retval = (Rev === conn.GetKV(Name));

            if (retval)
            {
                tables = this.ParseCreateSql(InitSQL);
                if (tables.length > 0)
                {
                    const set = new Set<string>();
                    const DataSet = await conn.ExecQuery('SELECT name FROM sqlite_master WHERE type="table"');
                    while (! DataSet.Eof)
                    {
                        set.add(DataSet.Curr.name.toUpperCase());
                        DataSet.Next();
                    }

                    for (const iter of tables)
                    {
                        if (! set.has(iter.toUpperCase()))
                        {
                            retval = false;
                            break;
                        }
                    }
                }
            }

            if (! retval)
            {
                if (! TypeInfo.Assigned(tables))
                    tables = this.ParseCreateSql(InitSQL);

                await this.DisableForeignKeysConstraint(conn);
                try
                {
                    for (const iter of tables)
                        await conn.ExecSQL(`DROP TABLE ${iter}`).catch(() => {});

                    this.DebugTracing = tracing;
                    await conn.ExecSQL(InitSQL);
                    conn.StoreKV(Name, Rev);
                }
                finally
                {
                    await this.EnableForeignKeysConstraint(conn);
                }
            }
            return retval;
        }
        finally
        {
            this.DebugTracing = tracing;
            this.ReleaseConnection(conn);
        }
    }

    private ParseCreateSql(InitSQL: string[]): string[]
    {
        const retval = new Array<string>();

        for (const sql of InitSQL)
        {
            const action = sql.substring(0, sql.indexOf('(')).trimEnd();

            const parse = action.toUpperCase().split(' ');
            for (let i = 0; i < parse.length; i ++)
                parse[i] = parse[i].trim();

            if (parse.includes('CREATE') && parse.includes('TABLE'))
                retval.push(action.substring(action.lastIndexOf(' ') + 1));
        }
        return retval;
    }

/* ISqlEngineSupport */

    DateTimeValue(dt: Date): string
    {
        return `datetime(${Math.trunc(dt.getTime() / 1000)}, 'unixepoch')`;
    }

    GenerateGUID(): Promise<string>
    {
        return Promise.resolve(TGuid.Generate());
    }

    async Pragma(Text: string, conn?: TSqlConnection): Promise<void>
    {
        const shareconn = TypeInfo.Assigned(conn) ? conn : await this.GetConnection();
        try // enable foreign_key support
        {
            await (shareconn as TSqliteConnection).InternalExecSQL(`PRAGMA ${Text}`);
        }
        catch (e)
        {
            throw new EAbort('SQLite No PRAGMA support');
        }
        finally
        {
            if (! TypeInfo.Assigned(conn))
                this.ReleaseConnection(shareconn);
        }
    }

    /*
    async DropEveryThing(): Promise<void>
    {
        await this.DisableForeignKeysConstraint();

        const DataSet = await this.ExecQuery('SELECT name FROM sqlite_master WHERE type="table"');
        while (! DataSet.Eof)
        {
            const Name = DataSet.Curr.name;
            if (Name[0] !== '_')
                await this.ExecSQL('DROP TABLE ' + Name);

            DataSet.Next();
        }
    }
    */

/* ISqlConnectionPool */

    async GetConnection(): Promise<TSqlConnection>
    {
        let  Conn = this.ConnectionPool.pop();

        if (! TypeInfo.Assigned(Conn))
        {
            Conn = await new Promise<TSqlConnection>((resolve, reject) =>
            {
                console.log('%cSqliteEngine: Creating new connection...', 'color:lightgreen');

                const Db = (this.constructor as typeof TSqliteEngine).OpenDatabase(this.DBName);
                if (TypeInfo.Assigned(Db))
                    resolve(new TSqliteConnection(this, Db));
                else
                    reject(new EAbort());
            });

            await this.EnableForeignKeysConstraint(Conn);
            await this.InitKeyValueStorage(Conn);
        }
        return Conn;
    }

    ReleaseConnection(Conn: TSqlConnection): void
    {
        this.ConnectionPool.push(Conn);
    }

    private ConnectionPool = new Array<TSqlConnection>();
}

/* TSqliteConnection */

class TSqliteConnection extends TSqlConnection
{
    constructor(private Owner: TSqliteEngine, private Instance: Database)
    {
        super();
    }

/* TSqlConnection */

    Release(): void
    {
        this.Owner.ReleaseConnection(this);
    }

    Close(): void
    {
        // sqlite has no action
    }

    BeginTrans(): Promise<void>
    {
        return Promise.resolve();
    }

    Rollback(): Promise<void>
    {
        return Promise.resolve();
    }

    Commit(): Promise<void>
    {
        return Promise.resolve();
    }

    override InternalExecSQL(Sql: string): Promise<number>
    {
        return new Promise<any>( (resolve, reject) =>
        {
            this.Instance.transaction(
                tx =>
                {
                    tx.executeSql(Sql as string, [],
                        (_tx, result) =>
                            { resolve(result.rowsAffected); },
                        (_tx, err) =>
                        {
                            reject(err);
                            return true;
                        }
                    );
                },
                err =>
                    { reject(err); }
            );
        });
    }

    protected InternalExecSQLs(Sqls: string[]): Promise<number>
    {
        return new Promise<number>((resolve, reject) =>
        {
            let RowsAffected = 0;

            this.Instance.transaction(
                tx =>
                {
                    for (const sql of Sqls)
                    {
                        tx.executeSql(sql, [],
                            (_tx, result) =>
                                { RowsAffected += result.rowsAffected; },
                            (_tx, err) =>
                            {
                                reject(err);
                                return true;
                            }
                        );
                    }
                },
                err =>
                    { reject(err); },
                () =>
                    { resolve(RowsAffected); }
            );
        });
    }

    protected InternalExecQuery(Query: TSqlQuery): Promise<TDataSet>
    {
        return new Promise<TDataSet>((resolve, reject) =>
        {
            this.Instance.transaction(tx =>
            {
                tx.executeSql(Query.Sql, [],
                    (_tx, result) =>
                    {
                        try
                        {
                            Query.HandleResult(result, result.rowsAffected);

                            const DataSet = new TSqliteDataSet(result);
                            resolve(DataSet);
                        }
                        catch (err)
                        {
                            reject(err);
                            throw err;
                        }
                    },
                    (_tx, err) =>
                    {
                        // rollback transaction when return true
                        reject(err);
                        return ! Query.HandleError(err);
                    }
                );
            });
        });
    }

    protected InternalExecQuerys(Queries: Array<TSqlQuery>): Promise<Array<TDataSet>>
    {
        return new Promise<Array<TDataSet>>((resolve, reject) =>
        {
            const SqlRetVal = new Map<TSqlQuery, TDataSet>();

            this.Instance.transaction(
                tx =>
                {
                    for (const Qry of Queries)
                    {
                        tx.executeSql(Qry.Sql, [],
                            (_tx, result) =>
                            {
                                try
                                {
                                    Qry.HandleResult(result, result.rowsAffected);

                                    const DataSet = new TSqliteDataSet(result);
                                    SqlRetVal.set(Qry, DataSet);
                                }
                                catch (err)
                                {
                                    reject(err);
                                    throw err;
                                }
                            },
                            (_tx, err) =>
                            {
                                if (! Qry.HandleError(err))
                                {
                                    reject(err);
                                    return true;    // rollback transaction
                                }
                                else
                                    return false;   // continue transaction
                            }
                        );
                    }
                },
                err =>
                    { },
                () =>
                {
                    const RetVal = new Array<TDataSet>();

                    for (const qry of Queries)
                        RetVal.push(SqlRetVal.get(qry) as TDataSet);
                    resolve(RetVal);
                }
            );
        });
    }
}

/* TSqliteDataSet */

class TSqliteDataSet extends TDataSet
{
    protected GetRecordCount(): number
    {
        if (this.IsDataSet)
            return this.SqlResult.rows.length;
        else
            return 0;
    }

    override get SqlResult(): SQLResultSet
    {
        return this._SqlResult;
    }

    protected GetEffectRows(): number
    {
        if (this.IsDataSet)
            return this.RecordCount;
        else
            return this.SqlResult.rowsAffected;
    }

    protected GetIsDataSet(): boolean
    {
        return TypeInfo.IsArrayLike(this.SqlResult.rows);
    }

    protected GotoRecord(RecNo: number): any
    {
        if (! TypeInfo.Assigned(this.SqlResult))
        {
            this._RecNo = 0;
            this._Bof = this._Eof = true;
            return null;
        }

        this._Bof = RecNo < 0;
        if (this._Bof)
        {
            this._Eof = this.SqlResult.rows.length === 0;
            this._RecNo = 0;
            return null;
        }

        this._Eof = RecNo >= this.SqlResult.rows.length;
        if (this._Eof)
        {
            this._Bof = this.SqlResult.rows.length === 0;
            this._RecNo = this.SqlResult.rows.length - 1;
            return null;
        }
        else
        {
            this._RecNo = RecNo;
            return this.SqlResult.rows.item(RecNo);
        }
    }
}
