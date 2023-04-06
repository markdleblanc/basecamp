/**
 * Runtime utilities for long-running processes.
 *
 * @author Mark LeBlanc <hello@mark.gd>
 */
export default class Process {
    public static readonly DEFAULT_INITIAL_REPEAT_DELAY_MS = 1000;
    public static readonly DEFAULT_MAXIMUM_REPEAT_ATTEMPTS = 5;
    public static readonly DEFAULT_REPEAT_STRATEGY = "exponential";

    private readonly maximumRepeats: number =
        Process.DEFAULT_MAXIMUM_REPEAT_ATTEMPTS;
    private readonly repeatStrategy: "exponential" | "linear" =
        Process.DEFAULT_REPEAT_STRATEGY;
    private readonly delayMs: number = Process.DEFAULT_INITIAL_REPEAT_DELAY_MS;

    /**
     * Configures the Process object to use the specified options for retries or the default values.
     * @see Process.DEFAULT_MAXIMUM_REPEAT_ATTEMPTS
     * @see Process.DEFAULT_INITIAL_REPEAT_DELAY_MS
     * @see Process.DEFAULT_REPEAT_STRATEGY
     *
     * @param options Optional overrides for the default retry options.
     * @param options.strategy The strategy to use for retrying the process.
     * @param options.attempts The maximum number of attempts to retry the process.
     * @param options.delayMs The initial delay in milliseconds to wait before retrying the process.
     */
    public constructor(options?: {
        strategy?: "exponential" | "linear" | undefined;
        attempts?: number | undefined;
        delayMs?: number | undefined;
    }) {
        if (options?.strategy) {
            this.repeatStrategy = options.strategy;
        }

        if (options?.attempts) {
            this.maximumRepeats = options.attempts;
        }

        if (options?.delayMs) {
            this.delayMs = options.delayMs;
        }
    }

    /**
     * Executes the provided function until the predicate returns true, or the maximum number of
     * attempts is reached.
     *
     * @param callback The function to execute
     * @param predicate The function to determine if the process should continue
     * @returns T | undefined Response from the callback.
     */
    public async repeatUntil<T>(
        callback: () => Promise<T>,
        predicate: (result: T) => boolean
    ) {
        const retry = async (retries = 0): Promise<T> => {
            const result = await callback();

            if (predicate(result) || retries > this.maximumRepeats) {
                return result;
            }

            await Process.sleep(this.nextInterval(this.delayMs, retries));

            return retry(retries + 1);
        };

        return await retry();
    }

    public static async waitFor(
        predicate: () => boolean,
        maximumAttempts = 500
    ) {
        let currentAttempt = 1;
        const wait = async (
            predicate: () => boolean,
            attempts: number
        ): Promise<boolean> => {
            if (attempts <= 0) {
                return false;
            }

            if (predicate()) {
                return true;
            }

            await Process.sleep(10 * currentAttempt);
            currentAttempt++;
            return wait(predicate, attempts - 1);
        };

        return await wait(predicate, maximumAttempts);
    }

    /**
     * Returns a promise that will resolve after the specified number of milliseconds has elapsed.
     *
     * @param milliseconds Duration to sleep for.
     */
    public static async sleep(milliseconds: number) {
        return new Promise((res) => setTimeout(res, milliseconds));
    }

    private nextInterval(delayMs: number, attempts: number) {
        switch (this.repeatStrategy) {
            case "exponential":
                return delayMs * 2 ** attempts;
            case "linear":
                return delayMs * attempts;
        }
    }
}
