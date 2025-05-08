/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { GameLogData } from "../../common/ingame-game-state/game-data-structure/GameLog";
import EntireGameSnapshot from "./EntireGameSnapshot";
import IngameGameState from "../../common/ingame-game-state/IngameGameState";
import ReplayConstants from "./replay-constants";
import _ from "lodash";
import { removeFirst, pullFirst } from "../../utils/arrayExt";

export interface CombatResultData {
  attacker: string;
  defender: string;
  attackerArmy: string[];
  defenderArmy: string[];
  attackerRegion: string;
  defenderRegion: string;
  retreatRegion: string | null;
  winner: string;
  winnerArmy: string[];
  winnerRegion: string;
  loser: string;
  loserArmy: string[];
  loserRegion: string;
  movePrevented: boolean;
  retreatForced: boolean;
  postCombatLogs: GameLogData[];
}

export default class CombatSnapshotMigrator {
  private ingame: IngameGameState;
  private combatResultData: CombatResultData;
  private onCombatResultDataRetrieved: (data: CombatResultData) => void;

  constructor(
    ingame: IngameGameState,
    combatResultDataRetrieved: (data: CombatResultData) => void
  ) {
    this.ingame = ingame;
    this.onCombatResultDataRetrieved = combatResultDataRetrieved;
  }

  migrateCombatResultLog(
    log: GameLogData,
    logIndex: number,
    snap: EntireGameSnapshot
  ): EntireGameSnapshot {
    if (log.type != "combat-result") {
      throw new Error(`Log type must be 'combat-result'`);
    }
    this.combatResultData = this.getCombatResultData(log, logIndex);

    const crd = this.combatResultData;
    this.onCombatResultDataRetrieved(crd);

    for (let i = 0; i < crd.postCombatLogs.length; i++) {
      const l = crd.postCombatLogs[i];
      snap = this.applyCombatResultEvent(snap, l);
    }

    const attackingRegion = snap.getRegion(crd.attackerRegion);
    const defendingRegion = snap.getRegion(crd.defenderRegion);
    const retreatRegion = crd.retreatRegion
      ? snap.getRegion(crd.retreatRegion)
      : null;

    // Perform move and retreat:
    if (crd.attacker == crd.winner) {
      if (retreatRegion) {
        // Retreat defending units
        while (crd.defenderArmy.length > 0) {
          const unit = crd.defenderArmy.pop();
          if (!unit) break;
          defendingRegion.moveTo(
            retreatRegion,
            unit,
            crd.defender,
            undefined,
            true
          );
        }

        crd.loserRegion = retreatRegion.id;
      }
      // Attacker movement may be blocked
      if (!crd.movePrevented) {
        const to = snap.getRegion(crd.defenderRegion);
        for (let i = 0; i < crd.attackerArmy.length; i++) {
          const unit = crd.attackerArmy[i];
          attackingRegion.moveTo(to, unit, crd.attacker);
        }

        crd.attackerRegion = crd.defenderRegion;
      }
    } else {
      // Attacking units usually retreat to where they came from
      // Except Arianne Martell forces retreat of a victorious defender
      if (crd.retreatForced && retreatRegion) {
        for (let i = 0; i < crd.defenderArmy.length; i++) {
          const unit = crd.defenderArmy[i];
          defendingRegion.moveTo(
            retreatRegion,
            unit,
            crd.defender,
            undefined,
            true
          );
        }

        crd.defenderRegion = retreatRegion.id;
      }
      // or Robb Stark forces the attacker to retreat to a specific region
      else if (retreatRegion) {
        for (let i = 0; i < crd.attackerArmy.length; i++) {
          const unit = crd.attackerArmy[i];
          attackingRegion.moveTo(
            retreatRegion,
            unit,
            crd.attacker,
            undefined,
            true
          );
        }

        crd.attackerRegion = retreatRegion.id;
      } else {
        // just mark all units as wounded
        attackingRegion.markAllUnitsAsWounded();
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

  private getCombatResultData(
    log: GameLogData,
    logIndex: number
  ): CombatResultData {
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
    const attackerArmy = [...att.armyUnits];
    const defenderArmy = [...def.armyUnits];
    const winnerArmy = winner === attacker ? attackerArmy : defenderArmy;
    const winnerRegion = winner === attacker ? attackerRegion : defenderRegion;
    const loser = winner === attacker ? defender : attacker;
    const loserArmy = winner === attacker ? defenderArmy : attackerArmy;
    const loserRegion = winner === attacker ? defenderRegion : attackerRegion;

    // const winnerFacedSkullIcon =
    //   (winner === attacker && defenderTob === "skull") ||
    //   (winner === defender && attackerTob === "skull");

    const logsSlice = this.ingame.gameLogManager.logs.slice(logIndex + 1);
    const relatedCombatResultLogs = _.takeWhile(
      logsSlice,
      (l) => !ReplayConstants.combatTerminationLogTypes.has(l.data.type)
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
      winnerArmy,
      winnerRegion,
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
    const ccd = this.combatResultData;

    switch (log.type) {
      case "immediatly-killed-after-combat": {
        const region = snap.getRegion(ccd.loserRegion);

        for (let i = 0; i < log.killedBecauseWounded.length; i++) {
          const unit = log.killedBecauseWounded[i];
          region.removeUnit(unit, ccd.loser, true);
        }
        for (let i = 0; i < log.killedBecauseCantRetreat.length; i++) {
          const unit = log.killedBecauseCantRetreat[i];
          region.removeUnit(unit, ccd.loser);
          pullFirst(ccd.loserArmy, unit);
        }
        return snap;
      }
      case "killed-after-combat": {
        if (log.house == ccd.loser) {
          const region = snap.getRegion(ccd.loserRegion);
          for (let i = 0; i < log.killed.length; i++) {
            const unit = log.killed[i];
            region.removeUnit(unit, ccd.loser);
            pullFirst(ccd.loserArmy, unit);
          }
        } else if (log.house == ccd.winner) {
          const region = snap.getRegion(ccd.winnerRegion);
          for (let i = 0; i < log.killed.length; i++) {
            const unit = log.killed[i];
            region.removeUnit(unit, ccd.winner);
            pullFirst(ccd.winnerArmy, unit);
          }
        } else {
          throw new Error(`Unable to apply log ${JSON.stringify(log)}`);
        }

        return snap;
      }
      case "retreat-casualties-suffered": {
        if (log.house == ccd.loser) {
          const region = snap.getRegion(ccd.loserRegion);
          for (let i = 0; i < log.units.length; i++) {
            const unit = log.units[i];
            region.removeUnit(unit, ccd.defender);
            pullFirst(ccd.loserArmy, unit);
          }
          return snap;
        } else if (log.house == ccd.winner) {
          const region = snap.getRegion(ccd.winnerRegion);
          for (let i = 0; i < log.units.length; i++) {
            const unit = log.units[i];
            region.removeUnit(unit, ccd.winner);
            pullFirst(ccd.winnerArmy, unit);
          }
          return snap;
        } else {
          throw new Error(`Unable to apply log ${JSON.stringify(log)}`);
        }
      }
      default:
        throw new Error(`Unhandled combat result log type '${log.type}'`);
    }
  }
}
