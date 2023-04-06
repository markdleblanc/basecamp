export default interface Flushable {
    flush(): Promise<void>;
}