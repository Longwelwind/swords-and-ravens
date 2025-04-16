import { HouseCardState } from "../../common/ingame-game-state/game-data-structure/house-card/HouseCard";

export default interface IHouseSnapshot {
  id: string;
  victoryPoints: number;
  landAreaCount: number;
  supply: number;
  houseCards: {
    id: string;
    state: HouseCardState;
  }[];
  powerTokens: number;
  isVassal?: boolean;
  suzerainHouseId?: string;
}
