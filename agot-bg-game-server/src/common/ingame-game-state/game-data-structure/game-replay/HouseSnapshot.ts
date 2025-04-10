import { HouseCardState } from "../house-card/HouseCard";
import IHouseSnapshot from "./IHouseSnapshot";

export default class HouseSnapshot implements IHouseSnapshot {
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

  constructor(data: IHouseSnapshot) {
    this.id = data.id;
    this.victoryPoints = data.victoryPoints;
    this.landAreaCount = data.landAreaCount;
    this.supply = data.supply;
    this.houseCards = data.houseCards;
    this.powerTokens = data.powerTokens;
    this.isVassal = data.isVassal;
    this.suzerainHouseId = data.suzerainHouseId;
  }
}
