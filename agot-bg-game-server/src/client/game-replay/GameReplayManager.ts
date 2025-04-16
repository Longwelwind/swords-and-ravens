/* eslint-disable @typescript-eslint/no-non-null-assertion */
import _ from "lodash";
import GameLog, {
  GameLogData,
} from "../../common/ingame-game-state/game-data-structure/GameLog";
import EntireGameSnapshot from "./EntireGameSnapshot";
import GameLogManager from "../../common/ingame-game-state/game-data-structure/GameLogManager";
import EntireGame from "../../common/EntireGame";
import { computed, observable } from "mobx";
import ReplayConstants, { modifyingGameLogIds } from "./replay-constants";
import BetterMap from "../../utils/BetterMap";
import IngameGameState from "../../common/ingame-game-state/IngameGameState";
import SnapshotMigrator from "./SnapshotMigrator";
import StaticRegion from "../../common/ingame-game-state/game-data-structure/static-data-structure/StaticRegion";
import Game from "../../common/ingame-game-state/game-data-structure/Game";
import SnapshotHighlighter from "./SnapshotHighlighter";

function filterArrayByThreshold(arr: number[], threshold: number): void {
  if (arr.length < 2) return;
  arr.sort((a, b) => a - b);
  let i = 0;
  while (i < arr.length - 1) {
    if (Math.abs(arr[i + 1] - arr[i]) <= threshold) {
      arr.splice(i + 1, 1);
    } else {
      i++;
    }
  }
}

export default class GameReplayManager {
  @observable selectedLogIndex = -1;
  @observable selectedSnapshot: EntireGameSnapshot | null = null;
  @observable highlightHouseAreas: boolean;

  castleRegions: BetterMap<string, StaticRegion> = new BetterMap();
  landRegions: BetterMap<string, StaticRegion> = new BetterMap();

  highlighter = new SnapshotHighlighter(this);

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

  constructor(game: Game) {
    this.entireGame = game.ingame.entireGame;
    this.landRegions = new BetterMap<string, StaticRegion>();
    this.castleRegions = new BetterMap<string, StaticRegion>();
    for (const region of game.world.regions.values) {
      const staticRegion = region.staticRegion;
      if (staticRegion.type.id == "land") {
        this.landRegions.set(staticRegion.id, staticRegion);
        if (staticRegion.castleLevel > 0) {
          this.castleRegions.set(staticRegion.id, staticRegion);
        }
      }
    }
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

    let snap = nearestLogSnapshot.snap.getCopy();
    const originalIndex = nearestLogSnapshot.originalIndex;

    const thresholdForSavingSeenSnaps = 10;
    let snapCount = 0;

    this.migrator = new SnapshotMigrator(this.ingame);

    for (let i = originalIndex + 1; i <= index; i++) {
      const log = this.logManager.logs[i].data;
      if (ReplayConstants.combatTerminationTypes.has(log.type)) {
        this.migrator.resetCombatLogData();
      }

      if (!this.isModifyingGameLog(log)) continue;
      const clone = _.cloneDeep(this.logManager.logs[i]).data;
      snap = this.migrator.applyLogEvent(snap, clone, i);
      snap = this.migrator.handleVassalReplacement(snap, clone);
      snapCount++;
    }

    snap.calculateControllersPerRegion();

    const selectedLog = this.logManager.logs[index].data;

    this.saveCurrentSnapshot(
      snapCount,
      thresholdForSavingSeenSnaps,
      selectedLog,
      index,
      snap
    );

    if (snap.gameSnapshot && selectedLog.type != "orders-revealed") {
      snap.gameSnapshot.housesOnVictoryTrack = snap.getVictoryTrack();
    }

    this.selectedLogIndex = index;
    this.selectedSnapshot = snap;

    this.highlighter.hightlightRelevantAreas();
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
    this.highlighter.clear();
  }

  toggleControlledAreasHighlighting(): void {
    this.highlightHouseAreas = !this.highlightHouseAreas;
    this.highlighter.hightlightRelevantAreas();
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
        snap: this.seenSnapshots.get(nearestSeenSnapshotIndex),
        originalIndex: nearestSeenSnapshotIndex,
      };
    }

    if (!nearestSnap) {
      const firstSnapIndex = this.logManager.logs.findIndex(
        (l) => l.data.type == "orders-revealed"
      );
      if (firstSnapIndex > -1) {
        return createSnapshotFromLog(
          this.logManager.logs[firstSnapIndex].data,
          this.ingame
        );
      }
      return null;
    }

    return createSnapshotFromLog(nearestSnap, this.ingame);

    function createSnapshotFromLog(
      log: GameLogData,
      ingame: IngameGameState
    ): { snap: EntireGameSnapshot; originalIndex: number } | null {
      if (log.type != "orders-revealed") return null;
      const l: any = log;
      return {
        snap: new EntireGameSnapshot(
          {
            worldSnapshot: l.worldState,
            gameSnapshot: l.gameSnapshot,
          },
          ingame
        ),
        originalIndex: originalIndex,
      };
    }
  }

  private saveCurrentSnapshot(
    snapCount: number,
    thresholdForSavingSeenSnaps: number,
    selectedLog: GameLogData,
    index: number,
    snap: EntireGameSnapshot
  ): void {
    if (
      snapCount > thresholdForSavingSeenSnaps &&
      this.isModifyingGameLog(selectedLog)
    ) {
      this.seenSnapshots.set(index, snap);
      const keysToKeep = this.seenSnapshots.keys;
      filterArrayByThreshold(keysToKeep, thresholdForSavingSeenSnaps);
      this.seenSnapshots.keys.forEach((key) => {
        if (!keysToKeep.includes(key)) {
          this.seenSnapshots.delete(key);
        }
      });
    }
  }

  private isModifyingGameLog(log: GameLogData): boolean {
    return modifyingGameLogIds.has(log.type);
  }
}
