import {Server} from "ws";
import GlobalServer from "./GlobalServer";
import * as dotenv from "dotenv";
import * as Sentry from "@sentry/node";
dotenv.config();

// Setup Sentry
if (process.env.SENTRY_DSN) {
    const SENTRY_DSN = process.env.SENTRY_DNS;
    
    Sentry.init({dsn: SENTRY_DSN});
}

const wsServer = new Server({port: parseInt(process.env.PORT || "5000")});

const globalServer = new GlobalServer(wsServer);
globalServer.start();
