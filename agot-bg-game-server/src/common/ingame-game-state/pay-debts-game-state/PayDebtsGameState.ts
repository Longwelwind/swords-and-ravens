import GameState from "../../GameState";
import House from "../game-data-structure/House";
import Player from "../Player";
import {ClientMessage} from "../../../messages/ClientMessage";
import {ServerMessage} from "../../../messages/ServerMessage";
import IngameGameState from "../IngameGameState";
import BetterMap from "../../../utils/BetterMap";
import ResolveSinglePayDebtGameState, { SerializedResolveSinglePayDebtGameState } from "./resolve-single-pay-debt-game-state/ResolveSinglePayDebtGameState";

export default class PayDebtsGameState extends GameState<IngameGameState, ResolveSinglePayDebtGameState> {
    unpaidDepts: BetterMap<House, number>;
    get ingame(): IngameGameState {
        return this.parentGameState;
    }

    firstStart(unpaidDebts: [House, number][]): void {
        this.unpaidDepts = new BetterMap(unpaidDebts);
        this.proceedNextResolve();
    }

    proceedNextResolve(): void {
        this.ingame.gainLoyaltyTokens();
        const nextHouse = this.pullNextHouseToResolve();
        if (!nextHouse) {
            this.ingame.onPayDebtsGameStateFinish();
            return;
        }

        this.setChildGameState(new ResolveSinglePayDebtGameState(this)).firstStart(nextHouse[0], nextHouse[1]);
    }

    pullNextHouseToResolve(): [House, number] | null {
        if (this.unpaidDepts.size == 0) {
            return null;
        }

        const nextHouse = this.unpaidDepts.keys[0];
        const debt = this.unpaidDepts.get(nextHouse);
        this.unpaidDepts.delete(nextHouse);
        return [nextHouse, debt];
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedPayDebtsGameState{
        return {
            type: "pay-debts",
            unpaidDebts: this.unpaidDepts.entries.map(([house, debt]) => [house.id, debt]),
            childGameState: this.childGameState.serializeToClient()
        };
    }

    static deserializeFromServer(ingame: IngameGameState, data: SerializedPayDebtsGameState): PayDebtsGameState {
        const gameState = new PayDebtsGameState(ingame);
        gameState.unpaidDepts = new BetterMap(data.unpaidDebts.map(([house, debt]) => [ingame.game.houses.get(house), debt]));
        gameState.childGameState = gameState.deserializeChildGameState(data.childGameState);
        return gameState;
    }

    deserializeChildGameState(data: SerializedResolveSinglePayDebtGameState): ResolveSinglePayDebtGameState {
        return ResolveSinglePayDebtGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedPayDebtsGameState {
    type: "pay-debts";
    unpaidDebts: [string, number][];
    childGameState: SerializedResolveSinglePayDebtGameState;
}
