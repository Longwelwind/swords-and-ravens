import * as React from 'react';
import User from "../../server/User";
import EntireGame from '../../common/EntireGame';
import Player from '../../common/ingame-game-state/Player';
import ConditionalWrap from './ConditionalWrap';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';


export default function getUserLinkOrLabel(entireGame: EntireGame, user: User, player: Player | null, houseNames: boolean | undefined = false): JSX.Element {
    const displayName = !houseNames || !player
        ? user.name
        : player.house.name;

    return <ConditionalWrap
        condition={!player}
        wrap={children =>
            <OverlayTrigger
                overlay={
                    <Tooltip id="user-is-spectator-tooltip">
                        This user does not participate in the game
                    </Tooltip>
                }
                placement="auto"
                delay={{ show: 250, hide: 0 }}
            >
                {children}
            </OverlayTrigger>
        }
    >
        {   /* Spectators are shown in burlywood brown: #deb887 */
            !entireGame.gameSettings.faceless
                ? <a href={`/user/${user.id}`} target="_blank" rel="noopener noreferrer" style={{ color: player?.house.color ?? "#deb887" }}>{displayName}</a>
                : <span style={{ color: player?.house.color ?? "#deb887" }}>{displayName}</span>
        }
    </ConditionalWrap>;
}