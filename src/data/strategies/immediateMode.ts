export default interface ImmediateMode
{
    query<T>(statement: string, params?: unknown[]) : Promise<T[] | undefined>;
    execute(statement: string, params?: unknown[]) : Promise<void>;
}