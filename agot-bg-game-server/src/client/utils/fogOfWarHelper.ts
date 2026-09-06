import _ from "lodash";
import EntireGame from "../../common/EntireGame";
import Game from "../../common/ingame-game-state/game-data-structure/Game";
import House from "../../common/ingame-game-state/game-data-structure/House";
import IngameGameState from "../../common/ingame-game-state/IngameGameState";
import GameClient from "../GameClient";
import Region from "../../common/ingame-game-state/game-data-structure/Region";

export default class FogOfWarHelper {
  gameClient: GameClient;

  get entireGame(): EntireGame {
    if (!this.gameClient.entireGame) {
      throw new Error("Entire game must be available");
    }
    return this.gameClient.entireGame;
  }

  get ingame(): IngameGameState {
    if (!this.entireGame.ingameGameState) {
      throw new Error("Ingame game state must be available");
    }
    return this.entireGame.ingameGameState;
  }

  get game(): Game {
    return this.ingame.game;
  }

  get isFogOfWar(): boolean {
    return this.ingame.fogOfWar ?? false;
  }

  get visibleRegions(): Region[] {
    return this.gameClient.visibleRegions ? this.gameClient.visibleRegions : [];
  }

  constructor(gameClient: GameClient) {
    this.gameClient = gameClient;
  }

  getPotentialWinners(): House[] {
    if (!this.isFogOfWar) {
      return this.game.getPotentialWinners();
    }

    const lastRound = this.game.turn == this.game.maxTurns;
    const victoryConditions: ((h: House) => number)[] = !this.entireGame
      .isFeastForCrows
      ? [
          (h: House) => (this.ingame.isVassalHouse(h) ? 1 : -1),
          (h: House) => -this.getVictoryPoints(h),
          (h: House) => -this.getTotalControlledLandRegions(h),
          (h: House) => -h.supplyLevel,
          (h: House) => this.game.ironThroneTrack.indexOf(h)
        ]
      : !lastRound
        ? [
            (h: House) => (this.ingame.isVassalHouse(h) ? 1 : -1),
            (h: House) => -this.getVictoryPoints(h),
            (h: House) => -this.getTotalControlledLandRegions(h),
            (h: House) => this.game.ironThroneTrack.indexOf(h)
          ]
        : [
            (h: House) => (this.ingame.isVassalHouse(h) ? 1 : -1),
            (h: House) => -this.getVictoryPoints(h),
            (h: House) => this.game.ironThroneTrack.indexOf(h)
          ];

    return _.sortBy(this.game.houses.values, victoryConditions);
  }

  private getVictoryPoints(house: House): number {
    const victoryPoints = !this.ingame.entireGame.isFeastForCrows
      ? house == this.game.targaryen
        ? this.getTotalLoyaltyTokenCount(house)
        : this.getControlledStrongholdAndCastleCount(house)
      : house.victoryPoints;
    return house == this.game.targaryen
      ? Math.min(victoryPoints, this.game.loyaltyTokenCountNeededToWin)
      : Math.min(victoryPoints, this.game.victoryPointsCountNeededToWin);
  }

  private getTotalLoyaltyTokenCount(house: House): number {
    const superLoyaltyTokens = this.visibleRegions.filter(
      (r) => r.superLoyaltyToken && r.getController() == house
    ).length;
    return superLoyaltyTokens + house.victoryPoints;
  }

  private getControlledStrongholdAndCastleCount(house: House): number {
    return this.visibleRegions.filter(
      (r) => r.castleLevel > 0 && r.getController() == house
    ).length;
  }

  private getTotalControlledLandRegions(h: House): number {
    return this.visibleRegions
      .filter((r) => r.type.id == "land")
      .filter((r) => r.getController() == h).length;
  }
}
