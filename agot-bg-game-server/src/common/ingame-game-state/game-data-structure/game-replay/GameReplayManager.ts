/* eslint-disable @typescript-eslint/no-non-null-assertion */
import _ from "lodash";
import GameLog, { GameLogData } from "../GameLog";
import EntireGameSnapshot from "./EntireGameSnapshot";
import GameLogManager from "../GameLogManager";
import EntireGame from "../../../../common/EntireGame";
import { computed, observable } from "mobx";
import RegionSnapshot from "./RegionSnapshot";
import ReplayConstants, { modifyingGameLogIds } from "./replay-constants";
import BetterMap from "../../../../utils/BetterMap";
import IngameGameState from "../../IngameGameState";
import GameSnapshot from "./GameSnapshot";
import SnapshotMigrator from "./SnapshotMigrator";

export default class GameReplayManager {
  @observable selectedLogIndex = -1;
  @observable selectedSnapshot: EntireGameSnapshot | null = null;
  @observable regionsToHighlight: BetterMap<string, string> = new BetterMap();
  @observable marchMarkers: BetterMap<string, string> = new BetterMap();

  private seenSnapshots: BetterMap<number, EntireGameSnapshot> =
    new BetterMap();
  private entireGame: EntireGame;
  private migrator: SnapshotMigrator;

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
    this.reset();
    const logs = this.logManager.logs.slice(0, index + 1).reverse();
    const reversedIndex = logs.findIndex(
      (log) => log.data.type === "orders-revealed"
    );
    const nearestLogSnapshot = this.findNearestLogSnapshot(
      index,
      logs,
      reversedIndex
    );

    if (!nearestLogSnapshot) {
      this.reset();
      return;
    }

    let snap = nearestLogSnapshot.snap;
    const originalIndex = nearestLogSnapshot.originalIndex;

    const thresholdForSavingSeenSnaps = 10;
    let snapCount = 0;

    this.migrator = new SnapshotMigrator(this.ingame);

    for (let i = originalIndex + 1; i <= index; i++) {
      const log = _.cloneDeep(this.logManager.logs[i]);
      if (ReplayConstants.combatTerminationTypes.has(log.data.type)) {
        this.migrator.resetCombatLogData();
      }

      if (!this.isModifyingGameLog(log.data)) continue;
      snap = this.migrator.applyLogEvent(snap, log.data, i);
      snapCount++;
    }

    if (
      snapCount > thresholdForSavingSeenSnaps &&
      this.isModifyingGameLog(this.logManager.logs[index].data)
    ) {
      this.seenSnapshots.set(index, _.cloneDeep(snap));
      const keysToKeep = this.seenSnapshots.keys;
      filterArrayByThreshold(keysToKeep, thresholdForSavingSeenSnaps);
      this.seenSnapshots.keys.forEach((key) => {
        if (!keysToKeep.includes(key)) {
          this.seenSnapshots.delete(key);
        }
      });
      console.debug("seenSnapshots", this.seenSnapshots.keys);
    }

    this.selectedLogIndex = index;
    this.selectedSnapshot = snap;

    this.handleHighligting(this.logManager.logs[index].data);

    function filterArrayByThreshold(arr: number[], threshold: number): void {
      if (arr.length < 2) return;
      arr.sort((a, b) => a - b); // Sort the array first
      let i = 0;
      while (i < arr.length - 1) {
        if (Math.abs(arr[i + 1] - arr[i]) <= threshold) {
          arr.splice(i + 1, 1); // Remove the element that breaks the condition
        } else {
          i++; // Move to the next element
        }
      }
    }
  }

  isModifyingGameLogUI(log: GameLogData): boolean {
    if (log.type == "orders-revealed") {
      return !log.onlySnapshot;
    }
    return modifyingGameLogIds.has(log.type);
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
    this.regionsToHighlight.clear();
    this.marchMarkers.clear();
  }

  private findNearestLogSnapshot(
    index: number,
    logs: GameLog[],
    reversedIndex: number
  ): { snap: EntireGameSnapshot; originalIndex: number } | null {
    const nearestSnap = reversedIndex >= 0 ? logs[reversedIndex].data : null;
    const originalIndex = index - reversedIndex - 1;

    // We want to search seenSnapshots keys if one index is nearer to index than original index
    const nearestSeenSnapshotIndex = this.seenSnapshots.keys
      .filter((key) => key <= index)
      .reduce(
        (prev, curr) =>
          Math.abs(curr - index) < Math.abs(prev - index) ? curr : prev,
        -1
      );

    if (
      nearestSeenSnapshotIndex != -1 &&
      nearestSeenSnapshotIndex > originalIndex
    ) {
      return {
        snap: _.cloneDeep(this.seenSnapshots.get(nearestSeenSnapshotIndex)),
        originalIndex: nearestSeenSnapshotIndex,
      };
    }

    if (!nearestSnap) {
      const firstSnapIndex = this.logManager.logs.findIndex(
        (l) => l.data.type == "orders-revealed"
      );
      if (firstSnapIndex > -1) {
        return createSnapshotFromLog(this.logManager.logs[firstSnapIndex].data);
      }
      return null;
    }

    return createSnapshotFromLog(nearestSnap);

    function createSnapshotFromLog(
      log: GameLogData
    ): { snap: EntireGameSnapshot; originalIndex: number } | null {
      if (log.type != "orders-revealed") return null;
      return {
        snap: new EntireGameSnapshot(
          _.cloneDeep({
            worldSnapshot: (log.type == "orders-revealed"
              ? log.worldState
              : null) as RegionSnapshot[],
            gameSnapshot: (log.type == "orders-revealed"
              ? log.gameSnapshot
              : null) as GameSnapshot,
          })
        ),
        originalIndex: originalIndex,
      };
    }
  }

  private isModifyingGameLog(log: GameLogData): boolean {
    return modifyingGameLogIds.has(log.type);
  }

  private handleHighligting(log: GameLogData): void {
    if (log.type == "attack") {
      this.regionsToHighlight.set(log.attackingRegion, "red");
      this.regionsToHighlight.set(log.attackedRegion, "yellow");
    } else if (log.type == "combat-result") {
      this.regionsToHighlight.set(log.stats[0].region, "red");
      this.regionsToHighlight.set(log.stats[1].region, "yellow");
    } else if (log.type == "player-mustered") {
      const regions = _.uniq(
        log.musterings.map(([_, m]) => m.map((r) => r.region)).flat()
      );
      regions.forEach((region) => {
        this.regionsToHighlight.set(region, "green");
      });
    } else if (log.type == "march-resolved") {
      const toRegions = log.moves.map(([r, _]) => r);
      toRegions.forEach((region) => {
        this.marchMarkers.set(log.startingRegion, region);
      });
    }
  }
}
