/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import BetterMap from "../utils/BetterMap";
import unitTypes from "../common/ingame-game-state/game-data-structure/unitTypes";
import staticWorld from "../common/ingame-game-state/game-data-structure/static-data-structure/globalStaticWorld";
import { CrowKillersStep } from "../common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/crow-killers-wildling-victory-game-state/CrowKillersWildlingVictoryGameState";
import { SerializedHouse } from "../common/ingame-game-state/game-data-structure/House";
import { HouseCardState } from "../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import { vassalHouseCards } from "../common/ingame-game-state/game-data-structure/static-data-structure/vassalHouseCards";
import { DraftStep } from "../common/ingame-game-state/draft-house-cards-game-state/DraftHouseCardsGameState";
import _ from "lodash";
import shuffleInPlace from "../utils/shuffleInPlace";
import { v4 } from "uuid";
import facelessMenNames from "../../data/facelessMenNames.json";
import popRandom from "../utils/popRandom";
//import { SerializedEntireGame } from "../common/EntireGame";

function replaceHouseCard(deck: [string, any][], idToRemove: string, cardToAdd: [string, any]): [string, any][] {
    const result = deck.filter(([id, _shc]) => id != idToRemove);
    result.push(cardToAdd);
    result.sort(([_id, shc]) => shc.combatStrength);
    return result;
}

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
                    ["supply", 0]
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
    },
    {
        version: "9",
        migrate: (serializedGame: any) => {
            // Migration for #750
            if (serializedGame.childGameState.type == "ingame") {
                const serializedIngameGameState = serializedGame.childGameState;
                serializedIngameGameState.game.revealedWesterosCards = 0;
            }

            return serializedGame;
        }
    },
    {
        version: "10",
        migrate: (serializedGame: any) => {
            // Migration for #785
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                const game = ingame.game;

                game.houses.forEach((h: any) => {
                    h.houseCards.forEach((value: any) => {
                        const shc = value[1];
                        shc.disabled = false;
                        shc.disabledAbilityId = null;
                        shc.originalCombatStrength = shc.combatStrength;
                        shc.originalSwordIcons = shc.swordIcons;
                        shc.originalTowerIcons = shc.towerIcons;
                    });
                });
            }

            return serializedGame;
        }
    },
    {
        version: "11",
        migrate: (serializedGame: any) => {
            // Migration for #791
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                if (ingame.childGameState && ingame.childGameState.type == "action") {
                    const action = ingame.childGameState;
                    if (action.childGameState && action.childGameState.type == "resolve-march-order") {
                        const resolveMarchOrders = action.childGameState;
                        if (resolveMarchOrders.childGameState && resolveMarchOrders.childGameState.type == "combat") {
                            const combat = resolveMarchOrders.childGameState;
                            if (combat.childGameState && combat.childGameState.type == "immediately-house-card-abilities-resolution") {
                                const immediatelyHouseCardResolution = combat.childGameState;
                                if (immediatelyHouseCardResolution.childGameState &&
                                    (immediatelyHouseCardResolution.childGameState.type == "aeron-damphair-dwd-ability" || immediatelyHouseCardResolution.childGameState.type == "qyburn-ability")) {
                                        // Aron and Qyburn are now BeforeCombat states => Convert combat.childGameState to BeforeCombat
                                        combat.childGameState.type = "before-combat-house-card-abilities-resolution";
                                }
                            }
                        }
                    }
                }
            }

            return serializedGame;
        }
    },
    {
        version: "12",
        migrate: (serializedGame: any) => {
            // Migration for #795
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                const game = ingame.game;

                game.houses.forEach((h: SerializedHouse) => {
                    h.houseCards.forEach(([hcid, shc]) => {
                        if (hcid == "asha-greyjoy-dwd") {
                            shc.abilityId = null;
                        }
                    });
                });
            }

            return serializedGame;
        }
    },
    {
        version: "13",
        migrate: (serializedGame: any) => {
            // Migration for #808
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                if (ingame.childGameState && ingame.childGameState.type == "action") {
                    const action = ingame.childGameState;
                    if (action.childGameState && action.childGameState.type == "resolve-march-order") {
                        const resolveMarchOrders = action.childGameState;
                        if (resolveMarchOrders.childGameState && resolveMarchOrders.childGameState.type == "combat") {
                            const combat = resolveMarchOrders.childGameState;
                            if (combat.childGameState && combat.childGameState.type == "post-combat") {
                                const postCombat = combat.childGameState;
                                if (postCombat.childGameState && postCombat.childGameState.type == "after-combat-house-card-abilities") {
                                    const afterCombatHouseCardAbilities = postCombat.childGameState;
                                    if (afterCombatHouseCardAbilities.childGameState && afterCombatHouseCardAbilities.childGameState.type == "rodrik-the-reader-ability") {
                                        // Rodrik is now a AfterWinner ability
                                        postCombat.childGameState.type = "after-winner-determination";
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return serializedGame;
        }
    },
    {
        version: "14",
        migrate: (serializedGame: any) => {
            // Migration for #811
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                // Abilities need to have the same id as the house card itself to allow house-card-ability-not-used giving the ability id.
                // In the game log getHouseCardById then returns the house card with the name. We could introduce a getHouseCardByAbilityId at some point.
                // For now lets migrate Melisandre DWD.

                // Fix melisandre => melisandre-dwd ability
                const game = ingame.game;
                game.houses.forEach((h: SerializedHouse) => {
                    h.houseCards.forEach(([hcid, shc]) => {
                        if (hcid == "melisandre-dwd") {
                            shc.abilityId = "melisandre-dwd";
                        }
                    });
                });

                // Fix invalid game logs
                ingame.gameLogManager.logs
                .filter((log: any) => log.data.type == "house-card-ability-not-used")
                .forEach((log: any) => {
                    if (log.data.houseCard == "melisandre") {
                        log.data.houseCard = "melisandre-dwd";
                    }
                });
            }

            return serializedGame;
        }
    },
    {
        version: "15",
        migrate: (serializedGame: any) => {
            // Migration for #450 Vassals
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                // Init vassal Relations
                ingame.game.vassalRelations = [];

                // Old planning phase is now child place-orders not for vassals
                if (ingame.childGameState.type == "planning") {
                    const planning = ingame.childGameState;

                    planning.childGameState = {
                        type: "place-orders",
                        readyHouses: planning.readyHouses,
                        placedOrders: planning.placedOrders,
                        forVassals: false
                    };
                }

                if (ingame.childGameState.type == "action") {
                    const action = ingame.childGameState;

                    if (action.childGameState.type == "resolve-raid-order") {
                        const resolveRaid = action.childGameState;
                        resolveRaid.resolvedRaidSupportOrderRegions = [];
                    }

                    if (action.childGameState.type == "resolve-march-order") {
                        const resolveMarch = action.childGameState;
                        if (resolveMarch.childGameState.type == "combat") {
                            const combat = resolveMarch.childGameState;
                            if (combat.childGameState.type == "choose-house-card") {
                                const chooseHouseCard = combat.childGameState;
                                const houses = new BetterMap((ingame.game.houses as SerializedHouse[]).map(h => [h.id, h]));
                                const combatData = combat.houseCombatDatas as [string, {houseCardId: string | null; army: number[]; regionId: string}][];
                                const combatHouses = combatData.map(([h, _hcd]) => h);
                                chooseHouseCard.choosableHouseCards = combatHouses.map(hid => [hid,
                                    houses.get(hid).houseCards.filter(([_hcid, hc]) => hc.state == HouseCardState.AVAILABLE).map(([hcid, _hc]) => hcid)]);
                            }
                        }
                    }
                }
            }

            return serializedGame;
        }
    },
    {
        version: "16",
        migrate: (serializedGame: any) => {
            // Migration for #850
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                const game = ingame.game;

                game.houses.forEach((h: SerializedHouse) => {
                    h.houseCards.forEach(([hcid, shc]) => {
                        if (hcid == "asha-greyjoy-dwd") {
                            shc.towerIcons = 1;
                        }
                    });
                });
            }

            return serializedGame;
        }
    },
    {
        version: "17",
        migrate: (serializedGame: any) => {
            // Migration for #854
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                if (ingame.childGameState && ingame.childGameState.type == "action") {
                    const action = ingame.childGameState;
                    if (action.childGameState && action.childGameState.type == "resolve-march-order") {
                        const resolveMarchOrders = action.childGameState;
                        if (resolveMarchOrders.childGameState && resolveMarchOrders.childGameState.type == "combat") {
                            const combat = resolveMarchOrders.childGameState;
                            if (combat.childGameState && combat.childGameState.type == "before-combat-house-card-abilities-resolution") {
                                const beforeCombatResultion = combat.childGameState;
                                if (beforeCombatResultion.childGameState && beforeCombatResultion.childGameState.type == "aeron-damphair-dwd-ability") {
                                    // aeron child game state is now bidding instead of simple choice
                                    const aeronDwdAbility = beforeCombatResultion.childGameState;
                                    const house = aeronDwdAbility.childGameState.house;
                                    aeronDwdAbility.childGameState = {
                                        type: "bidding",
                                        participatingHouses: [house],
                                        bids: []
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return serializedGame;
        }
    },
    {
        version: "18",
        migrate: (serializedGame: any) => {
            // Migration for #867
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                if (serializedGame.gameSettings && serializedGame.gameSettings.setupId == "a-dance-with-dragons") {
                    if (ingame.game.turn <= 6) {
                        ingame.game.maxTurns = 6;
                    } else {
                        ingame.game.maxTurns = ingame.game.turn;
                    }
                }
            }

            return serializedGame;
        }
    },
    {
        version: "19",
        migrate: (serializedGame: any) => {
            // Migration for #TBD
            // Make the vassal house cards non static again:
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                ingame.game.vassalHouseCards = vassalHouseCards.map(hc => [hc.id, hc.serializeToClient()]);
            }

            return serializedGame;
        }
    },
    {
        version: "20",
        migrate: (serializedGame: any) => {
            // Migration for #TBD
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                if (ingame.childGameState.type == "planning") {
                    const planning = ingame.childGameState;
                    if (planning.childGameState.type == "place-orders") {
                        const placeOrders = planning.childGameState;
                        const vassalHouses = new BetterMap(ingame.game.vassalRelations).keys as string[];
                        const nonVassalHouses = _.difference(ingame.game.houses.map((sh: SerializedHouse) => sh.id), vassalHouses);
                        placeOrders.readyHouses = placeOrders.readyHouses.filter((h: string) => placeOrders.forVassals ? vassalHouses.includes(h) : nonVassalHouses.includes(h));
                    }
                }

                if (ingame.childGameState.type == "action"
                    && ingame.childGameState.childGameState.type == "resolve-march-order"
                    && ingame.childGameState.childGameState.childGameState.type == "combat"
                    && ingame.childGameState.childGameState.childGameState.childGameState.type == "before-combat-house-card-abilities-resolution"
                    && ingame.childGameState.childGameState.childGameState.childGameState.childGameState.type == "house-card-resolution") {
                        const houseCardResolution = ingame.childGameState.childGameState.childGameState.childGameState.childGameState;
                        if (houseCardResolution.childGameState.type == "aeron-damphair-dwd-ability") {
                            const oldAeronState = houseCardResolution.childGameState;

                            houseCardResolution.childGameState = {
                                type: "aeron-damphair-dwd-ability",
                                house: oldAeronState.childGameState.participatingHouses[0]
                            }
                        }
                }
            }

            return serializedGame;
        }
    },
    {
        version: "21",
        migrate: (serializedGame: any) => {
            // Migration for #TBD
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                if (ingame.childGameState.type == "planning") {
                    const planning = ingame.childGameState;
                    if (planning.childGameState.type == "place-orders") {
                        const placeOrders = planning.childGameState;
                        const vassalHouses = new BetterMap(ingame.game.vassalRelations).keys as string[];

                        if (placeOrders.forVassals && vassalHouses.length == 0) {
                            ingame.childGameState = {
                                type: "action",
                                ordersOnBoard: placeOrders.placedOrders as [string, number][],
                                planningRestrictions: planning.planningRestrictions,
                                childGameState: {
                                    type: "use-raven",
                                    childGameState: {
                                        type: "replace-order"
                                    }
                                }
                            };
                        }
                    }
                }
            }

            return serializedGame;
        }
    },
    {
        version: "22",
        migrate: (serializedGame: any) => {
            // Migration for #TBD (Vote contains participatingPlayers now)
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                for (const vote of ingame.votes) {
                    vote.participatingPlayers = [...ingame.players];

                    // Add at least the removed player for "replace-by-vassal"
                    // (there may be up to 2 more removed players but so what, it's just beauty)
                    if (vote.type.type == "replace-player-by-vassal" &&
                        !vote.participatingPlayers.some((sp: any) => sp.userId == (vote.type.replaced))) {
                        vote.participatingPlayers.push({
                            houseId: vote.type.forHouse,
                            userId: vote.type.replaced,
                            note: ""
                        });
                    }
                }
            }

            return serializedGame;
        }
    },
    {
        version: "23",
        migrate: (serializedGame: any) => {
            // Fix voted vassals have become active again
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                const vassalRelations = new BetterMap(ingame.game.vassalRelations);
                for (const vassal of vassalRelations.keys) {
                    for (const player of ingame.players) {
                        if (player.houseId == vassal) {
                            ingame.players = _.without(ingame.players, player);
                            break;
                        }
                    }
                }
            }

            return serializedGame;
        }
    },
    {
        version: "24",
        migrate: (serializedGame: any) => {
            // Migration for #952
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                if (ingame.childGameState.type == "action"
                    && ingame.childGameState.childGameState.type == "resolve-march-order"
                    && ingame.childGameState.childGameState.childGameState.type == "combat") {
                        ingame.childGameState.childGameState.childGameState.houseCardModifiers = [];
                }
            }

            return serializedGame;
        }
    },
    {
        version: "25",
        migrate: (serializedGame: any) => {
            // Migration for #954
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                ingame.game.houseCardsForDrafting = [];
            }

            return serializedGame;
        }
    },
    {
        version: "26",
        migrate: (serializedGame: any) => {
            // This was a weird migration which is not necessary anymore
            return serializedGame;
        }
    },
    {
        version: "27",
        migrate: (serializedGame: any) => {
            // Fix the unit type dragon shit
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                ingame.game.houses.forEach((h: SerializedHouse) => {
                    h.unitLimits = h.unitLimits.filter(([utid, _limit]) => utid != "dragon");
                });
            }
            return serializedGame;
        }
    },
    {
        version: "28",
        migrate: (serializedGame: any) => {
            // Add the gameSetupId to the world to load the correct borders
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                ingame.game.world.gameSetupId = serializedGame.gameSettings.setupId;
            }
            return serializedGame;
        }
    },
    {
        version: "29",
        migrate: (serializedGame: any) => {
            // Migration for Tides of Battle
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                ingame.gameLogManager.logs.forEach((log: any) => {
                    if (log.data.type == "combat-valyrian-sword-used") {
                        log.data.forNewTidesOfBattleCard = false;
                    }
                });

                if (ingame.childGameState.type == "action" && ingame.childGameState.childGameState.type == "resolve-march-order" &&
                    ingame.childGameState.childGameState.childGameState.type == "combat") {
                    const combat = ingame.childGameState.childGameState.childGameState;
                    combat.tidesOfBattleDeck = [];
                    combat.revealTidesOfBattleCards = false;

                    (combat.houseCombatDatas as
                        [string, {
                            houseCardId: string | null;
                            army: number[];
                            regionId: string;
                            tidesOfBattleCardId: string | null | undefined;
                        }][]
                    ).forEach(([_houseId, hcd]) => hcd.tidesOfBattleCardId = null);

                    if (combat.childGameState.type == "use-valyrian-steel-blade") {
                        combat.childGameState.forNewTidesOfBattleCard = false;
                    }

                    if (combat.childGameState.type == "post-combat") {
                        combat.childGameState.resolvedSkullIcons = [];
                    }
                }
            }
            return serializedGame;
        }
    },
    {
        version: "30",
        migrate: (serializedGame: any) => {
            // Migration for Show Combat Info during Post Combat as well
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                if (ingame.childGameState.type == "action" && ingame.childGameState.childGameState.type == "resolve-march-order" &&
                    ingame.childGameState.childGameState.childGameState.type == "combat" &&
                    ingame.childGameState.childGameState.childGameState.childGameState.type == "post-combat" ) {
                    const postCombat = ingame.childGameState.childGameState.childGameState.childGameState;

                    postCombat.combatStats = [];
                }
            }
            return serializedGame;
        }
    },
    {
        version: "31",
        migrate: (serializedGame: any) => {
            // Migration for Wait 3s after combat is finished
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                if (ingame.childGameState.type == "action" &&
                    ingame.childGameState.childGameState.type == "resolve-march-order" &&
                    ingame.childGameState.childGameState.childGameState.type == "combat") {
                    const combat = ingame.childGameState.childGameState.childGameState;

                    combat.stats = [];

                    if (combat.childGameState.type == "post-combat") {
                        const postCombat = ingame.childGameState.childGameState.childGameState.childGameState;
                        combat.stats = postCombat.combatStats;
                    }
                }
            }

            return serializedGame;
        }
    },
    {
        version: "32",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                ingame.game.clientNextWildlingCardId = ingame.game.clientNextWidllingCardId;
            }

            return serializedGame;
        }
    },
    {
        version: "33",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                ingame.game.houses.forEach((h: any) => {
                    h.houseCards.forEach((value: any) => {
                        const shc = value[1];
                        if (shc.id == "damon-dance-for-me") {
                            shc.name = "Damon Dance-For-Me";
                        }
                    });
                });

                ingame.game.houseCardsForDrafting.forEach((value: any) => {
                    const shc = value[1];
                    if (shc.id == "damon-dance-for-me") {
                        shc.name = "Damon Dance-For-Me";
                    }
                });
            }

            return serializedGame;
        }
    },
    {
        version: "34",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                serializedGame.users.forEach((u: any) => {
                    u.settings.mapScrollbar = true;
                });
            }

            return serializedGame;
        }
    },
    {
        version: "35",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "lobby") {
                serializedGame.childGameState.password = "";
            }

            return serializedGame;
        }
    },
    {
        version: "36",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                serializedGame.childGameState.game.replacedPlayerHouseCards = [];
            }

            return serializedGame;
        }
    },
    {
        version: "37",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                if (serializedGame.gameSettings.setupId == "mother-of-dragons") {
                    serializedGame.gameSettings.allowGiftingPowerTokens = true;
                    serializedGame.gameSettings.seaOrderTokens = true;
                    serializedGame.gameSettings.vassals = true;
                    serializedGame.gameSettings.startWithSevenPowerTokens = true;
                }
            }

            return serializedGame;
        }
    },
    {
        version: "38",
        migrate: (serializedGame: any) => {
            // Migrate renaming of of deletedHouseCards
            if (serializedGame.childGameState.type == "ingame") {
                serializedGame.childGameState.game.deletedHouseCards = serializedGame.childGameState.game.replacedPlayerHouseCards;
            }

            // Migrate RobertArrynAbilityGameState
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                if (ingame.childGameState.type == "action") {
                    const action = ingame.childGameState;
                    if (action.childGameState.type == "resolve-march-order") {
                        const resolveMarch = action.childGameState;
                        if (resolveMarch.childGameState.type == "combat") {
                            const combat = resolveMarch.childGameState;
                            if (combat.childGameState.type == "post-combat") {
                                const postCombat = combat.childGameState;
                                if (postCombat.childGameState.type == "after-combat-house-card-abilities") {
                                    const afterCombatAbilities = postCombat.childGameState;
                                    if (afterCombatAbilities.childGameState.childGameState.type == "robert-arryn-ability") {
                                        const robertArryn = afterCombatAbilities.childGameState.childGameState;
                                        robertArryn.house = robertArryn.childGameState.house;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return serializedGame;
        }
    },
    {
        version: "39",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                ingame.votes.forEach((v: any) => {
                    v.participatingHouses = v.participatingPlayers.map((p: any) => p.houseId);
                });
            }

            return serializedGame;
        }
    },
    {
        version: "40",
        migrate: (serializedGame: any) => {
            // Migrate DraftHouseCardsGameState
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                if (ingame.childGameState.type == "draft-house-cards") {
                    const draft = ingame.childGameState;
                    draft.draftStep = DraftStep.HOUSE_CARD;
                    draft.vassalsOnInfluenceTracks = [];
                }

                if (ingame.childGameState.type == "thematic-draft-house-cards") {
                    const thematic = ingame.childGameState;
                    thematic.vassalsOnInfluenceTracks = [];
                }
            }

            // Set chat house names to true by default
            serializedGame.users.forEach((u: any) => {
                u.settings.chatHouseNames = true;
            });

            return serializedGame;
        }
    },
    {
        version: "41",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                const baratheon = ingame.game.houses.find((h: any) => h.id == "baratheon");
                if (baratheon !== undefined) {
                    baratheon.color = "#e6d228";
                }
            }

            return serializedGame;
        }
    },
    {
        version: "42",
        migrate: (serializedGame: any) => {
            // Turn on mapScrollbar again for all users as the new desktop experience is best with the map scrollbar
            if (serializedGame.childGameState.type == "ingame") {
                serializedGame.users.forEach((u: any) => {
                    u.settings.mapScrollbar = true;
                });
            }

            return serializedGame;
        }
    },
    {
        version: "43",
        migrate: (serializedGame: any) => {
            // Add migration for Targaryen beta
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                ingame.game.world.playerCount = ingame.game.houses.length;
                ingame.game.world.regions.forEach((region: any) => region.loyaltyTokens = 0);
                ingame.game.houses.forEach((h: any) => h.gainedLoyaltyTokens = 0);
            }

            return serializedGame;
        }
    },
    {
        version: "44",
        migrate: (serializedGame: any) => {
            // Add Westeros deck 4
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                ingame.game.removedDragonStrengthToken = 0;

                if (ingame.game.houses.length == 8) {
                    let lastId = Math.max(..._.flatten(ingame.game.westerosDecks).map((wc: any) => wc.id));

                    const wd4_ids = [ "domestic-disputes", "empty-promises", "fire-made-flesh",
                        "playing-with-fire", "scattering-dissent", "southron-ambitions", "strongholds-of-resistance",
                        "the-long-plan", "watering-the-seed", "word-spreads-quickly" ];
                    const deck = wd4_ids.map(wd4id => ({
                        id: ++lastId,
                        typeId: wd4id,
                        discarded: false
                    }));

                    shuffleInPlace(deck);
                    ingame.game.westerosDecks.push(deck);

                    ingame.gameLogManager.logs.forEach((l: any) => {
                        if (l.data.type == "place-loyalty-choice") {
                            l.data.loyaltyTokenCount = l.data.discardedPowerTokens == 0
                                ? 0 : l.data.discardedPowerTokens == 1 || l.data.discardedPowerTokens == 2
                                ? 1 : 2;
                        }
                    });
                }
            }

            return serializedGame;
        }
    },
    {
        version: "45",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                if (ingame.childGameState.type == "westeros") {
                    const westeros = ingame.childGameState;
                    if (ingame.game.houses.length == 8 && westeros.revealedCardIds.length == 3 && westeros.childGameState.type != "westeros-deck-4") {
                        const reveleadCard = ingame.game.westerosDecks[3].shift();
                        if (reveleadCard) {
                            reveleadCard.discarded = true;
                            ingame.game.westerosDecks[3].push(reveleadCard);
                            westeros.revealedCardIds.push(reveleadCard.id);
                        }
                    }
                }
            }
            return serializedGame;
        }
    },
    {
        version: "46",
        migrate: (serializedGame: any) => {
            serializedGame.users.forEach((u: any) => u.settings.responsiveLayout = false);
            return serializedGame;
        }
    },
    {
        version: "47",
        migrate: (serializedGame: any) => {
            // Migrate "Make Move Loyalty tokens more user-friendly"
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                if (ingame.childGameState.type == "westeros"
                    && ingame.childGameState.childGameState.type == "westeros-deck-4"
                    && ingame.childGameState.childGameState.childGameState.type == "move-loyalty-tokens") {

                    const moveLoyaltyTokens = ingame.childGameState.childGameState.childGameState;
                    moveLoyaltyTokens.costsToCancelPreviousMovement = moveLoyaltyTokens.costsToDiscardChoice;

                    if (moveLoyaltyTokens.regionFrom && moveLoyaltyTokens.regionTo) {
                        moveLoyaltyTokens.previousMovement = {
                            house: moveLoyaltyTokens.resolveOrder[0],
                            from: moveLoyaltyTokens.regionFrom,
                            to: moveLoyaltyTokens.regionTo
                        }
                    } else {
                        moveLoyaltyTokens.previousMovement = null;
                    }

                    if (moveLoyaltyTokens.childGameState.type == "select-region") {
                        moveLoyaltyTokens.childGameState.type = "resolve-move-loyalty-token";
                        moveLoyaltyTokens.childGameState.regions = undefined;
                    }
                }
            }

            return serializedGame;
        }
    },
    {
        version: "48",
        migrate: (serializedGame: any) => {
            // Add the Iron Bank to running 8p games
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                ingame.game.world.regions.forEach((r: any) => {
                    r.castleModifier = 0;
                    r.barrelModifier = 0;
                    r.crownModifier = 0;
                });

                if (ingame.childGameState.type == "action" && ingame.childGameState.childGameState.type == "resolve-consolidate-power" && ingame.childGameState.childGameState.childGameState.type == "player-mustering") {
                    const resolveConsolidatePower = ingame.childGameState.childGameState;
                    const house = resolveConsolidatePower.childGameState.house;

                    // Set the new child game state to resolve a CP*
                    resolveConsolidatePower.childGameState = {
                        type: "resolve-single-consolidate-power",
                        house: house
                    };
                }

                if (ingame.childGameState.type == "westeros" && ingame.childGameState.childGameState.type == "westeros-deck-4" && ingame.childGameState.childGameState.childGameState.type == "choose-multiple-regions-for-loyalty-token") {
                    const state = ingame.childGameState.childGameState.childGameState;
                    state.hasAlreadyPaid = state.hasAlreadyPayed;
                }

                if (ingame.game.houses.length != 8) {
                    ingame.game.ironBank = null;
                    return serializedGame;
                }

                serializedGame.gameSettings.seaOrderTokens = true;
                serializedGame.gameSettings.allowGiftingPowerTokens = true;

                const loanCardIds = [ "customs-officer", "expert-artificer", "full-host", "loyal-maester",
                "master-at-arms", "pyromancer", "savvy-steward", "sea-raiders",
                "siege-engineers", "spymaster", "the-faceless-men", "vanguard-cavalry" ];

                const loanDeck = shuffleInPlace(loanCardIds.map((id, i) => ({
                    id: i,
                    type: id,
                    purchasedBy: null,
                    discarded: false
                })));
                const loanSlots = [];

                // Normally, a new loan card is drawn before the start of each Westeros phase.
                // So, if we are in any state of Westeros, we can now reveal the top card.
                // But we do not do it when we are in the planning phase, as some players may not have recognized the new loan card.
                if (ingame.childGameState.type == "westeros") {
                    // Reveal the top loan card
                    loanSlots.push(loanDeck.shift());
                }

                if (ingame.childGameState.type != "planning" && ingame.game.turn >= 5) {
                    // Reveal another loan card
                    loanSlots.push(loanDeck.shift());
                }

                ingame.game.ironBank = {
                    loanCardDeck: loanDeck,
                    loanSlots: loanSlots,
                    purchasedLoans: []
                };
            }

            return serializedGame;
        }
    },
    {
        version: "49",
        migrate: (serializedGame: any) => {
            // Fix missing loan slots
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                if (!ingame.game.ironBank) {
                    return serializedGame;
                }

                while (ingame.game.ironBank.loanSlots.length != 3) {
                    ingame.game.ironBank.loanSlots.push(null);
                }
            }

            return serializedGame;
        }
    },
    {
        version: "50",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                ingame.gameLogManager.logs.forEach((l: any) => {
                    if (l.data.type == "the-faceless-men-units-destroyed") {
                        const oldUnits = l.data.units as [string, string[]][];
                        l.data.units = oldUnits.map(([regionId, unitTypeIds]) => ({
                            houseId: undefined,
                            regionId: regionId,
                            unitTypeId: unitTypeIds[0]
                        }))
                    }
                });
            }

            return serializedGame;
        }
    },
    {
        version: "51",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame" && serializedGame.childGameState.childGameState.type == "game-ended") {
                const ingame = serializedGame.childGameState;
                const gameEnded = serializedGame.childGameState.childGameState;
                const lastLog: any = _.last(ingame.gameLogManager.logs);

                if (!lastLog || lastLog.data.type == "winner-declared") {
                    return serializedGame;
                }

                ingame.gameLogManager.logs.push({
                    time: lastLog.time,
                    data: { type: "winner-declared", winner: gameEnded.winner },
                    resolvedAutomatically: false
                });
            }

            return serializedGame;
        }
    },
    {
        version: "52",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                ingame.gameLogManager.logs
                    .filter((log: any) => log.data.type == "combat-result")
                    .forEach((log: any) => log.data.stats.forEach((s: any) => s.woundedUnits = []));

                if (ingame.childGameState.type == "action" && ingame.childGameState.childGameState.type == "resolve-march-order" && ingame.childGameState.childGameState.childGameState.type == "combat") {
                    const combat = ingame.childGameState.childGameState.childGameState;
                    combat.stats.forEach((s: any) => s.woundedUnits = []);
                }
            }

            return serializedGame;
        }
    },
    {
        version: "53",
        migrate: (serializedGame: any) => {
            serializedGame.users.forEach((u: any) => u.otherUsersFromSameNetwork = []);
            return serializedGame;
        }
    },
    {
        version: "54",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                ingame.game.houses.forEach((h: any) => h.hasBeenReplacedByVassal = false);

                ingame.game.oldPlayerHouseCards = [];
            }

            return serializedGame;
        }
    },
    {
        version: "55",
        migrate: (serializedGame: any) => {
            // Migration for AFFC
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                ingame.game.houses.forEach((h: any) => {
                    h.maxPowerTokens = 20;
                    h.specialObjective = null;
                    h.secretObjectives = [];
                    h.completedObjectives = [];
                    h.victoryPoints = 0;
                });

                ingame.game.objectiveDeck = [];

                ingame.game.world.regions.forEach((r: any) => r.overwrittenSuperControlPowerToken = null);

                if (ingame.childGameState.type == "westeros" && ingame.childGameState.childGameState.type == "mustering") {
                    const mustering = ingame.childGameState.childGameState;
                    mustering.musteringType = 0;
                }
            }

            return serializedGame;
        }
    },
    {
        version: "56",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                ingame.game.victoryPointsCountNeededToWin = ingame.game.structuresCountNeededToWin;
                ingame.gameLogManager.logs.forEach((l: any) => {
                    switch (l.data.type) {
                        case "objective-scored":
                        case "special-objective-scored":
                        case "ironborn-raid":
                            l.data.newTotal = -1;
                            break;
                    }
                });
            }

            return serializedGame;
        }
    },
    {
        version: "57",
        migrate: (serializedGame: any) => {
            // Polish the logs and make 'retreat-failed' not resolved automatically as
            // only events, where the user could have had a choice should be marked with this flag
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                ingame.gameLogManager.logs.forEach((l: any) => {
                    if (l.data.type == "retreat-failed") {
                        l.resolvedAutomatically = false;
                    }
                });
            }

            return serializedGame;
        }
    },
    {
        version: "58",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                ingame.gameLogManager.logs = ingame.gameLogManager.logs.filter((l: any) => l.data.type != "march-order-removed");
            }

            return serializedGame;
        }
    },
    {
        version: "59",
        migrate: (serializedGame: any) => {
            // Init the note for all users
            const users = serializedGame.users;
            users.forEach((u: any) => u.note = "");
            if (serializedGame.childGameState.type == "ingame") {
                // Move player notes to user
                const ingame = serializedGame.childGameState;
                ingame.players.forEach((p: any) => {
                    const user = users.find((u: any) => u.id == p.userId);
                    user.note = p.note;
                });
            }

            return serializedGame;
        }
    },
    {
        version: "60",
        migrate: (serializedGame: any) => {
            // Migration for PBEM Speed
            serializedGame.leafStateId = v4()

            if (serializedGame.childGameState.type == "ingame") {
                serializedGame.childGameState.players.forEach((p: any) => {
                    p.waitedForData = null;
                });
            }

            return serializedGame;
        }
    },
    {
        version: "61",
        migrate: (serializedGame: any) => {
            // Polish the logs and make 'new-objective-card-drawn' not resolved automatically as
            // only events, where the user could have had a choice should be marked with this flag
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                const indicesToBeRemoved: number[] = [];
                const removedLogs: [number, any][] = [];
                ingame.gameLogManager.logs.forEach((l: any, i: number) => {
                    if (l.data.type == "new-objective-card-drawn") {
                        l.resolvedAutomatically = false;
                    }

                    // In addition we want to fix the "march-resolved" logs.
                    // When I removed the log entry "march-order-removed" (migration v58) and optimized
                    // rendering of "march-resolved" and reuse it for showing "March order has been removed from xyz"
                    // I forgot to not send "march-resolved" in case no non-combat move was done but a battle was initiated.
                    // So the game sent "march-resolved" with an empty array, followed by "attack" which resulted
                    // in an incorrect displaying of "March order has been removed from xyz". This has been fixed in #1331.
                    // So lets remove empty "march-resolved" logs followed by "attack" now:
                    if (l.data.type == "march-resolved" && l.data.moves.length == 0) {
                        if (i + 1 < ingame.gameLogManager.logs.length && ingame.gameLogManager.logs[i + 1].data.type == "attack") {
                            const followingLog = ingame.gameLogManager.logs[i + 1];
                            if (followingLog.data.attackingRegion == l.data.startingRegion) {
                                indicesToBeRemoved.push(i);
                            }
                        }
                    }
                });

                indicesToBeRemoved.reverse();

                indicesToBeRemoved.forEach(i => {
                    removedLogs.push([i, ingame.gameLogManager.logs.splice(i, 1)]);
                });

                ingame.gameLogManager.removedLogs = removedLogs;
            }

            return serializedGame;
        }
    },
    {
        version: "62",
        migrate: (serializedGame: any) => {
            // Add dragon limit 3 to Targaryen again to show dragons and their tooltip in the house row
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                const targaryen = ingame.game.houses.find((h: any) => h.id == "targaryen");
                if (targaryen !== undefined) {
                    targaryen.unitLimits.push(["dragon", 3]);
                }
            }
            return serializedGame;
        }
    },
    {
        version: "63",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                ingame.game.world.settings = serializedGame.gameSettings;
            }

            return serializedGame;
        }
    },
    {
        version: "64",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                if (ingame.childGameState.type == "action" && ingame.childGameState.childGameState.type == "score-objectives" &&
                        ingame.childGameState.childGameState.childGameState.type == "score-other-objectives") {
                    const scoreOtherObjectives = ingame.childGameState.childGameState.childGameState;
                    const participatingHouses = scoreOtherObjectives.childGameState.selectableCardsPerHouse.map(([hid, _ocids]: any) => ingame.game.houses.find((sh: any) => sh.id == hid));
                    scoreOtherObjectives.victoryPointsAtBeginning = participatingHouses.map((sh: any) => [sh.id, sh.victoryPoints]);
                }
            }

            return serializedGame;
        }
    },
    {
        version: "65",
        migrate: (serializedGame: any) => {
            serializedGame.users.forEach((u: any, i: number) => u.facelessName = `Faceless Man ${i+1}`);

            if (serializedGame.childGameState.type == "ingame" && serializedGame.gameSettings.faceless) {
                const ingame = serializedGame.childGameState;
                const usersOfPlayers = ingame.players.map((p: any) => p.userId).map((uid: any) => serializedGame.users.find((u: any) => u.id == uid));
                const facelessNames: string[] = [...facelessMenNames];
                usersOfPlayers.forEach((u: any) => u.facelessName = popRandom(facelessNames) ?? u.facelessName);
            }

            return serializedGame;
        }
    },
    {
        version: "66",
        migrate: (serializedGame: any) => {
            serializedGame.users.forEach((u: any) => u.facelessName = u.facelessName.replace("Faceless Man", "Nobody"));
            return serializedGame;
        }
    },
    {
        version: "67",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                serializedGame.childGameState.gameLogManager.lastSeenLogTimes = [];
            }
            return serializedGame;
        }
    },
    {
        version: "68",
        migrate: (serializedGame: any) => {
            if (serializedGame.gameSettings.setupId == "a-feast-for-crows") {
                serializedGame.gameSettings.allowGiftingPowerTokens = false;
            }
            return serializedGame;
        }
    },
    {
        version: "69",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                // Decouple leftPowerToken from march resolved and create an own log for it
                const newLogs: {time: number; data: any; index: number}[] = []
                ingame.gameLogManager.logs.forEach((l: any, i: number) => {
                    if (l.data.type == "march-resolved" && l.data.leftPowerToken !== null) {
                        newLogs.push({
                            time: l.time,
                            index: i + 1,
                            data: {
                                type: "leave-power-token-choice",
                                house: l.data.house,
                                region: l.data.startingRegion,
                                leftPowerToken: l.data.leftPowerToken
                            }
                        });

                        // Remove the leftPowerToken info from the march-resolved log
                        l.data.leftPowerToken = undefined;
                    }
                });

                // Now inject the new logs in reversed order so the indices will be applied correctly
                newLogs.reverse();

                newLogs.forEach(log => {
                    ingame.gameLogManager.logs.splice(log.index, 0 , {
                        time: log.time,
                        data: log.data
                    });
                });
            }

            return serializedGame;
        }
    },
    {
        version: "70",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "lobby") {
                // Migrate current lobby games and replace the old startWithSevenPowerTokens setting with the new ironBank setting
                if (serializedGame.gameSettings.playerCount >= 8 || serializedGame.gameSettings.startWithSevenPowerTokens) {
                    serializedGame.gameSettings.ironBank = true;
                }
            }
            return serializedGame;
        }
    },
    {
        version: "71",
        migrate: (serializedGame: any) => {
            if (serializedGame.gameSettings.setupId == "a-feast-for-crows") {
                serializedGame.gameSettings.endless = false;
                if (serializedGame.childGameState.type == "ingame" && serializedGame.childGameState.game.turn <= 10) {
                    serializedGame.childGameState.game.maxTurns = 10;
                }
            }
            return serializedGame;
        }
    },
    {
        version: "72",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame" && serializedGame.childGameState.childGameState.type == "thematic-draft-house-cards") {
                const ingame = serializedGame.childGameState;
                const thematicDraft = serializedGame.childGameState.childGameState;

                thematicDraft.readyHouses = [];
                ingame.game.houses.forEach((sh: any) => {
                    if (sh.houseCards.length == 7) {
                        thematicDraft.readyHouses.push(sh.id);
                    }
                });
            }
            return serializedGame;
        }
    },
    {
        version: "73",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame" && serializedGame.childGameState.childGameState.type == "westeros") {
                // Migration for Watering the Seed fix. In the past, the Targaryen player was allowed to place up to 2 loyalty tokens
                // though the card text says "Place 1 loyalty on 2 different areas" instead of "up to 2 different land areas" like
                // it does for Domestic Disputes
                const westeros = serializedGame.childGameState.childGameState;

                if (westeros.childGameState.type == "westeros-deck-4" && westeros.childGameState.childGameState.type == "choose-multiple-regions-for-loyalty-token") {
                    // Anyways, for running games in this state we initialize canBeSkipped with true to simply follow the old way (and not break Domestic Disputes)
                    westeros.childGameState.childGameState.canBeSkipped = true;
                }
            }
            return serializedGame;
        }
    },
    {
        version: "74",
        migrate: (serializedGame: any) => {
            // Migration for Storm of Swords house cards
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                // Initialize usurper with null (ASoS Stannis Baratheon)
                ingame.game.usurper = null;

                // Fix changed log entries
                ingame.gameLogManager.logs.forEach((l: any) => {
                    if (l.data.type == "robb-stark-retreat-location-overriden") {
                        l.data.houseCard = "robb-stark";
                    }

                    // Fix incorrect defense order type ids in orders-revealed log
                    if (l.data.type == "orders-revealed") {
                        l.data.worldState.forEach((regionState: any) => {
                            if (regionState.order?.type == "defense-plus-one") {
                                regionState.order.type = "defense-plus-two";
                            } else if (regionState.order?.type == "defensePlusOne") {
                                regionState.order.type = "defense-plus-one";
                            }
                        });
                    }

                    // Fix incorrect defense order type ids in order-removed log
                    if (l.data.type == "order-removed") {
                        if (l.data.order == "defense-plus-one") {
                            l.data.order = "defense-plus-two";
                        } else if (l.data.order == "defensePlusOne") {
                            l.data.order = "defense-plus-one";
                        }
                    }
                });

                if (ingame.childGameState.type == "action" && ingame.childGameState.childGameState.type == "resolve-march-order" && ingame.childGameState.childGameState.childGameState.type == "combat") {
                    const combat = ingame.childGameState.childGameState.childGameState;
                    combat.specialHouseCardModifier = null;

                    if (combat.childGameState.type == "immediately-house-card-abilities-resolution" && combat.childGameState.childGameState.type == "house-card-resolution"
                        && combat.childGameState.childGameState.childGameState.type == "aeron-damphair-ability") {
                            combat.childGameState.childGameState.childGameState.reduceCombatStrengthOfNewHouseCard = false;
                    }

                    // Align the handling of optional house cards with the other house cards
                    if (combat.childGameState.type == "post-combat" && combat.childGameState.childGameState.type == "after-winner-determination") {
                        const afterWinner = combat.childGameState.childGameState;
                        if (afterWinner.childGameState.type == "house-card-resolution" && (
                                afterWinner.childGameState.childGameState.type == "alayne-stone-ability"
                                || afterWinner.childGameState.childGameState.type == "lysa-arryn-mod-ability"
                                || afterWinner.childGameState.childGameState.type == "reek-ability")
                        ) {
                            const ability = afterWinner.childGameState.childGameState;
                            if (ability.childGameState.type == "simple-choice") {
                                ability.childGameState.choices.reverse();
                            }
                        }
                    }
                }
            }

            return serializedGame;
        }
    },
    {
        version: "75",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame" && serializedGame.childGameState.childGameState.type == "planning") {
                serializedGame.childGameState.childGameState.revealedWesterosCardIds = [];
            }
            return serializedGame;
        }
    },
    {
        version: "76",
        migrate: (serializedGame: any) => {
            serializedGame.users.forEach((u: any) => u.settings.chatHouseNames = false);
            return serializedGame;
        }
    },
    {
        version: "77",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                ingame.game.dragonStrengthTokens = [2, 4, 6, 8, 10].filter(token => token != ingame.game.removedDragonStrengthToken);
            }
            return serializedGame;
        }
    },
    {
        version: "78",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                ingame.game.houses.forEach((sh: any) => sh.laterHouseCards = null);
            }
            return serializedGame;
        }
    },
    {
        version: "79",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                ingame.players.forEach((p: any) => p.liveClockData = null);
            }
            return serializedGame;
        }
    },
    {
        version: "80",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                serializedGame.childGameState.game.paused = null;
            }
            return serializedGame;
        }
    },
    {
        version: "81",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                ingame.game.houses.forEach((h: any) => {
                    if (h.id == "targaryen") {
                        h.color = "#9013FE";
                    }
                });
            }
            return serializedGame;
        }
    },
    {
        version: "82",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                if (serializedGame.gameSettings.onlyLive && !serializedGame.gameSettings.initialLiveClock) {
                    serializedGame.gameSettings.initialLiveClock = 75;
                }

                ingame.paused = ingame.game.paused ? ingame.game.paused : null;
                ingame.willBeAutoResumedAt = ingame.game.willBeAutoResumedAt ? ingame.game.willBeAutoResumedAt : null;
                ingame.game.paused = undefined;
                ingame.game.willBeAutoResumedAt = undefined;
            }
            return serializedGame;
        }
    },
    {
        version: "83",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "lobby") {
                const lobby = serializedGame.childGameState;
                lobby.readyCheckWillTimeoutAt = null;
                lobby.readyUsers = null;
            }
            return serializedGame;
        }
    },
    {
        version: "84",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame" && serializedGame.gameSettings.pbem) {
                const ingame = serializedGame.childGameState;
                ingame.players.forEach((p: any) => p.waitedForData = null);
            }
            return serializedGame;
        }
    },
    {
        version: "85",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                if (ingame.childGameState.type == "action" && ingame.childGameState.childGameState.type == "resolve-march-order" &&
                    ingame.childGameState.childGameState.childGameState.type == "combat"
                    && ingame.childGameState.childGameState.childGameState.childGameState.type == "post-combat") {
                        ingame.childGameState.childGameState.childGameState.childGameState.notDiscardedHouseCardIds = [];
                }
            }
            return serializedGame;
        }
    },
    {
        version: "86",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                ingame.oldPlayerIds = [];
                ingame.replacerIds = [];
                ingame.timeoutPlayerIds = [];

                const replacedLogs = ingame.gameLogManager.logs.filter((l: any) => l.data.type == "player-replaced");
                replacedLogs.forEach((l: any) => {
                    ingame.oldPlayerIds.push(l.data.oldUser);
                    if (l.data.newUser) {
                        ingame.replacerIds.push(l.data.newUser);
                    }
                });

                ingame.oldPlayerIds = _.uniq(ingame.oldPlayerIds);
                ingame.replacerIds = _.uniq(ingame.replacerIds);
            }
            return serializedGame;
        }
    },
    {
        version: "87",
        migrate: (serializedGame: any) => {
            if (serializedGame.gameSettings.onlyLive && serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                ingame.players.forEach((p: any) => {
                    if (!p.liveClockData) {
                        p.liveClockData = {
                            remainingSeconds: 60 * 60,
                            timerStartedAt: null
                        };
                    }
                });
            }
            return serializedGame;
        }
    },
    {
        version: "88",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame" && serializedGame.gameSettings.setupId == "a-dance-with-mother-of-dragons") {
                const ingame = serializedGame.childGameState;
                ingame.game.dragonStrengthTokens = [2, 4, 5, 6];
                ingame.game.removedDragonStrengthToken = 0;
            }
            return serializedGame;
        }
    },
    {
        version: "89",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame" && serializedGame.gameSettings.setupId == "a-dance-with-mother-of-dragons") {
                const ingame = serializedGame.childGameState;

                if (ingame.childGameState.type == "westeros") {
                    const westeros = ingame.childGameState;

                    westeros.revealAndResolveTop2WesterosDeck4Cards = westeros.revealAndResolveTop3WesterosDeck4Cards;
                }
            }
            return serializedGame;
        }
    },
    {
        version: "90",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame" && serializedGame.gameSettings.adwdHouseCards) {
                const boltons = serializedGame.childGameState.game.houses.find((h: any) => h.id == "stark");
                if (boltons) {
                    boltons.name = "Bolton";
                    boltons.color = "#c59699"
                }
            }
            return serializedGame;
        }
    },
    {
        version: "91",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const game = serializedGame.childGameState.game;
                game.winterIsComingHappened = [];
                game.westerosDecks.forEach((_wd: any) => game.winterIsComingHappened.push(false));
            }
            return serializedGame;
        }
    },
    {
        version: "92",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                if (ingame.childGameState.type == "action" && ingame.childGameState.childGameState.type == "resolve-march-order"
                && ingame.childGameState.childGameState.childGameState.type == "take-control-of-enemy-port") {
                    const takeControlOfEnemyPort = ingame.childGameState.childGameState.childGameState;
                    takeControlOfEnemyPort.previousHouseId = takeControlOfEnemyPort.lastHouseThatResolvedMarchOrderId;
                }
            }
            return serializedGame;
        }
    },
    {
        version: "93",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                if (ingame.childGameState.type == "action") {
                    const action = ingame.childGameState;
                    ingame.ordersOnBoard = action.ordersOnBoard;
                } else {
                    ingame.ordersOnBoard = [];
                }
            }
            return serializedGame;
        }
    },
    {
        version: "94",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                ingame.game.vassalHouseCards.forEach(([_hcid, shc]: any) => {
                    shc.state = 0;
                });
            }
            return serializedGame;
        }
    },
    {
        version: "95",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                if (ingame.childGameState.type != "draft-house-cards" && ingame.childGameState.type != "thematic-draft-house-cards") {
                    ingame.game.houseCardsForDrafting = [];
                }
            }
            return serializedGame;
        }
    },
    {
        version: "96",
        migrate: (serializedGame: any) => {
            serializedGame.gameSettings.victoryPointsCountNeededToWin = 7;
            if (serializedGame.gameSettings.reduceVictoryPointsCountNeededToWinTo6) {
                serializedGame.gameSettings.victoryPointsCountNeededToWin = 6;
            }

            return serializedGame;
        }
    },
    {
        version: "97",
        migrate: (serializedGame: any) => {
            serializedGame.gameSettings.customBalancing = serializedGame.gameSettings.customModBalancing ? true : false;
            return serializedGame;
        }
    },
    {
        version: "98",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const game = serializedGame.childGameState.game;
                const allHouseCards = _.flatMap(game.houses.map((h: any) => h.houseCards.map(([_hcid, shc]: any) => shc)));

                allHouseCards.push(...game.houseCardsForDrafting.map(([_hcid, shc]: any) => shc));
                allHouseCards.push(...game.deletedHouseCards.map(([_hcid, shc]: any) => shc));

                const oldPlayerHouseCards = (_.flatMap(game.oldPlayerHouseCards.map(([_hid, hcs]: any) => hcs))).map(([_hcid, shc]) => shc);
                allHouseCards.push(...oldPlayerHouseCards);

                const walderFrey = allHouseCards.find((shc: any) => shc.id == "walder-frey") as any;
                if (walderFrey) {
                    walderFrey.name = "Walder Frey";
                }
            }
            return serializedGame;
        }
    },
    {
        version: "99",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                serializedGame.childGameState.housesTimedOut = [];
            }
            return serializedGame;
        }
    },
    {
        version: "100",
        migrate: (serializedGame: any) => {
            // Add migration to merge gainedLoyaltyTokens and victoryPoints
            if (serializedGame.childGameState.type == "ingame" && serializedGame.gameSettings.setupId != "a-feast-for-crows") {
                const ingame = serializedGame.childGameState;
                ingame.game.houses.forEach((h: any) => {
                    h.victoryPoints = h.gainedLoyaltyTokens;
                });
            }

            return serializedGame;
        }
    },
    {
        version: "101",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame" && serializedGame.gameSettings.setupId == "a-feast-for-crows") {
                const ingame = serializedGame.childGameState;
                const objectiveScoredLogs = ingame.gameLogManager.logs.filter((l: any) => l.data.type == "objective-scored" || l.data.type == "special-objective-scored");

                objectiveScoredLogs.forEach((l: any) => {
                    if (l.data.type == "objective-scored" || l.data.type == "special-objective-scored") {
                        const house = ingame.game.houses.find((h: any) => h.id == l.data.house);
                        if (house && l.data.newTotal > house.victoryPoints) {
                            house.victoryPoints = l.data.newTotal;
                        }
                    }
                });
            }

            return serializedGame;
        }
    },
    {
        version: "102",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;
                ingame.game.loyaltyTokenCountNeededToWin = ingame.game.victoryPointsCountNeededToWin;
            }

            return serializedGame;
        }
    },
    {
        version: "103",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                serializedGame.gameSettings.loyaltyTokenCountNeededToWin = serializedGame.gameSettings.victoryPointsCountNeededToWin;
            }

            return serializedGame;
        }
    },
    {
        version: "104",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const game = serializedGame.childGameState.game;
                game.previousPlayerHouseCards = [];
                game.draftableHouseCards = game.houseCardsForDrafting;
            }

            return serializedGame;
        }
    },
    {
        version: "105",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                if (ingame.childGameState.type == "westeros" && ingame.childGameState.childGameState.type == "westeros-deck-4") {
                    const wd4 = ingame.childGameState.childGameState;
                    if (wd4.childGameState.type == "move-loyalty-tokens") {
                        wd4.childGameState.acceptAllMovements = false;
                    }
                }
            }

            return serializedGame;
        }
    },
    {
        version: "106",
        migrate: (serializedGame: any) => {
            const settings = serializedGame.gameSettings;
            // Fix corrupted Dragon Strength games
            if (serializedGame.childGameState.type == "ingame" && settings.setupId == "mother-of-dragons" && settings.playerCount == 8) {
                const game = serializedGame.childGameState.game;

                if (game.removedDragonStrengthToken == 0 && _.isEqual([2, 4, 6], _.sortBy(game.dragonStrengthTokens))) {
                    game.dragonStrengthTokens = [2, 4, 6, 8, 10];
                }
            }

            return serializedGame;
        }
    },
    {
        version: "107",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                serializedGame.childGameState.bannedUsers = [];
            }

            return serializedGame;
        }
    },
    {
        version: "108",
        migrate: (serializedGame: any) => {
            // Fix undefined notes
            serializedGame.users.forEach((u: any) => {
                if (u.note === undefined) {
                    u.note = "";
                }
            });

            return serializedGame;
        }
    },
    {
        version: "109",
        migrate: (serializedGame: any) => {
            // Don't track PBEM response times after interal server error over several days
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                ingame.players.forEach((p: any) => {
                    p.waitedForData = null;
                });
            }

            return serializedGame;
        }
    },
    {
        version: "110",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                ingame.visibleRegionsPerPlayer = [];
                ingame.publicVisibleRegions = [];
            }

            return serializedGame;
        }
    },
    {
        version: "111",
        migrate: (serializedGame: any) => {
            serializedGame.gameSettings.randomDraft = serializedGame.gameSettings.blindDraft;
            serializedGame.gameSettings.blindDraft = false;
            return serializedGame;
        }
    },
    {
        version: "112",
        migrate: (serializedGame: any) => {
            serializedGame.users.forEach((u: any) => {
                if (!u.settings) {
                    return;
                }

                u.settings.notificationsVolume = u.settings.muted ? 0 : 1;
                u.settings.musicVolume = u.settings.muted ? 0 : 1;
            });
            return serializedGame;
        }
    },
    {
        version: "113",
        migrate: (serializedGame: any) => {
            serializedGame.users.forEach((u: any) => {
                if (!u.settings) {
                    return;
                }

                u.settings.sfxVolume = u.settings.muted ? 0 : 1;
            });
            return serializedGame;
        }
    },
    {
        version: "114",
        migrate: (serializedGame: any) => {
            serializedGame.gameSettings.selectedDraftDecks = 7; // Currently All: Base + Dwd / FfC + ASoS
            return serializedGame;
        }
    },
    {
        version: "115",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                const jaqenLogs = ingame.gameLogManager.logs.filter((l: any) => l.data.type == "jaqen-h-ghar-house-card-replaced");
                jaqenLogs.forEach((l: any) => l.data.usedById = "jaqen-h-ghar");
            }
            return serializedGame;
        }
    },
    {
        version: "116",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                ingame.game.removedDragonStrengthTokens = [];

                if (ingame.game.removedDragonStrengthToken > 0) {
                    ingame.game.removedDragonStrengthTokens = [ingame.game.removedDragonStrengthToken];
                }

                if (ingame.game.maxTurns == 6 && ingame.game.dragonStrengthTokens.length > 0) {
                    ingame.game.removedDragonStrengthTokens.push(10);
                }

                // Fix wrong id for players house cards map with nerfed cards
                if (serializedGame.gameSettings.dragonWar) {
                    ingame.game.houses.forEach((h: any) => {
                        const balon = h.houseCards.find(([id, shc]: any) => id == "balon-greyjoy" && shc.id == "balon-greyjoy-nerved");
                        const aeron = h.houseCards.find(([id, shc]: any) => id == "aeron-damphair-dwd" && shc.id == "aeron-damphair-dwd-nerved");

                        if (balon) {
                            h.houseCards = replaceHouseCard(h.houseCards, "balon-greyjoy", balon);
                        }

                        if (aeron) {
                            h.houseCards = replaceHouseCard(h.houseCards, "aeron-damphair-dwd", aeron);
                        }
                    });
                }
            }
            return serializedGame;
        }
    },
    {
        version: "117",
        migrate: (serializedGame: any) => {
            if (serializedGame.childGameState.type == "ingame") {
                const ingame = serializedGame.childGameState;

                ingame.game.houses.forEach((h: any) => {
                    h.houseCards = applyMigrations(h.houseCards);
                 });

                 ingame.game.draftableHouseCards = applyMigrations(ingame.game.draftableHouseCards);
            }
            return serializedGame;

            function applyMigrations(houseCards: [string, any][]): [string, any][] {
                let result = [...houseCards];
                const aeronDwdNerfed = result.find(([id, _shc]: any) => id == "aeron-damphair-dwd-nerved");
                if (aeronDwdNerfed) {
                    aeronDwdNerfed[1].abilityId = "quentyn-martell";
                    result = replaceHouseCard(result, "aeron-damphair-dwd-nerved", aeronDwdNerfed);
                }

                // Fix typo in nerfed:
                result.filter(([id, _shc]: any) => id.endsWith("-nerved")).forEach(([id, shc]: any) => {
                    shc.id = shc.id.replace("-nerved", "-nerfed");
                    result = replaceHouseCard(result, id, [shc.id, shc]);
                });

                return result;
            }
        }
    }
];

export default serializedGameMigrations;