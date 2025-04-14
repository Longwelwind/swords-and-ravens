/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { GameLogData } from "../GameLog";
import EntireGameSnapshot from "./EntireGameSnapshot";
import IngameGameState from "../../IngameGameState";
import ReplayConstants from "./replay-constants";
import _ from "lodash";
import { removeFirst, pullFirst } from "../../../../utils/arrayExt";

export interface CombatLogData {
  attacker: string;
  defender: string;
  attackerArmy: string[];
  defenderArmy: string[];
  attackerRegion: string;
  defenderRegion: string;
  retreatRegion: string | null;
  winner: string;
  loser: string;
  loserArmy: string[];
  loserRegion: string;
  movePrevented: boolean;
  retreatForced: boolean;
  postCombatLogs: GameLogData[];
}

export default class CombatSnapshotMigrator {
  private ingame: IngameGameState;
  private combatLogData: CombatLogData;
  private combatLogDataFetched: (data: CombatLogData) => void;

  constructor(
    ingame: IngameGameState,
    combatLogData: (data: CombatLogData) => void
  ) {
    this.ingame = ingame;
    this.combatLogDataFetched = combatLogData;
  }

  migrateCombatResultLog(
    log: GameLogData,
    logIndex: number,
    snap: EntireGameSnapshot
  ): EntireGameSnapshot {
    if (log.type != "combat-result") {
      throw new Error(`Log type must be 'combat-result'`);
    }
    this.combatLogData = this.getCombatLogData(log, logIndex);

    const cld = this.combatLogData;
    this.combatLogDataFetched(cld);
    console.log("Combat result log data", cld);

    for (let i = 0; i < cld.postCombatLogs.length; i++) {
      const l = cld.postCombatLogs[i];
      console.debug(`Executing post-combat event: ${l.type}`, l);
      snap = this.applyCombatResultEvent(snap, l);
    }

    const attackingRegion = snap.getRegion(cld.attackerRegion);
    const defendingRegion = snap.getRegion(cld.defenderRegion);

    // Perform move and retreat:
    if (cld.attacker == cld.winner) {
      if (cld.retreatRegion) {
        // Retreat defending units
        const retreatRegion = snap.getRegion(cld.retreatRegion);
        while (cld.defenderArmy.length > 0) {
          const unit = cld.defenderArmy.pop();
          if (!unit) break;
          defendingRegion.moveTo(
            retreatRegion,
            unit,
            cld.defender,
            undefined,
            true
          );
        }
      }
      // Attacker movement may be blocked
      if (!cld.movePrevented) {
        const to = snap.getRegion(cld.defenderRegion);
        for (let i = 0; i < cld.attackerArmy.length; i++) {
          const unit = cld.attackerArmy[i];
          attackingRegion.moveTo(to, unit, cld.attacker);
        }
      }
    } else {
      // attacker retreat => stay in attacking region, but wound units
      attackingRegion.markAllUnitsAsWounded();

      if (cld.retreatForced) {
        // Retreat defending units
        if (cld.retreatRegion) {
          // Retreat defending units
          const retreatRegion = snap.getRegion(cld.retreatRegion);
          for (let i = 0; i < cld.defenderArmy.length; i++) {
            const unit = cld.defenderArmy[i];
            defendingRegion.moveTo(retreatRegion, unit, cld.defender);
          }
        }
      }
    }

    attackingRegion.removeOrder();
    defendingRegion.removeOrder();

    if (!snap.gameSnapshot) return snap;

    const attStats = log.stats[0];
    const defStats = log.stats[1];

    if (attStats.house && attStats.houseCard) {
      const attacker = snap.getHouse(attStats.house);
      attacker.markHouseCardAsUsed(attStats.houseCard);
    }

    if (defStats.house && defStats.houseCard) {
      const defender = snap.getHouse(defStats.house);
      defender.markHouseCardAsUsed(defStats.houseCard);
    }

    return snap;
  }

  private getCombatLogData(log: GameLogData, logIndex: number): CombatLogData {
    if (log.type != "combat-result") {
      throw new Error(`Log type must be 'combat-result'`);
    }
    const {
      stats: [att, def],
      winner,
    } = log;
    const attacker = att.house;
    const defender = def.house;
    const attackerRegion = att.region;
    const defenderRegion = def.region;
    const attackerArmy = _.cloneDeep(att.armyUnits);
    const defenderArmy = _.cloneDeep(def.armyUnits);
    const loser = winner === attacker ? defender : attacker;
    const loserArmy = winner === attacker ? defenderArmy : attackerArmy;
    const loserRegion = winner === attacker ? defenderRegion : attackerRegion;

    const logsSlice = this.ingame.gameLogManager.logs.slice(logIndex + 1);
    const relatedCombatResultLogs = _.takeWhile(
      logsSlice,
      (l) => !ReplayConstants.combatTerminationTypes.has(l.data.type)
    ).filter((l) => ReplayConstants.relatedCombatResultTypes.has(l.data.type));

    const retreatRegionChosen = _.remove(
      relatedCombatResultLogs,
      (log) => log.data.type == "retreat-region-chosen"
    );

    const arianneMartellMovementPrevented = removeFirst(
      relatedCombatResultLogs,
      (log) => log.data.type == "arianne-martell-prevent-movement"
    );

    const arianneMartellForcedRetreat = removeFirst(
      relatedCombatResultLogs,
      (log) => log.data.type === "arianne-martell-force-retreat"
    );

    if (retreatRegionChosen.length > 1) {
      throw new Error("More than one retreat region chosen log found");
    }

    // only if a retreat region was chosen we set it, otherwise attacker retreats
    let retreatRegion: string | null = null;
    if (
      retreatRegionChosen.length == 1 &&
      retreatRegionChosen[0].data.type == "retreat-region-chosen"
    ) {
      retreatRegion = retreatRegionChosen[0].data.regionTo;
    }

    return {
      attacker,
      defender,
      attackerArmy,
      defenderArmy,
      attackerRegion,
      defenderRegion,
      winner,
      loser,
      loserArmy,
      loserRegion,
      retreatRegion,
      movePrevented: arianneMartellMovementPrevented != null,
      retreatForced: arianneMartellForcedRetreat != null,
      postCombatLogs: relatedCombatResultLogs.map((l) => l.data),
    };
  }

  private applyCombatResultEvent(
    snap: EntireGameSnapshot,
    log: GameLogData
  ): EntireGameSnapshot {
    const ccd = this.combatLogData;

    switch (log.type) {
      case "immediatly-killed-after-combat": {
        const region = snap.getRegion(ccd.loserRegion);

        for (let i = 0; i < log.killedBecauseWounded.length; i++) {
          const unit = log.killedBecauseWounded[i];
          region.removeUnit(unit, ccd.loser, true);
          const index = ccd.loserArmy.indexOf(unit);
          if (index > -1) {
            ccd.loserArmy.splice(index, 1);
          }
        }
        for (let i = 0; i < log.killedBecauseCantRetreat.length; i++) {
          const unit = log.killedBecauseCantRetreat[i];
          region.removeUnit(unit, ccd.loser);
          pullFirst(ccd.loserArmy, unit);
        }
        return snap;
      }
      case "killed-after-combat": {
        const region = snap.getRegion(ccd.loserRegion);
        for (let i = 0; i < log.killed.length; i++) {
          const unit = log.killed[i];
          region.removeUnit(unit, ccd.loser);
          pullFirst(ccd.loserArmy, unit);
        }
        return snap;
      }
      case "retreat-casualties-suffered": {
        const region = snap.getRegion(ccd.loserRegion);
        for (let i = 0; i < log.units.length; i++) {
          const unit = log.units[i];
          region.removeUnit(unit, ccd.defender);
          pullFirst(ccd.loserArmy, unit);
        }
        return snap;
      }
      default:
        throw new Error(`Unhandled combat result log type '${log.type}'`);
    }
  }
}
