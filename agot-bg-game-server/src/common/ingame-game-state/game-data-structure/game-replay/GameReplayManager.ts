/* eslint-disable @typescript-eslint/no-non-null-assertion */
import _ from "lodash";
import allKnownHouseCards from "../../../../client/utils/houseCardHelper";
import { MAX_WILDLING_STRENGTH } from "../Game";
import GameLog, { GameLogData } from "../GameLog";
import orders from "../orders";
import EntireGameSnapshot from "./EntireGameSnapshot";
import GameLogManager from "../GameLogManager";
import EntireGame from "../../../../common/EntireGame";
import { computed, observable } from "mobx";
import RegionSnapshot from "./RegionSnapshot";
import { modifyingGameLogIds } from "./replay-constants";
import HouseSnapshot from "./HouseSnapshot";
import { CombatStats } from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import { UnitState } from "../Unit";
import BetterMap from "../../../../utils/BetterMap";
import IngameGameState from "../../IngameGameState";
import { HouseCardState } from "../house-card/HouseCard";

interface CombatLogData {
  attackingRegion: RegionSnapshot;
  defendingRegion: RegionSnapshot;
  attacker: HouseSnapshot;
  defender: HouseSnapshot;
  retreatRegion: RegionSnapshot | null;
  winner: HouseSnapshot | null;
  loser: HouseSnapshot | null;
  combatResult: CombatStats[] | null;
}

export default class GameReplayManager {
  @observable selectedLogIndex = -1;
  @observable selectedSnapshot: EntireGameSnapshot | null = null;
  @observable regionsToHighlight: BetterMap<string, string> = new BetterMap();

  private entireGame: EntireGame;

  private currentCombatData: CombatLogData | null = null;

  @computed
  get isReplayMode(): boolean {
    return this.selectedLogIndex > -1 && this.selectedSnapshot != null;
  }

  get ingame(): IngameGameState {
    return this.entireGame.ingameGameState!;
  }

  get logManager(): GameLogManager {
    return this.ingame.gameLogManager;
  }

  constructor(entireGame: EntireGame) {
    this.entireGame = entireGame;
  }

  selectLog(index: number): void {
    this.regionsToHighlight.clear();
    const logs = this.logManager.logs.slice(0, index + 1).reverse();
    const reversedIndex = logs.findIndex(
      (log) => log.data.type === "orders-revealed"
    );
    const nearestSnapData = this.findNearestLogSnapshot(
      index,
      logs,
      reversedIndex
    );

    if (!nearestSnapData) {
      this.reset();
      return;
    }

    const nearestSnap = nearestSnapData.nearestSnap;

    if (!nearestSnap || nearestSnap?.type != "orders-revealed") return;

    let snap = new EntireGameSnapshot(
      _.cloneDeep({
        worldSnapshot: nearestSnap.worldState,
        gameSnapshot: nearestSnap.gameSnapshot,
      })
    );

    const logsToApply = _.cloneDeep(
      this.logManager.logs.slice(nearestSnapData.index + 1, index + 1)
    );

    while (logsToApply.length > 0) {
      const log = logsToApply.shift();
      if (!log) break;
      if (log.data.type == "attack") {
        if (log.data.attacked == null) {
          snap = this.handleAttackAgainstNeutralForce(log.data, snap);
        } else {
          // Extract logs of this combat and apply them in a special way as they might relate to each other
          // and we need to apply them in the right order.
          snap = this.handleCombatLog(log, logsToApply, snap);
        }
      } else {
        snap = this.applyLogEvent(snap, log.data, index);
      }
    }

    this.selectedLogIndex = index;
    this.selectedSnapshot = snap;

    this.handleHighligting(this.logManager.logs[index].data);
  }

  private handleAttackAgainstNeutralForce(
    log: GameLogData,
    snap: EntireGameSnapshot
  ): EntireGameSnapshot {
    if (log.type !== "attack") return snap;
    const region = snap.getRegion(log.attackingRegion);
    const regionTo = snap.getRegion(log.attackedRegion);

    log.units.forEach((unit) => {
      region.moveTo(unit, log.attacker, regionTo);
    });

    region.removeOrder();
    return snap;
  }

  private handleCombatLog(
    log: GameLog,
    logsToApply: GameLog[],
    snap: EntireGameSnapshot
  ): EntireGameSnapshot {
    const combatLogs: GameLog[] = [log];
    let isResolved = false;
    let endIndex = logsToApply.findIndex(
      (l) =>
        l.data.type == "attack" ||
        l.data.type == "march-resolved" ||
        l.data.type == "action-phase-resolve-consolidate-power-began" ||
        l.data.type == "winner-declared"
    );

    if (endIndex === -1) {
      endIndex = logsToApply.length;
      isResolved =
        logsToApply.findIndex((l) => l.data.type == "retreat-region-chosen") !==
        -1;
    } else {
      isResolved = true;
    }

    combatLogs.push(...logsToApply.splice(0, endIndex));

    snap = this.applyCombatLogEvents(combatLogs, snap, isResolved);
    return snap;
  }

  findNearestLogSnapshot(
    index: number,
    logs: GameLog[],
    reversedIndex: number
  ): {
    nearestSnap: GameLogData;
    index: number;
  } | null {
    const nearestSnap = reversedIndex >= 0 ? logs[reversedIndex].data : null;
    const originalIndex = index - reversedIndex - 1;

    if (!nearestSnap || nearestSnap?.type != "orders-revealed") {
      // Fallback to return first
      const i = this.logManager.logs.findIndex(
        (log) => log.data.type === "orders-revealed"
      );
      if (i >= 0) {
        return {
          nearestSnap: this.logManager.logs[i].data,
          index: i,
        };
      } else {
        this.reset();
        return null;
      }
    }
    return {
      nearestSnap: nearestSnap,
      index: originalIndex,
    };
  }

  nextLog(): void {
    if (this.selectedLogIndex < 0) {
      return;
    }

    let next = this.logManager.logs
      .slice(this.selectedLogIndex + 1)
      .findIndex((l) => this.isModifyingGameLogUI(l.data));

    if (next < 0) return;

    // restore original index
    next += this.selectedLogIndex + 1;

    this.selectLog(next);
  }

  nextRoundLog(): void {
    if (this.selectedLogIndex < 0) {
      return;
    }

    let next = this.logManager.logs
      .slice(this.selectedLogIndex + 1)
      .findIndex((l) => l.data.type == "turn-begin");

    if (next < 0) {
      this.selectLog(this.logManager.logs.length - 1);
      return;
    }

    // restore original index
    next += this.selectedLogIndex + 1;

    this.selectLog(next);
  }

  previousLog(): void {
    if (this.selectedLogIndex < 0) {
      return;
    }

    const previous = this.logManager.logs
      .slice(0, this.selectedLogIndex)
      .reverse()
      .findIndex((l) => this.isModifyingGameLogUI(l.data));

    if (previous < 0) return;

    // restore original index
    this.selectLog(this.selectedLogIndex - previous - 1);
  }

  previousRoundLog(): void {
    if (this.selectedLogIndex < 0) {
      return;
    }

    const previous = this.logManager.logs
      .slice(0, this.selectedLogIndex)
      .reverse()
      .findIndex((l) => l.data.type == "turn-begin");

    if (previous < 0) return;

    // restore original index
    this.selectLog(this.selectedLogIndex - previous - 1);
  }

  reset(): void {
    this.selectedSnapshot = null;
    this.selectedLogIndex = -1;
  }

  /*
    Replacing GameLogData by ModifiingGameLog allows to check in VS Code that all modifying logs are handled in the applyLogEvent function.
  */
  private applyLogEvent(
    snap: EntireGameSnapshot,
    log: GameLogData,
    logIndex: number
  ): EntireGameSnapshot {
    if (!this.isModifyingGameLog(log)) {
      return snap;
    }

    switch (log.type) {
      case "turn-begin": {
        if (!snap.gameSnapshot) return snap;
        snap.gameSnapshot.round = log.turn;
        snap.gameSnapshot.vsbUsed = false;
        snap.worldSnapshot.forEach((region) => {
          region.removeOrder();
          region.units?.forEach((unit) => {
            unit.wounded = false;
          });
        });
        snap.gameSnapshot.housesOnVictoryTrack.forEach((house) => {
          house.isVassal = false;
          house.suzerainHouseId = undefined;
        });
        return snap;
      }

      case "march-resolved": {
        const startingRegion = snap.getRegion(log.startingRegion);
        // remove from starting region
        log.moves.forEach(([rid, units]) => {
          units.forEach((unit) => {
            startingRegion.moveTo(unit, log.house, snap.getRegion(rid));
          });
        });
        startingRegion.removeOrder();
        return snap;
      }
      case "westeros-cards-drawn":
        if (!snap.gameSnapshot) return snap;
        snap.gameSnapshot.wildlingStrength += log.addedWildlingStrength;
        snap.gameSnapshot.wildlingStrength = Math.min(
          snap.gameSnapshot.wildlingStrength,
          MAX_WILDLING_STRENGTH
        );
        return snap;

      case "wildling-bidding":
        if (!snap.gameSnapshot) return snap;
        if (log.nightsWatchVictory) snap.gameSnapshot.wildlingStrength = 0;
        log.results.forEach(([bid, houses]) => {
          houses.forEach((h) => {
            const house = snap.getHouse(h)!;
            house.removePowerTokens(bid);
          });
        });
        return snap;

      case "player-mustered": {
        log.musterings.forEach(([rid, units]) => {
          units.forEach((unit) => {
            const region = snap.getRegion(rid);
            if (unit.from) {
              region.removeUnit(unit.from, log.house);
            }
            const toRegion = snap.getRegion(unit.region);
            toRegion.createUnit(unit.to, log.house);
            region.removeOrder(); // in case triggered by CP* or vassal muster order
          });
        });
        return snap;
      }
      case "raven-holder-replace-order": {
        const region = snap.getRegion(log.region);
        region.setOrder(this.getOrderTypeById(log.newOrder));
        return snap;
      }
      case "raid-done": {
        const raiderRegion = snap.getRegion(log.raiderRegion);
        raiderRegion?.removeOrder();
        if (log.raidedRegion) {
          const raidedRegion = snap.getRegion(log.raidedRegion);
          raidedRegion.removeOrder();
        }

        if (snap.gameSnapshot) {
          if (log.raiderGainedPowerToken) {
            const raider = snap.getHouse(log.raider);
            raider?.addPowerTokens(1);
          }

          if (log.raidedHouseLostPowerToken) {
            const raided = snap.getHouse(log.raidee);
            raided?.removePowerTokens(1);
          }
        }

        return snap;
      }
      case "clash-of-kings-bidding-done": {
        if (!snap.gameSnapshot) return snap;
        log.results.forEach(([bid, houses]) => {
          houses.forEach((h) => {
            const house = snap.getHouse(h)!;
            house.removePowerTokens(bid);
          });
        });
        if (log.trackerI == 0) {
          snap.gameSnapshot.ironThroneTrack = [
            snap.gameSnapshot.ironThroneTrack[0],
          ];
          snap.gameSnapshot.fiefdomsTrack = [];
          snap.gameSnapshot.kingsCourtTrack = [];
        }
        return snap;
      }

      case "clash-of-kings-final-ordering": {
        if (!snap.gameSnapshot) return snap;
        if (log.trackerI == 0) {
          snap.gameSnapshot.ironThroneTrack = log.finalOrder;
        } else if (log.trackerI == 1) {
          snap.gameSnapshot.fiefdomsTrack = log.finalOrder;
        } else if (log.trackerI == 2) {
          snap.gameSnapshot.kingsCourtTrack = log.finalOrder;
        }
        return snap;
      }
      case "consolidate-power-order-resolved": {
        const region = snap.getRegion(log.region);
        const house = snap.getHouse(log.house)!;
        house.addPowerTokens(log.powerTokenCount);
        region.removeOrder();
        return snap;
      }

      case "armies-reconciled": {
        log.armies.forEach(([rid, units]) => {
          const region = snap.getRegion(rid);
          units.forEach((unit) => {
            region.removeUnit(unit, log.house);
          });
        });
        return snap;
      }

      case "vassals-claimed": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        const vassals = log.vassals.map((v) => snap.getHouse(v)!);

        vassals.forEach((v) => {
          v.isVassal = true;
          v.suzerainHouseId = house.id;
        });
        return snap;
      }

      case "game-of-thrones-power-tokens-gained": {
        if (!snap.gameSnapshot) return snap;
        log.gains.forEach(([house, gain]) => {
          const h = snap.getHouse(house);
          h?.addPowerTokens(gain);
        });
        return snap;
      }

      case "garrison-removed": {
        const region = snap.getRegion(log.region);
        region.garrison = undefined;
        return snap;
      }

      case "garrison-returned": {
        const region = snap.getRegion(log.region);
        region.garrison = log.strength;
        return snap;
      }

      case "orders-revealed":
        return new EntireGameSnapshot({
          worldSnapshot: log.worldState,
          gameSnapshot: log.gameSnapshot,
        });

      case "leave-power-token-choice": {
        const region = snap.getRegion(log.region);
        if (log.leftPowerToken) region.controlPowerToken = log.house;
        return snap;
      }

      case "control-power-token-removed": {
        const region = snap.getRegion(log.regionId);
        region.controlPowerToken = undefined;
        return snap;
      }

      // UNREVIEWED LOGS:

      case "enemy-port-taken": {
        const region = snap.getRegion(log.port);

        if (region) {
          while (region.units?.length ?? -1 > 0) {
            region.removeUnit(region.units![0].type, log.oldController);
          }

          for (let i = 0; i < log.shipCount; i++) {
            region.createUnit("ship", log.newController);
          }
        }
        return snap;
      }

      case "ships-destroyed-by-empty-castle": {
        const region = snap.getRegion(log.port);
        while (region.units?.length ?? -1 > 0) {
          region.removeUnit(region.units![0].type, log.house);
        }

        return snap;
      }

      case "preemptive-raid-units-killed": {
        snap.removeUnits(log.units, log.house);
        return snap;
      }

      case "preemptive-raid-track-reduced": {
        if (!snap.gameSnapshot) return snap;
        const track = snap.getInfluenceTrack(log.trackI);
        const currentI = track.indexOf(log.house);
        track.splice(currentI, 1);
        track.splice(currentI + 2, 0, log.house);

        return snap;
      }

      case "preemptive-raid-wildlings-attack": {
        if (!snap.gameSnapshot) return snap;
        snap.gameSnapshot.wildlingStrength = 0;
        return snap;
      }

      case "massing-on-the-milkwater-house-cards-removed": {
        const house = snap.getHouse(log.house)!;
        log.houseCardsUsed.forEach((hc) => {
          house.markHouseCardAsUsed(hc);
        });
        return snap;
      }

      case "a-king-beyond-the-wall-lowest-reduce-tracks": {
        if (!snap.gameSnapshot) return snap;
        for (let i = 0; i < 3; i++) {
          const track = snap.getInfluenceTrack(i);
          track.splice(track.indexOf(log.lowestBidder), 1);
          track.push(log.lowestBidder);
        }
        return snap;
      }

      case "a-king-beyond-the-wall-house-reduce-track": {
        if (!snap.gameSnapshot) return snap;
        const track = snap.getInfluenceTrack(log.trackI);
        track.splice(track.indexOf(log.house), 1);
        track.push(log.house);
        return snap;
      }

      case "a-king-beyond-the-wall-highest-top-track": {
        if (!snap.gameSnapshot) return snap;
        const track = snap.getInfluenceTrack(log.trackI);
        track.splice(track.indexOf(log.house), 1);
        track.unshift(log.house);
        return snap;
      }

      case "mammoth-riders-destroy-units": {
        snap.removeUnits(log.units, log.house);
        return snap;
      }

      case "mammoth-riders-return-card": {
        const house = snap.getHouse(log.house)!;
        house.markHouseCardAsAvailable(log.houseCard);
        return snap;
      }

      case "the-horde-descends-units-killed": {
        snap.removeUnits(log.units, log.house);
        return snap;
      }

      case "crow-killers-knights-replaced": {
        log.units.forEach(([rid, units]) => {
          const region = snap.getRegion(rid);
          units.forEach((_) => {
            region.removeUnit("knight", log.house);
          });
          units.forEach((_) => {
            region.createUnit("footman", log.house);
          });
        });

        return snap;
      }

      case "crow-killers-knights-killed": {
        snap.removeUnits(log.units, log.house);
        return snap;
      }

      case "crow-killers-footman-upgraded": {
        log.units.forEach(([rid, units]) => {
          const region = snap.getRegion(rid);
          units.forEach((_) => {
            region.removeUnit("footman", log.house);
          });
          units.forEach((_) => {
            region.createUnit("knight", log.house);
          });
        });
        return snap;
      }

      case "skinchanger-scout-nights-watch-victory": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.addPowerTokens(log.powerToken);
        return snap;
      }

      case "skinchanger-scout-wildling-victory": {
        if (!snap.gameSnapshot) return snap;
        log.powerTokensLost.forEach(([hid, amount]) => {
          const h = snap.getHouse(hid)!;
          h.removePowerTokens(-amount); // as amount should be stored negative we remove a negative amount
        });
      }

      case "rattleshirts-raiders-nights-watch-victory": {
        if (!snap.gameSnapshot) return snap;
        snap.changeSupply(log.house, 1, this.ingame.game.supplyRestrictions);
        return snap;
      }

      case "rattleshirts-raiders-wildling-victory": {
        if (!snap.gameSnapshot) return snap;
        log.newSupply.forEach(([hid, supply]) => {
          const h = snap.getHouse(hid)!;
          h.supply = supply;
        });
        return snap;
      }

      case "supply-adjusted": {
        if (!snap.gameSnapshot) return snap;
        log.supplies.forEach(([hid, supply]) => {
          const h = snap.getHouse(hid)!;
          h.supply = supply;
        });
        return snap;
      }

      case "house-card-picked": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.houseCards.push({
          id: log.houseCard,
          state: HouseCardState.AVAILABLE,
        });
        return snap;
      }

      case "power-tokens-gifted": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        const affectedHouse = snap.getHouse(log.affectedHouse)!;

        house.removePowerTokens(log.powerTokens);
        affectedHouse.addPowerTokens(log.powerTokens);

        return snap;
      }

      case "influence-track-position-chosen": {
        if (!snap.gameSnapshot) return snap;
        const track = snap.getInfluenceTrack(log.trackerI);
        track.push(log.house);
        return snap;
      }

      case "place-loyalty-choice": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.removePowerTokens(log.discardedPowerTokens);
        // only power tokens are remved here
        return snap;
      }

      case "loyalty-token-placed": {
        const region = snap.getRegion(log.region);
        const previousChoice = this.logManager.logs
          .slice(0, logIndex)
          .reverse()
          .find((log) => log.data.type === "place-loyalty-choice");

        if (
          previousChoice &&
          previousChoice.data.type === "place-loyalty-choice"
        ) {
          if (!region.loyaltyTokens) region.loyaltyTokens = 0;
          region.loyaltyTokens += previousChoice.data.loyaltyTokenCount;
        }

        return snap;
      }

      case "loyalty-token-gained": {
        const house = snap.getHouse("targaryen")!;
        house.victoryPoints += log.count;
        const region = snap.getRegion(log.region);
        region.loyaltyTokens = 0;
        return snap;
      }

      case "fire-made-flesh-choice": {
        if (log.dragonKilledInRegion) {
          const region = snap.getRegion(log.dragonKilledInRegion);
          if (region) {
            region.removeUnit("dragon", log.house);
          }
        }

        if (log.regainedDragonRegion) {
          const region = snap.getRegion(log.regainedDragonRegion);
          region.createUnit("dragon", log.house);
        }

        if (snap.gameSnapshot && log.removedDragonStrengthToken) {
          snap.gameSnapshot.dragonStrength!++;
        }

        return snap;
      }

      case "playing-with-fire-choice": {
        const region = snap.getRegion(log.region);
        region.createUnit(log.unitType, log.house);
        return snap;
      }

      case "the-long-plan-choice": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.removePowerTokens(1);
        return snap;
      }

      case "move-loyalty-token-choice": {
        const nextLog = this.logManager.logs[logIndex + 1];

        if (log.regionFrom && log.regionTo) {
          if (
            !nextLog ||
            (nextLog.data.type === "move-loyalty-token-choice" &&
              !nextLog.data.powerTokensDiscardedToCancelMovement)
          ) {
            const from = snap.getRegion(log.regionFrom);
            from.loyaltyTokens!--;
            const to = snap.getRegion(log.regionTo);
            to.loyaltyTokens!++;
          }
        }
        return snap;
      }

      case "loan-purchased": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.removePowerTokens(log.paid);
        return snap;
      }

      case "order-removed": {
        const region = snap.getRegion(log.region);
        region.removeOrder();
        return snap;
      }

      case "interest-paid": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.addPowerTokens(log.paid); // paid is negative
        return snap;
      }

      case "debt-paid": {
        if (!snap.gameSnapshot) return snap;
        snap.removeUnits(log.units, log.house);
        return snap;
      }

      case "customs-officer-power-tokens-gained": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.addPowerTokens(log.gained);
        return snap;
      }

      case "sellswords-placed": {
        log.units.forEach(([rid, units]) => {
          const region = snap.getRegion(rid);
          units.forEach((unit) => {
            region.createUnit(unit, log.house);
          });
        });
      }

      // TODO: Test
      case "the-faceless-men-units-destroyed": {
        const units = log.units as {
          regionId: string;
          houseId?: string;
          unitTypeId: string;
        }[];
        units.forEach((unit) => {
          const { unitTypeId, regionId, houseId } = unit;
          const regionSnapshot = snap.getRegion(regionId);
          regionSnapshot.removeUnit(unitTypeId, houseId!);
        });
        return snap;
      }

      case "pyromancer-executed": {
        const region = snap.getRegion(log.region);
        region.castleModifier = -1;
        return snap;
      }

      case "expert-artificer-executed": {
        const region = snap.getRegion(log.region);
        if (!region.crownModifier) region.crownModifier = 0;
        region.crownModifier++;
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.addPowerTokens(log.gainedPowerTokens);
        return snap;
      }

      case "loyal-maester-executed": {
        log.regions.forEach((regionId) => {
          const region = snap.getRegion(regionId);
          if (!region.barrelModifier) region.barrelModifier = 0;
          region.barrelModifier++;
        });
        return snap;
      }

      case "master-at-arms-executed": {
        log.regions.forEach((regionId) => {
          const region = snap.getRegion(regionId);
          region.castleModifier = 1;
        });

        return snap;
      }

      case "savvy-steward-executed": {
        const region = snap.getRegion(log.region);
        if (!region.barrelModifier) region.barrelModifier = 0;
        region.barrelModifier++;
        if (!snap.gameSnapshot) return snap;
        snap.changeSupply(log.house, 1, this.ingame.game.supplyRestrictions);
        return snap;
      }

      case "special-objective-scored": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.victoryPoints = log.newTotal;
        return snap;
      }

      case "objective-scored": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.victoryPoints = log.newTotal;
        return snap;
      }

      case "ironborn-raid": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.victoryPoints = log.newTotal;
        return snap;
      }

      case "house-cards-returned": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        log.houseCards.forEach((hc) => {
          house.markHouseCardAsAvailable(hc);
        });
        return snap;
      }

      case "last-land-unit-transformed-to-dragon": {
        const region = snap.getRegion(log.region);
        region.removeUnit(log.transformedUnitType, log.house);
        region.createUnit("dragon", log.house);
        return snap;
      }

      case "massing-on-the-milkwater-house-cards-back": {
        const house = snap.getHouse(log.house)!;
        log.houseCardsReturned.forEach((hc) => {
          house.markHouseCardAsAvailable(hc);
        });
        return snap;
      }

      /*
            COMBAT LOGS
      */
      case "attack": {
        return snap;
      }
      case "combat-result": {
        if (!snap.gameSnapshot) return snap;
        const cd = this.currentCombatData!;
        if (log.stats[0].houseCard)
          cd.attacker.markHouseCardAsUsed(log.stats[0].houseCard);

        if (log.stats[1].houseCard)
          cd.defender.markHouseCardAsUsed(log.stats[1].houseCard);
        return snap;
      }
      case "immediatly-killed-after-combat": {
        if (!snap.gameSnapshot) return snap;
        const cd = this.currentCombatData!;
        const house = snap.getHouse(log.house);
        if (!house) return snap;
        if (house != cd.loser)
          throw new Error("Only the loser suffers this casualty type");
        const region =
          house == cd.defender ? cd.defendingRegion : cd.attackingRegion;

        log.killedBecauseWounded.forEach((unit) => {
          region.removeUnit(unit, house.id, true);
        });
        log.killedBecauseCantRetreat.forEach((unit) => {
          region.removeUnit(unit, house.id);
        });
        return snap;
      }
      case "killed-after-combat": {
        if (!snap.gameSnapshot) return snap;
        const cd = this.currentCombatData!;
        const house = snap.getHouse(log.house);
        if (!house) return snap;
        const region =
          house == cd.defender ? cd.defendingRegion : cd.attackingRegion;

        log.killed.forEach((unit) => {
          region.removeUnit(unit, house.id);
        });
        return snap;
      }
      case "retreat-casualties-suffered": {
        if (!snap.gameSnapshot) return snap;
        const cd = this.currentCombatData!;
        const house = snap.getHouse(log.house);
        if (!house) return snap;

        const region =
          house == cd.defender ? cd.defendingRegion : cd.attackingRegion;

        log.units.forEach((unit) => {
          region.removeUnit(unit, house.id);
        });

        return snap;
      }

      case "combat-valyrian-sword-used": {
        if (!snap.gameSnapshot) return snap;
        snap.gameSnapshot.vsbUsed = true;
        return snap;
      }

      case "patchface-used": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.affectedHouse)!;
        house.markHouseCardAsUsed(log.houseCard);

        return snap;
      }

      // UNREVIEWED LOGS:

      case "melisandre-dwd-used": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.markHouseCardAsAvailable(log.houseCard);
        const card = allKnownHouseCards.get(log.houseCard);
        house.removePowerTokens(card.combatStrength);

        return snap;
      }

      case "doran-used": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.affectedHouse);
        if (!house) return snap;
        const track = snap.getInfluenceTrack(log.influenceTrack);
        _.pull(track, house.id);
        track.push(house.id);
        return snap;
      }

      case "reek-used": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.markHouseCardAsAvailable("reek");

        return snap;
      }

      case "reek-returned-ramsay": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.markHouseCardAsAvailable(log.returnedCardId);

        return snap;
      }

      case "lysa-arryn-mod-used": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.markHouseCardAsAvailable("lysa-arryn-mod");
        return snap;
      }

      case "aeron-damphair-used": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.removePowerTokens(log.tokens);
        return snap;
      }
      case "bronn-used": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.removePowerTokens(2);
        return snap;
      }
      case "qyburn-used": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.removePowerTokens(2);
        return snap;
      }
      case "stannis-baratheon-asos-used": {
        if (!snap.gameSnapshot) return snap;
        // TODO: such a rare card. needs UI adaption
        return snap;
      }
      case "viserys-targaryen-used": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.markHouseCardAsUsed(log.houseCard);
        return snap;
      }
      case "mace-tyrell-footman-killed": {
        const region = snap.getRegion(log.region);
        region.removeUnit("footman", log.house);
        return snap;
      }
      case "queen-of-thorns-order-removed": {
        const region = snap.getRegion(log.region);
        region.removeOrder();
        return snap;
      }
      case "garrison-removed": {
        const region = snap.getRegion(log.region);
        region.garrison = undefined;
        return snap;
      }
      case "commander-power-token-gained": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.addPowerTokens(1);
        return snap;
      }
      case "house-cards-returned": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        log.houseCards.forEach((hc) => {
          house.markHouseCardAsAvailable(hc);
        });
        return snap;
      }
      case "bran-stark-used": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.markHouseCardAsAvailable(log.houseCard);
        return snap;
      }
      case "jon-connington-used": {
        const region = snap.getRegion(log.region);
        region.createUnit("knight", log.house);
        return snap;
      }
      case "mace-tyrell-asos-order-placed": {
        const region = snap.getRegion(log.region);
        region.setOrder(this.getOrderTypeById(log.order));
        return snap;
      }
      case "alayne-stone-used": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        const affectedHouse = snap.getHouse(log.affectedHouse)!;
        house.removePowerTokens(2);
        affectedHouse.powerTokens = 0;
        return snap;
      }
      case "cersei-lannister-order-removed": {
        const region = snap.getRegion(log.region);
        region.removeOrder();
        return snap;
      }
      case "jon-snow-used": {
        if (!snap.gameSnapshot) return snap;
        snap.gameSnapshot.wildlingStrength += log.wildlingsStrength;
        return snap;
      }
      case "missandei-used": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.markHouseCardAsAvailable(log.houseCard);
        return snap;
      }
      case "renly-baratheon-footman-upgraded-to-knight": {
        const region = snap.getRegion(log.region);
        region.removeUnit("footman", log.house);
        region.createUnit("knight", log.house);
        return snap;
      }
      case "ser-gerris-drinkwater-used": {
        if (!snap.gameSnapshot) return snap;
        const track = snap.getInfluenceTrack(log.influenceTrack);
        const pos = track.indexOf(log.house);
        track.splice(pos - 1, 0, track.splice(pos, 1)[0]);
        return snap;
      }
      case "ser-ilyn-payne-footman-killed": {
        const region = snap.getRegion(log.region);
        region.removeUnit("footman", log.house);
        return snap;
      }
      case "anya-waynwood-power-tokens-gained": {
        if (!snap.gameSnapshot) return snap;
        log.gains.forEach(([house, gain]) => {
          const h = snap.getHouse(house);
          h?.addPowerTokens(gain);
        });
        return snap;
      }
      case "balon-greyjoy-asos-power-tokens-gained": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.addPowerTokens(log.powerTokensGained);
        return snap;
      }
      case "cersei-lannister-asos-power-tokens-discarded": {
        if (!snap.gameSnapshot) return snap;
        const affected = snap.getHouse(log.affectedHouse)!;
        affected.removePowerTokens(log.powerTokensDiscarded);

        return snap;
      }
      case "daenerys-targaryen-b-power-tokens-discarded": {
        if (!snap.gameSnapshot) return snap;
        const affected = snap.getHouse(log.affectedHouse)!;
        affected.removePowerTokens(log.powerTokensDiscarded);
        return snap;
      }
      case "doran-martell-asos-used": {
        if (!snap.gameSnapshot) return snap;
        const affectedHouse = snap.getHouse(log.affectedHouse)!;
        const track = snap.getInfluenceTrack(1);
        _.pull(track, affectedHouse.id);
        track.push(affectedHouse.id);
        return snap;
      }
      case "illyrio-mopatis-power-tokens-gained": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.addPowerTokens(log.powerTokensGained);
        return snap;
      }
      case "house-card-removed-from-game": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        _.remove(house.houseCards, (hc) => hc.id === log.houseCard);
        return snap;
      }
      case "littlefinger-power-tokens-gained": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.addPowerTokens(log.powerTokens);
        return snap;
      }
      case "lysa-arryn-ffc-power-tokens-gained": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.addPowerTokens(log.powerTokens);
        return snap;
      }
      case "melisandre-of-asshai-power-tokens-gained": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.addPowerTokens(log.powerTokens);
        return snap;
      }
      case "qarl-the-maid-tokens-gained": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.addPowerTokens(log.powerTokensGained);
        return snap;
      }
      case "roose-bolton-house-cards-returned": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        log.houseCards.forEach((hc) => {
          house.markHouseCardAsAvailable(hc);
        });
        return snap;
      }
      case "salladhar-saan-asos-power-tokens-changed": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        const affectedHouse = snap.getHouse(log.affectedHouse)!;
        house.addPowerTokens(log.powerTokensGained);
        affectedHouse.removePowerTokens(log.powerTokensLost);
        return snap;
      }
      case "loras-tyrell-attack-order-moved": {
        const region = snap.getRegion(
          this.currentCombatData!.attackingRegion.id
        );
        const order = region.order;
        region.removeOrder();
        const toRegion = snap.getRegion(log.region);
        toRegion.order = order;
        return snap;
      }
      case "tywin-lannister-power-tokens-gained": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        house.addPowerTokens(log.powerTokensGained);
        return snap;
      }
      case "beric-dondarrion-used": {
        if (!snap.gameSnapshot) return snap;
        const houseIsAttacker =
          this.currentCombatData?.attacker.id == log.house;
        const region = houseIsAttacker
          ? this.currentCombatData?.attackingRegion
          : this.currentCombatData?.defendingRegion;
        region?.removeUnit(log.casualty, log.house);
        return snap;
      }
      case "robert-arryn-used": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house)!;
        const affectedHouse = snap.getHouse(log.affectedHouse)!;
        _.remove(house.houseCards, (card) => card.id === "robert-arryn");
        _.remove(
          affectedHouse.houseCards,
          (card) => card.id === log.removedHouseCard
        );
        return snap;
      }
      case "ser-ilyn-payne-asos-casualty-suffered": {
        if (!snap.gameSnapshot) return snap;
        const houseIsAttacker =
          this.currentCombatData?.attacker.id == log.house;
        const region = houseIsAttacker
          ? this.currentCombatData?.attackingRegion
          : this.currentCombatData?.defendingRegion;
        region?.removeUnit(log.unit, log.house);
        return snap;
      }
      case "varys-used": {
        if (!snap.gameSnapshot) return snap;
        const track = snap.getInfluenceTrack(1);
        _.pull(track, log.house);
        track.unshift(log.house);
        return snap;
      }

      default:
        throw new Error(`Unhandled modifying log type '${log.type}'`);
    }
  }

  private applyCombatLogEvents(
    combatLogs: GameLog[],
    snap: EntireGameSnapshot,
    isResolved: boolean
  ): EntireGameSnapshot {
    const attackLog = combatLogs[0].data;
    if (attackLog.type != "attack") {
      throw new Error(`First log type must be 'attack'`);
    }

    const retreatRegionLog = combatLogs.find(
      (log) => log.data.type == "retreat-region-chosen"
    );

    const combatResult = combatLogs.find(
      (log) => log.data.type == "combat-result"
    );

    const winner =
      combatResult && combatResult.data.type == "combat-result"
        ? snap.getHouse(combatResult.data.winner)
        : null;

    let loser = null;

    if (winner) {
      loser =
        winner == snap.getHouse(attackLog.attacker)
          ? snap.getHouse(attackLog.attacked)
          : snap.getHouse(attackLog.attacker);
    }

    const cd = {
      attacker: snap.getHouse(attackLog.attacker)!,
      defender: snap.getHouse(attackLog.attacked)!,
      attackingRegion: snap.getRegion(attackLog.attackingRegion),
      defendingRegion: snap.getRegion(attackLog.attackedRegion),
      retreatRegion:
        retreatRegionLog &&
        retreatRegionLog.data.type == "retreat-region-chosen"
          ? snap.getRegion(retreatRegionLog.data.regionTo)
          : null,
      isResolved: isResolved,
      winner: winner,
      loser: loser,
      combatResult:
        combatResult && combatResult.data.type == "combat-result"
          ? combatResult.data.stats
          : null,
    };

    this.currentCombatData = cd;

    combatLogs.forEach((log) => {
      // original log index not relevant as we fetched related logs already in combat logs
      snap = this.applyLogEvent(snap, log.data, -1);
    });

    if (isResolved) {
      this.handleResolvedCombat(combatLogs);
    }

    this.currentCombatData = null;
    return snap;
  }

  private handleResolvedCombat(combatLogs: GameLog[]): void {
    const cd = this.currentCombatData!;
    if (!cd.winner || !cd.combatResult) {
      throw new Error("combat-result not found in combat logs");
    }
    //const attackingArmy = cd.combatResult[0].armyUnits.map(unit => snap.get
    const attackingArmy = cd.attackingRegion.getUnits(
      cd.combatResult[0].armyUnits,
      cd.attacker.id
    );

    const defendingArmy = cd.defendingRegion.getUnits(
      cd.combatResult[1].armyUnits,
      cd.defender.id
    );

    // Perform retreat:
    if (cd.attacker == cd.winner) {
      // defender retreats from the region
      this.handleRetreat(
        defendingArmy,
        cd.defender.id,
        cd.defendingRegion,
        cd.retreatRegion,
        combatLogs
      );
      // Attacker movement may be blocked
      if (
        !_.some(
          combatLogs,
          (l) => l.data.type == "arianne-martell-prevent-movement"
        )
      ) {
        attackingArmy.forEach((unit) => {
          cd.attackingRegion.moveTo(
            unit.type,
            cd.attacker.id,
            cd.defendingRegion
          );
        });
      }
    } else {
      // attacker retreat => stay in attacking region, but wound units
      attackingArmy.forEach((unit) => {
        unit.wounded = true;
      });

      if (
        _.some(
          combatLogs,
          (l) => l.data.type == "arianne-martell-force-retreat"
        )
      ) {
        // defending army must retreat though they won
        this.handleRetreat(
          defendingArmy,
          cd.defender.id,
          cd.defendingRegion,
          cd.retreatRegion,
          combatLogs
        );
      }
    }

    cd.attackingRegion.removeOrder();
  }

  isModifyingGameLog(log: GameLogData): boolean {
    return modifyingGameLogIds.includes(log.type);
  }

  isModifyingGameLogUI(log: GameLogData): boolean {
    if (log.type == "orders-revealed") {
      return !log.onlySnapshot;
    }
    return modifyingGameLogIds.includes(log.type);
  }

  getOrderTypeById(id: number): string {
    return orders.get(id).type.id;
  }

  private handleRetreat(
    army: UnitState[],
    house: string,
    fromRegion: RegionSnapshot,
    retreatRegion: RegionSnapshot | null,
    combatLogs: GameLog[],
    applyWound = true
  ): void {
    if (retreatRegion) {
      army.forEach((unit) => {
        fromRegion.moveTo(unit.type, house, retreatRegion);
        unit.wounded = applyWound;
      });
    }
    // Retreat region may miss due to several reasons:
    // 1. No retreat region available (e.g. no ships in the sea)
    // 2. No unit to retreat (e.g. all units are killed)
    // 3. Retreat region is not available (e.g. blocked by Arianne Martell)
  }

  private handleHighligting(selectedLog: GameLogData): void {
    if (selectedLog.type == "attack") {
      this.regionsToHighlight.set(selectedLog.attackingRegion, "red");
      this.regionsToHighlight.set(selectedLog.attackedRegion, "yellow");
    } else if (selectedLog.type == "combat-result") {
      this.regionsToHighlight.set(selectedLog.stats[0].region, "red");
      this.regionsToHighlight.set(selectedLog.stats[1].region, "yellow");
    }
  }
}
