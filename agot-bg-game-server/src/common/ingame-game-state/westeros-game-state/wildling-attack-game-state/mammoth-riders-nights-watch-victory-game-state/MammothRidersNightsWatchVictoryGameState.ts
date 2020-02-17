import GameState from "../../../../GameState";
import WildlingsAttackGameState from "../WildlingAttackGameState";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import House from "../../../game-data-structure/House";
import Game from "../../../game-data-structure/Game";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../simple-choice-game-state/SimpleChoiceGameState";
import SelectHouseCardGameState, {SerializedSelectHouseCardGameState} from "../../../select-house-card-game-state/SelectHouseCardGameState";
import HouseCard, {HouseCardState} from "../../../game-data-structure/house-card/HouseCard";
import IngameGameState from "../../../IngameGameState";

export default class MammothRidersNightsWatchVictoryGameState extends GameState<
    WildlingsAttackGameState,
    SimpleChoiceGameState | SelectHouseCardGameState<MammothRidersNightsWatchVictoryGameState>
> {
    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.ingame;
    }

    firstStart(): void {
        const house = this.parentGameState.highestBidder;

        const usedHouseCards = this.getUsedHouseCards(house);
        if (usedHouseCards.length == 0) {
            this.parentGameState.onWildlingCardExecuteEnd();
            return;
        }

        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
            house,
            "",
            ["Retrieve a House card", "Ignore"]
        );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;

        if (choice == 0) {
            this.setChildGameState(new SelectHouseCardGameState(this))
                .firstStart(house, this.getUsedHouseCards(house));
        } else {
            this.parentGameState.onWildlingCardExecuteEnd();
        }
    }

    onSelectHouseCardFinish(house: House, houseCard: HouseCard): void {
        houseCard.state = HouseCardState.AVAILABLE;

        this.entireGame.broadcastToClients({
            type: "change-state-house-card",
            houseId: house.id,
            cardIds: [houseCard.id],
            state: HouseCardState.AVAILABLE
        });

        this.ingame.log({
            type: "mammoth-riders-return-card",
            house: house.id,
            houseCard: houseCard.id
        });

        this.parentGameState.onWildlingCardExecuteEnd();
    }

    getUsedHouseCards(house: House): HouseCard[] {
        return house.houseCards.values.filter(hc => hc.state == HouseCardState.USED);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(_message: ServerMessage): void { }

    serializeToClient(admin: boolean, player: Player | null): SerializedMammothRidersNightsWatchVictoryGameState {
        return {
            type: "mammoth-riders-nights-watch-victory",
            childGameState: this.childGameState.serializeToClient(admin, player)
        }
    }

    static deserializeFromServer(parent: WildlingsAttackGameState, data: SerializedMammothRidersNightsWatchVictoryGameState): MammothRidersNightsWatchVictoryGameState {
        const mammothRiders = new MammothRidersNightsWatchVictoryGameState(parent);

        mammothRiders.childGameState = mammothRiders.deserializeChildGameState(data.childGameState);

        return mammothRiders;
    }

    deserializeChildGameState(data: SerializedMammothRidersNightsWatchVictoryGameState["childGameState"]): MammothRidersNightsWatchVictoryGameState["childGameState"] {
        switch (data.type) {
            case "select-house-card":
                return SelectHouseCardGameState.deserializeFromServer(this, data);
            case "simple-choice":
                return SimpleChoiceGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedMammothRidersNightsWatchVictoryGameState {
    type: "mammoth-riders-nights-watch-victory";
    childGameState: SerializedSimpleChoiceGameState | SerializedSelectHouseCardGameState;
}
