import * as sql from 'mssql';
import Process from "../../runtime/process";
import ReadOnlyDict = NodeJS.ReadOnlyDict;

export default class AzureSqlServer
{
    private readonly pool: sql.ConnectionPool;

    public constructor(connectionString: string)
    {
        // NOTE: An optional callback can be passed to the connection pool. If one is provided, it will automatically
        // attempt to establish a connection. We'll handle this ourselves.
        this.pool = new sql.ConnectionPool(connectionString);
    }

    public async query<T>(statement: string, params?: ReadOnlyDict<unknown>[]) : Promise<T[] | undefined>
    {
        return await this.process((request: sql.Request) => request.query(statement), params);
    }

    public async execute(statement: string, params?: ReadOnlyDict<unknown>[]) : Promise<void>
    {
        await this.process((request: sql.Request) => request.execute(statement), params);
    }

    private async process<T>(callback: (request: sql.Request) => Promise<sql.IResult<any>>, params?: ReadOnlyDict<unknown>[]) : Promise<T[]> {
        if (!await this.connect())
        {
            throw new Error("Unable to connect to the database.");
        }

        // TODO: Depending on the execution mode, we may want to use a prepared statement.
        const request = this.pool.request();

        if (params)
        {
            for (const key in params)
            {
                request.input(key, params[key]);
            }
        }

        const response = await callback(request);

        let records: any[];

        if (Array.isArray(response.recordsets) && response.recordsets.length > 0)
        {
            records = response.recordsets.flat();
        } else {
            records = response.recordset;
        }

        return records as T[];
    }

    private async connect() : Promise<boolean> {
        if (this.pool.connected) {
            return true;
        }

        if (this.pool.connecting) {
            // Can occur if the connect call isn't awaited and a subsequent call is executed.
            console.debug(`Connection pool is already connecting.`);
            await Process.waitFor(() => !this.pool.connecting);
        } else {
            const process = new Process();

            await process.repeatUntil(async () => {
                console.debug(`Establishing connection to the database...`);
                try {
                    await this.pool.connect();
                } catch (error: unknown) {
                    console.error(error);
                    // TODO: If the error is unrecoverable, we should stop future connection attempts.
                    return false;
                }

                return true;

            }, (connected) => connected);
        }

        return this.pool.connected;
    }

    public async close() {
        console.debug(`Closing connection pool...`);
        return await this.pool.close();
    }
}