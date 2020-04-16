import BetterMap from "../utils/BetterMap";
import unitTypes from "../common/ingame-game-state/game-data-structure/unitTypes";

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
    },
    {
        version: "4",
        migrate: (serializedGame: any) => {
            // Migration for #532
            if (serializedGame.childGameState.type == "ingame") {
                // Set max power tokens to the default max of 20
                serializedGame.childGameState.game.maxPowerTokens = 20;
            }

            // Migration for #550
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                const unitTypeNameToIdMappings = new BetterMap(unitTypes.entries.map(([utid, ut]) => [ut.name, utid]));
                const houseNameToIdMappings = new BetterMap(ingame.game.houses.map((h: any) => [h.name, h.id]));

                ingame.gameLogManager.logs
                    .filter((log: any) => log.data.type == "immediatly-killed-after-combat")
                    .forEach((log: any) => {
                        const woundedNames: string[] = log.data.killedBecauseWounded;
                        const cannotRetreatNames: string[] = log.data.killedBecauseCantRetreat;
                        const houseName = log.data.house;
                        log.data.house = houseNameToIdMappings.get(houseName);
                        log.data.killedBecauseWounded = woundedNames.map(name => unitTypeNameToIdMappings.get(name));
                        log.data.killedBecauseCantRetreat = cannotRetreatNames.map(name => unitTypeNameToIdMappings.get(name));
                    });
            }
        }
    }
];

export default serializedGameMigrations;