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
import { observable } from "mobx";
import { objectiveCards } from "../../game-data-structure/static-data-structure/objectiveCards";
import _ from "lodash";
import shuffleInPlace from "../../../../utils/shuffleInPlace";

export enum ShiftingAmbitionsStep {
    CHOOSE_OBJECTIVE_FROM_HAND,
    CHOOSE_OBJECTIVE_FROM_POOL
}

export default class ShiftingAmbitionsGameState extends GameState<WesterosGameState, SelectObjectiveCardsGameState<ShiftingAmbitionsGameState>> {
    @observable step: ShiftingAmbitionsStep;
    @observable objectiveCardPool: ObjectiveCard[];
    @observable turnOrder: House[];

    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    firstStart(): void {
        this.step = ShiftingAmbitionsStep.CHOOSE_OBJECTIVE_FROM_HAND;
        this.objectiveCardPool = [];
        this.turnOrder = this.ingame.getTurnOrderWithoutVassals();
        this.setChildGameState(new SelectObjectiveCardsGameState(this)).firstStart(
            this.game.nonVassalHouses.map(h => [h, h.secretObjectives]),
            1,
            false
        );
    }

    onObjectiveCardsSelected(house: House, selectedObjectiveCards: ObjectiveCard[], resolvedAutomatically: boolean): void {
        if (selectedObjectiveCards.length != 1) {
            throw new Error("Unexpected amount of objective cards selected!");
        }

        const selectedObjectiveCard = selectedObjectiveCards[0];

        if (this.step == ShiftingAmbitionsStep.CHOOSE_OBJECTIVE_FROM_HAND) {
            this.objectiveCardPool.push(selectedObjectiveCard);
            _.pull(house.secretObjectives, selectedObjectiveCard);

            this.ingame.log({
                type: "shifting-ambitions-objective-chosen-from-hand",
                house: house.id
            });
        } else if (this.step == ShiftingAmbitionsStep.CHOOSE_OBJECTIVE_FROM_POOL) {
            house.secretObjectives.push(selectedObjectiveCard);
            _.pull(this.objectiveCardPool, selectedObjectiveCard);

            this.ingame.log({
                type: "shifting-ambitions-objective-chosen-from-pool",
                house: house.id,
                objectiveCard: selectedObjectiveCard.id
            }, resolvedAutomatically);
        }

        this.ingame.broadcastObjectives();
    }

    onSelectObjectiveCardsFinish(): void {
        if (this.step == ShiftingAmbitionsStep.CHOOSE_OBJECTIVE_FROM_HAND) {
            shuffleInPlace(this.objectiveCardPool);
            this.step = ShiftingAmbitionsStep.CHOOSE_OBJECTIVE_FROM_POOL;
        }

        this.snychGameStateToClients();

        this.proceedNextHouse();
    }

    proceedNextHouse(): void {
        if (this.turnOrder.length > 0) {
            const nextHouse = this.turnOrder.shift() as House;

            this.setChildGameState(new SelectObjectiveCardsGameState(this)).firstStart(
                [[nextHouse, this.objectiveCardPool]],
                1,
                false
            );
        } else {
            this.parentGameState.onWesterosCardEnd();
        }
    }

    snychGameStateToClients(): void {
        this.entireGame.broadcastToClients({
            type: "sync-shifting-ambitions",
            step: this.step,
            objectiveCardPool: this.step == ShiftingAmbitionsStep.CHOOSE_OBJECTIVE_FROM_POOL ? this.objectiveCardPool.map(oc => oc.id) : [],
            turnOrder: this.turnOrder.map(h => h.id)
        });
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "sync-shifting-ambitions") {
            this.step = message.step;
            this.objectiveCardPool = message.objectiveCardPool.map(ocid => objectiveCards.get(ocid));
            this.turnOrder = message.turnOrder.map(hid => this.game.houses.get(hid));
        } else {
            this.childGameState.onServerMessage(message);
        }
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedShiftingAmbitionsGameState {
        return {
            type: "shifting-ambitions",
            step: this.step,
            objectiveCardPool: admin || this.step == ShiftingAmbitionsStep.CHOOSE_OBJECTIVE_FROM_POOL ? this.objectiveCardPool.map(oc => oc.id) : [],
            turnOrder: this.turnOrder.map(h => h.id),
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(westeros: WesterosGameState, data: SerializedShiftingAmbitionsGameState): ShiftingAmbitionsGameState {
        const shiftingAmbitions = new ShiftingAmbitionsGameState(westeros);

        shiftingAmbitions.step = data.step;
        shiftingAmbitions.objectiveCardPool = data.objectiveCardPool.map(ocid => objectiveCards.get(ocid));
        shiftingAmbitions.turnOrder = data.turnOrder.map(hid => westeros.game.houses.get(hid));
        shiftingAmbitions.childGameState = shiftingAmbitions.deserializeChildGameState(data.childGameState);

        return shiftingAmbitions;
    }

    deserializeChildGameState(data: SerializedShiftingAmbitionsGameState["childGameState"]): SelectObjectiveCardsGameState<ShiftingAmbitionsGameState> {
        return SelectObjectiveCardsGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedShiftingAmbitionsGameState {
    type: "shifting-ambitions";
    step: ShiftingAmbitionsStep;
    objectiveCardPool: string[];
    turnOrder: string[];
    childGameState: SerializedSelectObjectiveCardsGameState;
}
