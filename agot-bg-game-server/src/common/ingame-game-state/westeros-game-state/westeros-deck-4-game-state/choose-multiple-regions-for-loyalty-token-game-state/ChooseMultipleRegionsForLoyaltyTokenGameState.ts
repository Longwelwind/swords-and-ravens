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
import _ from "lodash";

export default class ChooseMultipleRegionsForLoyaltyTokenGameState extends GameState<WesterosDeck4GameState,
    SelectRegionGameState<ChooseMultipleRegionsForLoyaltyTokenGameState> | SimpleChoiceGameState> {
    costs: number;
    regions: Region[];
    count: number;
    placedCount: number;
    hasAlreadyPaid: boolean;

    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    get westeros(): WesterosGameState {
        return this.parentGameState.parentGameState;
    }

    firstStart(house: House, costs: number, regions: Region[], count: number, description: string): void {
        this.regions = regions;
        this.costs = costs;
        this.count = count;
        this.placedCount = 0;
        this.hasAlreadyPaid = false;
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(house, description, this.getChoices(house));
    }

    getChoices(house: House): string[] {
        const result = [];
        result.push("Ignore");
        if (house.powerTokens < this.costs || !this.game.isLoyaltyTokenAvailable || this.regions.length == 0) {
            return result;
        }

        result.push("Activate");
        return result;
    }

    onSimpleChoiceGameStateEnd(choice: number, resolvedAutomatically: boolean): void {
        const house = this.childGameState.house;

        if (this.hasAlreadyPaid) {
            if (choice == 0) {
                this.setChildGameState(new SelectRegionGameState(this)).firstStart(house, this.regions);
            } else {
                this.westeros.onWesterosCardEnd();
            }
        } else {
            if (choice == 0) {
                this.ingame.log({
                    type: "place-loyalty-choice",
                    house: this.childGameState.house.id,
                    discardedPowerTokens: 0,
                    loyaltyTokenCount: 0
                }, resolvedAutomatically);
                this.westeros.onWesterosCardEnd();
            } else if (choice == 1) {
                this.ingame.log({
                    type: "place-loyalty-choice",
                    house: this.childGameState.house.id,
                    discardedPowerTokens: this.costs,
                    loyaltyTokenCount: this.count
                });

                // Remove the power token
                this.ingame.changePowerTokens(this.childGameState.house, -this.costs);
                this.hasAlreadyPaid = true;
                this.setChildGameState(new SelectRegionGameState(this)).firstStart(house, this.regions);
            }
        }
    }

    onSelectRegionFinish(house: House, region: Region): void {
        this.placedCount++;
        this.westeros.placeLoyaltyToken(region);
        this.regions = _.without(this.regions, region);

        if (this.game.isLoyaltyTokenAvailable && this.placedCount < this.count && this.regions.length > 0) {
            this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(house, `House ${house.name} can choose to place another loyalty token.`, ["Place another loyalty token", "Finish"]);
        } else {
            this.westeros.onWesterosCardEnd();
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedChooseMultipleRegionsForLoyaltyTokenGameState {
        return {
            type: "choose-multiple-regions-for-loyalty-token",
            costs: this.costs,
            regions: this.regions.map(r => r.id),
            count: this.count,
            placedCount: this.placedCount,
            hasAlreadyPaid: this.hasAlreadyPaid,
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(westerosDeck4: WesterosDeck4GameState, data: SerializedChooseMultipleRegionsForLoyaltyTokenGameState): ChooseMultipleRegionsForLoyaltyTokenGameState {
        const gameState = new ChooseMultipleRegionsForLoyaltyTokenGameState(westerosDeck4);

        gameState.costs = data.costs;
        gameState.regions = data.regions.map(r => westerosDeck4.parentGameState.world.regions.get(r));
        gameState.count = data.count;
        gameState.placedCount = data.count;
        gameState.hasAlreadyPaid = data.hasAlreadyPaid;
        gameState.childGameState = gameState.deserializeChildGameState(data.childGameState);

        return gameState;
    }

    deserializeChildGameState(data: SerializedChooseMultipleRegionsForLoyaltyTokenGameState["childGameState"]): ChooseMultipleRegionsForLoyaltyTokenGameState["childGameState"] {
        if (data.type == "simple-choice") {
            return SimpleChoiceGameState.deserializeFromServer(this, data);
        } else if (data.type == "select-region") {
            return SelectRegionGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedChooseMultipleRegionsForLoyaltyTokenGameState {
    type: "choose-multiple-regions-for-loyalty-token";
    costs: number;
    regions: string[];
    count: number;
    placedCount: number;
    hasAlreadyPaid: boolean;
    childGameState: SerializedSimpleChoiceGameState | SerializedSelectRegionGameState;
}
