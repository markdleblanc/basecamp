import type Flushable from "../domain/flushable";

export interface Message {
    [key: string]: unknown;
    message?: string;
    trace?: string;
    timestamp?: Date;
}

export default interface LogTransportProvider extends Flushable {
    send(message: Message): Promise<boolean>;
    flush(): Promise<void>;
}
