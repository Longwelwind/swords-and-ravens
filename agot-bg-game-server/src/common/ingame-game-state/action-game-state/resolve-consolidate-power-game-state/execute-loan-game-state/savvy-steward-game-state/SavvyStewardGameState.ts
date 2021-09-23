import GameState from "../../../../../GameState";
import Region from "../../../../game-data-structure/Region";
import House from "../../../../game-data-structure/House";
import Game from "../../../../game-data-structure/Game";
import ExecuteLoanGameState from "../ExecuteLoanGameState";
import IngameGameState from "../../../../IngameGameState";
import SelectRegionGameState, { SerializedSelectRegionGameState } from "../../../../select-region-game-state/SelectRegionGameState";
import { ServerMessage } from "../../../../../../messages/ServerMessage";
import { ClientMessage } from "../../../../../../messages/ClientMessage";
import Player from "../../../../Player";
import { land } from "../../../../game-data-structure/regionTypes";

export default class SavvyStewardGameState extends GameState<ExecuteLoanGameState, SelectRegionGameState<SavvyStewardGameState>> {
    get game(): Game {
        return this.parentGameState.game;
    }

    get executeLoanGameState(): ExecuteLoanGameState {
        return this.parentGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    get selectableRegions(): Region[] {
        return this.game.world.regions.values.filter(r => r.type == land);
    }

    firstStart(house: House): void {
        this.setChildGameState(new SelectRegionGameState(this)).firstStart(house, this.selectableRegions);
    }

    onSelectRegionFinish(house: House, region: Region): void {
        region.barrelModifier += 1;
        this.entireGame.broadcastToClients({
            type: "update-region-modifiers",
            region: region.id,
            barrelModifier: region.barrelModifier
        });

        this.game.changeSupply(house, 1);
        this.entireGame.broadcastToClients({
            type: "supply-adjusted",
            supplies: [[house.id, house.supplyLevel]]
        })

        this.ingame.log({
            type: "savvy-steward-executed",
            house: this.childGameState.house.id,
            region: region.id,
            newSupply: house.supplyLevel
        });

        this.executeLoanGameState.onExecuteLoanFinish(house);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedSavvyStewardGameState {
        return {
            type: "savvy-steward",
            childGameState: this.childGameState.serializeToClient(admin, player)
        }
    }

    static deserializeFromServer(parent: ExecuteLoanGameState, data: SerializedSavvyStewardGameState): SavvyStewardGameState {
        const gameState = new SavvyStewardGameState(parent);

        gameState.childGameState = gameState.deserializeChildGameState(data.childGameState);

        return gameState;
    }

    deserializeChildGameState(data: SerializedSavvyStewardGameState["childGameState"]): SavvyStewardGameState["childGameState"] {
        return SelectRegionGameState.deserializeFromServer(this, data);    }
    }

export interface SerializedSavvyStewardGameState {
    type: "savvy-steward";
    childGameState: SerializedSelectRegionGameState
}
