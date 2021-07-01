import GameState from "../../../../GameState";
import ClaimVassalsGameState from "../ClaimVassalsGameState";
import Player from "../../../../ingame-game-state/Player";
import { ServerMessage } from "../../../../../messages/ServerMessage";
import { ClientMessage } from "../../../../../messages/ClientMessage";
import House from "../../../../ingame-game-state/game-data-structure/House";
import IngameGameState from "../../../IngameGameState";
import User from "../../../../../server/User";
import { observable } from "mobx";

export default class ClaimVassalGameState extends GameState<ClaimVassalsGameState> {
    house: House;
    count: number;
    @observable claimableVassals: House[];

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    firstStart(house: House, count: number): void {
        this.house = house;
        this.count = count;

        this.claimableVassals = this.getClaimableVassals();
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

            if (claimedVassals.some(v => !this.getClaimableVassals().includes(v))) {
                return;
            }

            this.parentGameState.passedVassalsCount = this.count - claimedVassals.length;

            if (claimedVassals.length > 0) {
                this.parentGameState.assignVassals(player.house, claimedVassals);
            } else {
                this.ingame.log({
                    type: "vassals-claimed",
                    house: player.house.id,
                    vassals: []
                });
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

    private getClaimableVassals(): House[] {
        return this.ingame.getNonClaimedVassalHouses();
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedClaimVassalGameState {
        return {
            type: "claim-vassal",
            house: this.house.id,
            count: this.count,
            claimableVassals: this.claimableVassals.map(h => h.id)
        };
    }

    actionAfterVassalReplacement(_newVassal: House): void {
        this.ingame.game.vassalRelations.keys.forEach(vassal => this.ingame.game.vassalRelations.delete(vassal));
        this.ingame.broadcastVassalRelations();
        const planning = this.parentGameState.parentGameState;
        planning.setChildGameState(new ClaimVassalsGameState(planning)).firstStart();
    }

    static deserializeFromServer(claimVassals: ClaimVassalsGameState, data: SerializedClaimVassalGameState): ClaimVassalGameState {
        const claimVassal = new ClaimVassalGameState(claimVassals);

        claimVassal.house = claimVassals.game.houses.get(data.house);
        claimVassal.count = data.count;
        claimVassal.claimableVassals = data.claimableVassals.map(hid => claimVassals.game.houses.get(hid));

        return claimVassal;
    }
}

export interface SerializedClaimVassalGameState {
    type: "claim-vassal";
    house: string;
    count: number;
    claimableVassals: string[];
}