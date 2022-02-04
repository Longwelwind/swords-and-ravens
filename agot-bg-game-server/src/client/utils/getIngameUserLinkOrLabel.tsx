import * as React from 'react';
import User from "../../server/User";
import IngameGameState from "../../common/ingame-game-state/IngameGameState";

export default function getIngameUserLinkOrLabel(ingame: IngameGameState, user: User): JSX.Element {
    return !ingame.entireGame.gameSettings.faceless
        ? <a href={`/user/${user.id}`} target="_blank" rel="noopener noreferrer">{user.name}</a>
        : <>{user.name}</>;
}