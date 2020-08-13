import BetterMap from "../utils/BetterMap";
import unitTypes from "../common/ingame-game-state/game-data-structure/unitTypes";
import staticWorld from "../common/ingame-game-state/game-data-structure/static-data-structure/globalStaticWorld";
import { CrowKillersStep } from "../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/crow-killers-wildling-victory-game-state/CrowKillersWildlingVictoryGameState";

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
                const regionNameToIdMappings = new BetterMap(staticWorld.staticRegions.entries.map(([rid, r]) => [r.name, rid]));

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

                ingame.gameLogManager.logs
                    .filter((log: any) => log.data.type == "killed-after-combat")
                    .forEach((log: any) => {
                        const killedNames: string[] = log.data.killed;
                        const houseName = log.data.house;
                        log.data.house = houseNameToIdMappings.get(houseName);
                        log.data.killed = killedNames.map(name => unitTypeNameToIdMappings.get(name));
                    });

                ingame.gameLogManager.logs
                    .filter((log: any) => log.data.type == "ships-destroyed-by-empty-castle")
                    .forEach((log: any) => {
                        const houseName = log.data.house;
                        const portName = log.data.port;
                        const castleName = log.data.castle;
                        log.data.house = houseNameToIdMappings.get(houseName);
                        log.data.port = regionNameToIdMappings.get(portName);
                        log.data.castle = regionNameToIdMappings.get(castleName);
                    });

                ingame.gameLogManager.logs
                    .filter((log: any) => log.data.type == "enemy-port-taken")
                    .forEach((log: any) => {
                        const oldControllerName = log.data.oldController;
                        const newControllerName = log.data.newController;
                        const portName = log.data.port;
                        log.data.oldController = houseNameToIdMappings.get(oldControllerName);
                        log.data.newController = houseNameToIdMappings.get(newControllerName);
                        log.data.port = regionNameToIdMappings.get(portName);
                    });

                ingame.gameLogManager.logs
                    .filter((log: any) => log.data.type == "retreat-region-chosen")
                    .forEach((log: any) => {
                        const houseName = log.data.house;
                        const regionFromName = log.data.regionFrom;
                        const regionToName = log.data.regionTo;
                        log.data.house = houseNameToIdMappings.get(houseName);
                        log.data.regionFrom = regionNameToIdMappings.get(regionFromName);
                        log.data.regionTo = regionNameToIdMappings.get(regionToName);
                    });

                ingame.gameLogManager.logs
                    .filter((log: any) => log.data.type == "retreat-casualties-suffered")
                    .forEach((log: any) => {
                        const houseName = log.data.house;
                        const unitNames: string[] = log.data.units;
                        log.data.house = houseNameToIdMappings.get(houseName);
                        log.data.units = unitNames.map(name => unitTypeNameToIdMappings.get(name));
                    });

                ingame.gameLogManager.logs
                    .filter((log: any) => log.data.type == "retreat-failed")
                    .forEach((log: any) => {
                        const houseName = log.data.house;
                        const regionName = log.data.region;
                        log.data.house = houseNameToIdMappings.get(houseName);
                        log.data.region = regionNameToIdMappings.get(regionName);
                    });
            }

            return serializedGame;
        }
    },
    {
        version: "5",
        migrate: (serializedGame: any) => {
            // Migration for #245
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                const game = ingame.game;

                game.houses.forEach((h: any) => h.knowsNextWildlingCard = false);
                game.clientNextWidllingCardId = null;
            }

            return serializedGame;
        }
    },
    {
        version: "6",
        migrate: (serializedGame: any) => {
            // Migration for #635
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                // Add an empty list of votes in ingame
                ingame.votes = [];

                // Planning phase was changed to store houses and not players
                if (ingame.childGameState.type == "planning") {
                    const planning = ingame.childGameState;

                    const playersToHouse = new BetterMap(ingame.players.map((serializedPlayer: any) => [serializedPlayer.userId, serializedPlayer.houseId]));

                    planning.readyHouses = planning.readyPlayers.map((playerId: string) => playersToHouse.get(playerId));
                }
            }

            return serializedGame;
        }
    },
    {
        version: "7",
        migrate: (serializedGame: any) => {
            // Migration for #690

            // Check if game is currently in "CrowKillersWildlingsVictoryGameState"
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                if (ingame.childGameState && ingame.childGameState.type == "westeros") {
                    const westeros = ingame.childGameState;

                    if (westeros.childGameState && westeros.childGameState.type == "wildlings-attack") {
                        const wildlingsAttack = westeros.childGameState;

                        if (wildlingsAttack.childGameState && wildlingsAttack.childGameState == "crow-killers-wildling-victory") {
                            const crowKillersWildlingVictory = wildlingsAttack.childGameState;

                            // We assume no game is in the potential buggy state where we would have to apply KILLING_KNIGHTS
                            crowKillersWildlingVictory.step = CrowKillersStep.DEGRADING_KNIGHTS;
                        }
                    }
                }
            }

            return serializedGame;
        }
    },
    {
        version: "8",
        migrate: (serializedGame: any) => {
            // Migration for #590
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                if (ingame.childGameState && ingame.childGameState.type == "action") {
                    const action = ingame.childGameState;
                    if (action.childGameState && action.childGameState.type == "use-raven") {
                        const useRaven = action.childGameState;
                        if (useRaven.childGameState && useRaven.childGameState.type == "choose-raven-action") {
                            // If game is currently in "choose-raven-action" replace it with new first child state "replace-order"
                            useRaven.childGameState.type = "replace-order"
                        }
                    }
                }
            }

            return serializedGame;
        }
    }
];

export default serializedGameMigrations;