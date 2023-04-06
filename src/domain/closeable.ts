export default interface Closeable
{
    close(): Promise<void>;
}