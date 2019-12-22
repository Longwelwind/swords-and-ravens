import WildlingAttackGameState from "../WildlingAttackGameState";
import SelectHouseCardGameState, {SerializedSelectHouseCardGameState} from "../../../select-house-card-game-state/SelectHouseCardGameState";
import House from "../../../game-data-structure/House";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import HouseCard, {HouseCardState} from "../../../game-data-structure/house-card/HouseCard";
import WildlingCardEffectInTurnOrderGameState from "../WildlingCardEffectInTurnOrderGameState";
import _ from "lodash";

export default class MassingOnTheMilkwaterWildlingVictoryGameState extends WildlingCardEffectInTurnOrderGameState<
    SelectHouseCardGameState<MassingOnTheMilkwaterWildlingVictoryGameState>
> {
    executeForLowestBidder(house: House): void {
        const availableHouseCards = house.houseCards.values.filter(hc => hc.state == HouseCardState.AVAILABLE);

        if (availableHouseCards.length < 2) {
            this.proceedNextHouse(house);
            return;
        }

        const highestStrength = _.max(availableHouseCards.map(hc => hc.combatStrength));

        const cardsToDiscard = availableHouseCards.filter(hc => hc.combatStrength == highestStrength);

        cardsToDiscard.forEach(hc => hc.state = HouseCardState.USED);

        this.parentGameState.entireGame.broadcastToClients({
            type: "change-state-house-card",
            houseId: house.id,
            state: HouseCardState.USED,
            cardIds: cardsToDiscard.map(hc => hc.id)
        });

        this.proceedNextHouse(house);
    }

    executeForEveryoneElse(house: House): void {
        const availableHouseCards = house.houseCards.values.filter(hc => hc.state == HouseCardState.AVAILABLE);

        if (availableHouseCards.length < 2) {
            this.proceedNextHouse(house);
            return;
        }

        this.setChildGameState(new SelectHouseCardGameState(this)).firstStart(house, availableHouseCards);
    }

    onSelectHouseCardFinish(house: House, houseCard: HouseCard): void {
        houseCard.state = HouseCardState.USED;

        this.parentGameState.entireGame.broadcastToClients({
            type: "change-state-house-card",
            houseId: house.id,
            state: HouseCardState.USED,
            cardIds: [houseCard.id]
        });

        this.proceedNextHouse(house);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(_message: ServerMessage): void { }

    serializeToClient(admin: boolean, player: Player | null): SerializedMassingOnTheMilkwaterWildlingVictoryGameState {
        return {
            type: "massing-on-the-milkwater-wildling-victory",
            childGameState: this.childGameState.serializeToClient(admin, player)
        }
    }

    static deserializeFromServer(wildlingAttack: WildlingAttackGameState, data: SerializedMassingOnTheMilkwaterWildlingVictoryGameState): MassingOnTheMilkwaterWildlingVictoryGameState {
        const massingOnTheMilkwater = new MassingOnTheMilkwaterWildlingVictoryGameState(wildlingAttack);

        massingOnTheMilkwater.childGameState = massingOnTheMilkwater.deserializeChildGameState(data.childGameState);

        return massingOnTheMilkwater;
    }

    deserializeChildGameState(data: SerializedMassingOnTheMilkwaterWildlingVictoryGameState["childGameState"]): MassingOnTheMilkwaterWildlingVictoryGameState["childGameState"] {
        return SelectHouseCardGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedMassingOnTheMilkwaterWildlingVictoryGameState {
    type: "massing-on-the-milkwater-wildling-victory";
    childGameState: SerializedSelectHouseCardGameState;
}
