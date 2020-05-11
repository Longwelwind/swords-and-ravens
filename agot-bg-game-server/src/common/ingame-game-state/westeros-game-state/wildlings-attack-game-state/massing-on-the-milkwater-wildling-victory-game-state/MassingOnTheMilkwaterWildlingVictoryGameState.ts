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
            });

            this.proceedNextHouse(house);
            return;
        }

        if (availableHouseCards.every(hc => hc.combatStrength == availableHouseCards[0].combatStrength)) {
            // Lowest bidder has only cards of same strength left.
            // According to Errata v2 he can decide which one to discard first, the other one will then be discarded at last
            // and stays discarded while the other ones will be available again, which is more a benefit than a penalty...

            this.setChildGameState(new SelectHouseCardGameState(this)).firstStart(house, availableHouseCards);
        } else {
            const highestStrength = _.max(availableHouseCards.map(hc => hc.combatStrength));

            const cardsToDiscard = availableHouseCards.filter(hc => hc.combatStrength == highestStrength);

            cardsToDiscard.forEach(hc => hc.state = HouseCardState.USED);

            this.parentGameState.entireGame.broadcastToClients({
                type: "change-state-house-card",
                houseId: house.id,
                state: HouseCardState.USED,
                cardIds: cardsToDiscard.map(hc => hc.id)
            });

            this.ingame.log({
                type: "massing-on-the-milkwater-house-cards-removed",
                house: house.id,
                houseCardsUsed: cardsToDiscard.map(hc => hc.id)
            });

            this.proceedNextHouse(house);
        }
    }

    executeForEveryoneElse(house: House): void {
        const availableHouseCards = house.houseCards.values.filter(hc => hc.state == HouseCardState.AVAILABLE);

        if (availableHouseCards.length < 2) {
            this.ingame.log({
                type: "massing-on-the-milkwater-house-cards-removed",
                house: house.id,
                houseCardsUsed: []
            });

            this.proceedNextHouse(house);
            return;
        }

        this.setChildGameState(new SelectHouseCardGameState(this)).firstStart(house, availableHouseCards);
    }

    onSelectHouseCardFinish(house: House, houseCard: HouseCard): void {
        if (house == this.parentGameState.lowestBidder) {
            // We only come here when lowest bidder had to decide which of his lowest cards to discard first

            houseCard.state = HouseCardState.USED;
            const availableHouseCards = house.houseCards.values.filter(hc => hc.state == HouseCardState.AVAILABLE);

            if (availableHouseCards.length > 1) {
                // For the case we allow custom decks with e.g. three 2-cards we have to repeat SelectHouseCardGameState
                // until there is only one card left which will be finally discarded.

                this.setChildGameState(new SelectHouseCardGameState(this)).firstStart(house, availableHouseCards);
                return;
            } else if (availableHouseCards.length == 1) {
                const finallyDiscarded = availableHouseCards[0];

                // Create an array for logging which always puts the last discarded card at the end
                const allDiscardedHouseCards = house.houseCards.values.filter(hc => hc != finallyDiscarded && hc.combatStrength == houseCard.combatStrength);
                allDiscardedHouseCards.push(finallyDiscarded);

                this.ingame.log({
                    type: "massing-on-the-milkwater-house-cards-removed",
                    house: house.id,
                    houseCardsUsed: allDiscardedHouseCards.map(hc => hc.id)
                });

                const cardsToRefresh = house.houseCards.values.filter(hc => hc.state == HouseCardState.USED || hc.state == HouseCardState.DISCARDED);

                // The last card stays discarded:
                finallyDiscarded.state = HouseCardState.USED;

                this.parentGameState.entireGame.broadcastToClients({
                    type: "change-state-house-card",
                    houseId: house.id,
                    state: HouseCardState.USED,
                    cardIds: [finallyDiscarded.id]
                });

                // But the rest of his hand has to be refreshed now:
                cardsToRefresh.forEach(hc => {
                    hc.state = HouseCardState.AVAILABLE;

                    this.parentGameState.entireGame.broadcastToClients({
                        type: "change-state-house-card",
                        houseId: house.id,
                        state: HouseCardState.AVAILABLE,
                        cardIds: [hc.id]
                    });
                });
            } else {
                throw new Error("At least one house card should be available when lowest bidder had to select a house card to discard!");
            }
        } else {
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
            });
        }

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
