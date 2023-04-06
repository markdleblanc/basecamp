import * as appInsights from "applicationinsights";
import type LogTransportProvider from "../logTransportProvider";
import type { Message } from "../logTransportProvider";
import {
    TelemetryType,
    TraceTelemetry,
} from "applicationinsights/out/Declarations/Contracts/index";

interface AzureTransportProviderOptions {
    /**
     * The connection string for the Azure Application Insights instance.
     */
    connectionString: string;
    /**
     * The name of the application.
     */
    moduleName?: string | undefined;
}

export default class AzureApplicationInsights implements LogTransportProvider {
    private readonly client: appInsights.TelemetryClient;

    public constructor(options: AzureTransportProviderOptions) {
        if (options.connectionString === undefined) {
            throw "Connection string is required.";
        }

        /*
            We're leveraging the Application Insights SDK to send our logs.
            However, we won't call start here as we don't want to automatically collect
            and transmit telemetry data. That'll be provided by a separate service and
            not a hidden side effect here.
         */
        appInsights.setup(options.connectionString);

        if (options.moduleName !== undefined) {
            appInsights.defaultClient.context.tags[
                appInsights.defaultClient.context.keys.cloudRole
            ] = options.moduleName;
        }

        this.client = appInsights.defaultClient;
    }

    public async send(_message: Message): Promise<boolean> {
        try {
            this.client.track(
                <TraceTelemetry>{
                    time: _message.timestamp,
                    message: _message.message,
                    severityLevel: TelemetryType.Trace,
                    properties: _message,
                },
                TelemetryType.Trace
            );
        } catch (e) {
            // TODO: Write this error to the raw STDERR stream to ensure it's not lost.
            return false;
        }
        return true;
    }

    public async flush(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.flush({callback: (response) => {
                let result: { itemsReceived: number, itemsAccepted: number };

                try {
                    result = JSON.parse(response);
                } catch (e) {
                    return resolve();
                }

                process.stdout.write(`Flushed local telemetry to Application Insights: ${response}\n`);

                if (result.itemsReceived === result.itemsAccepted) {
                    resolve();
                }

                reject(response);
            }});
        });
    }
}
