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

export default class MasterAtArmsGameState extends GameState<ExecuteLoanGameState, SelectRegionGameState<MasterAtArmsGameState>> {
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
        // No need to filter for selected Regions as after Upgrade the castle wont be available for selection anymore
        return this.game.world.regions.values.filter(r => r.castleLevel == 1);
    }

    firstStart(house: House): void {
        this.selectedRegions = [];
        this.setChildGameState(new SelectRegionGameState(this)).firstStart(house, this.selectableRegions);
    }

    onSelectRegionFinish(house: House, region: Region): void {
        region.castleModifier = 1;
        this.entireGame.broadcastToClients({
            type: "update-region-modifiers",
            region: region.id,
            castleModifier: region.castleModifier
        });

        this.selectedRegions.push(region);

        if (this.selectedRegions.length == 2) {
            this.ingame.log({
                type: "master-at-arms-executed",
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

    serializeToClient(admin: boolean, player: Player | null): SerializedMasterAtArmsGameState {
        return {
            type: "master-at-arms",
            selectedRegions: this.selectedRegions.map(r => r.id),
            childGameState: this.childGameState.serializeToClient(admin, player)
        }
    }

    static deserializeFromServer(parent: ExecuteLoanGameState, data: SerializedMasterAtArmsGameState): MasterAtArmsGameState {
        const gameState = new MasterAtArmsGameState(parent);

        gameState.selectedRegions = data.selectedRegions.map(rid => parent.ingame.world.regions.get(rid));
        gameState.childGameState = gameState.deserializeChildGameState(data.childGameState);

        return gameState;
    }

    deserializeChildGameState(data: SerializedMasterAtArmsGameState["childGameState"]): MasterAtArmsGameState["childGameState"] {
        return SelectRegionGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedMasterAtArmsGameState {
    type: "master-at-arms";
    selectedRegions: string[];
    childGameState: SerializedSelectRegionGameState
}
