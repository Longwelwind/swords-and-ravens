import GameState from "../../../../GameState";
import ClaimVassalsGameState from "../ClaimVassalsGameState";
import Player from "../../../../ingame-game-state/Player";
import { ServerMessage } from "../../../../../messages/ServerMessage";
import { ClientMessage } from "../../../../../messages/ClientMessage";
import House from "../../../../ingame-game-state/game-data-structure/House";
import IngameGameState from "../../../IngameGameState";
import User from "../../../../../server/User";

export default class ClaimVassalGameState extends GameState<ClaimVassalsGameState> {
    house: House;
    count: number;

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    firstStart(house: House, count: number): void {
        this.house = house;
        this.count = count;
    }

    onServerMessage(_message: ServerMessage): void {
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "claim-vassal") {
            if (player.house != this.house) {
                return;
            }

            const claimedVassals = message.houses.map(hid => this.ingame.game.houses.get(hid));

            if (claimedVassals.length > this.count) {
                return;
            }
            
            if (claimedVassals.every(v => !this.getClaimableVassals().includes(v))) {
                return;
            }

            if (claimedVassals.length > 0) {
                this.parentGameState.assignVassals(player.house, claimedVassals);
            }

            this.parentGameState.onClaimVassalFinish(player.house);
        }
    }

    getWaitedUsers(): User[] {
        return [this.parentGameState.ingame.getControllerOfHouse(this.house).user];
    }

    choose(houses: House[]): void {
        this.ingame.entireGame.sendMessageToServer({
            type: "claim-vassal",
            houses: houses.map(h => h.id),
        });
    }

    getClaimableVassals(): House[] {
        return this.ingame.getNonClaimedVassalHouses();
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedClaimVassalGameState {
        return {
            type: "claim-vassal",
            house: this.house.id,
            count: this.count
        };
    }

    static deserializeFromServer(claimVassals: ClaimVassalsGameState, data: SerializedClaimVassalGameState): ClaimVassalGameState {
        const claimVassal = new ClaimVassalGameState(claimVassals);

        claimVassal.house = claimVassals.game.houses.get(data.house);
        claimVassal.count = data.count;
        
        return claimVassal;
    }
}

export interface SerializedClaimVassalGameState {
    type: "claim-vassal";
    house: string;
    count: number;
}