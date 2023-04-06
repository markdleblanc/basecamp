import Process from "../runtime/process";
import type { ApplicationConfigurationProvider } from "./applicationConfigurationProvider";
import { LocalConfigurationProvider } from "./providers/localConfigurationProvider";
import { RemoteConfigurationProvider } from "./providers/remoteConfigurationProvider";
import type { ConfigurationOptions } from "./configurationOptions";

type TaggedKey = { key: string; tag: string };
type TaggedValue<T = unknown> = { tag?: string | undefined; value: T };

export type ConfigurationKey = string | TaggedKey;
export type ConfigurationValue = TaggedValue | undefined;

/**
 * Wraps T with an entry-time into the cache.
 */
type CacheEntry = {
    entryTime: Date;
    ttl: number;
    value: unknown;
    tag?: string | undefined;
};

export default class Configuration {
    /**
     * Where no cache TTL is provided, default to 10 minutes.
     */
    public static readonly DEFAULT_CACHE_TTL = 60 * 10_000;
    private static readonly DEFAULT_CONFIGURATION_PROVIDER =
        new LocalConfigurationProvider();

    private readonly cacheTTL: number;

    private provider: ApplicationConfigurationProvider =
        Configuration.DEFAULT_CONFIGURATION_PROVIDER;
    private initialization?: boolean;

    private cache: Map<string, CacheEntry> = new Map<string, CacheEntry>();

    public constructor(options?: ConfigurationOptions) {
        if (options?.cacheTimeToLive) {
            this.cacheTTL = options.cacheTimeToLive;
        } else {
            this.cacheTTL = Configuration.DEFAULT_CACHE_TTL;
        }

        if (options?.connectionStringKeyName) {
            Configuration.DEFAULT_CONFIGURATION_PROVIDER.get(
                options.connectionStringKeyName
            ).then((r) => {
                if (!r?.value) {
                    // Do nothing, default to the environment provider.
                    this.initialization = false;
                    return;
                }

                this.provider = new RemoteConfigurationProvider(
                    <string>r.value
                );
                this.initialization = true;
            });
        } else {
            this.initialization = true;
        }
    }

    public async get<T = unknown>(key: string): Promise<T | undefined> {
        const entry = this.cache.get(key);

        if (!this.isExpired(entry)) {
            console.debug(`Cache hit for key ${key}`);
            return entry?.value as T;
        }

        if (this.initialization === undefined) {
            await Process.waitFor(() => this.initialization !== undefined);
        }

        if (this.initialization === undefined) {
            console.warn("Configuration initialization failed.");
        }

        const result = await this.provider.get(key);

        if (!result) {
            console.debug(`Configuration key ${key} not found.`);
            this.cache.delete(key);
            return undefined;
        }

        if (entry?.tag && entry.tag == result?.tag) {
            console.debug(`Configuration key ${key} has not changed.`);
            entry.entryTime = new Date();
            return entry.value as T;
        }

        this.cache.set(key, {
            value: result.value,
            entryTime: new Date(),
            ttl: this.cacheTTL,
            tag: result.tag,
        });

        return result.value as T;
    }

    private isExpired = (cache?: CacheEntry) =>
        cache == null || Date.now() - cache.entryTime.getTime() > cache.ttl;
}
