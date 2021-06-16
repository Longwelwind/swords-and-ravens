import GameState from "../../GameState";
import Game from "../game-data-structure/Game";
import House from "../game-data-structure/House";
import {ServerMessage} from "../../../messages/ServerMessage";
import Player from "../Player";
import {ClientMessage} from "../../../messages/ClientMessage";
import IngameGameState from "../IngameGameState";
import User from "../../../server/User";
import WesterosCard from "../game-data-structure/westeros-card/WesterosCard";
import _ from "lodash";

interface ParentGameState extends GameState<any, any> {
    game: Game;
    ingame: IngameGameState;

    onSelectWesterosCardFinish(house: House, westerosCard: WesterosCard | null, deckId: number): void;
}

export default class SelectWesterosCardGameState<P extends ParentGameState> extends GameState<P> {
    house: House;
    deckId: number;

    get selectableCards(): WesterosCard[] {
        return _.uniqBy(this.parentGameState.game.westerosDecks[this.deckId].filter(wc => !wc.discarded), wc => wc.type.id);
    }

    firstStart(house: House, deckId: number): void {
        this.house = house;
        this.deckId = deckId;

        // Due to endless mode Deck 3 will be completely discarded in round 20, 30, etc...
        if (this.parentGameState.game.westerosDecks[deckId].every(wc => wc.discarded)) {
            this.parentGameState.onSelectWesterosCardFinish(house, null, deckId);
        }
    }

    select(westerosCard: WesterosCard): void {
        this.parentGameState.entireGame.sendMessageToServer({
            type: "select-westeros-card",
            westerosCardId: westerosCard.id,
            deckId: this.deckId
        });
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "select-westeros-card") {
            if (this.parentGameState.ingame.getControllerOfHouse(this.house) != player) {
                return;
            }

            const westerosCard = this.parentGameState.game.getWesterosCardById(message.westerosCardId, message.deckId);
            if (this.deckId != message.deckId
                || !this.parentGameState.game.westerosDecks[this.deckId].includes(westerosCard)
                || westerosCard.discarded) {
                return;
            }

            this.parentGameState.onSelectWesterosCardFinish(this.house, westerosCard, this.deckId);
        }
    }

    getWaitedUsers(): User[] {
        return [this.parentGameState.ingame.getControllerOfHouse(this.house).user];
    }

    onServerMessage(_message: ServerMessage): void { }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedSelectWesterosCardGameState {
        return {
            type: "select-westeros-card",
            deckId: this.deckId,
            house: this.house.id,
        };
    }

    static deserializeFromServer<P extends ParentGameState>(parent: P, data: SerializedSelectWesterosCardGameState): SelectWesterosCardGameState<P> {
        const selectHouseCardGameState = new SelectWesterosCardGameState(parent);

        selectHouseCardGameState.house = parent.game.houses.get(data.house);
        selectHouseCardGameState.deckId = data.deckId;

        return selectHouseCardGameState;
    }
}

export interface SerializedSelectWesterosCardGameState {
    type: "select-westeros-card";
    house: string;
    deckId: number;
}
