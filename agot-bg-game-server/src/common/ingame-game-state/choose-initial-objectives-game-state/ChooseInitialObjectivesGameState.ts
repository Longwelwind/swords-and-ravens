import IngameGameState from "../IngameGameState";
import GameState from "../../GameState";
import EntireGame from "../../EntireGame";
import Player from "../Player";
import {ClientMessage} from "../../../messages/ClientMessage";
import {ServerMessage} from "../../../messages/ServerMessage";
import House from "../game-data-structure/House";
import Game from "../game-data-structure/Game";
import { ObjectiveCard } from "../game-data-structure/static-data-structure/ObjectiveCard";
import SelectObjectiveCardsGameState, { SerializedSelectObjectiveCardsGameState } from "../select-objective-cards-game-state/SelectObjectiveCardsGameState";
import _ from "lodash";
import getShuffledObjectivesDeck from "../game-data-structure/static-data-structure/objectiveCards";
import popRandom from "../../../utils/popRandom";
import shuffleInPlace from "../../../utils/shuffleInPlace";

export default class ChooseInitialObjectivesGameState extends GameState<IngameGameState, SelectObjectiveCardsGameState<ChooseInitialObjectivesGameState>> {
    get ingame(): IngameGameState {
        return this.parentGameState;
    }

    get game(): Game {
        return this.ingame.game;
    }

    get entireGame(): EntireGame {
        return this.ingame.entireGame;
    }

    get participatingHouses(): House[] {
        return this.game.nonVassalHouses;
    }

    constructor(ingameGameState: IngameGameState) {
        super(ingameGameState);
    }

    firstStart(): void {
        this.game.objectiveDeck = getShuffledObjectivesDeck();

        // Though we disallowed vassals for AFFC we use the nonVassalHouses to maybe enable it later at some point
        this.game.nonVassalHouses.forEach(h => {
            for (let i = 0; i < 5; i ++) {
                h.secretObjectives.push(popRandom(this.game.objectiveDeck) as ObjectiveCard);
            }

            h.secretObjectives = _.sortBy(h.secretObjectives, oc => oc.name);
        });

        this.setChildGameState(new SelectObjectiveCardsGameState(this)).firstStart(
            this.game.nonVassalHouses.map(h => [h, h.secretObjectives]),
            3,
            false
        );
    }

    onObjectiveCardsSelected(house: House, selectedObjectiveCards: ObjectiveCard[]): void {
        const notSelected = _.difference(house.secretObjectives, selectedObjectiveCards);
        house.secretObjectives = _.sortBy(selectedObjectiveCards, oc => oc.name);
        this.game.objectiveDeck.push(...notSelected);

        this.ingame.log({
            type: "objectives-chosen",
            house: house.id
        });

        this.ingame.broadcastObjectives();
    }

    onSelectObjectiveCardsFinish(): void {
        shuffleInPlace(this.game.objectiveDeck);
        this.ingame.onChooseInitialObjectivesGameStateEnd();
    }

    getNotReadyPlayers(): Player[] {
        return this.participatingHouses.filter(h => h.houseCards.size < 7).map(h => this.ingame.getControllerOfHouse(h));
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedChooseInitialObjectivesGameState {
        return {
            type: "choose-initial-objectives",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(ingameGameState: IngameGameState, data: SerializedChooseInitialObjectivesGameState): ChooseInitialObjectivesGameState {
        const chooseObjectives = new ChooseInitialObjectivesGameState(ingameGameState);
        chooseObjectives.childGameState = chooseObjectives.deserializeChildGameState(data.childGameState);
        return chooseObjectives;
    }

    deserializeChildGameState(data: SerializedChooseInitialObjectivesGameState["childGameState"]): ChooseInitialObjectivesGameState["childGameState"] {
        switch (data.type) {
            case "select-objectives":
                return SelectObjectiveCardsGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedChooseInitialObjectivesGameState {
    type: "choose-initial-objectives";
    childGameState: SerializedSelectObjectiveCardsGameState;
}
