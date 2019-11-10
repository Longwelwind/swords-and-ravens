import GameState from "../../../../../../GameState";
import CombatGameState from "../../CombatGameState";
import Region from "../../../../../game-data-structure/Region";
import House from "../../../../../game-data-structure/House";
import {ServerMessage} from "../../../../../../../messages/ServerMessage";
import {ClientMessage} from "../../../../../../../messages/ClientMessage";
import Player from "../../../../../Player";
import World from "../../../../../game-data-structure/World";
import Unit from "../../../../../game-data-structure/Unit";
import EntireGame from "../../../../../../EntireGame";
import PostCombatGameState from "../PostCombatGameState";

export default class ChooseRetreatRegionGameState extends GameState<PostCombatGameState> {
    house: House;
    startingRegion: Region;
    army: Unit[];

    get postCombatGameState(): PostCombatGameState {
        return this.parentGameState;
    }

    get world(): World {
        return this.postCombatGameState.world;
    }

    get entireGame(): EntireGame {
        return this.postCombatGameState.entireGame;
    }

    firstStart(house: House, startingRegion: Region, army: Unit[]) {
        this.house = house;
        this.startingRegion = startingRegion;
        this.army = army;
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "choose-retreat-region") {
            const chosenRetreatRegion = this.world.regions.get(message.regionId);

            if (player.house != this.house) {
                return;
            }

            if (!this.getValidRetreatRegions().includes(chosenRetreatRegion)) {
                return;
            }

            this.postCombatGameState.onChooseRetreatLocationGameStateEnd(this.house, this.startingRegion, this.army, chosenRetreatRegion);
        }
    }

    onServerMessage(_message: ServerMessage): void {

    }

    getValidRetreatRegions(): Region[] {
        return this.world.getValidRetreatRegions(this.startingRegion, this.house, this.army);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedChooseRetreatRegionGameState {
        return {
            type: "choose-retreat-region",
            houseId: this.house.id,
            army: this.army.map(u => u.id),
            startingRegionId: this.startingRegion.id
        };
    }

    getPhaseName(): string {
        return "Choose retreat region";
    }

    static deserializeFromServer(postCombat: PostCombatGameState, data: SerializedChooseRetreatRegionGameState): ChooseRetreatRegionGameState {
        const chooseRetreatRegion = new ChooseRetreatRegionGameState(postCombat);

        chooseRetreatRegion.house = postCombat.game.houses.get(data.houseId);
        chooseRetreatRegion.startingRegion = postCombat.world.regions.get(data.startingRegionId);
        chooseRetreatRegion.army = data.army.map(uid => chooseRetreatRegion.startingRegion.units.get(uid));

        return chooseRetreatRegion;
    }

    choose(selectedRegion: Region) {
        this.entireGame.sendMessageToServer({
            type: "choose-retreat-region",
            regionId: selectedRegion.id
        });
    }
}

export interface SerializedChooseRetreatRegionGameState {
    type: "choose-retreat-region";
    houseId: string;
    army: number[];
    startingRegionId: string;
}
