import Reflection from "../runtime/reflection";
import type LogTransportProvider from "./logTransportProvider";
import LocalConsoleService from "./services/localConsoleService";
import type Flushable from "../domain/flushable";

/**
 * Default level classifications for each log request.
 *
 * @author Mark LeBlanc <hello@mark.gd>
 */
export enum Level {
    Info = "info",
    Warn = "warn",
    Error = "error",
    Debug = "debug",
    Trace = "trace",
}

/**
 * Configurable options for the logger. Allows for the optional overriding of the default log levels
 * and specifying which log levels should be captured.
 */
export interface LoggerOptions {
    levelOverrides?: Record<Level, string>;
    levels?: Level[];
}

/**
 * Simple logging module that proxies the native console object and redirects the output
 * to the configured transport channel in a structured format.
 *
 * @author Mark LeBlanc <hello@mark.gd>
 */
export default class Logger implements Flushable {
    private readonly levelOverrides?: Record<Level, string> | undefined;
    private readonly levels: string[] = [
        Level.Info,
        Level.Warn,
        Level.Error,
        Level.Debug,
        Level.Trace,
    ];
    private readonly provider: LogTransportProvider;

    private promises: Promise<boolean>[] = [];
    private proxy?: Reflection;

    /**
     *
     * @param provider
     * @param options
     */
    public constructor(
        provider?: LogTransportProvider,
        options?: LoggerOptions
    ) {
        this.provider = provider ?? new LocalConsoleService();

        if (options?.levelOverrides) {
            this.levelOverrides = options.levelOverrides;
        }

        if (options?.levels) {
            this.levels = options.levels;
        }
    }

    public apply() {
        this.proxy = new Reflection(global.console)
            .save()
            .inject(
                "log",
                ((...args: any[]) => {
                    if (!this.levels.includes(Level.Info)) {
                        return;
                    }

                    return this.log({
                        message: args.length > 0 ? args[0] : Level.Info,
                        level: this.levelOverrides?.info ?? Level.Info,
                        ...args.slice(1),
                    });
                }).bind(this)
            )
            .inject(
                "info",
                ((...args: any) => {
                    if (!this.levels.includes(Level.Info)) {
                        return;
                    }

                    return this.log({
                        message: args.length > 0 ? args[0] : Level.Info,
                        level: this.levelOverrides?.info ?? Level.Info,
                        ...args.slice(1),
                    });
                }).bind(this)
            )
            .inject(
                "warn",
                ((...args: any) => {
                    if (!this.levels.includes(Level.Warn)) {
                        return;
                    }

                    return this.log({
                        message: args.length > 0 ? args[0] : Level.Warn,
                        level: this.levelOverrides?.warn ?? Level.Warn,
                        ...args.slice(1),
                    });
                }).bind(this)
            )
            .inject(
                "error",
                ((...args: any) => {
                    if (!this.levels.includes(Level.Error)) {
                        return;
                    }

                    return this.log({
                        message: args.length > 0 ? args[0] : Level.Error,
                        level: this.levelOverrides?.error ?? Level.Error,
                        ...args.slice(1),
                    });
                }).bind(this)
            )
            .inject(
                "debug",
                ((...args: any) => {
                    if (!this.levels.includes(Level.Debug)) {
                        return;
                    }

                    return this.log({
                        message: args.length > 0 ? args[0] : Level.Debug,
                        level: this.levelOverrides?.debug ?? Level.Debug,
                        ...args.slice(1),
                    });
                }).bind(this)
            )
            .inject(
                "trace",
                ((...args: any) => {
                    if (!this.levels.includes(Level.Trace)) {
                        return;
                    }

                    return this.log({
                        message: args.length > 0 ? args[0] : Level.Trace,
                        level: this.levelOverrides?.trace ?? Level.Trace,
                        ...args.slice(1),
                    });
                }).bind(this)
            )
            .apply();
        return this;
    }

    public log(args: object) {
        this.promises.push(
            this.provider.send({ timestamp: new Date(), ...args })
        );
    }

    public static writeToStdout(message: string) {
        process.stdout.write(message + "\n");
    }

    public async flush() {
        await this.provider.flush();
        this.proxy?.restore();
    }
}
