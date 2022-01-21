import House from "./game-data-structure/House";
import User from "../../server/User";
import IngameGameState from "./IngameGameState";

export default class Player {
    user: User;
    house: House;

    constructor(user: User, house: House) {
        this.user = user;
        this.house = house;
    }

    serializeToClient(): SerializedPlayer {
        return {
            userId: this.user.id,
            houseId: this.house.id
        };
    }

    static deserializeFromServer(ingame: IngameGameState, data: SerializedPlayer): Player {
        const player = new Player(ingame.entireGame.users.get(data.userId), ingame.game.houses.get(data.houseId));

        return player;
    }
}

export interface SerializedPlayer {
    userId: string;
    houseId: string;
}
