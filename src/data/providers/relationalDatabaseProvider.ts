import type TransactionMode from "../strategies/TransactionMode";
import DatabaseProvider, {Capabilities} from "../databaseProvider";
import ReadOnlyDict = NodeJS.ReadOnlyDict;
import AzureSqlServer from "../services/azureSqlServer";

export default class RelationalDatabaseProvider extends DatabaseProvider implements TransactionMode
{
    public capabilities: Capabilities = Capabilities.TransactionMode | Capabilities.BatchMode | Capabilities.ImmediateMode;

    private readonly service: AzureSqlServer;

    public constructor(connectionString: string) {
        super();

        this.service = new AzureSqlServer(connectionString);
    }

    public async commit(): Promise<void> {
        return;
    }

    public async execute(_statement: string, _params?: ReadOnlyDict<unknown>[]): Promise<void> {
        return await this.service.execute(_statement, _params);
    }

    public async query<T>(_statement: string, _params?: ReadOnlyDict<unknown>[]): Promise<T[] | undefined> {
        return await this.service.query(_statement, _params);
    }

    public async rollback(): Promise<void> {
        return;
    }

    public async close(): Promise<void> {
        return await this.service.close();
    }
}