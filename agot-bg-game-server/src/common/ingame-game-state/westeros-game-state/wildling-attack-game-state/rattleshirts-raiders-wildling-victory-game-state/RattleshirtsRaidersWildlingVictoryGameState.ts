import WildlingsAttackGameState from "../WildlingAttackGameState";
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

    get wildlingAttack(): WildlingsAttackGameState {
        return this.parentGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.ingame;
    }

    firstStart(): void {
        [this.wildlingAttack.lowestBidder].concat(_.without(this.wildlingAttack.game.houses.values, this.wildlingAttack.lowestBidder)).forEach((house, i) => {
            const delta = i == 0 ? 2 : 1;

            this.wildlingAttack.game.changeSupply(house, -delta);
        });

        this.wildlingAttack.entireGame.broadcastToClients({
            type: "supply-adjusted",
            supplies: this.wildlingAttack.game.houses.values.map(h => [h.id, h.supplyLevel])
        });

        this.ingame.log({
            type: "rattleshirts-raiders-wildling-victory",
            lowestBidder: this.wildlingAttack.lowestBidder.id,
            newSupply: this.wildlingAttack.game.houses.values.map(h => [h.id, h.supplyLevel])
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

    static deserializeFromServer(wildlingAttack: WildlingsAttackGameState, data: SerializedRattleshirtsRaidersWildlingVictoryGameState): RattleshirtsRaidersWildlingVictoryGameState {
        const rattleshirtsRaidersWildlingVictory = new RattleshirtsRaidersWildlingVictoryGameState(wildlingAttack);

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
