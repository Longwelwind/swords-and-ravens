import Region from "../common/ingame-game-state/game-data-structure/Region";
import Unit from "../common/ingame-game-state/game-data-structure/Unit";
import Order from "../common/ingame-game-state/game-data-structure/Order";
import {observable} from "mobx";

interface HighlightProperties {
    active: boolean;
}

export interface RegionOnMapProperties {
    highlight: HighlightProperties | null;
    onClick: (() => void) | null;
}

export interface UnitOnMapProperties {
    highlight: HighlightProperties | null;
    onClick: (() => void) | null;
}

export interface OrderOnMapProperties {
    highlight: HighlightProperties | null;
    onClick: (() => void) | null;
}

export default class MapControls {
    @observable modifyRegionsOnMap: (() => [Region, Partial<RegionOnMapProperties>][])[] = [];
    @observable modifyUnitsOnMap: (() => [Unit, Partial<UnitOnMapProperties>][])[] = [];
    @observable modifyOrdersOnMap: (() => [Region, Partial<OrderOnMapProperties>][])[] = [];
}
