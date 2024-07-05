import GameState from "../../../GameState";
import ActionGameState from "../ActionGameState";
import IngameGameState from "../../IngameGameState";
import ResolveSingleMarchOrderGameState, {SerializedResolveSingleMarchOrderGameState} from "./resolve-single-march-order-game-state/ResolveSingleMarchOrderGameState";
import House from "../../game-data-structure/House";
import EntireGame from "../../../EntireGame";
import World from "../../game-data-structure/World";
import Player from "../../Player";
import {ClientMessage} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";
import CombatGameState, {SerializedCombatGameState} from "./combat-game-state/CombatGameState";
import Region from "../../game-data-structure/Region";
import Unit from "../../game-data-structure/Unit";
import Game from "../../game-data-structure/Game";
import Order from "../../game-data-structure/Order";
import TakeControlOfEnemyPortGameState, { SerializedTakeControlOfEnemyPortGameState } from "../../take-control-of-enemy-port-game-state/TakeControlOfEnemyPortGameState";
import BetterMap from "../../../../utils/BetterMap";
import CallForSupportAgainstNeutralForceGameState, { SerializedCallForSupportAgainstNeutralForceGameState } from "./call-for-support-against-neutral-force-game-state/CallForSupportAgainstNeutralForceGameState";

export default class ResolveMarchOrderGameState extends GameState<
        ActionGameState, ResolveSingleMarchOrderGameState | CombatGameState | TakeControlOfEnemyPortGameState | CallForSupportAgainstNeutralForceGameState> {
    public currentTurnOrderIndex: number;

    get actionGameState(): ActionGameState {
        return this.parentGameState;
    }

    get action(): ActionGameState {
        return this.actionGameState;
    }

    get ingameGameState(): IngameGameState {
        return this.actionGameState.ingame;
    }

    get ingame(): IngameGameState {
        return this.ingameGameState;
    }

    get entireGame(): EntireGame {
        return this.actionGameState.entireGame;
    }

    get game(): Game {
        return this.ingameGameState.game;
    }

    get world(): World {
        return this.game.world;
    }

    firstStart(): void {
        this.currentTurnOrderIndex = -1;

	    this.ingameGameState.log({
            type: "action-phase-resolve-march-began"
        });

        this.proceedNextResolveSingleMarchOrder();
    }

    onResolveSingleMarchOrderGameStateFinish(house: House): void {
        // Last march is completely handled

        // Reset all card abilities (e.g. due to DWD Queen of Thorns)
        const manipulatedHouseCards = this.game.getAllHouseCardsInGame().values
            .filter(hc => hc.disabled || hc.originalCombatStrength !== undefined);

        manipulatedHouseCards.forEach(card => {
            if (card.disabled) {
                card.ability = card.disabledAbility;
                card.disabled = false;
                card.disabledAbility = null;
            }
            if (card.originalCombatStrength !== undefined) {
                card.combatStrength = card.originalCombatStrength;
                card.originalCombatStrength = undefined;
            }
        });

        if (manipulatedHouseCards.length > 0) {
            this.entireGame.broadcastToClients({
                type: "manipulate-combat-house-card",
                manipulatedHouseCards: manipulatedHouseCards.map(hc => [hc.id, hc.serializeToClient()])
            });
        }

        // Gain Loyalty tokens
        this.ingameGameState.gainLoyaltyTokens();

        // Handle possible unit loss consequences (checks winning condition)
        const consequence = this.ingame.processPossibleConsequencesOfUnitLossAndCheckWinningConditions();
        if (consequence.victoryConditionsFulfilled) {
            return;
        } else if (consequence.takeOverPort) {
            this.setChildGameState(new TakeControlOfEnemyPortGameState(this))
                .firstStart(consequence.takeOverPort.port, consequence.takeOverPort.newController, house);
            return;
        }

        // Find next march order to resolve
        this.proceedNextResolveSingleMarchOrder();
    }

    onTakeControlOfEnemyPortFinish(previousHouse: House | null): void {
        if (!previousHouse) {
            throw new Error("previousHouse must be set here!");
        }
        // Check if an other march order can be resolved
        this.onResolveSingleMarchOrderGameStateFinish(previousHouse);
    }

    onCallForSupportAgainstNeutralForceGameStateEnd(houseThatResolvesMarchOrder: House, supportersAgainstNeutralForce: BetterMap<Region, House[]>): void {
        this.setChildGameState(new ResolveSingleMarchOrderGameState(this)).firstStart(houseThatResolvesMarchOrder, supportersAgainstNeutralForce);
    }

    proceedNextResolveSingleMarchOrder(): void {
        const houseToResolve = this.getNextHouseToResolveMarchOrder();

        if (houseToResolve == null) {
            // All march orders have been executed
            // go the to the next phase
            this.actionGameState.onResolveMarchOrderGameStateFinish();
            return;
        }

        this.setChildGameState(new ResolveSingleMarchOrderGameState(this)).firstStart(houseToResolve);
    }

    proceedToCombat(attackerComingFrom: Region, combatRegion: Region, attacker: House, defender: House, army: Unit[], order: Order): void {
        this.setChildGameState(new CombatGameState(this)).firstStart(attackerComingFrom, combatRegion, attacker, defender, army, order);
    }

    getNextHouseToResolveMarchOrder(): House | null {
        const turnOrder = this.game.getTurnOrder();
        const numberOfPlayers = turnOrder.length;

        // Check each house in order to find one that has an available March order.
        // Check at most once for each house
        for (let i = 0;i < numberOfPlayers;i++) {
            this.currentTurnOrderIndex = (this.currentTurnOrderIndex + 1) % numberOfPlayers;
            const currentHouseToCheck = turnOrder[this.currentTurnOrderIndex];

            const regions = this.actionGameState.getRegionsWithMarchOrderOfHouse(currentHouseToCheck);
            if (regions.length > 0) {
                return currentHouseToCheck;
            }
        }

        // If no house has any march order available, return null
        return null;
    }

    moveUnits(from: Region, units: Unit[], to: Region): void {
        const controllerToRegion = to.getController();

        if (controllerToRegion != units[0].allegiance) {
            // If there was an order from an other house, remove it
            this.actionGameState.removeOrderFromRegion(to, true);

            // If there was a power token from an other house, remove it
            if (to.controlPowerToken) {
                this.ingameGameState.log({
                    type: "control-power-token-removed",
                    regionId: to.id,
                    houseId: to.controlPowerToken.id
                });

                to.controlPowerToken = null;

                this.ingame.sendMessageToUsersWhoCanSeeRegion({
                    type: "change-control-power-token",
                    regionId: to.id,
                    houseId: null
                }, to);
            }
        }

        units.forEach(u => {
            from.units.delete(u.id);
            to.units.set(u.id, u);
            u.region = to;
        });

        if (!this.ingame.fogOfWar) {
            this.entireGame.broadcastToClients({
                type: "move-units",
                from: from.id,
                to: to.id,
                units: units.map(u => u.id)
            });
        } else {
            const userVisibilityList = this.entireGame.users.values.map(u => {
                const p = this.ingame.players.tryGet(u, null);
                const visibleRegions = this.ingame.getVisibleRegionsForPlayer(p);
                return {
                    user: u,
                    seesFrom: visibleRegions.includes(from),
                    seesTo: visibleRegions.includes(to)
                }
            });

            const usersWhoSeeFromAndTo = userVisibilityList.filter(item => item.seesFrom && item.seesTo).map(item => item.user);
            this.entireGame.sendMessageToClients(usersWhoSeeFromAndTo, {
                type: "move-units",
                from: from.id,
                to: to.id,
                units: units.map(u => u.id)
            });

            const userWhoOnlySeeFrom = userVisibilityList.filter(dict => dict.seesFrom && !dict.seesTo).map(dict => dict.user);
            this.entireGame.sendMessageToClients(userWhoOnlySeeFrom, {
                type: "remove-units",
                regionId: from.id,
                unitIds: units.map(u => u.id),
                animate: false
            });

            const userWhoOnlySeeTo = userVisibilityList.filter(dict => !dict.seesFrom && dict.seesTo).map(dict => dict.user);
            this.entireGame.sendMessageToClients(userWhoOnlySeeTo, {
                type: "add-units",
                regionId: to.id,
                units: units.map(u => u.serializeToClient())
            });
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "call-for-support-against-neutral-force") {
            const resolveSingleMarch = this.childGameState instanceof ResolveSingleMarchOrderGameState ? this.childGameState : null;
            if (!resolveSingleMarch || this.ingameGameState.getControllerOfHouse(resolveSingleMarch.house) != player) {
                return;
            }

            if (resolveSingleMarch.supportersAgainstNeutralForce != null) {
                return;
            }

            const possipleSupporters = resolveSingleMarch.getPossibleSupportingHousesAgainstNeutralForces();
            if (!possipleSupporters || possipleSupporters.size == 0) {
                return;
            }
            this.setChildGameState(new CallForSupportAgainstNeutralForceGameState(this)).firstStart(
                resolveSingleMarch.house, possipleSupporters
            );
        } else {
            this.childGameState.onPlayerMessage(player, message);
        }
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedResolveMarchOrderGameState {
        return {
            type: "resolve-march-order",
            childGameState: this.childGameState.serializeToClient(admin, player),
            currentTurnOrderIndex: this.currentTurnOrderIndex
        };
    }

    static deserializeFromServer(actionGameState: ActionGameState, data: SerializedResolveMarchOrderGameState): ResolveMarchOrderGameState {
        const resolveMarchOrderGameState = new ResolveMarchOrderGameState(actionGameState);
        resolveMarchOrderGameState.currentTurnOrderIndex = data.currentTurnOrderIndex;

        resolveMarchOrderGameState.childGameState = resolveMarchOrderGameState.deserializeChildGameState(data.childGameState);

        return resolveMarchOrderGameState;
    }

    deserializeChildGameState(data: SerializedResolveMarchOrderGameState["childGameState"]): ResolveMarchOrderGameState["childGameState"] {
        if (data.type == "resolve-single-march") {
            return ResolveSingleMarchOrderGameState.deserializeFromServer(this, data);
        } else if (data.type == "combat") {
            return CombatGameState.deserializeFromServer(this, data);
        } else if (data.type == "take-control-of-enemy-port") {
            return TakeControlOfEnemyPortGameState.deserializeFromServer(this, data);
        } else if (data.type == "call-for-support-against-neutral-force") {
            return CallForSupportAgainstNeutralForceGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedResolveMarchOrderGameState {
    type: "resolve-march-order";
    childGameState: SerializedResolveSingleMarchOrderGameState | SerializedCombatGameState
        | SerializedTakeControlOfEnemyPortGameState | SerializedCallForSupportAgainstNeutralForceGameState;
    currentTurnOrderIndex: number;
}
