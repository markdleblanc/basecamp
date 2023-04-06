import * as dotenv from "dotenv";

export class EnvironmentConfigurationService {
    public static readonly OBJECT_SEPARATOR = ".";
    public static readonly ARRAY_TOKEN = "__";
    private static readonly ARRAY_REGEX = new RegExp(
        `${EnvironmentConfigurationService.ARRAY_TOKEN}\\d+${EnvironmentConfigurationService.ARRAY_TOKEN}`
    );

    public constructor() {
        const configuration = dotenv.config({});
        if (configuration.error) {
            throw configuration.error;
        }
    }

    /**
     * Get the value of the environment variable with the given key. Supports nested objects and arrays.
     *
     * 1. Object properties are referenced by using the OBJECT_SEPARATOR character.
     * 2. Array properties are referenced by using the ARRAY_TOKEN character.
     *
     * \
     * @example
     * ```
     * # .env
     * application.name = "My Application"
     * application.version = "1.0.0"
     * application.authors__0__= "John Doe"
     * application.authors__1__= "Jane Smith"
     *
     * service.protocols__0__.name = "http"
     * service.protocols__0__.port = 80
     * service.protocols__1__.name = "https"
     * service.protocols__1__.port = 443
     * service.protocols__1__.whitelist__0__ = "0.0.0.0/0"
     * ```
     *
     * @see EnvironmentConfigurationService.OBJECT_SEPARATOR
     * @see EnvironmentConfigurationService.ARRAY_TOKEN
     *
     * @param key
     */
    public getValue(key: string) {
        const keys = Object.keys(process.env).filter((k) => k.startsWith(key));
        if (
            keys?.length == 1 &&
            keys[0]?.indexOf(
                EnvironmentConfigurationService.OBJECT_SEPARATOR
            ) == -1 &&
            keys[0]?.indexOf(EnvironmentConfigurationService.ARRAY_TOKEN) == -1
        ) {
            return process.env[key];
        }

        let configuration: Record<string | symbol, unknown> = {};
        for (const k of keys) {
            configuration = this.build(k, process.env[k] ?? "", configuration);
        }

        return configuration[key];
    }

    private build(
        key: string,
        value: string,
        object: Record<string | symbol, unknown>
    ): Record<string | symbol, unknown> {
        const separatorIndex = key.indexOf(
            EnvironmentConfigurationService.OBJECT_SEPARATOR
        );
        const isArray =
            key.indexOf(EnvironmentConfigurationService.ARRAY_TOKEN) != -1;
        const isObject = separatorIndex != -1;

        if (!isObject && !isArray) {
            return { ...object, [key]: value };
        }

        if (!isObject && isArray) {
            const prop = key.substring(
                0,
                key.indexOf(EnvironmentConfigurationService.ARRAY_TOKEN)
            );
            const val = [...(<unknown[]>object[prop] ?? []), value];

            return { ...object, [prop]: val };
        }

        const rootKey = key.substring(
            0,
            isObject ? separatorIndex : key.length
        );
        const arrayMatch = rootKey.match(
            EnvironmentConfigurationService.ARRAY_REGEX
        );

        if (!isArray || !arrayMatch) {
            return {
                ...object,
                [rootKey]: this.build(
                    key.slice(separatorIndex + 1),
                    value,
                    <{ [key: string | symbol]: unknown }>object[rootKey] ?? {}
                ),
            };
        }

        const index = parseInt(
            arrayMatch[0].substring(2, arrayMatch[0].length - 2)
        );
        const property = rootKey.substring(0, rootKey.indexOf(arrayMatch[0]));

        const arrayValues = <unknown[]>object[property] ?? [];
        const arrayItem = this.build(
            key.substring(
                key.indexOf(arrayMatch[0]) + arrayMatch[0].length + 1
            ),
            value,
            <{ [key: string | symbol]: unknown }>arrayValues[index] ?? {}
        );

        if (arrayValues.length <= index) {
            arrayValues.push(arrayItem);
        } else {
            if (typeof arrayItem === "object") {
                arrayValues[index] = {
                    ...(<object>arrayValues[index]),
                    ...arrayItem,
                };
            } else {
                arrayValues[index] = arrayItem;
            }
        }

        return { ...object, [property]: arrayValues };
    }
}
