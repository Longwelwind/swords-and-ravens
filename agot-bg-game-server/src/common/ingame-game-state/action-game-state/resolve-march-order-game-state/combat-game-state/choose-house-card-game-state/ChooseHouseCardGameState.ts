import GameState from "../../../../../GameState";
import CombatGameState from "../CombatGameState";
import {ClientMessage} from "../../../../../../messages/ClientMessage";
import Player from "../../../../Player";
import HouseCard, {HouseCardState} from "../../../../game-data-structure/house-card/HouseCard";
import EntireGame from "../../../../../EntireGame";
import {ServerMessage} from "../../../../../../messages/ServerMessage";
import {observable} from "mobx";
import House from "../../../../game-data-structure/House";
import BetterMap from "../../../../../../utils/BetterMap";
import IngameGameState from "../../../../IngameGameState";
import _ from "lodash";
import User from "../../../../../../server/User";

export default class ChooseHouseCardGameState extends GameState<CombatGameState> {
    // A null value for a key can be present client-side, it indicates
    // that a house card was chosen but it may not be shown to the player.
    @observable houseCards = new BetterMap<House, HouseCard | null>();

    get combatGameState(): CombatGameState {
        return this.parentGameState;
    }

    get entireGame(): EntireGame {
        return this.combatGameState.entireGame;
    }

    get ingameGameState(): IngameGameState {
        return this.combatGameState.ingameGameState;
    }

    firstStart(): void {

    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "house-card-chosen") {
            const house = this.combatGameState.game.houses.get(message.houseId);

            this.houseCards.set(house, null);
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "choose-house-card") {
            if (!this.combatGameState.houseCombatDatas.has(player.house)) {
                return;
            }

            const houseCard = player.house.houseCards.get(message.houseCardId);

            if (!this.getChoosableCards(player.house).includes(houseCard)) {
                return;
            }

            this.houseCards.set(player.house, houseCard);

            this.entireGame.broadcastToClients({
                type: "house-card-chosen",
                houseId: player.house.id
            });

            if (this.houseCards.size == 2) {
                this.houseCards.forEach((houseCard, house) => this.combatGameState.houseCombatDatas.get(house).houseCard = houseCard);

                this.entireGame.broadcastToClients({
                    type: "change-combat-house-card",
                    // Same here, the houseCards will always be non-null
                    // @ts-ignore
                    houseCardIds: this.combatGameState.houseCombatDatas.map((h, hcd) => [h.id, hcd.houseCard.id])
                });

                this.combatGameState.onChooseHouseCardGameStateEnd();
            }
        }
    }

    getWaitingForHouses(): House[] {
        return _.difference(this.combatGameState.houseCombatDatas.keys, this.houseCards.keys);
    }

    getWaitedUsers(): User[] {
        return this.getWaitingForHouses().map(h => this.ingameGameState.getControllerOfHouse(h).user);
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

    serializeToClient(_admin: boolean, _player: Player | null): SerializedChooseHouseCardGameState {
        return {
            type: "choose-house-card",
            houseCards: this.houseCards.map((h, hc) => [h.id, hc ? hc.id : null])
        };
    }

    static deserializeFromServer(combatGameState: CombatGameState, data: SerializedChooseHouseCardGameState): ChooseHouseCardGameState {
        const chooseHouseCardGameState = new ChooseHouseCardGameState(combatGameState);

        chooseHouseCardGameState.houseCards = new BetterMap(data.houseCards.map(([hid, hcid]) => [
            combatGameState.game.houses.get(hid),
            hcid ? combatGameState.game.houses.get(hid).houseCards.get(hcid) : null
        ]));

        return chooseHouseCardGameState;
    }
}

export interface SerializedChooseHouseCardGameState {
    type: "choose-house-card";
    houseCards: [string, string | null][];
}
