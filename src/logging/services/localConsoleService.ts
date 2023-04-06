import type LogTransportProvider from "../logTransportProvider";
import type { Message } from "../logTransportProvider";

export default class LocalConsoleService implements LogTransportProvider {
    public async send(_message: Message): Promise<boolean> {
        /**
         * We're injecting our implementation into the global console, so it's not necessary to
         * send the message to the console again.
         */
        return true;
    }

    public async flush(): Promise<void> {
        return;
    }
}
