import React, { useId, useRef, useState } from "react";
import { Dropdown } from "react-bootstrap";
import { observer } from "mobx-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import { t, Trans } from "./i18n";
import GameClient from "./GameClient";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import GameLogListComponent from "./GameLogListComponent";
import AutoScroll from "./utils/AutoScroll";
import mammothImage from "../../public/images/icons/mammoth.svg";
import expandImage from "../../public/images/icons/expand.svg";
import contractImage from "../../public/images/icons/contract.svg";

interface GameLogPanelProps {
  ingameGameState: IngameGameState;
  gameClient: GameClient;
  currentlyViewed: boolean;
  fullScreen?: boolean;
  onFullScreenClick?: () => void;
}

export default observer(function GameLogPanel({
  ingameGameState,
  gameClient,
  currentlyViewed,
  fullScreen = false,
  onFullScreenClick
}: GameLogPanelProps): React.JSX.Element {
  const panelRef = useRef<HTMLDivElement>(null);
  const controlsId = useId();
  const [controlsOpen, setControlsOpen] = useState(fullScreen);
  const [wildlingCardsOnly, setWildlingCardsOnly] = useState(false);
  const [roundIds, setRoundIds] = useState<string[]>([]);

  return (
    <div ref={panelRef} className="position-relative d-flex flex-column h-100">
      <button
        type="button"
        className="btn btn-sm btn-secondary position-absolute top-0 start-0 z-1 d-flex align-items-center justify-content-center"
        style={{ width: 32, height: 32 }}
        aria-label={t("common.gameLogs")}
        title={t("common.gameLogs")}
        aria-expanded={controlsOpen}
        aria-controls={controlsId}
        onClick={() => setControlsOpen(!controlsOpen)}
      >
        <FontAwesomeIcon icon={controlsOpen ? faChevronUp : faChevronDown} />
      </button>
      {controlsOpen && (
        <div
          id={controlsId}
          role="group"
          aria-label={t("common.gameLogs")}
          className="d-flex flex-nowrap align-items-center gap-2 flex-shrink-0 mb-2"
          style={{ paddingLeft: 40, minHeight: 32 }}
        >
          <Dropdown
            onToggle={(show) => {
              if (show) {
                setRoundIds(
                  Array.from(
                    panelRef.current?.querySelectorAll(
                      '[id^="gamelog-round-"]'
                    ) ?? [],
                    (element) => element.id
                  )
                );
              }
            }}
          >
            <Dropdown.Toggle
              variant="secondary"
              size="sm"
              className="text-nowrap"
            >
              {t("common.jumpTo")}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {roundIds.map((id) => (
                <Dropdown.Item
                  className="text-center"
                  key={id}
                  onClick={() => {
                    panelRef.current?.querySelector(`#${id}`)?.scrollIntoView({
                      behavior: "smooth",
                      block: "center"
                    });
                  }}
                >
                  <Trans
                    i18nKey="gameTabs.round6f8874"
                    values={{ round: id.replace("gamelog-round-", "") }}
                  />
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
          <button
            type="button"
            className={`btn btn-sm btn-outline-secondary${wildlingCardsOnly ? " active" : ""}`}
            aria-label={t("gameTabs.wildlingCardsOnly")}
            title={t("gameTabs.wildlingCardsOnly")}
            aria-pressed={wildlingCardsOnly}
            onClick={() => setWildlingCardsOnly(!wildlingCardsOnly)}
          >
            <img src={mammothImage} width={24} alt="" />
          </button>
          {onFullScreenClick && (
            <button
              type="button"
              className="btn btn-sm btn-secondary ms-auto"
              aria-label={t("gameTabs.fullScreen")}
              title={t("gameTabs.fullScreen")}
              aria-pressed={fullScreen}
              onClick={onFullScreenClick}
            >
              <img
                src={fullScreen ? contractImage : expandImage}
                width={24}
                alt=""
              />
            </button>
          )}
        </div>
      )}
      <AutoScroll
        className="flex-fill-remaining"
        scrollViewClassName="overflow-x-hidden"
        initialScrollBehavior="auto"
      >
        <GameLogListComponent
          ingameGameState={ingameGameState}
          gameClient={gameClient}
          currentlyViewed={currentlyViewed}
          wildlingCardsOnly={wildlingCardsOnly}
        />
      </AutoScroll>
    </div>
  );
});
