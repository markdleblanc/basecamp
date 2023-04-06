import type { ConfigurationKey, ConfigurationValue } from "./configuration";

export interface ApplicationConfigurationProvider {
    get(key: ConfigurationKey): Promise<ConfigurationValue>;
}
