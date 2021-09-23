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

export default class ExpertArtificerGameState extends GameState<ExecuteLoanGameState, SelectRegionGameState<ExpertArtificerGameState>> {
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
        region.crownModifier += 1;
        this.entireGame.broadcastToClients({
            type: "update-region-modifiers",
            region: region.id,
            crownModifier: region.crownModifier
        });

        const gained = this.ingame.changePowerTokens(house, 8);

        this.ingame.log({
            type: "expert-artificer",
            house: house.id,
            region: region.id,
            gainedPowerTokens: gained
        });

        this.executeLoanGameState.onExecuteLoanFinish(this.childGameState.house);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedExpertArtificerGameState {
        return {
            type: "expert-artificer",
            childGameState: this.childGameState.serializeToClient(admin, player)
        }
    }

    static deserializeFromServer(parent: ExecuteLoanGameState, data: SerializedExpertArtificerGameState): ExpertArtificerGameState {
        const gameState = new ExpertArtificerGameState(parent);

        gameState.childGameState = gameState.deserializeChildGameState(data.childGameState);

        return gameState;
    }

    deserializeChildGameState(data: SerializedExpertArtificerGameState["childGameState"]): ExpertArtificerGameState["childGameState"] {
        return SelectRegionGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedExpertArtificerGameState {
    type: "expert-artificer";
    childGameState: SerializedSelectRegionGameState
}
