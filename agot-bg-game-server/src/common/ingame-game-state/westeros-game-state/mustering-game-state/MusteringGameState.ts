import GameState from "../../../GameState";
import WesterosGameState from "../WesterosGameState";
import PlayerMusteringGameState, {
    PlayerMusteringType,
    SerializedPlayerMusteringGameState
} from "./player-mustering-game-state/PlayerMusteringGameState";
import House from "../../game-data-structure/House";
import {ClientMessage} from "../../../../messages/ClientMessage";
import Player from "../../Player";
import {ServerMessage} from "../../../../messages/ServerMessage";
import IngameGameState from "../../IngameGameState";

export default class MusteringGameState extends GameState<WesterosGameState, PlayerMusteringGameState> {

    get game() {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingameGameState;
    }

    firstStart() {
        this.proceedNextHouse();
    }

    onPlayerMusteringEnd(house: House) {
        this.proceedNextHouse(house);
    }

    onPlayerMessage(player: Player, message: ClientMessage ) {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage) {

    }

    proceedNextHouse(house: House | null = null) {
        if (this.game.ironThroneTrack[this.game.ironThroneTrack.length - 1] == house) {
            this.parentGameState.onMusteringGameStateEnd();
            return;
        }

        const nextHouse = this.game.getNextInTurnOrder(house);

        // Check if this can muster something
        if (!this.canMuster(nextHouse)) {
            this.onPlayerMusteringEnd(nextHouse);
            return;
        }

        this.setChildGameState(new PlayerMusteringGameState(this)).firstStart(
            nextHouse,
            PlayerMusteringType.MUSTERING_WESTEROS_CARD
        );
    }

    canMuster(house: House) {
        return this.game.world.getControlledRegions(house).some(r => r.castleLevel > 0);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedMusteringGameState {
        return {
            type: "mustering",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(westeros: WesterosGameState, data: SerializedMusteringGameState): MusteringGameState {
        const mustering = new MusteringGameState(westeros);

        mustering.childGameState = mustering.deserializeChildGameState(data.childGameState);

        return mustering;
    }

    deserializeChildGameState(data: SerializedMusteringGameState["childGameState"]): PlayerMusteringGameState {
        return PlayerMusteringGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedMusteringGameState {
    type: "mustering";
    childGameState: SerializedPlayerMusteringGameState;
}
