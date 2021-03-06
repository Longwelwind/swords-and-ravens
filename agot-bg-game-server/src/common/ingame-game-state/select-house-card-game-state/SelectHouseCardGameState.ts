import GameState from "../../GameState";
import Game from "../game-data-structure/Game";
import House from "../game-data-structure/House";
import HouseCard from "../game-data-structure/house-card/HouseCard";
import {ServerMessage} from "../../../messages/ServerMessage";
import Player from "../Player";
import {ClientMessage} from "../../../messages/ClientMessage";
import IngameGameState from "../IngameGameState";
import User from "../../../server/User";


interface ParentGameState extends GameState<any, any> {
    game: Game;
    ingame: IngameGameState;

    onSelectHouseCardFinish(house: House, houseCard: HouseCard): void;
}

export default class SelectHouseCardGameState<P extends ParentGameState> extends GameState<P> {
    house: House;
    houseCards: HouseCard[];

    firstStart(house: House, houseCards: HouseCard[]): void {
        this.house = house;
        this.houseCards = houseCards;

        if (houseCards.length == 0) {
            throw new Error("SelectHouseCardGameState called with houseCards.length == 0!");
        }

        // Automatically resolve this state in case there is just one house card to select
        if (houseCards.length == 1) {
            this.parentGameState.onSelectHouseCardFinish(house, houseCards[0]);
        }
    }

    select(houseCard: HouseCard): void {
        this.parentGameState.entireGame.sendMessageToServer({
            type: "select-house-card",
            houseCard: houseCard.id
        })
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "select-house-card") {
            const houseCard = this.parentGameState.game.getHouseCardById(message.houseCard);

            if (this.parentGameState.ingame.getControllerOfHouse(this.house) != player) {
                return;
            }

            if (!this.houseCards.includes(houseCard)) {
                return;
            }

            this.parentGameState.onSelectHouseCardFinish(this.house, houseCard);
        }
    }

    getWaitedUsers(): User[] {
        return [this.parentGameState.ingame.getControllerOfHouse(this.house).user];
    }

    onServerMessage(_message: ServerMessage): void { }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedSelectHouseCardGameState {
        return {
            type: "select-house-card",
            house: this.house.id,
            houseCards: this.houseCards.map(hc => hc.id)
        };
    }

    static deserializeFromServer<P extends ParentGameState>(parent: P, data: SerializedSelectHouseCardGameState): SelectHouseCardGameState<P> {
        const selectHouseCardGameState = new SelectHouseCardGameState(parent);

        selectHouseCardGameState.house = parent.game.houses.get(data.house);
        selectHouseCardGameState.houseCards = data.houseCards.map(hcid => parent.game.getHouseCardById(hcid));

        return selectHouseCardGameState;
    }
}

export interface SerializedSelectHouseCardGameState {
    type: "select-house-card";
    house: string;
    houseCards: string[];
}
