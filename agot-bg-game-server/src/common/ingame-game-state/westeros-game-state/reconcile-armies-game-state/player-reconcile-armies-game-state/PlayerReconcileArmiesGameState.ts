import GameState from "../../../../GameState";
import ReconcileArmiesGameState from "../ReconcileArmiesGameState";
import House from "../../../game-data-structure/House";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import Unit from "../../../game-data-structure/Unit";
import Region from "../../../game-data-structure/Region";
import Game from "../../../game-data-structure/Game";
import BetterMap from "../../../../../utils/BetterMap";
import EntireGame from "../../../../EntireGame";
import UnitType from "../../../game-data-structure/UnitType";

export default class PlayerReconcileArmiesGameState extends GameState<ReconcileArmiesGameState<any>> {
    house: House;

    get reconcileArmiesGameState(): ReconcileArmiesGameState<any> {
        return this.parentGameState;
    }

    get game(): Game {
        return this.parentGameState.game;
    }

    get entireGame(): EntireGame {
        return this.parentGameState.entireGame;
    }

    firstStart(house: House) {
        this.house = house;
    }

    onPlayerMessage(player: Player, message: ClientMessage) {
        if (message.type == "reconcile-armies") {
            if (this.house != player.house) {
                return;
            }

            const removedUnits: BetterMap<Region, Unit[]> = new BetterMap(message.unitsToRemove.map(([regionId, unitIds]) => {
                const region = this.game.world.regions.get(regionId);
                const units = unitIds.map(uid => region.units.get(uid));
                return [region, units];
            }));

            if (!this.isEnoughToReconcile(removedUnits)) {
                // The player has not given enough units to remove to match his supply
                return;
            }

            removedUnits.forEach((units, region) => {
                units.forEach(u => region.units.delete(u.id));

                this.entireGame.broadcastToClients({
                    type: "remove-units",
                    regionId: region.id,
                    unitIds: units.map(u => u.id)
                });
            });

            this.reconcileArmiesGameState.onPlayerReconcileArmiesGameStateEnd(this.house);
        }
    }

    onServerMessage(message: ServerMessage) {

    }

    reconcileArmies(removedUnits: BetterMap<Region, Unit[]>) {
        this.entireGame.sendMessageToServer({
            type: "reconcile-armies",
            unitsToRemove: removedUnits.entries.map(([region, units]) => [region.id, units.map(u => u.id)])
        });
    }

    isEnoughToReconcile(removedUnits: BetterMap<Region, Unit[]>) {
        return !this.game.hasTooMuchArmies(this.house, new BetterMap<Region, UnitType[]>(), removedUnits);
    }

    serializeToClient(): SerializedPlayerReconcileArmiesGameState {
        return {
            house: this.house.id
        }
    }

    static deserializeFromServer(reconcileArmies: ReconcileArmiesGameState<any>, data: SerializedPlayerReconcileArmiesGameState): PlayerReconcileArmiesGameState {
        const playerReconcileArmies = new PlayerReconcileArmiesGameState(reconcileArmies);

        playerReconcileArmies.house = reconcileArmies.game.houses.get(data.house);

        return playerReconcileArmies;
    }
}

export interface SerializedPlayerReconcileArmiesGameState {
    house: string;
}
