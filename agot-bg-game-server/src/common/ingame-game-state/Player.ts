import House from "./game-data-structure/House";
import User from "../../server/User";
import IngameGameState from "./IngameGameState";
import { observable } from "mobx";

export default class Player {
    user: User;
    house: House;
    @observable note = "";

    constructor(user: User, house: House) {
        this.user = user;
        this.house = house;
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedPlayer {
        return {
            userId: this.user.id,
            houseId: this.house.id,
            note: admin ? this.note : player == this ? this.note : ""
        };
    }

    static deserializeFromServer(ingame: IngameGameState, data: SerializedPlayer): Player {
        const player = new Player(ingame.entireGame.users.get(data.userId), ingame.game.houses.get(data.houseId));
        player.note = data.note;

        return player;
    }
}

export interface SerializedPlayer {
    userId: string;
    houseId: string;
    note: string;
}
