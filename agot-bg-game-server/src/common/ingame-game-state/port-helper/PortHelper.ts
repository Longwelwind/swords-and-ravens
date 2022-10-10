import { port } from "../game-data-structure/regionTypes";
import Region from "../game-data-structure/Region";
import ActionGameState from "../action-game-state/ActionGameState";
import IngameGameState from "../IngameGameState";
import House from "../game-data-structure/House";

function removePossibleOrdersInPort(portRegion: Region, actionGameState: ActionGameState | null): void {
    if (portRegion.type != port) {
        throw new Error("This method is intended to only be used for removing orders of destroyed or taken ships")
    }

    if (!actionGameState) {
        return;
    }

    actionGameState.removeOrderFromRegion(portRegion, true, undefined, undefined, "red");
}

export function destroyAllShipsInPort(portRegion: Region, ingame: IngameGameState, actionGameState: ActionGameState | null, animateRemoval = true): number {
    if (portRegion.type != port) {
        throw new Error("This method is intended to only be used for destroying ships in ports")
    }

    removePossibleOrdersInPort(portRegion, actionGameState);

    const house = portRegion.units.size > 0 ? portRegion.units.values[0].allegiance : null;
    const shipsToDestroy = portRegion.units.values;
    shipsToDestroy.forEach(u => portRegion.units.delete(u.id));

    if (house) {
        ingame.entireGame.broadcastToClients({
            type: "combat-change-army",
            region: portRegion.id,
            house: house.id,
            army: []
        });
    }

    ingame.broadcastRemoveUnits(portRegion, shipsToDestroy, animateRemoval);
    return shipsToDestroy.length;
}

export function findOrphanedShipsAndDestroyThem(ingame: IngameGameState, actionGameState: ActionGameState | null = null): void {
    const world = ingame.world;
    const portsWithOrphanedShips = world.regions.values.filter(r => r.type == port
        && r.units.size > 0
        && !world.getAdjacentLandOfPort(r).getController());

    portsWithOrphanedShips.forEach(portRegion => {
        const houseThatLostShips = portRegion.units.values[0].allegiance;
        const destroyedShipCount = destroyAllShipsInPort(portRegion, ingame, actionGameState);
        ingame.log({
            type: "ships-destroyed-by-empty-castle",
            castle: world.getAdjacentLandOfPort(portRegion).id,
            house: houseThatLostShips.id,
            port: portRegion.id,
            shipCount: destroyedShipCount
        });
    })
}

export function isTakeControlOfEnemyPortGameStateRequired(ingame: IngameGameState): TakeControlOfEnemyPortResult | null {
    // Find ports with enemy ships
    const portsWithEnemyShips = ingame.world.regions.values.filter(r => r.type == port
        && r.units.size > 0
        && r.getController() != ingame.world.getAdjacentLandOfPort(r).getController());

    if (portsWithEnemyShips.length == 0) {
        return null;
    }

    const portRegion = portsWithEnemyShips[0];
    const adjacentCastle = ingame.world.getAdjacentLandOfPort(portRegion);
    const adjacentCastleController = adjacentCastle.getController();

    if (adjacentCastleController) {
        // return TakeControlOfEnemyPortGameState required
        return {
            port: portRegion,
            newController: adjacentCastleController
        }
    }

    // We should never reach this line because we removed orphaned ships earlier.
    throw new Error(`$Port with id '{portRegion.id}' contains orphaned ships which should have been removed before!`);
}

export interface TakeControlOfEnemyPortResult {
    port: Region;
    newController: House;
}