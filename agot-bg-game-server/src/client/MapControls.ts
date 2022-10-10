import Region from "../common/ingame-game-state/game-data-structure/Region";
import Unit from "../common/ingame-game-state/game-data-structure/Unit";
import {observable} from "mobx";
import PartialRecursive from "../utils/PartialRecursive";
import { ReactElement } from "react";

interface HighlightProperties {
    active: boolean;
    color: string;
    light?: boolean;
    strong?: boolean;
    text?: string;
}

export interface RegionOnMapProperties {
    highlight: HighlightProperties;
    onClick?: () => void;
    wrap?: (child: ReactElement) => ReactElement;
}

export interface UnitOnMapProperties {
    highlight: HighlightProperties;
    onClick?: () => void;
    targetRegion: Region | null;
}

export interface OrderOnMapProperties {
    highlight?: HighlightProperties;
    onClick?: () => void;
    wrap?: (child: ReactElement) => ReactElement;
    animateAttention?: boolean;
    animateFadeOut?: boolean;
    animateFlip?: boolean;
}

export default class MapControls {
    @observable modifyRegionsOnMap: (() => [Region, PartialRecursive<RegionOnMapProperties>][])[] = [];
    @observable modifyUnitsOnMap: (() => [Unit, PartialRecursive<UnitOnMapProperties>][])[] = [];
    @observable modifyOrdersOnMap: (() => [Region, PartialRecursive<OrderOnMapProperties>][])[] = [];
}
