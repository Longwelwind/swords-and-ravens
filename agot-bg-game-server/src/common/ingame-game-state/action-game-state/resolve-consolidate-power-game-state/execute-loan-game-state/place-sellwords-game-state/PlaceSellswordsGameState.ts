import GameState from "../../../../../../common/GameState";
import UnitType from "../../../../game-data-structure/UnitType";
import Region from "../../../../game-data-structure/Region";
import ExecuteLoanGameState from "../ExecuteLoanGameState";
import House from "../../../../game-data-structure/House";
import Game from "../../../../game-data-structure/Game";
import IngameGameState from "../../../../IngameGameState";
import BetterMap from "../../../../../../utils/BetterMap";
import { ServerMessage } from "../../../../../../messages/ServerMessage";
import { ClientMessage } from "../../../../../../messages/ClientMessage";
import Player from "../../../../Player";
import User from "../../../../../../server/User";
import _ from "lodash";
import { observable } from "mobx";
import unitTypes from "../../../../game-data-structure/unitTypes";

export default class PlaceSellswordsGameState extends GameState<ExecuteLoanGameState> {
    @observable house: House;
    @observable sellswords: UnitType[];

    get game(): Game {
        return this.parentGameState.game;
    }

    get executeLoanGameState(): ExecuteLoanGameState {
        return this.parentGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    get regions(): Region[] {
        return this.ingame.world.getControlledRegions(this.house);
    }

    firstStart(house: House, sellswords: UnitType[]): void {
        this.house = house;
        this.sellswords = sellswords;

        if (!this.anyPlacementPossible(new BetterMap())) {
            this.ingame.log({
                type: "sellswords-placed",
                house: house.id,
                units: [],
                loanType: this.executeLoanGameState.loanCardType.id
            }, true);

            this.parentGameState.onExecuteLoanFinish(house);
        }
    }

    onServerMessage(_: ServerMessage): void {

    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        if (message.type == "place-sellswords") {
            if (this.parentGameState.ingame.getControllerOfHouse(this.house) != player) {
                return;
            }

            const placedSellswords = new BetterMap(message.units.map(([rid, utids]) => [this.ingame.world.regions.get(rid), utids.map(ut => unitTypes.get(ut))] as [Region, UnitType[]]));

            if (!this.isPlacementValid(placedSellswords)) {
                return;
            }

            placedSellswords.keys.forEach(region => {
                const addedUnitTypes = placedSellswords.get(region);
                const addedUnits = addedUnitTypes.map(ut => {
                    const unit = this.game.createUnit(region, ut, this.house);
                    region.units.set(unit.id, unit);
                    return unit;
                });
                this.entireGame.broadcastToClients({
                    type: "add-units",
                    regionId: region.id,
                    units: addedUnits.map(u => u.serializeToClient()),
                    animate: "green"
                });
            });

            this.ingame.log({
                type: "sellswords-placed",
                house: this.house.id,
                units: message.units,
                loanType: this.executeLoanGameState.loanCardType.id
            });

            this.parentGameState.onExecuteLoanFinish(this.house);
        }
    }

    sendPlaceSellswors(placement: BetterMap<Region, UnitType[]>): void {
        this.entireGame.sendMessageToServer({
            type: "place-sellswords",
            units: placement.entries.map(([region, unitTypes]) => [
                region.id,
                unitTypes.map(ut => ut.id)
            ])
        });
    }

    getWaitedUsers(): User[] {
        return [this.parentGameState.ingame.getControllerOfHouse(this.house).user];
    }

    isPlacementValid(placement: BetterMap<Region, UnitType[]>): boolean {
        // Incremental approach:
        return placement.entries.every(([region, sellswords], pIndex) => {
            return sellswords.every((sellsword, sIndex) => {
                // Create the map of the previous placements

                const previousPlacement = new BetterMap(
                    placement.entries.slice(0, pIndex).concat([[region, sellswords.slice(0, sIndex)]])
                );

                const validPlacements = this.getValidUnitsForRegion(region, previousPlacement);
                return validPlacements.includes(sellsword);
            });
        });
    }

    getValidUnitsForRegion(region: Region, placedSellswords: BetterMap<Region, UnitType[]>): UnitType[] {
        if (!this.regions.includes(region)) {
            return [];
        }

        const alreadyPlacedUnits = _.flatMap(placedSellswords.values);

        const result = this.sellswords.filter(sellsword => sellsword.walksOn == region.type.kind)
            .filter(sellsword => this.game.getAvailableUnitsOfType(this.house, sellsword) - alreadyPlacedUnits.filter(ut => ut == sellsword).length)
            .filter(sellsword => {
                const addedUnits = new BetterMap(placedSellswords.entries);
                addedUnits.set(region, addedUnits.tryGet(region, [] as UnitType[]).concat([sellsword]));
                return !this.game.hasTooMuchArmies(this.house, addedUnits);
            });


        // Remove already placed units
        alreadyPlacedUnits.forEach(alreadyPlaced => {
            const foundAt = result.findIndex(ut => alreadyPlaced == ut);
            if (foundAt > -1) {
                result.splice(foundAt, 1);
            }
        });

        return result;
    }

    anyPlacementPossible(placedSellswords: BetterMap<Region, UnitType[]>): boolean {
        return _.flatMap(this.regions.map(r => this.getValidUnitsForRegion(r, placedSellswords))).length > 0;
    }

    serializeToClient(_admin: boolean, _player: Player | null): SerializedPlaceSellswordsGameState {
        return {
            type: "place-sellswords",
            house: this.house.id,
            sellswords: this.sellswords.map(ut => ut.id)
        }
    }

    static deserializeFromServer(parent: ExecuteLoanGameState, data: SerializedPlaceSellswordsGameState): PlaceSellswordsGameState {
        const gameState = new PlaceSellswordsGameState(parent);

        gameState.house = parent.game.houses.get(data.house);
        gameState.sellswords = data.sellswords.map(ut => unitTypes.get(ut));

        return gameState;
    }
}

export interface SerializedPlaceSellswordsGameState {
    type: "place-sellswords";
    house: string;
    sellswords: string[];
}
