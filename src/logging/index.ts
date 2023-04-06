/**
 * Sample usage of the Logging module.
 */
import Configuration from "../config/configuration";
import AzureApplicationInsights from "./services/azureApplicationInsights";
import Logger from "./logger";

const configuration = new Configuration({
    connectionStringKeyName: "AzureApplicationConfigurationConnectionString",
});

(async () => {
    const telemetryConnectionString = await configuration.get<string>(
        "AzureApplicationInsightsConnectionString"
    );

    console.log(`Telemetry connection string: ${telemetryConnectionString}`);

    if (!telemetryConnectionString) {
        throw new Error("Telemetry connection string is not set.");
    }

    const logger = new Logger(
        new AzureApplicationInsights({
            connectionString: telemetryConnectionString,
        }),
        {
            // ... customization
        }
    ).apply();

    console.log("Proxies application log");
    console.info("Proxies application info");
    console.warn("Proxies application warning message");
    console.error("Proxies application error message");
    console.debug("Proxies application debug message");

    await logger.flush();

    console.log("Local application log");
    console.info("Local application info");
    console.warn("Local application warning message");
    console.error("Local application error message");
    console.debug("Local application debug message");
})();
