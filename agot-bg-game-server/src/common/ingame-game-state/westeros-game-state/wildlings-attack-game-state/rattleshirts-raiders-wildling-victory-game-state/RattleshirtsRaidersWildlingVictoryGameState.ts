import WildlingsAttackGameState from "../WildlingsAttackGameState";
import GameState from "../../../../GameState";
import ReconcileArmiesGameState, {SerializedReconcileArmiesGameState} from "../../reconcile-armies-game-state/ReconcileArmiesGameState";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import Game from "../../../game-data-structure/Game";
import _ from "lodash";
import IngameGameState from "../../../IngameGameState";

export default class RattleshirtsRaidersWildlingVictoryGameState extends GameState<
    WildlingsAttackGameState,
    ReconcileArmiesGameState<RattleshirtsRaidersWildlingVictoryGameState>
> {
    get game(): Game {
        return this.parentGameState.game;
    }

    get wildlingsAttack(): WildlingsAttackGameState {
        return this.parentGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.ingame;
    }

    firstStart(): void {
        [this.wildlingsAttack.lowestBidder].concat(_.without(this.wildlingsAttack.participatingHousesWithoutVassals, this.wildlingsAttack.lowestBidder)).forEach((house, i) => {
            const delta = i == 0 ? 2 : 1;

            this.wildlingsAttack.game.changeSupply(house, -delta);
        });

        this.wildlingsAttack.entireGame.broadcastToClients({
            type: "supply-adjusted",
            supplies: this.wildlingsAttack.participatingHousesWithoutVassals.map(h => [h.id, h.supplyLevel])
        });

        this.ingame.log({
            type: "rattleshirts-raiders-wildling-victory",
            lowestBidder: this.wildlingsAttack.lowestBidder.id,
            newSupply: this.wildlingsAttack.participatingHousesWithoutVassals.map(h => [h.id, h.supplyLevel])
        });

        this.setChildGameState(new ReconcileArmiesGameState(this)).firstStart();
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    onReconcileArmiesGameStateEnd(): void {
        this.parentGameState.onWildlingCardExecuteEnd();
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedRattleshirtsRaidersWildlingVictoryGameState {
        return {
            type: "rattleshirts-raiders-wildling-victory",
            childGameState: this.childGameState.serializeToClient()
        };
    }

    static deserializeFromServer(wildlingsAttack: WildlingsAttackGameState, data: SerializedRattleshirtsRaidersWildlingVictoryGameState): RattleshirtsRaidersWildlingVictoryGameState {
        const rattleshirtsRaidersWildlingVictory = new RattleshirtsRaidersWildlingVictoryGameState(wildlingsAttack);

        rattleshirtsRaidersWildlingVictory.childGameState = rattleshirtsRaidersWildlingVictory.deserializeChildGameState(data.childGameState);

        return rattleshirtsRaidersWildlingVictory;
    }

    deserializeChildGameState(data: SerializedRattleshirtsRaidersWildlingVictoryGameState["childGameState"]): RattleshirtsRaidersWildlingVictoryGameState["childGameState"] {
        return ReconcileArmiesGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedRattleshirtsRaidersWildlingVictoryGameState {
    type: "rattleshirts-raiders-wildling-victory";
    childGameState: SerializedReconcileArmiesGameState;
}
