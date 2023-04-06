import type ImmediateMode from "./strategies/immediateMode";
import type DatabaseProvider from "./databaseProvider";
import type BatchMode from "./strategies/batchMode";
import {Capabilities} from "./databaseProvider";
import type TransactionMode from "./strategies/TransactionMode";
import type Closeable from "../domain/closeable";

export default class Database implements Closeable {

    private readonly provider: DatabaseProvider;

    /*
     *  TODO:
     *   - Multiple strategies:
     *     - Immediate mode execution
     *     - Batch mode execution
     *     - Transaction mode execution
     *   - Return an object with a query and execute method.
     *   - Once the statements are gathered, execute them.
     */
    public constructor(provider: DatabaseProvider) {
        this.provider = provider;
    }

    public async query<T>(statement: string, params?: unknown[]) : Promise<T[] | undefined>
    {
        return await this.provider.query(statement, params);
    }

    public async execute(statement: string, params?: unknown[]) : Promise<void>
    {
        return await this.provider.execute(statement, params);
    }

    public get immediate() : ImmediateMode
    {
            return this.provider as ImmediateMode;
    }

    public get batch() : BatchMode
    {
        if (this.provider.capabilities & Capabilities.BatchMode) {
            return this.provider as unknown as BatchMode;
        }

        throw new Error("The database provider does not support batch mode.");
    }

    public get transaction() : TransactionMode
    {
        if (this.provider.capabilities & Capabilities.TransactionMode) {
            return this.provider as unknown as TransactionMode;
        }

        throw new Error("The database provider does not support transaction mode.");
    }

    public async close(): Promise<void> {
        return await this.provider.close();
    }
}