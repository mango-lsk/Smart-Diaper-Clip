/**
 *  NodeJS Native MySql support
 *      npm install mysql --save
 *      npm install @types/mysql --save-dev
 */
import * as MySql from 'mysql';
import {TypeInfo} from '../../core/typeinfo';

import {ITransactionSupport} from '../storage.sql';
import {TSqlEngine, TSqlConnection, TSqlQuery, TDataSet} from '../storage.sql';

export {InitializeStorage} from '../storage';

/* TMySqlEngineCommon */

export abstract class TMySqlEngineCommon extends TSqlEngine
{
    DateTimeValue(dt: Date): string
    {
        return 'from_unixtime(' + Math.trunc(dt.getTime() / 1000) + ')';
    }

    GenerateGUID(): Promise<string>
    {
        return StorageEngine.ExecQuery('SELECT CONCAT("{", UPPER(UUID()), "}") AS UUID').then(DataSet =>
            DataSet.Curr.UUID);
    }
}

/* TMySqlPool */

export class TMySqlPool extends TMySqlEngineCommon
{
    constructor(private _config: MySql.PoolConfig)
    {
        super();
        this.Instance = MySql.createPool(_config);
    }

    get config(): MySql.PoolConfig
    {
        return this._config;
    }

    Shutdown(): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            this.Instance.end(err =>
            {
                if (TypeInfo.Assigned(err))
                    console.log(`%cerror in end pool: ${err.message}`, 'color:red');
                resolve();
            });
        });
    }

/* ISqlConnectionPool */

    GetConnection(): Promise<TMySqlConnection>
    {
        return new Promise((resolve, reject) =>
        {
            this.Instance.getConnection((err, conn) =>
            {
                if (TypeInfo.Assigned(err))
                    reject(err);
                else
                    resolve(new TMySqlConnection(conn));
            });
        });
    }

    ReleaseConnection(Conn: TSqlConnection): void
    {
        Conn.Release();
    }

    private Instance: MySql.Pool;
}


/* TMySqlCluster */

export class TMySqlCluster extends TMySqlEngineCommon
{
    constructor(private _config: MySql.PoolClusterConfig)
    {
        super();
        this.Instance = MySql.createPoolCluster(_config);
    }

    get config(): MySql.PoolClusterConfig
    {
        return this._config;
    }

    /**
     *  todo:
     *      cluster.add
     *      cluster.remove
     *      cluster.getConnection(*)
     */

    Shutdown(): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            this.Instance.end(err =>
            {
                if (TypeInfo.Assigned(err))
                    console.log(`%cerror in end pool: ${err.message}`, 'color:red');
                resolve();
            });
        });
    }

/* ISqlConnectionPool */

    GetConnection(): Promise<TMySqlConnection>
    {
        return new Promise((resolve, reject) =>
        {
            this.Instance.getConnection((err, conn) =>
            {
                if (TypeInfo.Assigned(err))
                    reject(err);
                else
                    resolve(new TMySqlConnection(conn));
            });
        });
    }

    ReleaseConnection(Conn: TSqlConnection): void
    {
        Conn.Release();
    }

    private Instance: MySql.PoolCluster;
}

/* TMySqlConnection */

export class TMySqlConnection extends TSqlConnection implements ITransactionSupport
{
    constructor(private Instance: MySql.Connection | MySql.PoolConnection)
    {
        super();
    }

    get Id(): number
    {
        return this.Instance.threadId;
    }

    Shutdown(Immedidate: boolean = false): Promise<void>
    {
        if (! Immedidate)
        {
            return new Promise<void>((resolve, reject) =>
            {
                (this.Instance as MySql.Connection).end(err =>
                {
                    if (TypeInfo.Assigned(err))
                        console.log(`%cerror in end connection: ${err.message}`, 'color:red');
                    resolve();
                });
            });
        }
        else
            return Promise.resolve(this.Instance.destroy());
    }

    private Query(Sql: string): Promise<{Result?: any, Fields?: Array<MySql.FieldInfo>}>
    {
        return new Promise((resolve, reject) =>
        {
            this.Instance.query(Sql, (err, result, fields) =>
            {
                if (TypeInfo.Assigned(err))
                    reject(err);
                else
                    resolve({Result: result, Fields: fields});
            });
        });
    }

/* TSqlConnection */

    Release(): void
    {
        const Connection = this.Instance as MySql.PoolConnection;
        if (TypeInfo.Assigned(Connection.release))
        {
            // console.log('PoolConnection.release()');
            Connection.release();
        }
        else
            this.Close();
    }

    Close()
    {
        this.Shutdown();
    }

    BeginTrans(): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            this.Instance.beginTransaction(err =>
            {
                if (! TypeInfo.Assigned(err))
                {
                    this._InTransaction = true;
                    resolve();
                }
                else
                    reject(err);
            });
        });
    }

    Commit(): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            this.Instance.commit(err =>
            {
                if (! TypeInfo.Assigned(err))
                {
                    this._InTransaction = false;
                    resolve();
                }
                else
                    reject(err);
            });
        });
    }

    Rollback(): Promise<void>
    {
        return new Promise<void>((resolve, reject) =>
        {
            this.Instance.rollback(() =>
            {
                this._InTransaction = false;
                resolve();
            });
        });
    }

    protected async InternalExecSQL(Sql: string): Promise<number>
    {
        const SqlRet = await this.Query(Sql);

        if (TypeInfo.Assigned(SqlRet.Result.affectedRows))
            return SqlRet.Result.affectedRows;
        else
            return SqlRet.Result.length;
    }

    protected async InternalExecSQLs(Sqls: string[]): Promise<number>
    {
        let RetVal = 0;

        for (const Sql of Sqls)
        {
            const SqlRet = await this.Query(Sql);

            if (TypeInfo.Assigned(SqlRet.Result.affectedRows))
                RetVal += SqlRet.Result.affectedRows;
            else
                RetVal += SqlRet.Result.length;
        }

        return RetVal;
    }

    protected async InternalExecQuery(Query: TSqlQuery): Promise<TDataSet>
    {
        const Sql = Query.Sql;
        const SqlRet = await this.Query(Sql);

        return new TMySqlDataSet(SqlRet.Result);
    }

    protected async InternalExecQuerys(Queries: Array<TSqlQuery>): Promise<Array<TDataSet>>
    {
        const RetVal = new Array<TDataSet>();

        for (const Query of Queries)
        {
            const Sql = Query.Sql;
            const SqlRet = await this.Query(Sql);
            RetVal.push(new TMySqlDataSet(SqlRet.Result));
        }

        return RetVal;
    }
}

/* TMySqlDataSet */

class TMySqlDataSet extends TDataSet
{
    constructor(SqlResult: any)
    {
        super(SqlResult);
    }

    protected GetEffectRows(): number
    {
        if (TypeInfo.Assigned(this._SqlResult.affectedRows))
            return this._SqlResult.affectedRows;
        else
            return 0;
    }

    protected GetIsDataSet(): boolean
    {
        return TypeInfo.IsArrayLike(this._SqlResult);
    }

    protected GetRecordCount(): number
    {
        if (this.IsDataSet)
            return this._SqlResult.length;
        else
            return 0;
    }

    protected GotoRecord(RecNo: number): any
    {
        if (! TypeInfo.Assigned(this._SqlResult))
        {
            this._RecNo = 0;
            this._Bof = this._Eof = true;
            return null;
        }

        this._Bof = RecNo < 0;
        if (this._Bof)
        {
            this._Eof = this.GetRecordCount() === 0;
            this._RecNo = 0;
            return null;
        }

        this._Eof = RecNo >= this.GetRecordCount();
        if (this._Eof)
        {
            this._Bof = this.GetRecordCount() === 0;
            this._RecNo = this.GetRecordCount() - 1;
            return null;
        }
        else
        {
            this._RecNo = RecNo;
            return this._SqlResult[RecNo];
        }
    }
}
