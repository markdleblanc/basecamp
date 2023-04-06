import type BatchMode from "./batchMode.js";

export default interface TransactionMode extends BatchMode
{
    rollback() : Promise<void>;
}