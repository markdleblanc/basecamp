import Configuration from "./config/configuration";
import CommunicationClient from "./communications/communicationClient";
import type CommunicationOptions from "./communications/communicationOptions";
import type { LoggerOptions } from "./logging/logger";
import Logger from "./logging/logger";
import type { ConfigurationOptions } from "./config/configurationOptions";
import type LogTransportProvider from "./logging/logTransportProvider";
import AzureApplicationInsights from "./logging/services/azureApplicationInsights";
import LocalConsoleService from "./logging/services/localConsoleService";
import Database from "./data/database";
import RelationalDatabaseProvider from "./data/providers/relationalDatabaseProvider";

export interface Context {
    configuration: Configuration;
    communications: CommunicationClient;
    database: Database;
}

export interface ApplicationOptions {
    configurationOptions?: ConfigurationOptions;
}

export default class Foundation {
    private readonly _options?: ApplicationOptions | undefined;
    private hasCrashOccurred: boolean | undefined;

    public constructor(options?: ApplicationOptions) {
        this._options = options;
    }

    public async setup<T>(
        callback: (context: Context) => Promise<T>
    ): Promise<T> {
        // Configure application context and dependencies.
        const configuration = new Configuration(
            this._options?.configurationOptions
        );

        const communicationClient = new CommunicationClient(
            (await configuration.get<CommunicationOptions>(
                "communication"
            )) ?? {
                protocols: [],
            }
        );

        const loggerOptions = (await configuration.get<
            LoggerOptions & { channel: "azure" | "local"; connection: unknown }
        >("logger")) ?? {
            channel: "local",
        };

        let transport: LogTransportProvider;

        switch (loggerOptions.channel) {
            case "azure":
                transport = new AzureApplicationInsights({
                    connectionString: loggerOptions.connection as string,
                });
                break;
            default:
                transport = new LocalConsoleService();
        }

        const logger = new Logger(
            transport,
            <LoggerOptions>loggerOptions
        ).apply();

        const database = new Database(new RelationalDatabaseProvider((await configuration.get<string>("database")) ?? ""));

        const context: Context = {
            configuration: configuration,
            communications: communicationClient,
            database: database
        };

        process.on("beforeExit", async () => {
            // Emergency, in-case of application crash.
            if (this?.hasCrashOccurred !== false) {
                console.error(`Crash has occurred! Attempting to flush logs.`);
                await database.close();
                await logger.flush();
            }
        });

        const result = await callback(context);

        await database.close();
        await logger.flush();

        this.hasCrashOccurred = false;
        return result;
    }
}
