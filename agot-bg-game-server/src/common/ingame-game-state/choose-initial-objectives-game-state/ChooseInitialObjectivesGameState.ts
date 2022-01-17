import IngameGameState from "../IngameGameState";
import GameState from "../../GameState";
import EntireGame from "../../EntireGame";
import Player from "../Player";
import {ClientMessage} from "../../../messages/ClientMessage";
import {ServerMessage} from "../../../messages/ServerMessage";
import House from "../game-data-structure/House";
import Game from "../game-data-structure/Game";
import User from "../../../server/User";
import { ObjectiveCard } from "../game-data-structure/static-data-structure/ObjectiveCard";
import SelectObjectiveCardsGameState, { SerializedSelectObjectiveCardsGameState } from "../select-objective-cards-game-state/SelectObjectiveCardsGameState";
import BetterMap from "../../../utils/BetterMap";
import _ from "lodash";
import getShuffledObjectivesDeck from "../game-data-structure/static-data-structure/ObjectiveCards";
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
        return this.game.houses.values.filter(h => !this.ingame.isVassalHouse(h));
    }

    constructor(ingameGameState: IngameGameState) {
        super(ingameGameState);
    }

    firstStart(): void {
        this.game.objectiveDeck = getShuffledObjectivesDeck();

        this.game.houses.values.forEach(h => {
            for (let i = 0; i < 5; i ++) {
                h.secretObjectives.push(popRandom(this.game.objectiveDeck) as ObjectiveCard);
            }
        });

        this.setChildGameState(new SelectObjectiveCardsGameState(this)).firstStart(
            this.game.houses.values.map(h => [h, h.secretObjectives]),
            3,
            false
        );
    }

    onSelectObjectiveCardsFinish(selectedObjectives: BetterMap<House, ObjectiveCard[]>): void {
        selectedObjectives.keys.forEach(h => {
            const notSelected = _.difference(h.secretObjectives, selectedObjectives.get(h));
            h.secretObjectives = selectedObjectives.get(h);
            this.game.objectiveDeck.push(...notSelected);
        });

        shuffleInPlace(this.game.objectiveDeck);
        this.ingame.broadcastObjectives();
        this.ingame.onChooseInitialObjectivesGameStateEnd();
    }

    getNotReadyPlayers(): Player[] {
        return this.participatingHouses.filter(h => h.houseCards.size < 7).map(h => this.ingame.getControllerOfHouse(h));
    }

    getWaitedUsers(): User[] {
        return this.getNotReadyPlayers().map(p => p.user);
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
