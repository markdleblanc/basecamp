import { EmailAttachmentType, EmailClient } from "@azure/communication-email";
import type CommunicationProvider from "../communicationProvider";
import type { Result } from "../communicationProvider";
import { State } from "../messages/state";
import type Message from "../messages/message";
import type { ContactUri } from "../protocols/uri";
import Process from "../../runtime/process";
import MimeType from "../protocols/mimeType";
import Uri from "../protocols/uri";
import type { ProtocolOptions } from "../communicationOptions";

export default class AzureEmailService implements CommunicationProvider {
    public static readonly SUPPORTED_CONTENT_TYPES: Map<string, string> =
        new Map([
            [MimeType.Bmp, "bmp"],
            [MimeType.Jpeg, "jpeg"],
            [MimeType.Png, "png"],
            [MimeType.Tif, "tif"],
            [MimeType.Txt, "txt"],
            [MimeType.Doc, "doc"],
            [MimeType.Docm, "docm"],
            [MimeType.Docx, "docx"],
            [MimeType.Rtf, "rtf"],
            [MimeType.Ppt, "ppt"],
            [MimeType.Pptm, "pptm"],
            [MimeType.Pptx, "pptx"],
            [MimeType.Ppsm, "ppsm"],
            [MimeType.Ppsx, "ppsx"],
            [MimeType.Vsd, "vsd"],
            [MimeType.Xls, "xls"],
            [MimeType.Xlsb, "xlsb"],
            [MimeType.Xlsx, "xlsx"],
            [MimeType.Xlsm, "xlsm"],
            [MimeType.Pdf, "pdf"],
        ]);

    public static readonly DEFAULT_RETRY_ATTEMPTS = 3;
    public static readonly DEFAULT_RETRY_DELAY = 1000;
    public static readonly DEFAULT_RETRY_DELAY_MAXIMUM = 10_000;

    private static readonly SUCCESSFUL_DELIVERY_STATE = "outfordelivery";
    private readonly client: EmailClient;
    private readonly author: ContactUri;

    public constructor(options: ProtocolOptions) {
        if (!options.author) {
            throw `Azure Email Services require an valid author URI.`;
        }

        this.author = options.author;
        this.client = new EmailClient(options.connectionString, {
            retryOptions: {
                maxRetries:
                    options?.retry?.maxRetries ??
                    AzureEmailService.DEFAULT_RETRY_ATTEMPTS,
                retryDelayInMs:
                    options?.retry?.retryInterval ??
                    AzureEmailService.DEFAULT_RETRY_DELAY,
                maxRetryDelayInMs:
                    options?.retry?.maxRetryInterval ??
                    AzureEmailService.DEFAULT_RETRY_DELAY_MAXIMUM,
            },
        });
    }

    /**
     * Sends a message to the specified recipients, does not guarantee the recipients has, or will
     * receive the message. Does guarantee the message was sent.
     *
     * Will retry until successful send, or the maximum number of retries has been reached.
     *
     * @param message Email message to send.
     */
    public async send(message: Message): Promise<Result> {
        // Spread syntax is utilized to optionally include properties on the object.
        const response = await this.client.send({
            sender: Uri.from(this.author).path,
            content: {
                subject: message.content.subject ?? "",
                html: message.content.body ?? "",
            },
            recipients: {
                to: message.recipients.to.map((r) => ({
                    email: Uri.from(r).path,
                })),
                ...(message.recipients.additional?.length && {
                    cC: message.recipients.additional.map((r) => ({
                        email: Uri.from(r).path,
                    })),
                }),
                ...(message.recipients.hidden?.length && {
                    bCC: message.recipients.hidden.map((r) => ({
                        email: Uri.from(r).path,
                    })),
                }),
            },
            ...(message.attachments && {
                attachments: message.attachments.map((a) => ({
                    name: a.name,
                    attachmentType: AzureEmailService.toAttachmentType(a.type),
                    contentBytesBase64: a.payload,
                })),
            }),
        });

        const retry = new Process();
        const state = await retry.repeatUntil(
            async () => {
                return (await this.client.getSendStatus(response.messageId))
                    .status;
            },
            (status) =>
                status.toString().toLowerCase() ===
                AzureEmailService.SUCCESSFUL_DELIVERY_STATE
        );

        console.debug(
            'Azure Email Service: Message sent with state "%s".',
            state
        );

        return {
            state:
                state.toString().toLowerCase() ===
                AzureEmailService.SUCCESSFUL_DELIVERY_STATE
                    ? State.Sent
                    : State.Undeliverable,
        };
    }

    private static toAttachmentType(contentType: string): EmailAttachmentType {
        if (AzureEmailService.SUPPORTED_CONTENT_TYPES.has(contentType)) {
            return <EmailAttachmentType>(
                AzureEmailService.SUPPORTED_CONTENT_TYPES.get(contentType)
            );
        }

        return "txt";
    }
}
