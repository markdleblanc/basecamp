import type ImmediateMode from "./strategies/immediateMode";
import type Closeable from "../domain/closeable";

export enum Capabilities {
    ImmediateMode = 1,
    BatchMode = 2,
    TransactionMode = 4
}

export default abstract class DatabaseProvider implements ImmediateMode, Closeable
{
    abstract capabilities: Capabilities;

    abstract execute(statement: string, params?: unknown[]): Promise<void>;

    abstract query<T>(statement: string, params?: unknown[]): Promise<T[] | undefined>;

    abstract close(): Promise<void>;
}