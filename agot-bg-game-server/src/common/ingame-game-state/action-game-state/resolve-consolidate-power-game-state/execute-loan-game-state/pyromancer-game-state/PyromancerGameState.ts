import GameState from "../../../../../GameState";
import Region from "../../../../game-data-structure/Region";
import House from "../../../../game-data-structure/House";
import Game from "../../../../game-data-structure/Game";
import ExecuteLoanGameState from "../ExecuteLoanGameState";
import IngameGameState from "../../../../IngameGameState";
import SelectRegionGameState, { SerializedSelectRegionGameState } from "../../../../select-region-game-state/SelectRegionGameState";
import SimpleChoiceGameState, { SerializedSimpleChoiceGameState } from "../../../../simple-choice-game-state/SimpleChoiceGameState";
import { ServerMessage } from "../../../../../../messages/ServerMessage";
import { ClientMessage } from "../../../../../../messages/ClientMessage";
import Player from "../../../../Player";
import { observable } from "mobx";

export default class PyromancerGameState extends GameState<ExecuteLoanGameState, SelectRegionGameState<PyromancerGameState> | SimpleChoiceGameState> {
    @observable chosenRegion: Region | null = null;

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
        return this.game.world.regions.values.filter(r => r.castleLevel == 1);
    }

    firstStart(house: House): void {
        this.setChildGameState(new SelectRegionGameState(this)).firstStart(house, this.selectableRegions);
    }

    onSelectRegionFinish(house: House, region: Region): void {
        this.chosenRegion = region;
        this.chosenRegion.castleModifier = -1;
        this.entireGame.broadcastToClients({
            type: "update-region-modifiers",
            region: this.chosenRegion.id,
            castleModifier: this.chosenRegion.castleModifier
        });

        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(house, "What kind of improvement do you choose?", ["Barrel", "Crown"]);
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        if (!this.chosenRegion) {
            throw new Error("Will never happen but satisfy the linter");
        }

        if (choice == 0) {
            this.chosenRegion.barrelModifier += 1;
        } else {
            this.chosenRegion.crownModifier += 1;
        }

        this.entireGame.broadcastToClients({
            type: "update-region-modifiers",
            region: this.chosenRegion.id,
            barrelModifier: this.chosenRegion.barrelModifier,
            crownModifier: this.chosenRegion.crownModifier
        });

        this.ingame.log({
            type: "pyromancer",
            house: this.childGameState.house.id,
            region: this.chosenRegion.id,
            upgradeType: choice == 0 ? "Barrel" : "Crown"
        });

        this.executeLoanGameState.onExecuteLoanFinish(this.childGameState.house);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedPyromancerGameState {
        return {
            type: "pyromancer",
            chosenRegion: this.chosenRegion?.id ?? null,
            childGameState: this.childGameState.serializeToClient(admin, player)
        }
    }

    static deserializeFromServer(parent: ExecuteLoanGameState, data: SerializedPyromancerGameState): PyromancerGameState {
        const gameState = new PyromancerGameState(parent);

        gameState.chosenRegion = data.chosenRegion ? parent.ingame.world.regions.get(data.chosenRegion) : null;
        gameState.childGameState = gameState.deserializeChildGameState(data.childGameState);

        return gameState;
    }

    deserializeChildGameState(data: SerializedPyromancerGameState["childGameState"]): PyromancerGameState["childGameState"] {
        switch (data.type) {
            case "simple-choice":
                return SimpleChoiceGameState.deserializeFromServer(this, data);
            case "select-region":
                return SelectRegionGameState.deserializeFromServer(this, data);
            default:
                throw new Error("Invalid child game state for Pyromancer");
        }
    }
}

export interface SerializedPyromancerGameState {
    type: "pyromancer";
    chosenRegion: string | null;
    childGameState: SerializedSimpleChoiceGameState | SerializedSelectRegionGameState
}
