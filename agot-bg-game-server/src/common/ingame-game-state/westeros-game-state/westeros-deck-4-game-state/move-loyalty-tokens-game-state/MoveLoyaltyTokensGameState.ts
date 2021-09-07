import GameState from "../../../../GameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../simple-choice-game-state/SimpleChoiceGameState";
import Game from "../../../game-data-structure/Game";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import IngameGameState from "../../../IngameGameState";
import House from "../../../game-data-structure/House";
import Region from "../../../game-data-structure/Region";
import SelectRegionGameState, { SerializedSelectRegionGameState } from "../../../select-region-game-state/SelectRegionGameState";
import WesterosDeck4GameState from "../WesterosDeck4GameState";
import WesterosGameState from "../../WesterosGameState";
import { land } from "../../../../../common/ingame-game-state/game-data-structure/regionTypes";
import { observable } from "mobx";

export default class MoveLoyaltyTokensGameState extends GameState<WesterosDeck4GameState,
    SelectRegionGameState<MoveLoyaltyTokensGameState> | SimpleChoiceGameState> {
    resolveOrder: House[];
    costsToDiscardChoice: number;
    @observable regionFrom: Region | null;
    @observable regionTo: Region | null;

    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    get westeros(): WesterosGameState {
        return this.parentGameState.parentGameState;
    }

    get regionsWithLoyaltyTokens(): Region[] {
        return this.game.world.regions.values.filter(r => r.loyaltyTokens > 0);
    }

    firstStart(resolveOrder: House[], costsToDiscardChoice: number): void {
        this.costsToDiscardChoice = costsToDiscardChoice;
        this.resolveOrder = resolveOrder;
        this.proceedNextResolve();
    }

    proceedNextResolve(): void {
        const nextHouse = this.getNextHouseToResolve();
        if (!nextHouse) {
            this.westeros.onWesterosCardEnd();
            return;
        }

        this.regionFrom = null;
        this.regionTo = null;
        this.broadcastRegionFromAndRegionTo();
        this.setChildGameState(new SelectRegionGameState(this)).firstStart(nextHouse, this.regionsWithLoyaltyTokens);
    }

    broadcastRegionFromAndRegionTo(): void {
        this.entireGame.broadcastToClients({
            type: "update-move-loyalty-token-game-state",
            regionFrom: this.regionFrom?.id ?? null,
            regionTo: this.regionTo?.id ?? null
        });
    }

    getNextHouseToResolve(): House | null {
        if (this.resolveOrder.length == 0 || this.regionsWithLoyaltyTokens.length == 0) {
            return null;
        }

        return this.resolveOrder.shift() as House;
    }

    getChoices(house: House): string[] {
        const result = [];
        result.push("Ignore");
        if (house.powerTokens < this.costsToDiscardChoice) {
            return result;
        }

        result.push(`Discard ${this.costsToDiscardChoice} power tokens to cancel the previous movement`);
        return result;
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;
        if (choice == 0) {
            this.ingame.log({
                type: "move-loyalty-token-choice",
                house: house.id,
                powerTokensDiscardedToCancelMovement: 0
            });
        } else if (choice == 1) {
            if (!this.regionFrom) {
                throw new Error("regionFrom must be available here!");
            }

            if (!this.regionTo) {
                throw new Error("regionTo must be available here!");
            }

            this.ingame.log({
                type: "move-loyalty-token-choice",
                house: house.id,
                powerTokensDiscardedToCancelMovement: this.costsToDiscardChoice
            });

            // Remove the power token
            this.ingame.changePowerTokens(this.childGameState.house, -this.costsToDiscardChoice);
            this.movePowerTokens(this.regionTo, this.regionFrom);
        }

        this.proceedNextResolve();
    }

    movePowerTokens(regionFrom: Region, regionTo: Region): void {
        if (regionFrom.loyaltyTokens == 0) {
            throw new Error("Tried to move a loyalty token which doesn't exist!");
        }

        regionFrom.loyaltyTokens -= 1;
        regionTo.loyaltyTokens += 1;

        this.entireGame.broadcastToClients({
            type: "move-loyalty-token",
            regionFrom: regionFrom.id,
            regionTo: regionTo.id
        });
    }

    setCancelMoveGameState(houseWhichMovedLoyaltyTokens: House): void {
        if (!this.game.targaryen) {
            throw new Error("Targaryen must be available here!");
        }

        if (!this.regionFrom) {
            throw new Error("regionFrom must be available here!");
        }

        if (!this.regionTo) {
            throw new Error("regionTo must be available here!");
        }

        this.broadcastRegionFromAndRegionTo();

        this.ingame.log({
            type: "move-loyalty-token-choice",
            house: houseWhichMovedLoyaltyTokens.id,
            regionFrom: this.regionFrom.id,
            regionTo: this.regionTo.id
        });

        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(this.game.targaryen, `House Targaryen may discard ${this.costsToDiscardChoice} power token${this.costsToDiscardChoice > 1 ? "s" : ""} to move the loyalty token back to ${this.regionFrom.name}.`, this.getChoices(this.game.targaryen));
    }

    onSelectRegionFinish(house: House, region: Region): void {
        if (this.regionFrom == null) {
            if (region.loyaltyTokens == 0) {
                // This should never happen!
                return;
            }

            this.regionFrom = region;
            const adjacentRegions = this.game.world.getNeighbouringRegions(region).filter(r => r.type == land)
            if (adjacentRegions.length == 0) {
                this.regionTo = region;
                this.setCancelMoveGameState(house);
                return;
            }

            this.broadcastRegionFromAndRegionTo();

            this.setChildGameState(new SelectRegionGameState(this)).firstStart(house, adjacentRegions);
            return;
        } else if (this.regionFrom != null && this.regionTo == null) {
            this.regionTo = region;

            this.movePowerTokens(this.regionFrom, this.regionTo);

            this.setCancelMoveGameState(house);
            return;
        }

        throw new Error("MoveLoyaltyTokenGameState: We must never reach this line!");
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "update-move-loyalty-token-game-state") {
            this.regionFrom = message.regionFrom ? this.game.world.regions.get(message.regionFrom) : null;
            this.regionTo = message.regionTo ? this.game.world.regions.get(message.regionTo) : null;
        } else {
            this.childGameState.onServerMessage(message);
        }
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedMoveLoyaltyTokensGameState {
        return {
            type: "move-loyalty-tokens",
            resolveOrder: this.resolveOrder.map(h => h.id),
            costsToDiscardChoice: this.costsToDiscardChoice,
            regionFrom: this.regionFrom?.id ?? null,
            regionTo: this.regionTo?.id ?? null,
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(westerosDeck4: WesterosDeck4GameState, data: SerializedMoveLoyaltyTokensGameState): MoveLoyaltyTokensGameState {
        const gameState = new MoveLoyaltyTokensGameState(westerosDeck4);

        gameState.resolveOrder = data.resolveOrder.map(hid => westerosDeck4.game.houses.get(hid));
        gameState.costsToDiscardChoice = data.costsToDiscardChoice;
        gameState.regionFrom = data.regionFrom ? westerosDeck4.game.world.regions.get(data.regionFrom) : null;
        gameState.regionTo = data.regionTo ? westerosDeck4.game.world.regions.get(data.regionTo) : null;
        gameState.childGameState = gameState.deserializeChildGameState(data.childGameState);

        return gameState;
    }

    deserializeChildGameState(data: SerializedMoveLoyaltyTokensGameState["childGameState"]): MoveLoyaltyTokensGameState["childGameState"] {
        if (data.type == "simple-choice") {
            return SimpleChoiceGameState.deserializeFromServer(this, data);
        } else if (data.type == "select-region") {
            return SelectRegionGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedMoveLoyaltyTokensGameState {
    type: "move-loyalty-tokens";
    resolveOrder: string[];
    costsToDiscardChoice: number;
    regionFrom: string | null;
    regionTo: string | null;
    childGameState: SerializedSimpleChoiceGameState | SerializedSelectRegionGameState;
}
