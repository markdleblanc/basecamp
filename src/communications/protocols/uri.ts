import { Protocol } from "./protocol";

type VoiceScheme = "tel";
type EmailScheme = "mailto";
type SmsScheme = "sms";

type EmailUri = `${EmailScheme}:${string}@${string}`;
type TelephoneUri = `${VoiceScheme | SmsScheme}:${string}`;

export type ContactUri = EmailUri | TelephoneUri;

export default class Uri {
    private readonly uri: string;

    protected constructor(uri: string) {
        this.uri = uri;
    }

    public get protocol(): Protocol {
        if (Uri.isEmail(this.uri)) {
            return Protocol.Email;
        }

        if (Uri.isVoice(this.uri)) {
            return Protocol.Voice;
        }

        if (Uri.isSms(this.uri)) {
            return Protocol.Sms;
        }

        return Protocol.Unknown;
    }

    public get path(): string {
        return this.uri.slice(this.uri.indexOf(":") + 1);
    }

    public static from(uri: string) {
        return new Uri(uri);
    }

    private static isEmail(uri?: string) {
        return uri?.startsWith("mailto:") === true;
    }

    private static isVoice(uri?: string) {
        return uri?.startsWith("tel:") === true;
    }

    private static isSms(uri?: string) {
        return uri?.startsWith("sms:") === true;
    }

    public toString() {
        return this.uri;
    }
}
