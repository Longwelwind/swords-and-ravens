import GameState from "../../../../../../GameState";
import Game from "../../../../../game-data-structure/Game";
import CombatGameState from "../../CombatGameState";
import House from "../../../../../game-data-structure/House";
import Player from "../../../../../Player";
import {ClientMessage} from "../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../messages/ServerMessage";
import IngameGameState from "../../../../../IngameGameState";
import BeforeCombatHouseCardAbilitiesGameState from "../BeforeCombatHouseCardAbilitiesGameState";
import BiddingGameState, { SerializedBiddingGameState } from "../../../../../westeros-game-state/bidding-game-state/BiddingGameState";

export default class AeronDamphairDwDAbilityGameState extends GameState<
    BeforeCombatHouseCardAbilitiesGameState["childGameState"],
    BiddingGameState<AeronDamphairDwDAbilityGameState>> {

    combatStrengthModifier: number = 2; 

    get game(): Game {
        return this.parentGameState.game;
    }

    get combatGameState(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.parentGameState.ingameGameState;
    }

    onBiddingGameStateEnd(results: [number, House[]][]): void {
        const house = this.game.houses.get("greyjoy")
        this.combatStrengthModifier = results[0][0]

        this.ingame.log({
            type: "aeron-dwd-bid",
            house: house.name,
            powerTokens: this.combatStrengthModifier
        });

        this.entireGame.broadcastToClients({
            type: "change-house-card-strength",
            house: house.id,
            strength: this.combatStrengthModifier
        });

        this.parentGameState.onHouseCardResolutionFinish(house);

        this.ingame.log({
            type: "aeron-damphair-used",
            house: this.childGameState.house.id,
            tokens: choice
        });

    firstStart(house: House): void {
        // If the house doesn't have 2 power tokens, or doesn't have other available
        // house cards, don't even ask him.
        if (house.powerTokens < 0) {
            return ;
        }
        this.setChildGameState(new BiddingGameState(this)).firstStart([house]);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedAeronDamphairDwDAbilityGameState {
        return {
            type: "aeron-damphair-dwd-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(houseCardResolution: BeforeCombatHouseCardAbilitiesGameState["childGameState"], data: SerializedAeronDamphairDwDAbilityGameState): AeronDamphairDwDAbilityGameState {
        const aeronDamphairAdwdAbilityGameState = new AeronDamphairDwDAbilityGameState(houseCardResolution);

        aeronDamphairAdwdAbilityGameState.childGameState = aeronDamphairAdwdAbilityGameState.deserializeChildGameState(data.childGameState);

        return aeronDamphairAdwdAbilityGameState;
    }

    deserializeChildGameState(data: SerializedAeronDamphairDwDAbilityGameState["childGameState"]): AeronDamphairDwDAbilityGameState["childGameState"] {
            return BiddingGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedAeronDamphairDwDAbilityGameState {
    type: "aeron-damphair-dwd-ability";
    childGameState: SerializedBiddingGameState;
}
