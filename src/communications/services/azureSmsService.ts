import type Message from "../messages/message";
import type CommunicationProvider from "../communicationProvider";
import type { Result } from "../communicationProvider";
import { State } from "../messages/state";
import { SmsClient, SmsSendRequest } from "@azure/communication-sms";
import type { ContactUri } from "../protocols/uri";
import Uri from "../protocols/uri";
import { Protocol } from "../protocols/protocol";
import type { ProtocolOptions } from "../communicationOptions";

export default class AzureSmsService implements CommunicationProvider {
    private readonly author: ContactUri;
    private readonly client: SmsClient;

    public constructor(options: ProtocolOptions) {
        if (!options.author) {
            throw `Azure SMS Services require an valid author URI.`;
        }

        this.author = options.author;
        this.client = new SmsClient(options.connectionString);
    }

    /**
     * Sends an SMS message to the specified recipients. Guarantees a message has been
     * sent successfully, but is not configured to guarantee delivery.
     *
     * ## Implementation notes
     * 1. **Attachments, and additional recipients are ignored.**
     * 2. Telephone numbers must be in E.164 international standard format.
     *
     * @param message SMS message to send.
     */
    public async send(message: Message): Promise<Result> {
        const request = {
            from: this.author,
            to: message.recipients.to
                .map((r) => Uri.from(r))
                .filter((u) => u.protocol === Protocol.Sms)
                .map((u) => u.path),
            message: message.content.body,
        } as SmsSendRequest;

        const results = await this.client.send(request);
        const failures = [];

        let state: State = State.Pending;
        for (const result of results) {
            if (!result.successful) {
                state = <State>(
                    (state === State.Pending || state === State.Undeliverable
                        ? State.Undeliverable
                        : State.PartiallySent)
                );
                failures.push({ uri: result.to, state: State.Undeliverable });
                continue;
            }

            state =
                state === State.Pending || state === State.Sent
                    ? State.Sent
                    : State.PartiallySent;
        }

        // Spread syntax is utilized to optionally include properties on the object.
        return {
            state: state,
            ...(failures.length > 0 && { undelivered: failures }),
        };
    }
}
