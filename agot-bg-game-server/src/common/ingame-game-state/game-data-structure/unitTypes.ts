import UnitType from "./UnitType";
import RegionKind from "./RegionKind";
import BetterMap from "../../../utils/BetterMap";

export const footman = new UnitType("footman", "Footman", RegionKind.LAND, 1);
export const knight = new UnitType("knight", "Knight", RegionKind.LAND, 2);
export const siegeEngine = new UnitType("siege-engine", "Siege Engine", RegionKind.LAND, null, 4, null, false);
export const ship = new UnitType("ship", "Ship", RegionKind.SEA, 1, null, RegionKind.LAND);

const unitTypes = new BetterMap<string, UnitType>([
    [footman.id, footman],
    [knight.id, knight],
    [siegeEngine.id, siegeEngine],
    [ship.id, ship],
]);

export default unitTypes;
