import GameState from "../../../../../GameState";
import CombatGameState from "../CombatGameState";
import {ClientMessage} from "../../../../../../messages/ClientMessage";
import Player from "../../../../Player";
import HouseCard, {HouseCardState} from "../../../../game-data-structure/house-card/HouseCard";
import EntireGame from "../../../../../EntireGame";
import {ServerMessage} from "../../../../../../messages/ServerMessage";
import {observable} from "mobx";
import House from "../../../../game-data-structure/House";

export default class ChooseHouseCardGameState extends GameState<CombatGameState> {
    @observable attackerHouseCardChosen = false;
    attackerHouseCard: HouseCard | null;
    @observable defenderHouseCardChosen = false;
    defenderHouseCard: HouseCard | null;

    get combatGameState(): CombatGameState {
        return this.parentGameState;
    }

    get entireGame(): EntireGame {
        return this.combatGameState.entireGame;
    }

    firstStart(): void {

    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "house-card-chosen") {
            if (message.attackerOrDefender) {
                this.attackerHouseCardChosen = true;
            } else {
                this.defenderHouseCardChosen = true;
            }
        } else if (message.type == "reveal-house-card") {
            this.combatGameState.attackerHouseCard = this.combatGameState.attacker.houseCards.get(message.attackerHouseCard);
            this.combatGameState.defenderHouseCard = this.combatGameState.defender.houseCards.get(message.defenderHouseCard);
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "choose-house-card") {
            if (player.house == this.combatGameState.attacker) {
                if (this.combatGameState.attackerHouseCard != null) {
                    return;
                }

                const houseCard = this.combatGameState.attacker.houseCards.get(message.houseCardId);

                if (!this.getChoosableCards(player.house).includes(houseCard)) {
                    return;
                }

                this.attackerHouseCardChosen = true;
                this.attackerHouseCard = houseCard;

                this.entireGame.broadcastToClients({
                    type: "house-card-chosen",
                    attackerOrDefender: true
                });

                this.checkEndOfGameState();
            } else if (player.house == this.combatGameState.defender) {
                if (this.combatGameState.defenderHouseCard != null) {
                    return;
                }

                const houseCard = this.combatGameState.defender.houseCards.get(message.houseCardId);

                if (!this.getChoosableCards(player.house).includes(houseCard)) {
                    return;
                }

                this.defenderHouseCardChosen = true;
                this.defenderHouseCard = houseCard;

                this.entireGame.broadcastToClients({
                    type: "house-card-chosen",
                    attackerOrDefender: false
                });

                this.checkEndOfGameState();
            }
        }
    }

    private checkEndOfGameState(): void {
        if (this.attackerHouseCard && this.defenderHouseCard) {
            this.combatGameState.attackerHouseCard = this.attackerHouseCard;
            this.combatGameState.defenderHouseCard = this.defenderHouseCard;

            this.entireGame.log(
                `**${this.combatGameState.attacker.name}** chooses **${this.attackerHouseCard.name}**  `,
                `**${this.combatGameState.defender.name}** chooses **${this.defenderHouseCard.name}**`
            );

            this.entireGame.broadcastToClients({
                type: "reveal-house-card",
                attackerHouseCard: this.attackerHouseCard.id,
                defenderHouseCard: this.defenderHouseCard.id
            });

            this.combatGameState.onChooseHouseCardGameStateEnd();
        }
    }

    getChoosableCards(house: House): HouseCard[] {
        return house.houseCards.values.filter(hc => hc.state == HouseCardState.AVAILABLE);
    }

    chooseHouseCard(houseCard: HouseCard): void {
        this.entireGame.sendMessageToServer({
            type: "choose-house-card",
            houseCardId: houseCard.id
        });
    }

    getPhaseName(): string {
        return "Choose a general";
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedChooseHouseCardGameState {
        return {
            type: "choose-house-card",
            attackerHouseCardChosen: this.attackerHouseCardChosen,
            attackerHouseCardId: this.attackerHouseCard && (admin || (player && player.house == this.combatGameState.attacker))
                ? this.attackerHouseCard.id
                : null,
            defenderHouseCardChosen: this.defenderHouseCardChosen,
            defenderHouseCardId: this.defenderHouseCard && (admin || (player && player.house == this.combatGameState.defender))
                ? this.defenderHouseCard.id
                : null
        };
    }

    static deserializeFromServer(combatGameState: CombatGameState, data: SerializedChooseHouseCardGameState): ChooseHouseCardGameState {
        const chooseHouseCardGameState = new ChooseHouseCardGameState(combatGameState);

        chooseHouseCardGameState.attackerHouseCard = data.attackerHouseCardId ? combatGameState.attacker.houseCards.get(data.attackerHouseCardId) : null;
        chooseHouseCardGameState.attackerHouseCardChosen = data.attackerHouseCardChosen;
        chooseHouseCardGameState.defenderHouseCard = data.defenderHouseCardId ? combatGameState.defender.houseCards.get(data.defenderHouseCardId) : null;
        chooseHouseCardGameState.defenderHouseCardChosen = data.defenderHouseCardChosen;

        return chooseHouseCardGameState;
    }
}

export interface SerializedChooseHouseCardGameState {
    type: "choose-house-card";
    attackerHouseCardChosen: boolean;
    attackerHouseCardId: string | null;
    defenderHouseCardChosen: boolean;
    defenderHouseCardId: string | null;
}
