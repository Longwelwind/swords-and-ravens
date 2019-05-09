import GameState from "../../../../../GameState";
import CombatGameState from "../CombatGameState";
import Region from "../../../../game-data-structure/Region";
import House from "../../../../game-data-structure/House";
import {ServerMessage} from "../../../../../../messages/ServerMessage";
import {ClientMessage} from "../../../../../../messages/ClientMessage";
import Player from "../../../../Player";
import World from "../../../../game-data-structure/World";
import Unit from "../../../../game-data-structure/Unit";
import EntireGame from "../../../../../EntireGame";

export default class ChooseRetreatRegionGameState extends GameState<CombatGameState> {
    house: House;
    startingRegion: Region;
    army: Unit[];

    get combatGameState(): CombatGameState {
        return this.parentGameState;
    }

    get world(): World {
        return this.combatGameState.world;
    }

    get entireGame(): EntireGame {
        return this.combatGameState.entireGame;
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

            this.entireGame.log(
                `**${this.house.name}** retreats to **${chosenRetreatRegion.name}**`
            );

            this.combatGameState.onChooseRetreatLocationGameStateEnd(this.house, this.startingRegion, this.army, chosenRetreatRegion);
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

    static deserializeFromServer(combatGameState: CombatGameState, data: SerializedChooseRetreatRegionGameState): ChooseRetreatRegionGameState {
        const chooseRetreatRegion = new ChooseRetreatRegionGameState(combatGameState);

        chooseRetreatRegion.house = combatGameState.game.houses.get(data.houseId);
        chooseRetreatRegion.startingRegion = combatGameState.world.regions.get(data.startingRegionId);
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
