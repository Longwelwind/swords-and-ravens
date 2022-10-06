import GameState from "../../../../../GameState";
import Game from "../../../../game-data-structure/Game";
import Player from "../../../../Player";
import House from "../../../../game-data-structure/House";
import CombatGameState from "../CombatGameState";
import HouseCard from "../../../../game-data-structure/house-card/HouseCard";
import {ServerMessage} from "../../../../../../messages/ServerMessage";
import {ClientMessage} from "../../../../../../messages/ClientMessage";

export interface ParentGameState extends GameState<any, any> {
    game: Game;
    combatGameState: CombatGameState;

    onHouseCardResolutionFinish(): void;
    resolveHouseCard(house: House, houseCard: HouseCard): void;
    deserializeHouseCardResolutionChild(houseCard: any, data: any): any;
}

export interface ChildGameState extends GameState<any, any> {
    serializeToClient(admin: boolean, player: Player | null): any;

    onPlayerMessage(player: Player, message: ClientMessage): void;
    onServerMessage(message: ServerMessage): void;
}

export default class HouseCardResolutionGameState<P extends ParentGameState, C extends ChildGameState> extends GameState<P, C> {
    resolvedHouses: House[] = [];

    get combatGameState(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    get game(): Game {
        return this.parentGameState.game;
    }

    firstStart(): void {
        this.resolveNextHouseCard();
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    resolveNextHouseCard(): void {
        // Get the next house to resolve
        const nextHouse = this.combatGameState.getOrderResolutionHouseCard()
            .find(h => !this.resolvedHouses.includes(h));

        if (nextHouse == null) {
            this.parentGameState.onHouseCardResolutionFinish();
            return;
        }

        const houseCard = this.combatGameState.houseCombatDatas.get(nextHouse).houseCard;

        if (houseCard == null || houseCard.ability == null || !nextHouse.houseCards.has(houseCard.id)) {
            this.resolvedHouses.push(nextHouse);
            this.resolveNextHouseCard();
            return;
        }

        this.parentGameState.resolveHouseCard(nextHouse, houseCard);
    }

    onHouseCardResolutionFinish(house: House): void {
        this.resolvedHouses.push(house);
        this.resolveNextHouseCard();
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedHouseCardResolutionGameState<any> {
        return {
            type: "house-card-resolution",
            resolvedHouses: this.resolvedHouses.map(h => h.id),
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(parent: ParentGameState, data: SerializedHouseCardResolutionGameState<any>): HouseCardResolutionGameState<any, any> {
        const houseCardResolution = new HouseCardResolutionGameState(parent);

        houseCardResolution.resolvedHouses = data.resolvedHouses.map(hid => houseCardResolution.game.houses.get(hid));
        houseCardResolution.childGameState = houseCardResolution.deserializeChildGameState(data.childGameState);

        return houseCardResolution;
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    deserializeChildGameState(data: any): C {
        return this.parentGameState.deserializeHouseCardResolutionChild(this, data);
    }
}

export interface SerializedHouseCardResolutionGameState<S> {
    type: "house-card-resolution";
    resolvedHouses: string[];
    childGameState: S;
}
