import type { ApplicationConfigurationProvider } from "../applicationConfigurationProvider";
import { EnvironmentConfigurationService } from "../services/environmentConfigurationService";
import type { ConfigurationKey, ConfigurationValue } from "../configuration";

export class LocalConfigurationProvider
    implements ApplicationConfigurationProvider
{
    private serviceProvider: EnvironmentConfigurationService;

    public constructor() {
        this.serviceProvider = new EnvironmentConfigurationService();
    }

    public async get(key: ConfigurationKey): Promise<ConfigurationValue> {
        if (typeof key === "string") {
            return {
                value: this.serviceProvider.getValue(key),
            } as ConfigurationValue;
        }

        return {
            value: this.serviceProvider.getValue(key.key),
        } as ConfigurationValue;
    }
}
