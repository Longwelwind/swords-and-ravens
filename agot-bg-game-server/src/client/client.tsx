import App from "./App";
import * as ReactDOM from "react-dom";
import * as React from "react";
import "./style/custom.scss";
import GameClient, {AuthData} from "./GameClient";

function getAuthData(): AuthData {
    if (process.env.NODE_ENV == "development") {
        // In development, parse the URL to find the user id with
        // which we should authenticate.
        // Other fields are dumb fields that won't be read by the server.
        const userId = location.hash.substr(1);

        if (!userId) {
            throw new Error("No user id in the URL");
        }

        return {userId, gameId: "1", authToken: userId}
    } else if (process.env.NODE_ENV == "production") {
        // Find the data that has been included in the HTML by Django
        const authDataElement = document.getElementById("auth-data");
        if (!authDataElement) {
            throw new Error("No auth data available, can't authenticate to the server");
        }
        const textContent = authDataElement.textContent;
        if (!textContent) {
            throw new Error("\"auth-data\" exists, but no auth data available, can't authenticate to the server");
        }
        return JSON.parse(textContent);
    } else {
        throw new Error("NODE_ENV was not set to \"development\" nor \"production\"");
    }
}

const authData = getAuthData();

const gameClient = new GameClient(authData);

ReactDOM.render(
    <App gameClient={gameClient} />,
    document.getElementById("root")
);

gameClient.start();

declare global {
    interface Window {
        gameClient: GameClient;
    }
}

window["gameClient"] = gameClient;
