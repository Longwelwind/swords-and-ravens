import GameState from "../../GameState";
import Game from "../game-data-structure/Game";
import House from "../game-data-structure/House";
import {ServerMessage} from "../../../messages/ServerMessage";
import Player from "../Player";
import {ClientMessage} from "../../../messages/ClientMessage";
import Region from "../game-data-structure/Region";
import IngameGameState from "../IngameGameState";
import User from "../../../server/User";


interface ParentGameState extends GameState<any, any> {
    game: Game;
    ingame: IngameGameState;

    onSelectRegionFinish(house: House, region: Region): void;
}

export default class SelectRegionGameState<P extends ParentGameState> extends GameState<P> {
    house: House;
    regions: Region[];

    get game(): Game {
        return this.parentGameState.game;
    }

    firstStart(house: House, regions: Region[]): void {
        this.house = house;
        this.regions = regions;
    }

    select(region: Region): void {
        this.parentGameState.entireGame.sendMessageToServer({
            type: "select-region",
            region: region.id
        })
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "select-region") {
            const region = this.game.world.regions.get(message.region);

            if (this.parentGameState.ingame.getControllerOfHouse(this.house) != player) {
                return;
            }

            if (!this.regions.includes(region)) {
                return;
            }

            this.parentGameState.onSelectRegionFinish(this.house, region);
        }
    }

    onServerMessage(_message: ServerMessage): void { }

    getWaitedUsers(): User[] {
        return [this.parentGameState.ingame.getControllerOfHouse(this.house).user];
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedSelectRegionGameState {
        return {
            type: "select-region",
            house: this.house.id,
            regions: this.regions.map(r => r.id)
        };
    }

    static deserializeFromServer<P extends ParentGameState>(parent: P, data: SerializedSelectRegionGameState): SelectRegionGameState<P> {
        const selectRegionGameState = new SelectRegionGameState(parent);

        selectRegionGameState.house = parent.game.houses.get(data.house);
        selectRegionGameState.regions = data.regions.map(hcid => parent.game.world.regions.get(hcid));

        return selectRegionGameState;
    }
}

export interface SerializedSelectRegionGameState {
    type: "select-region";
    house: string;
    regions: string[];
}
