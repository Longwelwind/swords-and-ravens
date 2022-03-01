import WesterosGameState from "../WesterosGameState";
import GameState from "../../../GameState";
import Game from "../../game-data-structure/Game";
import Player from "../../Player";
import {ClientMessage} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";
import IngameGameState from "../../IngameGameState";
import SelectObjectiveCardsGameState, { SerializedSelectObjectiveCardsGameState } from "../../select-objective-cards-game-state/SelectObjectiveCardsGameState";
import { ObjectiveCard } from "../../game-data-structure/static-data-structure/ObjectiveCard";
import House from "../../game-data-structure/House";
import _ from "lodash";
import shuffleInPlace from "../../../../utils/shuffleInPlace";
import popRandom from "../../../../utils/popRandom";

export default class NewInformationGameState extends GameState<WesterosGameState, SelectObjectiveCardsGameState<NewInformationGameState>> {
    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    firstStart(): void {
        this.game.ingame.getTurnOrderWithoutVassals().forEach(h => {
            const newCard = popRandom(this.game.objectiveDeck);
            if (newCard) {
                h.secretObjectives.push(newCard);
                this.ingame.log({
                    type: "new-objective-card-drawn",
                    house: h.id
                });
            } else {
                this.ingame.log({
                    type: "objective-deck-empty",
                    house: h.id
                });
            }
        });

        if (this.game.nonVassalHouses.every(h => h.secretObjectives.length <= 3)) {
            this.parentGameState.onWesterosCardEnd();
            return;
        }

        this.setChildGameState(new SelectObjectiveCardsGameState(this)).firstStart(
            this.game.nonVassalHouses.filter(h => h.secretObjectives.length > 3).map(h => [h, h.secretObjectives]),
            1,
            false
        );
    }

    onObjectiveCardsSelected(house: House, selectedObjectiveCards: ObjectiveCard[]): void {
        if (selectedObjectiveCards.length != 1) {
            throw new Error("Unexpected amount of objective cards selected!");
        }

        const selectedObjectiveCard = selectedObjectiveCards[0];

        _.pull(house.secretObjectives, selectedObjectiveCard);
        this.game.objectiveDeck.push(selectedObjectiveCard);

        this.ingame.log({
            type: "new-information-objective-card-chosen",
            house: house.id
        });

        this.ingame.broadcastObjectives();
    }

    onSelectObjectiveCardsFinish(): void {
        shuffleInPlace(this.game.objectiveDeck);
        this.parentGameState.onWesterosCardEnd();
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedNewInformationGameState {
        return {
            type: "new-information",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(westeros: WesterosGameState, data: SerializedNewInformationGameState): NewInformationGameState {
        const newInformation = new NewInformationGameState(westeros);

        newInformation.childGameState = newInformation.deserializeChildGameState(data.childGameState);

        return newInformation;
    }

    deserializeChildGameState(data: SerializedNewInformationGameState["childGameState"]): SelectObjectiveCardsGameState<NewInformationGameState> {
        return SelectObjectiveCardsGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedNewInformationGameState {
    type: "new-information";
    childGameState: SerializedSelectObjectiveCardsGameState;
}
