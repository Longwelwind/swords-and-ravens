import UnitType from "./UnitType";
import RegionKind from "./RegionKind";
import BetterMap from "../../../utils/BetterMap";

export const footman = new UnitType("footman", "Footman", "Adds 1 Combat Strength in battle. Costs 1 point of mustering.", RegionKind.LAND, 1);
export const knight = new UnitType("knight", "Knight", "Adds 2 Combat Strength in battle. Costs 2 points of mustering (or 1 point if upgraded from a Footman).", RegionKind.LAND, 2);
export const siegeEngine = new UnitType("siege-engine", "Siege Engine", "Adds 4 Combat Strength when attacking (or supporting an attack against) an area containing a Castle or Stronghold, otherwise it adds 0. Siege Engines may not retreat when losing combat; it is destroyed instead. Costs 2 points of mustering (or 1 point if upgraded from a Footman).", RegionKind.LAND, null, 4, null, false);
export const ship = new UnitType("ship", "Ship", "Adds 1 Combat Strength in battle. Costs 1 point of mustering.", RegionKind.SEA, 1, null, RegionKind.LAND);

const unitTypes = new BetterMap<string, UnitType>([
    [footman.id, footman],
    [knight.id, knight],
    [siegeEngine.id, siegeEngine],
    [ship.id, ship],
]);

export default unitTypes;
