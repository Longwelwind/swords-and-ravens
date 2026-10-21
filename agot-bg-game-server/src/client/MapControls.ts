import Region from "../common/ingame-game-state/game-data-structure/Region";
import Unit from "../common/ingame-game-state/game-data-structure/Unit";
import Order from "../common/ingame-game-state/game-data-structure/Order";
import { action, observable } from "mobx";
import PartialRecursive from "../utils/PartialRecursive";
import { ReactElement } from "react";
import GameState from "../common/GameState";
import BetterMap from "../utils/BetterMap";

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

// Unlike units and orders, the loyalty token counts in the model are updated right away.
// The entry only makes the map show the arriving token once it has reached the target region.
export interface LoyaltyTokenMoveAnimationEntry {
  id: number;
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

export type MapEntries<Entity, Properties> = [
  Entity,
  PartialRecursive<Properties>
][];

export interface MapLayer {
  gameState?: GameState<any, any>;
  kind?: "state" | "hover" | "animation";
  regions?: MapEntries<Region, RegionOnMapProperties>;
  units?: MapEntries<Unit, UnitOnMapProperties>;
  orders?: MapEntries<Region, OrderOnMapProperties>;
}

interface RegisteredLayer {
  layer: MapLayer;
  sequence: number;
}

export default class MapControls {
  private readonly layers = observable.map<symbol, RegisteredLayer>(undefined, {
    deep: false
  });
  private nextSequence = 0;

  @action
  setLayer(owner: symbol, layer: MapLayer): void {
    const previous = this.layers.get(owner);
    const activatedHover =
      layer.kind == "hover" &&
      !!layer.regions?.length &&
      !previous?.layer.regions?.length;
    this.layers.set(owner, {
      layer,
      sequence:
        previous && !activatedHover ? previous.sequence : this.nextSequence++
    });
  }

  @action
  removeLayer(owner: symbol): void {
    this.layers.delete(owner);
  }

  resolve(
    root: GameState<any, any>,
    regions: Region[]
  ): {
    regions: BetterMap<Region, RegionOnMapProperties>;
    units: BetterMap<Unit, UnitOnMapProperties>;
    orders: BetterMap<Region, OrderOnMapProperties>;
  } {
    const depths = new Map<GameState<any, any>, number>();
    let state: GameState<any, any> | null = root;
    while (state) {
      depths.set(state, depths.size);
      state = state.childGameState;
    }

    const priorities = { state: 0, hover: 1, animation: 2 };
    const layers = Array.from(this.layers.values())
      .filter(({ layer }) => !layer.gameState || depths.has(layer.gameState))
      .sort((a, b) => {
        return (
          priorities[a.layer.kind ?? "state"] -
            priorities[b.layer.kind ?? "state"] ||
          (depths.get(a.layer.gameState ?? root) ?? 0) -
            (depths.get(b.layer.gameState ?? root) ?? 0) ||
          a.sequence - b.sequence
        );
      });

    const regionProperties = new Map<Region, RegionOnMapProperties>(
      regions.map((region) => [
        region,
        { highlight: { active: false, color: "white" } }
      ])
    );
    const unitProperties = new Map<Unit, UnitOnMapProperties>(
      regions.flatMap((region) =>
        region.allUnits.map((unit): [Unit, UnitOnMapProperties] => [unit, {}])
      )
    );
    const orderProperties = new Map<Region, OrderOnMapProperties>(
      regions.map((region) => [region, {}])
    );

    for (const { layer } of layers) {
      if (layer.kind == "hover") {
        if (!layer.regions?.length) {
          continue;
        }
        // Hover replaces only region highlighting, never the underlying interactions.
        regionProperties.forEach((properties) => {
          properties.highlight = { active: false, color: "white" };
        });
        for (const [region, properties] of layer.regions) {
          const previous = regionProperties.get(region);
          if (previous) {
            previous.highlight = {
              active: false,
              color: "white",
              ...properties.highlight
            };
          }
        }
      } else {
        this.mergeEntries(regionProperties, layer.regions);
        this.mergeEntries(unitProperties, layer.units);
        this.mergeEntries(orderProperties, layer.orders);
      }
    }

    return {
      regions: new BetterMap(Array.from(regionProperties.entries()), false),
      units: new BetterMap(Array.from(unitProperties.entries()), false),
      orders: new BetterMap(Array.from(orderProperties.entries()), false)
    };
  }

  private mergeEntries<
    Entity,
    Properties extends { highlight?: Partial<HighlightProperties> }
  >(
    target: Map<Entity, Properties>,
    entries: MapEntries<Entity, Properties> | undefined
  ): void {
    for (const [entity, patch] of entries ?? []) {
      const previous = target.get(entity);
      if (!previous) {
        continue;
      }
      const merged = { ...previous, ...patch } as Properties;
      if (Object.prototype.hasOwnProperty.call(patch, "highlight")) {
        merged.highlight = patch.highlight
          ? { ...previous.highlight, ...patch.highlight }
          : undefined;
      }
      target.set(entity, merged);
    }
  }
}
