import type Message from "./messages/message";
import type { State } from "./messages/state";

/**
 * Represents the result of a communication attempt. Includes a listing of recipients
 * that weren't deliver to, and the reason why. As well as the overall state of the
 * attempt.
 *
 * @author Mark LeBlanc <hello@mark.gd>
 */
export type Result = {
    undelivered?: { uri: string; state?: State }[] | undefined;
    state: State;
};

/**
 * General purpose abstraction for sending messages to users.
 *
 * @author Mark LeBlanc <hello@mark.gd>
 */
export default interface CommunicationProvider {
    send(message: Message): Promise<Result>;
}
