import type { ApplicationConfigurationProvider } from "../applicationConfigurationProvider";
import { AzureConfigurationService } from "../services/azureConfigurationService";
import type { ConfigurationKey, ConfigurationValue } from "../configuration";

export class RemoteConfigurationProvider
    implements ApplicationConfigurationProvider
{
    private serviceProvider: AzureConfigurationService;

    public constructor(connectionString: string) {
        this.serviceProvider = new AzureConfigurationService(connectionString);
    }

    public async get(key: ConfigurationKey): Promise<ConfigurationValue> {
        const isTaggedKey = typeof key === "object";
        const etag = isTaggedKey ? key.tag : undefined;

        const result = await this.serviceProvider.getConfigurationSetting(
            isTaggedKey ? key.key : key,
            etag
        );

        if (!result) {
            return undefined;
        }

        return {
            value: result.value,
            tag: result.etag,
        };
    }
}
