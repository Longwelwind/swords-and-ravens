import BetterMap from "../utils/BetterMap";

const serializedGameMigrations: {version: string; migrate: (serializeGamed: any) => any}[] = [
    {
        version: "2",
        migrate: (serializedGame: any) => {
            // Migration for #292
            if (serializedGame.childGameState.type == "ingame") {
                const mappings = new BetterMap([
                    ["feast-for-crows", 2],
                    ["put-to-the-sword", 2],
                    ["rains-of-autumn", 2],
                    ["sea-of-storms", 2],
                    ["storm-of-swords", 2],
                    ["web-of-lies", 2],
                    ["wildlings-attack", 2],
                    ["game-of-thrones", 1],
                    ["dark-wings-dark-words", 1],
                    ["clash-of-kings", 1],
                    ["last-days-of-summer", 0],
                    ["mustering", 0],
                    ["winter-is-coming", 0],
                    ["a-throne-of-blades", 0],
                    ["supply", 0],
                ]);
                // The goal is to find a deckI for each card referenced
                // in "(westeros-card-exe)cuted". Anyone will do, as long
                // as it exists.
                const ingame = serializedGame.childGameState;

                ingame.gameLogManager.logs
                    .filter((log: any) => log.data.type == "westeros-card-executed")
                    .forEach((log: any) => {
                        log.data.westerosDeckI = mappings.get(log.data.westerosCardType)
                    });
            }

            // Migration for #336
            serializedGame.gameSettings.setupId = "base-game";

            return serializedGame;
        }
    },
    {
        version: "3",
        migrate: (serializedGame: any) => {
          // Migration for #499
          if (serializedGame.childGameState.type == "ingame") {
              const serializedIngameGameState = serializedGame.childGameState;
              if (serializedIngameGameState.childGameState.type == "action") {
                  const serializedActionGameState = serializedIngameGameState.childGameState;
                  if (serializedActionGameState.childGameState.type == "resolve-march-order") {
                      const serializedResolveMarchOrderGameState = serializedActionGameState.childGameState;

                      let lastSelectedId: any;

                      const serializedChildGameState = serializedResolveMarchOrderGameState.childGameState;
                      switch (serializedChildGameState.type) {
                          case "resolve-single-march":
                              lastSelectedId = serializedChildGameState.houseId;
                              break;
                          case "combat":
                              lastSelectedId = serializedChildGameState.attackerId;
                              break;
                          case "take-control-of-enemy-port":
                              lastSelectedId = serializedChildGameState.lastHouseThatResolvedMarchOrderId;
                              break;
                          default:
                              throw new Error("Invalid childGameState type")
                      }

                      // This will get the index of the last player that resolved a march order on the current turn order.
                      // It might result in the pre-fix behavior if the Doran Martell was used as one of the cards in the child game state.
                      serializedResolveMarchOrderGameState.currentTurnOrderIndex = serializedIngameGameState.game.ironThroneTrack.indexOf(lastSelectedId);
                  }
              }
          }


            // Migration for #506
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                ingame.gameLogManager.logs
                    .filter((log: any) => log.data.type == "combat-result")
                    .forEach((log: any) => {
                        log.data.stats.forEach((s: any) => s.armyUnits = []);
                    });
            }

            // Migration for #501
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                ingame.gameLogManager.logs
                    .filter((log: any) => log.data.type == "retreat-region-chosen" && log.data.regionTo == null)
                    .forEach((log: any) => {
                        // Convert to a retreat-failed message
                        log.data.type = "retreat-failed";

                        log.data.region = log.data.regionFrom;
                        delete log.data.regionFrom;

                        // Assume the common case for a failed retreat
                        log.data.isAttacker = false;
                    });
            }

            return serializedGame;
        }
    }
];

export default serializedGameMigrations;