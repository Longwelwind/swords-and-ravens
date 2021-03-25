import World from "../game-data-structure/World";
import { port } from "../game-data-structure/regionTypes";
import Region from "../game-data-structure/Region";
import ActionGameState from "../action-game-state/ActionGameState";
import IngameGameState from "../IngameGameState";
import EntireGame from "../../../common/EntireGame";

function removePossibleOrdersInPort(portRegion: Region, actionGameState: ActionGameState | null): void {
    if (portRegion.type != port) {
        throw new Error("This method is intended to only be used for removing orders of destroyed or taken ships")
    }

    if (!actionGameState) {
        return;
    }

    actionGameState.removeOrderFromRegion(portRegion);
}

export function destroyAllShipsInPort(portRegion: Region, entireGame: EntireGame, actionGameState: ActionGameState | null): number {
    if (portRegion.type != port) {
        throw new Error("This method is intended to only be used for destroying ships in ports")
    }

    removePossibleOrdersInPort(portRegion, actionGameState);

    const house = portRegion.units.size > 0 ? portRegion.units.values[0].allegiance : null;
    const shipsToDestroy = portRegion.units.map((id, _unit) => id);
    shipsToDestroy.forEach(id => portRegion.units.delete(id));

    if (house) {
        entireGame.broadcastToClients({
            type: "combat-change-army",
            region: portRegion.id,
            house: house.id,
            army: []
        });
    }

    entireGame.broadcastToClients({
        type: "remove-units",
        regionId: portRegion.id,
        unitIds: shipsToDestroy
    });

    return shipsToDestroy.length;
}

export function findOrphanedShipsAndDestroyThem(world: World, ingameGameState: IngameGameState, actionGameState: ActionGameState | null): void {
    const portsWithOrphanedShips = world.regions.values.filter(r => r.type == port
        && r.units.size > 0
        && !world.getAdjacentLandOfPort(r).getController());

    portsWithOrphanedShips.forEach(portRegion => {
        const houseThatLostShips = portRegion.units.values[0].allegiance;
        const destroyedShipCount = destroyAllShipsInPort(portRegion, ingameGameState.entireGame, actionGameState);
        ingameGameState.log({
            type: "ships-destroyed-by-empty-castle",
            castle: world.getAdjacentLandOfPort(portRegion).id,
            house: houseThatLostShips.id,
            port: portRegion.id,
            shipCount: destroyedShipCount
        });
    })
}
