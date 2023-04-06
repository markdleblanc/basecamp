import type { ContactUri } from "../protocols/uri";
import type Content from "./content";
import type Attachment from "./attachment";

export type Destination = {
    to: ContactUri[];
    additional?: ContactUri[] | undefined;
    hidden?: ContactUri[] | undefined;
};

enum CopyMode {
    Public,
    Blind,
}

export default class Message {
    public recipients: Destination;
    public content: Content;
    public attachments?: Attachment[] | undefined;
    private copyMode: CopyMode = CopyMode.Public;

    protected constructor(content: Content) {
        this.content = content;
        this.recipients = { to: [] };
    }

    public static write(title?: string, content?: string): Message {
        return new Message({ subject: title, body: content });
    }

    public to(...recipients: ContactUri[]): Message {
        if (recipients.length === 0) {
            return this;
        }

        this.recipients.to = recipients;

        return this;
    }

    public copy(...recipients: ContactUri[]): Message {
        if (recipients.length === 0) {
            return this;
        }

        const contacts = recipients;

        if (this.copyMode === CopyMode.Blind) {
            this.recipients.hidden = contacts;
        } else {
            this.recipients.additional = contacts;
        }

        return this;
    }

    public attach(...attachments: Attachment[]): Message {
        if (attachments.length === 0) {
            return this;
        }

        if (!this.attachments) {
            this.attachments = [];
        }

        this.attachments.push(...attachments);
        return this;
    }

    public get blind() {
        this.copyMode = CopyMode.Blind;
        return this;
    }

    public get visible() {
        this.copyMode = CopyMode.Public;
        return this;
    }
}
