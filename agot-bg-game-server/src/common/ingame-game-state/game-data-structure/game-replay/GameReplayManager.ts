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

export default class GameReplayManager {
  @observable selectedLogIndex = -1;
  @observable selectedSnapshot: EntireGameSnapshot | null = null;
  @observable regionsToHighlight: BetterMap<string, string> = new BetterMap();
  @observable rerender = 0;

  private entireGame: EntireGame;

  private currentCombatData: {
    attackingRegion: RegionSnapshot;
    defendingRegion: RegionSnapshot;
    attacker: HouseSnapshot;
    defender: HouseSnapshot;
    retreatRegion: RegionSnapshot | null;
    winner: HouseSnapshot | null;
    loser: HouseSnapshot | null;
    combatResult: CombatStats[] | null;
  } | null = null;

  @computed
  get isReplayMode(): boolean {
    return this.selectedLogIndex > -1 && this.selectedSnapshot != null;
  }

  get logManager(): GameLogManager {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.entireGame.ingameGameState!.gameLogManager;
  }

  constructor(entireGame: EntireGame) {
    this.entireGame = entireGame;
  }

  render(): void {
    if (this.rerender == 0) {
      this.rerender = 1;
    } else {
      this.rerender = 0;
    }
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
        snap = this.applyLogEvent(log.data, snap);
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
    log: GameLogData,
    snap: EntireGameSnapshot
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
            const house = snap.getHouse(h);
            house?.removePowerTokens(bid);
            this.render();
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
            this.render();
          }

          if (log.raidedHouseLostPowerToken) {
            const raided = snap.getHouse(log.raidee);
            raided?.removePowerTokens(1);
            this.render();
          }
        }

        return snap;
      }
      case "clash-of-kings-bidding-done": {
        if (!snap.gameSnapshot) return snap;
        log.results.forEach(([bid, houses]) => {
          houses.forEach((h) => {
            const house = snap.getHouse(h);
            house?.removePowerTokens(bid);
            this.render();
          });
        });
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
          this.render();
        });
        return snap;
      }

      case "enemy-port-taken": {
        return snap;
      }

      case "ships-destroyed-by-empty-castle": {
        return snap;
      }

      case "preemptive-raid-units-killed": {
        return snap;
      }

      case "preemptive-raid-track-reduced": {
        return snap;
      }

      case "preemptive-raid-wildlings-attack": {
        return snap;
      }

      case "massing-on-the-milkwater-house-cards-removed": {
        return snap;
      }

      case "a-king-beyond-the-wall-lowest-reduce-tracks": {
        return snap;
      }

      case "a-king-beyond-the-wall-house-reduce-track": {
        return snap;
      }

      case "a-king-beyond-the-wall-highest-top-track": {
        return snap;
      }

      case "mammoth-riders-destroy-units": {
        return snap;
      }

      case "mammoth-riders-return-card": {
        return snap;
      }

      case "the-horde-descends-highest-muster": {
        return snap;
      }

      case "the-horde-descends-units-killed": {
        return snap;
      }

      case "crow-killers-knights-replaced": {
        return snap;
      }

      case "crow-killers-knights-killed": {
        return snap;
      }

      case "crow-killers-footman-upgraded": {
        return snap;
      }

      case "skinchanger-scout-nights-watch-victory": {
        return snap;
      }

      case "skinchanger-scout-wildling-victory": {
        return snap;
      }

      case "rattleshirts-raiders-nights-watch-victory": {
        return snap;
      }

      case "rattleshirts-raiders-wildling-victory": {
        return snap;
      }

      case "game-of-thrones-power-tokens-gained": {
        return snap;
      }

      case "supply-adjusted": {
        return snap;
      }

      case "house-card-picked": {
        return snap;
      }

      case "power-tokens-gifted": {
        return snap;
      }

      case "influence-track-position-chosen": {
        return snap;
      }

      case "place-loyalty-choice": {
        return snap;
      }

      case "loyalty-token-placed": {
        return snap;
      }

      case "loyalty-token-gained": {
        return snap;
      }

      case "fire-made-flesh-choice": {
        return snap;
      }

      case "playing-with-fire-choice": {
        return snap;
      }

      case "the-long-plan-choice": {
        return snap;
      }

      case "move-loyalty-token-choice": {
        return snap;
      }

      case "loan-purchased": {
        return snap;
      }

      case "order-removed": {
        return snap;
      }

      case "interest-paid": {
        return snap;
      }

      case "debt-paid": {
        return snap;
      }

      case "customs-officer-power-tokens-gained": {
        return snap;
      }

      case "sellswords-placed": {
        return snap;
      }

      case "the-faceless-men-units-destroyed": {
        return snap;
      }

      case "pyromancer-executed": {
        return snap;
      }

      case "expert-artificer-executed": {
        return snap;
      }

      case "loyal-maester-executed": {
        return snap;
      }

      case "master-at-arms-executed": {
        return snap;
      }

      case "savvy-steward-executed": {
        return snap;
      }

      case "special-objective-scored": {
        return snap;
      }

      case "objective-scored": {
        return snap;
      }

      case "ironborn-raid": {
        return snap;
      }

      case "garrison-removed": {
        const region = snap.getRegion(log.region);
        region.garrison = undefined;
        return snap;
      }

      case "garrison-returned": {
        return snap;
      }

      case "orders-revealed":
        return new EntireGameSnapshot({
          worldSnapshot: log.worldState,
          gameSnapshot: log.gameSnapshot,
        });

      case "house-cards-returned": {
        return snap;
      }

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

      case "last-land-unit-transformed-to-dragon": {
        return snap;
      }

      case "massing-on-the-milkwater-house-cards-back": {
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
      case "retreat-failed": {
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
      case "retreat-region-chosen": {
        return snap;
      }

      case "combat-valyrian-sword-used": {
        if (!snap.gameSnapshot) return snap;
        snap.gameSnapshot.vsbUsed = true;
        return snap;
      }

      case "patchface-used": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.affectedHouse);
        house?.markHouseCardAsUsed(log.houseCard);
        this.render();
        return snap;
      }

      case "melisandre-dwd-used": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house);
        house?.markHouseCardAsAvailable(log.houseCard);
        const card = allKnownHouseCards.get(log.houseCard);
        house?.removePowerTokens(card.combatStrength);
        this.render();
        return snap;
      }

      case "doran-used": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.affectedHouse);
        if (!house) return snap;
        if (log.influenceTrack == 0) {
          _.pull(snap.gameSnapshot.ironThroneTrack, house.id);
          snap.gameSnapshot.ironThroneTrack.push(house.id);
        } else if (log.influenceTrack == 1) {
          _.pull(snap.gameSnapshot.fiefdomsTrack, house.id);
          snap.gameSnapshot.fiefdomsTrack.push(house.id);
        } else if (log.influenceTrack == 2) {
          _.pull(snap.gameSnapshot.kingsCourtTrack, house.id);
          snap.gameSnapshot.kingsCourtTrack.push(house.id);
        }
        return snap;
      }

      case "reek-used": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house);
        house?.markHouseCardAsAvailable("reek");
        this.render();
        return snap;
      }

      case "reek-returned-ramsay": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house);
        house?.markHouseCardAsAvailable(log.returnedCardId);
        this.render();
        return snap;
      }

      case "lysa-arryn-mod-used": {
        if (!snap.gameSnapshot) return snap;
        const house = snap.getHouse(log.house);
        house?.markHouseCardAsAvailable("lysa-arryn-mod");
        this.render();
        return snap;
      }

      case "aeron-damphair-used": {
        return snap;
      }
      case "bronn-used": {
        return snap;
      }
      case "qyburn-used": {
        return snap;
      }
      case "stannis-baratheon-asos-used": {
        return snap;
      }
      case "viserys-targaryen-used": {
        return snap;
      }
      case "mace-tyrell-footman-killed": {
        return snap;
      }
      case "queen-of-thorns-order-removed": {
        return snap;
      }

      case "garrison-removed": {
        return snap;
      }
      case "commander-power-token-gained": {
        return snap;
      }
      case "house-cards-returned": {
        return snap;
      }
      case "bran-stark-used": {
        return snap;
      }
      case "jon-connington-used": {
        return snap;
      }
      case "mace-tyrell-asos-order-placed": {
        return snap;
      }

      case "alayne-stone-used": {
        return snap;
      }
      case "cersei-lannister-order-removed": {
        return snap;
      }
      case "jon-snow-used": {
        return snap;
      }
      case "missandei-used": {
        return snap;
      }
      case "renly-baratheon-footman-upgraded-to-knight": {
        return snap;
      }
      case "rodrik-the-reader-used": {
        return snap;
      }
      case "ser-gerris-drinkwater-used": {
        return snap;
      }
      case "ser-ilyn-payne-footman-killed": {
        return snap;
      }
      case "anya-waynwood-power-tokens-gained": {
        return snap;
      }
      case "arianne-martell-force-retreat": {
        return snap;
      }
      case "balon-greyjoy-asos-power-tokens-gained": {
        return snap;
      }
      case "cersei-lannister-asos-power-tokens-discarded": {
        return snap;
      }
      case "daenerys-targaryen-b-power-tokens-discarded": {
        return snap;
      }
      case "doran-martell-asos-used": {
        return snap;
      }
      case "illyrio-mopatis-power-tokens-gained": {
        return snap;
      }
      case "house-card-removed-from-game": {
        return snap;
      }
      case "littlefinger-power-tokens-gained": {
        return snap;
      }
      case "lysa-arryn-ffc-power-tokens-gained": {
        return snap;
      }
      case "melisandre-of-asshai-power-tokens-gained": {
        return snap;
      }
      case "qarl-the-maid-tokens-gained": {
        return snap;
      }
      case "roose-bolton-house-cards-returned": {
        return snap;
      }
      case "salladhar-saan-asos-power-tokens-changed": {
        return snap;
      }
      case "loras-tyrell-attack-order-moved": {
        return snap;
      }
      case "tywin-lannister-power-tokens-gained": {
        return snap;
      }
      case "arianne-martell-prevent-movement": {
        return snap;
      }
      case "beric-dondarrion-used": {
        return snap;
      }
      case "robert-arryn-used": {
        return snap;
      }
      case "ser-ilyn-payne-asos-casualty-suffered": {
        return snap;
      }
      case "varys-used": {
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
      snap = this.applyLogEvent(log.data, snap);
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
