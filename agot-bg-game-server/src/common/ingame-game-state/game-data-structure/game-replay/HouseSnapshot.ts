import { observable } from "mobx";
import allKnownHouseCards from "../../../../client/utils/houseCardHelper";
import { HouseCardState } from "../house-card/HouseCard";
import IHouseSnapshot from "./IHouseSnapshot";

export default class HouseSnapshot implements IHouseSnapshot {
  id: string;
  @observable victoryPointsUI: number;
  @observable landAreaCount: number;
  @observable supply: number;
  @observable houseCards: {
    id: string;
    state: HouseCardState;
  }[];
  @observable powerTokens: number;
  @observable isVassal?: boolean;
  @observable suzerainHouseId?: string;
  victoryPoints: number;
  name: string;
  color: string;

  constructor(data: IHouseSnapshot) {
    this.id = data.id;
    this.victoryPoints = data.victoryPoints;
    this.victoryPointsUI = data.victoryPoints;
    this.landAreaCount = data.landAreaCount;
    this.supply = data.supply;
    this.houseCards = data.houseCards.map((card) => ({ ...card }));
    this.powerTokens = data.powerTokens;
    this.isVassal = data.isVassal;
    this.suzerainHouseId = data.suzerainHouseId;
  }

  getCopy(): HouseSnapshot {
    return new HouseSnapshot(this);
  }

  addPowerTokens(count: number): void {
    this.powerTokens += count;
  }

  removePowerTokens(count: number): void {
    this.powerTokens -= count;
  }

  getHouseCardByCombatStrength(
    combatStrength: number
  ): { id: string; state: HouseCardState } | null {
    return (
      this.houseCards.find(
        (card) =>
          allKnownHouseCards.get(card.id)?.combatStrength === combatStrength
      ) ?? null
    );
  }

  markHouseCardAsUsed(cardId: string): void {
    const card = this.houseCards.find((card) => card.id === cardId);
    if (card) {
      card.state = HouseCardState.USED;
    }
  }

  markHouseCardAsAvailable(cardId: string): void {
    const card = this.houseCards.find((card) => card.id === cardId);
    if (card) {
      card.state = HouseCardState.AVAILABLE;
    }
  }
}
