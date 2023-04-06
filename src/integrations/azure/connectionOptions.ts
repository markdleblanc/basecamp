import type RetryOptions from "../retryOptions";

export default interface ConnectionOptions
{
    connectionString: string;
    retry?: RetryOptions;
}