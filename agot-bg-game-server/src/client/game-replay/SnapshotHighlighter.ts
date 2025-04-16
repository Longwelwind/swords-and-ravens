/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { observable } from "mobx";
import { GameLogData } from "../../common/ingame-game-state/game-data-structure/GameLog";
import GameReplayManager from "./GameReplayManager";
import BetterMap from "../../utils/BetterMap";
import EntireGameSnapshot from "./EntireGameSnapshot";
import _ from "lodash";

export default class SnapshotHighlighter {
  replayManager: GameReplayManager;

  @observable regionsToHighlight: BetterMap<string, string> = new BetterMap();
  @observable marchMarkers: [string, { to: string; color: string }][] = [];

  get hlHouseAreas(): boolean {
    return this.replayManager.highlightHouseAreas;
  }

  constructor(replayManager: GameReplayManager) {
    this.replayManager = replayManager;
  }

  hightlightRelevantAreas(): void {
    if (
      !this.replayManager.selectedSnapshot ||
      this.replayManager.selectedLogIndex < 0
    )
      return;

    const log =
      this.replayManager.logManager.logs[this.replayManager.selectedLogIndex]
        .data;
    const snap = this.replayManager.selectedSnapshot;

    this.clear();

    if (!snap.gameSnapshot) return;

    this.handleHighlighting(log, snap);

    if (this.hlHouseAreas) {
      this.regionsToHighlight.clear();
      snap.worldSnapshot.forEach((region) => {
        const house = snap.getController(region.id);
        if (house) {
          this.regionsToHighlight.set(region.id, house.color);
        }
      });
      return;
    }
  }

  clear(): void {
    this.regionsToHighlight.clear();
    this.marchMarkers = [];
  }

  private handleHighlighting(log: GameLogData, snap: EntireGameSnapshot): void {
    switch (log.type) {
      case "march-resolved": {
        const toRegions = log.moves.map(([r, _]) => r);
        const markerColor = this.getMarkerColor(log.house, snap);

        for (let i = 0; i < toRegions.length; i++) {
          const region = toRegions[i];
          this.marchMarkers.push([
            log.startingRegion,
            {
              to: region,
              color: markerColor,
            },
          ]);
        }

        if (toRegions.length == 0) {
          this.regionsToHighlight.set(
            log.startingRegion,
            snap.getHouse(log.house).color
          );
        } else {
          const color = snap.getHouse(log.house).color;
          toRegions.forEach((region) => {
            this.regionsToHighlight.set(region, color);
          });
        }
        break;
      }

      case "player-mustered": {
        const regions = _.uniq(
          log.musterings.map(([_, m]) => m.map((r) => r.region)).flat()
        );
        regions.forEach((region) => {
          this.regionsToHighlight.set(region, snap.getHouse(log.house).color);
        });
        break;
      }

      case "raven-holder-replace-order": {
        this.regionsToHighlight.set(
          log.region,
          snap.getHouse(log.ravenHolder).color
        );
        break;
      }

      case "raid-done": {
        this.regionsToHighlight.set(
          log.raiderRegion,
          snap.getHouse(log.raider).color
        );
        if (log.raidedRegion && log.raidee) {
          this.regionsToHighlight.set(
            log.raidedRegion,
            snap.getHouse(log.raidee).color
          );
        }

        break;
      }

      case "consolidate-power-order-resolved": {
        this.regionsToHighlight.set(log.region, snap.getHouse(log.house).color);
        break;
      }

      case "armies-reconciled": {
        log.armies.forEach(([rid, _]) => {
          this.regionsToHighlight.set(rid, snap.getHouse(log.house).color);
        });
        break;
      }

      case "garrison-returned":
      case "garrison-removed": {
        const controller = snap.getController(log.region);
        const color = controller ? controller.color : "white";
        this.regionsToHighlight.set(log.region, color);
        break;
      }

      case "leave-power-token-choice": {
        const controller = snap.getController(log.region);
        const color = controller ? controller.color : "white";
        this.regionsToHighlight.set(log.region, color);
        break;
      }

      case "control-power-token-removed": {
        this.regionsToHighlight.set(
          log.regionId,
          snap.getHouse(log.houseId).color
        );
        break;
      }

      case "enemy-port-taken": {
        this.regionsToHighlight.set(
          log.port,
          snap.getHouse(log.oldController).color
        );
        break;
      }

      case "ships-destroyed-by-empty-castle": {
        this.regionsToHighlight.set(log.port, snap.getHouse(log.house).color);
        this.regionsToHighlight.set(log.castle, snap.getHouse(log.house).color);
        break;
      }

      case "preemptive-raid-units-killed": {
        this.highlightUnitAreas(log.house, log.units, snap);
        break;
      }

      case "mammoth-riders-destroy-units": {
        this.highlightUnitAreas(log.house, log.units, snap);
        break;
      }

      case "the-horde-descends-units-killed": {
        this.highlightUnitAreas(log.house, log.units, snap);
        break;
      }

      case "crow-killers-knights-replaced": {
        this.highlightUnitAreas(log.house, log.units, snap);
        break;
      }

      case "crow-killers-knights-killed": {
        this.highlightUnitAreas(log.house, log.units, snap);
        break;
      }

      case "crow-killers-footman-upgraded": {
        this.highlightUnitAreas(log.house, log.units, snap);
        break;
      }

      case "loyalty-token-placed": {
        this.regionsToHighlight.set(
          log.region,
          snap.getHouse("targaryen").color
        );
        break;
      }

      case "loyalty-token-gained": {
        this.regionsToHighlight.set(
          log.region,
          snap.getHouse("targaryen").color
        );
        break;
      }

      case "fire-made-flesh-choice": {
        if (log.dragonKilledInRegion) {
          this.regionsToHighlight.set(
            log.dragonKilledInRegion,
            snap.getHouse(log.house).color
          );
        } else if (log.regainedDragonRegion) {
          this.regionsToHighlight.set(
            log.regainedDragonRegion,
            snap.getHouse(log.house).color
          );
        }
        break;
      }

      case "playing-with-fire-choice": {
        this.regionsToHighlight.set(log.region, snap.getHouse(log.house).color);
        break;
      }

      case "move-loyalty-token-choice": {
        if (log.regionFrom && log.regionTo) {
          this.regionsToHighlight.set(
            log.regionFrom,
            snap.getHouse(log.house).color
          );
          this.regionsToHighlight.set(
            log.regionTo,
            snap.getHouse(log.house).color
          );
          this.marchMarkers.push([
            log.regionFrom,
            {
              to: log.regionTo,
              color: log.house != "greyjoy" ? "black" : "white",
            },
          ]);
        }
        break;
      }

      case "order-removed": {
        const controller = snap.getController(log.region);
        const color = controller ? controller.color : "white";
        this.regionsToHighlight.set(log.region, color);
        break;
      }
      case "loan-purchased": {
        this.regionsToHighlight.set(log.region, snap.getHouse(log.house).color);
        break;
      }
      case "sellswords-placed": {
        this.highlightUnitAreas(log.house, log.units, snap);
        break;
      }

      case "the-faceless-men-units-destroyed": {
        log.units.forEach(({ regionId, houseId }) => {
          this.regionsToHighlight.set(
            regionId,
            snap.getHouse(houseId ? houseId : log.house).color
          );
        });
        break;
      }

      case "pyromancer-executed": {
        this.regionsToHighlight.set(log.region, snap.getHouse(log.house).color);
        break;
      }

      case "expert-artificer-executed": {
        this.regionsToHighlight.set(log.region, snap.getHouse(log.house).color);
        break;
      }

      case "loyal-maester-executed": {
        log.regions.forEach((region) => {
          this.regionsToHighlight.set(region, snap.getHouse(log.house).color);
        });
        break;
      }

      case "master-at-arms-executed": {
        log.regions.forEach((region) => {
          this.regionsToHighlight.set(region, snap.getHouse(log.house).color);
        });
        break;
      }

      case "savvy-steward-executed": {
        this.regionsToHighlight.set(log.region, snap.getHouse(log.house).color);
        break;
      }

      case "last-land-unit-transformed-to-dragon": {
        this.regionsToHighlight.set(log.region, snap.getHouse(log.house).color);
        break;
      }

      case "attack": {
        this.regionsToHighlight.set(
          log.attackingRegion,
          snap.getHouse(log.attacker).color
        );
        if (log.attacked)
          this.regionsToHighlight.set(
            log.attackedRegion,
            snap.getHouse(log.attacked).color
          );

        this.marchMarkers.push([
          log.attackingRegion,
          {
            to: log.attackedRegion,
            color: "red",
          },
        ]);
        break;
      }
      case "combat-result": {
        const ctrl1 = snap.getController(log.stats[0].region);
        const ctrl2 = snap.getController(log.stats[1].region);

        if (ctrl1)
          this.regionsToHighlight.set(log.stats[0].region, ctrl1.color);
        if (ctrl2)
          this.regionsToHighlight.set(log.stats[1].region, ctrl2.color);
        break;
      }

      case "mace-tyrell-footman-killed": {
        this.regionsToHighlight.set(log.region, snap.getHouse(log.house).color);
        break;
      }

      case "queen-of-thorns-order-removed": {
        this.regionsToHighlight.set(log.region, snap.getHouse(log.house).color);
        break;
      }

      case "jon-connington-used": {
        this.regionsToHighlight.set(log.region, snap.getHouse(log.house).color);
        break;
      }
      case "mace-tyrell-asos-order-placed": {
        this.regionsToHighlight.set(log.region, snap.getHouse(log.house).color);
        break;
      }
      case "cersei-lannister-order-removed": {
        this.regionsToHighlight.set(log.region, snap.getHouse(log.house).color);
        break;
      }
      case "renly-baratheon-footman-upgraded-to-knight": {
        this.regionsToHighlight.set(log.region, snap.getHouse(log.house).color);
        break;
      }

      case "ser-ilyn-payne-footman-killed": {
        this.regionsToHighlight.set(log.region, snap.getHouse(log.house).color);
        break;
      }

      case "loras-tyrell-attack-order-moved": {
        this.regionsToHighlight.set(log.region, snap.getHouse(log.house).color);
        break;
      }
      case "ser-ilyn-payne-asos-casualty-suffered":
      case "beric-dondarrion-used": {
        // no region info here. we would need that from another log
        // and we wont do that in a loop for highlighting rare logs
        break;
      }
    }
  }

  private highlightUnitAreas(
    house: string,
    units: [string, string[]][],
    snap: EntireGameSnapshot
  ): void {
    units.forEach(([rid, _]) => {
      this.regionsToHighlight.set(rid, snap.getHouse(house).color);
    });
  }

  private getMarkerColor(house: string, snap: EntireGameSnapshot): string {
    return this.hlHouseAreas
      ? house != "greyjoy"
        ? "black"
        : "white"
      : snap.getHouse(house).color;
  }
}
