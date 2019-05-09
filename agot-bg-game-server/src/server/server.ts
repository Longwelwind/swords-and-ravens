import {Server} from "ws";
import GlobalServer from "./GlobalServer";
import * as dotenv from "dotenv";
dotenv.config();

const wsServer = new Server({port: parseInt(process.env.PORT || "5000")});

const globalServer = new GlobalServer(wsServer);
globalServer.start();
