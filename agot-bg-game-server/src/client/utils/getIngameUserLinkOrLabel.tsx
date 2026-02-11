import * as React from "react";
import User from "../../server/User";
import ConditionalWrap from "./ConditionalWrap";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import EntireGame from "../../common/EntireGame";

function banUser(user: User, entireGame: EntireGame): void {
  if (
    !window.confirm(
      "Are you sure you want to ban '" + user.name + "' from your game?",
    )
  ) {
    return;
  }

  entireGame.sendMessageToServer({
    type: "ban-user",
    userId: user.id,
  });
}

export default function getUserLinkOrLabel(
  user: User,
  houseNames?: boolean,
  showBanButton?: boolean,
): JSX.Element {
  const entireGame = user.entireGame;
  const player = entireGame.ingameGameState?.players.tryGet(user, null) ?? null;
  const displayName = !houseNames || !player ? user.name : player.house.name;

  return (
    <>
      <ConditionalWrap
        condition={!player}
        wrap={(children) => (
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
        )}
      >
        {
          /* Spectators are shown in burlywood brown: #deb887 */
          !entireGame.gameSettings.faceless ? (
            <a
              href={`/user/${user.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: player?.house.color ?? "#deb887" }}
            >
              {displayName}
            </a>
          ) : (
            <span style={{ color: player?.house.color ?? "#deb887" }}>
              {displayName}
            </span>
          )
        }
      </ConditionalWrap>
      {showBanButton && (
        <OverlayTrigger
          overlay={
            <Tooltip id={`ban-user-${user.id}-tooltip`}>
              Ban this user from your game.
            </Tooltip>
          }
          placement="auto"
          delay={{ show: 250, hide: 0 }}
        >
          <button
            type="button"
            className="close ml-1"
            style={{ float: "none" }}
            onClick={() => banUser(user, entireGame)}
          >
            &times;
          </button>
        </OverlayTrigger>
      )}
    </>
  );
}
