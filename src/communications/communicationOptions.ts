import type { ContactUri } from "./protocols/uri";
import type { Protocol } from "./protocols/protocol";
import type ConnectionOptions from "../integrations/azure/connectionOptions";

/**
 * Options for our communication protocol implementations.
 *
 * @author Mark LeBlanc <hello@mark.gd>
 */
export interface ProtocolOptions extends ConnectionOptions {
    protocol?: Protocol | undefined;
    author?: ContactUri | undefined;
}

/**
 * Options for our communication service.
 *
 * @author Mark LeBlanc <hello@mark.gd>
 */
export default interface CommunicationOptions {
    protocols: ProtocolOptions[];
    whitelist?: ContactUri[] | undefined;
    blacklist?: ContactUri[] | undefined;
}
