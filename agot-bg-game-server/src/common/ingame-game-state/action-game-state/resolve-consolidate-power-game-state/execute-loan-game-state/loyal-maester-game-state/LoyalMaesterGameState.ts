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
import _ from "lodash";

export default class LoyalMaesterGameState extends GameState<ExecuteLoanGameState, SelectRegionGameState<LoyalMaesterGameState>> {
    selectedRegions: Region[];
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
        return _.without(this.game.world.regions.values.filter(r => r.type == land), ...this.selectedRegions);
    }

    firstStart(house: House): void {
        this.selectedRegions = [];
        this.setChildGameState(new SelectRegionGameState(this)).firstStart(house, this.selectableRegions);
    }

    onSelectRegionFinish(house: House, region: Region): void {
        region.barrelModifier += 1;
        this.entireGame.broadcastToClients({
            type: "update-region-modifiers",
            region: region.id,
            barrelModifier: region.barrelModifier
        });

        this.selectedRegions.push(region);

        if (this.selectedRegions.length == 2) {
            this.ingame.log({
                type: "loyal-maester",
                house: house.id,
                regions: this.selectedRegions.map(r => r.id)
            });

            this.executeLoanGameState.onExecuteLoanFinish(this.childGameState.house);
        } else {
            this.setChildGameState(new SelectRegionGameState(this)).firstStart(house, this.selectableRegions);
        }
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedLoyalMaesterGameState {
        return {
            type: "loyal-maester",
            selectedRegions: this.selectedRegions.map(r => r.id),
            childGameState: this.childGameState.serializeToClient(admin, player)
        }
    }

    static deserializeFromServer(parent: ExecuteLoanGameState, data: SerializedLoyalMaesterGameState): LoyalMaesterGameState {
        const gameState = new LoyalMaesterGameState(parent);

        gameState.selectedRegions = data.selectedRegions.map(rid => parent.ingame.world.regions.get(rid));
        gameState.childGameState = gameState.deserializeChildGameState(data.childGameState);

        return gameState;
    }

    deserializeChildGameState(data: SerializedLoyalMaesterGameState["childGameState"]): LoyalMaesterGameState["childGameState"] {
        return SelectRegionGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedLoyalMaesterGameState {
    type: "loyal-maester";
    selectedRegions: string[];
    childGameState: SerializedSelectRegionGameState
}
