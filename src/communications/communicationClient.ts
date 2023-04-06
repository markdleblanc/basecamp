import type { Result } from "./communicationProvider";
import type Message from "./messages/message";
import Uri, { ContactUri } from "./protocols/uri";
import { Protocol } from "./protocols/protocol";
import type CommunicationOptions from "./communicationOptions";
import AzureEmailService from "./services/azureEmailService";
import type CommunicationProvider from "./communicationProvider";
import AzureSmsService from "./services/azureSmsService";
import { State } from "./messages/state";

/**
 * Communication client implementation for sending messages to our customers.
 *
 * @todo
 *  - Add support for SMS
 *  - Migrate to an API based implementation
 *  - Message body format and encoding
 *  - Logging and error alerts
 *  - Queue failed messages for redelivery
 *
 * @author Mark LeBlanc <hello@mark.gd>
 */
export default class CommunicationClient implements CommunicationProvider {
    private readonly options: CommunicationOptions;

    private readonly services: Map<Protocol, CommunicationProvider> = new Map<
        Protocol,
        CommunicationProvider
    >();

    public constructor(options: CommunicationOptions) {
        this.options = options;

        for (const service of options.protocols) {
            if (service.protocol == null && service.author == null) {
                console.warn(
                    "No protocol or author specified for communication service."
                );
                continue;
            }

            let protocol: Protocol | undefined = service.protocol;
            if (!protocol && service.author) {
                protocol = Uri.from(service.author).protocol;
            }

            if (protocol === Protocol.Email) {
                this.services.set(protocol, new AzureEmailService(service));
            } else if (protocol === Protocol.Sms) {
                this.services.set(protocol, new AzureSmsService(service));
            }
        }
    }

    /**
     * Attempts to send a message to the specified recipients through the configured delivery service(s).
     * Recipients must be specified with a valid contact URI.
     *
     * @param message The message to send and recipients to send to.
     * @returns Result of the message delivery, including recipients that weren't included.
     */
    public async send(message: Message): Promise<Result> {
        const processRecipients =
            (blind?: boolean, carbon?: boolean) => (r: ContactUri) => ({
                blind: blind ?? false,
                carbon: carbon ?? false,
                recipient: r,
            });
        const removeRecipient = (
            blind: boolean,
            carbon: boolean,
            message: Message,
            recipient: ContactUri
        ) => {
            if (blind) {
                message.recipients.hidden?.splice(
                    message.recipients.hidden?.indexOf(recipient),
                    1
                );
            } else if (carbon) {
                message.recipients.additional?.splice(
                    message.recipients.additional?.indexOf(recipient),
                    1
                );
            } else {
                message.recipients.to.splice(
                    message.recipients.to.indexOf(recipient),
                    1
                );
            }
        };

        const recipients = [
            ...(message.recipients.to.map(processRecipients(false, false)) ??
                []),
            ...(message.recipients?.additional?.map(
                processRecipients(false, true)
            ) ?? []),
            ...(message.recipients.hidden?.map(
                processRecipients(true, false)
            ) ?? []),
        ];
        const unsupportedRecipients = [];
        const promises = [];

        // Batch all recipients together based on the protocol retrieved from the URI scheme.
        // Call the send function once for each protocol with only the recipients for that protocol.
        const batches = new Map<Protocol, Message>();

        for (const { blind, carbon, recipient } of recipients) {
            // If we have a whitelist, ensure the recipient is in it before proceeding.
            if (
                this.options.whitelist &&
                !this.options.whitelist.includes(recipient)
            ) {
                console.debug(
                    `Recipient ${recipient} not in whitelist.`,
                    this.options.whitelist
                );
                removeRecipient(blind, carbon, message, recipient);
                unsupportedRecipients.push(recipient);
                continue;
            }

            // If we have a blacklist, ensure the recipient is not in it before proceeding.
            if (
                this.options.blacklist &&
                this.options.blacklist.includes(recipient)
            ) {
                console.debug(
                    `Recipient ${recipient} in blacklist.`,
                    this.options.blacklist
                );
                removeRecipient(blind, carbon, message, recipient);
                unsupportedRecipients.push(recipient);
                continue;
            }

            const uri = Uri.from(recipient);

            if (!this.services.has(uri.protocol)) {
                console.debug(
                    `No service configured for recipient ${recipient} protocol ${uri.protocol}.`
                );
                removeRecipient(blind, carbon, message, recipient);
                unsupportedRecipients.push(uri.toString());
                continue;
            }

            // TODO: Validate the recipient address is valid for the protocol, and where the capability exists validate that the recipient address actually exists.

            if (!batches.has(uri.protocol) && this.services.has(uri.protocol)) {
                // TODO: Convert to a message specific to the protocol and exclude any recipients that are not supported by it.
                batches.set(uri.protocol, message);
            }
        }

        for (const [protocol, message] of batches) {
            const service = this.services.get(protocol);

            if (!service) {
                continue;
            }

            promises.push(service.send(message));
        }

        const failures = [];
        const undelivered = [];
        let hasOneOrMoreMessagesBeenDelivered = false;

        for (const result of await Promise.allSettled(promises)) {
            if (result.status === "rejected") {
                failures.push(result.reason);
                continue;
            }

            if (
                result.value.state === State.Sent ||
                result.value.state === State.PartiallySent
            ) {
                hasOneOrMoreMessagesBeenDelivered = true;
            }

            if (
                result.value.undelivered &&
                result.value.undelivered.length > 0
            ) {
                undelivered.push(...result.value.undelivered);
            }
        }

        const state = hasOneOrMoreMessagesBeenDelivered
            ? undelivered.length > 0 || unsupportedRecipients.length > 0
                ? State.PartiallySent
                : State.Sent
            : State.Undeliverable;

        return {
            state: state,
            undelivered: [
                ...unsupportedRecipients.map((u) => ({ uri: u })),
                ...undelivered,
            ],
        };
    }
}
