import WildlingsAttackGameState from "../WildlingsAttackGameState";
import SelectHouseCardGameState, {SerializedSelectHouseCardGameState} from "../../../select-house-card-game-state/SelectHouseCardGameState";
import House from "../../../game-data-structure/House";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import HouseCard, {HouseCardState} from "../../../game-data-structure/house-card/HouseCard";
import WildlingCardEffectInTurnOrderGameState from "../WildlingCardEffectInTurnOrderGameState";
import _ from "lodash";
import IngameGameState from "../../../IngameGameState";

export default class MassingOnTheMilkwaterWildlingVictoryGameState extends WildlingCardEffectInTurnOrderGameState<
    SelectHouseCardGameState<MassingOnTheMilkwaterWildlingVictoryGameState>
> {
    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.ingame;
    }

    executeForLowestBidder(house: House): void {
        const availableHouseCards = house.houseCards.values.filter(hc => hc.state == HouseCardState.AVAILABLE);

        if (availableHouseCards.length < 2) {
            this.ingame.log({
                type: "massing-on-the-milkwater-house-cards-removed",
                house: house.id,
                houseCardsUsed: []
            }, true);

            this.proceedNextHouse(house);
            return;
        }

        const highestStrength = _.max(availableHouseCards.map(hc => hc.combatStrength));

        const cardsToDiscard = availableHouseCards.filter(hc => hc.combatStrength == highestStrength);

        // If all the house cards have the same strength, i.e. cardsToDiscard == availableHouseCards
        // Remove none of them
        if (availableHouseCards.length == cardsToDiscard.length) {
            this.ingame.log({
                type: "massing-on-the-milkwater-house-cards-removed",
                house: house.id,
                houseCardsUsed: []
            }, true);

            this.proceedNextHouse(house);
            return;
        }

        cardsToDiscard.forEach(hc => hc.state = HouseCardState.USED);

        this.parentGameState.entireGame.broadcastToClients({
            type: "change-state-house-card",
            houseId: house.id,
            state: HouseCardState.USED,
            cardIds: cardsToDiscard.map(hc => hc.id)
        });

        this.ingame.log({
            type: "massing-on-the-milkwater-house-cards-removed",
            house: this.parentGameState.lowestBidder.id,
            houseCardsUsed: cardsToDiscard.map(hc => hc.id)
        }, true);

        this.proceedNextHouse(house);
    }

    executeForEveryoneElse(house: House): void {
        const availableHouseCards = house.houseCards.values.filter(hc => hc.state == HouseCardState.AVAILABLE);

        if (availableHouseCards.length < 2) {
            this.ingame.log({
                type: "massing-on-the-milkwater-house-cards-removed",
                house: house.id,
                houseCardsUsed: []
            }, true);

            this.proceedNextHouse(house);
            return;
        }

        this.setChildGameState(new SelectHouseCardGameState(this)).firstStart(house, availableHouseCards);
    }

    onSelectHouseCardFinish(house: House, houseCard: HouseCard, resolvedAutomatically: boolean): void {
        houseCard.state = HouseCardState.USED;

        this.parentGameState.entireGame.broadcastToClients({
            type: "change-state-house-card",
            houseId: house.id,
            state: HouseCardState.USED,
            cardIds: [houseCard.id]
        });

        this.ingame.log({
            type: "massing-on-the-milkwater-house-cards-removed",
            house: house.id,
            houseCardsUsed: [houseCard.id]
        }, resolvedAutomatically);

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

    static deserializeFromServer(wildlingsAttack: WildlingsAttackGameState, data: SerializedMassingOnTheMilkwaterWildlingVictoryGameState): MassingOnTheMilkwaterWildlingVictoryGameState {
        const massingOnTheMilkwater = new MassingOnTheMilkwaterWildlingVictoryGameState(wildlingsAttack);

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
