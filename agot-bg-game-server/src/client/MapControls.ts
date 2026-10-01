import Region from "../common/ingame-game-state/game-data-structure/Region";
import Unit from "../common/ingame-game-state/game-data-structure/Unit";
import Order from "../common/ingame-game-state/game-data-structure/Order";
import { observable } from "mobx";
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
  highlight?: HighlightProperties;
  onClick?: () => void;
  targetRegion?: Region;
  animateFadeIn?: boolean;
  animateFadeOut?: boolean;
  animateAttention?: boolean;
}

export interface UnitMoveAnimationEntry {
  id: number;
  unit: Unit;
  from: Region;
  to: Region;
  durationMs: number;
}

export interface OrderMoveAnimationEntry {
  id: number;
  order: Order;
  from: Region;
  to: Region;
  durationMs: number;
}

export interface OrderOnMapProperties {
  highlight?: HighlightProperties;
  onClick?: () => void;
  wrap?: (child: ReactElement) => ReactElement;
  animateAttention?: boolean;
  animateFadeOut?: boolean;
  animateFlip?: boolean;
  // Called by the rendered order icon when its CSS animation naturally finishes,
  // so the entry that triggered it can be cleared precisely instead of guessing a duration.
  onAnimationEnd?: () => void;
}

// A single, independently tracked pending order animation. Several of these can exist for the
// same region at once (e.g. one order fading out while another gets highlighted) without
// clobbering each other, because each is only ever cleared by its own id.
export interface OrderAnimationEntry {
  id: number;
  region: Region;
  properties: OrderOnMapProperties;
}

export default class MapControls {
  @observable revision = 0;
  @observable modifyRegionsOnMap: (() => [
    Region,
    PartialRecursive<RegionOnMapProperties>
  ][])[] = [];
  @observable modifyUnitsOnMap: (() => [
    Unit,
    PartialRecursive<UnitOnMapProperties>
  ][])[] = [];
  @observable modifyOrdersOnMap: (() => [
    Region,
    PartialRecursive<OrderOnMapProperties>
  ][])[] = [];

  refresh(): void {
    this.revision++;
  }
}
