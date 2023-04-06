import { AppConfigurationClient } from "@azure/app-configuration";

/**
 * Base module for managing API configurations.
 *
 * @author Mark LeBlanc <hello@mark.gd>
 */
export class AzureConfigurationService {
    private client: AppConfigurationClient;

    public constructor(connectionString: string) {
        this.client = new AppConfigurationClient(connectionString);
    }

    public async getConfigurationSetting(key: string, etag?: string) {
        try {
            const setting = await this.client.getConfigurationSetting({
                key: key,
                ...(etag && { etag: etag }),
            });

            return {
                value: setting.value,
                etag: setting.etag,
            };
        } catch (e) {
            return undefined;
        }
    }
}
