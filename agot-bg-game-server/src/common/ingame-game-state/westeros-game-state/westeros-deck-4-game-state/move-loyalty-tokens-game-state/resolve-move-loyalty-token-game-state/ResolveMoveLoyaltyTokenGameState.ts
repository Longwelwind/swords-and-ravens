import GameState from "../../../../../GameState";
import Game from "../../../../game-data-structure/Game";
import Player from "../../../../Player";
import {ClientMessage} from "../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../messages/ServerMessage";
import IngameGameState from "../../../../IngameGameState";
import House from "../../../../game-data-structure/House";
import Region from "../../../../game-data-structure/Region";
import User from "../../../../../../server/User";
import MoveLoyaltyTokensGameState from "../MoveLoyaltyTokensGameState";

export default class ResolveMoveLoyaltyTokenGameState extends GameState<MoveLoyaltyTokensGameState> {
    house: House;

    get moveLoyaltyTokensState(): MoveLoyaltyTokensGameState {
        return this.parentGameState;
    }

    get game(): Game {
        return this.moveLoyaltyTokensState.game;
    }

    get ingame(): IngameGameState {
        return this.moveLoyaltyTokensState.ingame;
    }

    firstStart(house: House): void {
        this.house = house;
    }

    sendMovePowerTokens(from: Region, to: Region): void {
        this.entireGame.sendMessageToServer({
            type: "move-loyalty-token",
            from: from.id,
            to: to.id
        });
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "move-loyalty-token") {
            if(this.ingame.getControllerOfHouse(this.house) != player) {
                return;
            }

            const regionFrom = this.ingame.world.regions.get(message.from);
            const regionTo = this.ingame.world.regions.get(message.to);

            if (regionFrom.loyaltyTokens < 1 || !this.moveLoyaltyTokensState.getValidTargetRegions(regionFrom).includes(regionTo)) {
                return;
            }

            this.moveLoyaltyTokensState.moveLoyaltyToken(regionFrom, regionTo);
            this.moveLoyaltyTokensState.previousMovement = {
                house: this.house,
                from: regionFrom,
                to: regionTo
            };
            this.moveLoyaltyTokensState.setChooseCancelLastMoveGameState(this.house);
        }
    }

    onServerMessage(_message: ServerMessage): void {
    }

    getWaitedUsers(): User[] {
        return [this.ingame.getControllerOfHouse(this.house).user];
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedResolveMoveLoyaltyTokenGameState {
        return {
            type: "resolve-move-loyalty-token",
            house: this.house.id
        };
    }

    static deserializeFromServer(moveLoyaltyTokens: MoveLoyaltyTokensGameState, data: SerializedResolveMoveLoyaltyTokenGameState): ResolveMoveLoyaltyTokenGameState {
        const gameState = new ResolveMoveLoyaltyTokenGameState(moveLoyaltyTokens);
        gameState.house = moveLoyaltyTokens.game.houses.get(data.house);
        return gameState;
    }
}

export interface SerializedResolveMoveLoyaltyTokenGameState {
    type: "resolve-move-loyalty-token";
    house: string;
}
