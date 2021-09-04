import GameState from "../../../GameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../simple-choice-game-state/SimpleChoiceGameState";
import Game, { MAX_LOYALTY_TOKEN_COUNT } from "../../game-data-structure/Game";
import Player from "../../Player";
import {ClientMessage} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";
import IngameGameState from "../../IngameGameState";
import House from "../../game-data-structure/House";
import Region from "../../game-data-structure/Region";
import SelectRegionGameState, { SerializedSelectRegionGameState } from "../../select-region-game-state/SelectRegionGameState";
import WesterosDeck4GameState from "../westeros-deck-4-game-state/WesterosDeck4GameState";
import WesterosGameState from "../WesterosGameState";

export default class ChooseRegionForLoyaltyTokenGameState extends GameState<WesterosDeck4GameState,
    SelectRegionGameState<ChooseRegionForLoyaltyTokenGameState> | SimpleChoiceGameState> {
    regions: Region[];
    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    get westeros(): WesterosGameState {
        return this.parentGameState.parentGameState;
    }

    firstStart(house: House, regions: Region[]): void {
        this.regions = regions;
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(house, `House ${house.name} may discard 1 Power token to place a loyalty token in ${regions.map(r => r.name).join(" or ")}.`, this.getChoices(house));
    }

    getChoices(house: House): string[] {
        const result = [];
        result.push("Ignore");
        if (house.powerTokens <= 0 && this.game.loyaltyTokensOnBoardCount + 1 <= MAX_LOYALTY_TOKEN_COUNT) {
            return result;
        }

        result.push("Activate");
        return result;
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;
        if (choice == 0) {
            this.ingame.log({
                type: "place-loyalty-choice",
                house: this.childGameState.house.id,
                discardedPowerTokens: 0
            });
            this.westeros.onWesterosCardEnd();
        } else if (choice == 1) {
            this.ingame.log({
                type: "place-loyalty-choice",
                house: this.childGameState.house.id,
                discardedPowerTokens: 1
            });

            // Remove the power token
            this.ingame.changePowerTokens(this.childGameState.house, -1);
            this.setChildGameState(new SelectRegionGameState(this)).firstStart(house, this.regions);
        }
    }

    onSelectRegionFinish(_house: House, region: Region): void {
        this.westeros.placeLoyaltyToken(region);
        this.westeros.onWesterosCardEnd();
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedChooseRegionForLoyaltyTokenGameState {
        return {
            type: "choose-region-for-loyalty-token",
            regions: this.regions.map(r => r.id),
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(westerosDeck4: WesterosDeck4GameState, data: SerializedChooseRegionForLoyaltyTokenGameState): ChooseRegionForLoyaltyTokenGameState {
        const chooseRegionForLoyaltyTokenGameState = new ChooseRegionForLoyaltyTokenGameState(westerosDeck4);

        chooseRegionForLoyaltyTokenGameState.regions = data.regions.map(r => westerosDeck4.parentGameState.world.regions.get(r));
        chooseRegionForLoyaltyTokenGameState.childGameState = chooseRegionForLoyaltyTokenGameState.deserializeChildGameState(data.childGameState);

        return chooseRegionForLoyaltyTokenGameState;
    }

    deserializeChildGameState(data: SerializedChooseRegionForLoyaltyTokenGameState["childGameState"]): ChooseRegionForLoyaltyTokenGameState["childGameState"] {
        if (data.type == "simple-choice") {
            return SimpleChoiceGameState.deserializeFromServer(this, data);
        } else if (data.type == "select-region") {
            return SelectRegionGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedChooseRegionForLoyaltyTokenGameState {
    type: "choose-region-for-loyalty-token";
    regions: string[];
    childGameState: SerializedSimpleChoiceGameState | SerializedSelectRegionGameState;
}
