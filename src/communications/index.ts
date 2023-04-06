/**
 * Sample usage of the Communications module.
 */
import * as fs from "fs";
import CommunicationClient from "./communicationClient";
import MimeType from "./protocols/mimeType";
import Message from "./messages/message";

const service = new CommunicationClient({
    protocols: [
        {
            /*
             * Protocol can be explicitly specified, or it will be inferred from the author URI schema.
             * - Author is optional, but all current protocols require it.
             */
            author: "mailto:author@hostname.tld",
            connectionString:
                "endpoint=https://hostname.tld/;accesskey=accesskey;entitypath=entitypath",
        },
    ],
});

// Sample file load query for demonstration purposes.
const encoded = fs.readFileSync("./data/chart.png").toString("base64");

const message = Message.write("Communication Module", "Hello, world!")
    .to("mailto:username@hostname.tld")
    .copy("mailto:username@hostname.tld")
    .blind.copy("mailto:username@hostname.tld")
    .attach({ name: "chart.png", type: MimeType.Png, payload: encoded });

service
    .send(message)
    .then((result) => {
        // Result will contain the state, and any recipients that weren't reachable.
        console.log(result);
    })
    .catch((error) => {
        console.error(error);
    });
