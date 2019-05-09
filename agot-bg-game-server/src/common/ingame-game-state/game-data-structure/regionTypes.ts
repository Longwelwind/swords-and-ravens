import RegionType from "./RegionType";
import RegionKind from "./RegionKind";
import BetterMap from "../../../utils/BetterMap";

export const land = new RegionType("land", RegionKind.LAND);
export const sea = new RegionType("sea", RegionKind.SEA);
export const port = new RegionType("port", RegionKind.SEA);

const regionTypes = new BetterMap<string, RegionType>([
    [land.id, land],
    [sea.id, sea],
    [port.id, port]
]);

export default regionTypes;
