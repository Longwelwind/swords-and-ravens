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
    BeforeCombatHouseCardAbilitiesGameState["childGameState"], BiddingGameState<AeronDamphairDwDAbilityGameState>
> {
    get game(): Game {
        return this.parentGameState.game;
    }

    get combatGameState(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.parentGameState.ingameGameState;
    }

    firstStart(house: House): void {
        if (house.powerTokens > 0) {
            this.setChildGameState(new BiddingGameState(this)).firstStart([house]);
        } else {
            this.ingame.log({
                type: "aeron-damphair-used",
                house: house.id,
                tokens: 0
            });

            this.parentGameState.onHouseCardResolutionFinish(house);
        }
    }

    onBiddingGameStateEnd(result: [number, House[]][]): void {
        // Removing power tokens is done by BiddingGameState!
        if (result.length != 1) {
            return;
        }

        const givenTokens = result[0][0];
        const houses = result[0][1];
        if (houses.length != 1) {
            return;
        }

        const house = houses[0];

        const houseCombatData = this.combatGameState.houseCombatDatas.get(house);
        const aeronDamphairHouseCard = houseCombatData.houseCard;

        // This should normally never happen as there's no way for the houseCard of a house to
        // be null if this game state was triggered.
        if (aeronDamphairHouseCard == null) {
            throw new Error();
        }

        aeronDamphairHouseCard.combatStrength += givenTokens;

        this.entireGame.broadcastToClients({
            type: "manipulate-combat-house-card",
            manipulatedHouseCards: [aeronDamphairHouseCard].map(hc => [hc.id, hc.serializeToClient()])
        });

        this.ingame.log({
            type: "aeron-damphair-used",
            house: house.id,
            tokens: givenTokens
        });

        this.parentGameState.onHouseCardResolutionFinish(house);
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
        const aeronDamphairDwDAbilityGameState = new AeronDamphairDwDAbilityGameState(houseCardResolution);

        aeronDamphairDwDAbilityGameState.childGameState = aeronDamphairDwDAbilityGameState.deserializeChildGameState(data.childGameState);

        return aeronDamphairDwDAbilityGameState;
    }

    deserializeChildGameState(data: SerializedAeronDamphairDwDAbilityGameState["childGameState"]): AeronDamphairDwDAbilityGameState["childGameState"] {
        return BiddingGameState.deserializeFromServer(this, data);

    }
}

export interface SerializedAeronDamphairDwDAbilityGameState {
    type: "aeron-damphair-dwd-ability";
    childGameState: SerializedBiddingGameState;
}
