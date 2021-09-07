import App from "./App";
import * as ReactDOM from "react-dom";
import * as React from "react";
import "./style/custom.scss";
import GameClient, {AuthData} from "./GameClient";

function getAuthData(): AuthData {
    const urlContent = location.hash.substr(1);
    const urlData = urlContent.split('.');
    const userId = urlData[0];
    const gameId = urlData.length > 1 ? urlData[1] : "1";
    const authToken = urlData.length > 2 ? urlData[2] : userId;

    if (!userId) {
        throw new Error("No user id in the URL");
    }

    return {userId, gameId, authToken};
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
