import IngameGameState from "../../IngameGameState";
import GameState from "../../../GameState";
import EntireGame from "../../../EntireGame";
import Player from "../../Player";
import { ClientMessage } from "../../../../messages/ClientMessage";
import { ServerMessage } from "../../../../messages/ServerMessage";
import House from "../../game-data-structure/House";
import Game from "../../game-data-structure/Game";
import HouseCard from "../../game-data-structure/house-card/HouseCard";
import _ from "lodash";
import User from "../../../../server/User";
import { observable } from "mobx";
import DraftGameState, {
  houseCardCombatStrengthAllocations,
} from "../DraftGameState";

export default class ThematicDraftHouseCardsGameState extends GameState<DraftGameState> {
  @observable readyHouses: House[];

  get ingame(): IngameGameState {
    return this.parentGameState.parentGameState;
  }

  get game(): Game {
    return this.ingame.game;
  }

  get entireGame(): EntireGame {
    return this.ingame.entireGame;
  }

  get participatingHouses(): House[] {
    return this.game.nonVassalHouses;
  }

  constructor(draftGameState: DraftGameState) {
    super(draftGameState);
  }

  firstStart(): void {
    this.ingame.log({
      type: "draft-house-cards-began",
    });

    this.readyHouses = [];
  }

  getFilteredHouseCardsForHouse(house: House): HouseCard[] {
    if (!this.participatingHouses.includes(house)) {
      throw new Error(
        "getFilteredHouseCardsForHouse() called for a vassal house!"
      );
    }

    let availableCards = _.sortBy(
      this.game.draftPool.values.filter((hc) => hc.houseId == house.id),
      (hc) => -hc.combatStrength
    );
    house.houseCards.forEach((card) => {
      const countOfCardsWithThisCombatStrength = house.houseCards.values.filter(
        (hc) => hc.combatStrength == card.combatStrength
      ).length;
      if (
        houseCardCombatStrengthAllocations.get(card.combatStrength) ==
        countOfCardsWithThisCombatStrength
      ) {
        availableCards = availableCards.filter(
          (hc) => hc.combatStrength != card.combatStrength
        );
      }
    });

    return availableCards;
  }

  getNotReadyPlayers(): Player[] {
    return _.without(this.participatingHouses, ...this.readyHouses).map((h) =>
      this.ingame.getControllerOfHouse(h)
    );
  }

  getWaitedUsers(): User[] {
    return this.getNotReadyPlayers().map((p) => p.user);
  }

  select(houseCard: HouseCard): void {
    this.entireGame.sendMessageToServer({
      type: "select-house-card",
      houseCard: houseCard.id,
    });
  }

  onPlayerMessage(player: Player, message: ClientMessage): void {
    if (message.type == "select-house-card") {
      const house = player.house;
      if (
        !this.participatingHouses.includes(house) ||
        house.houseCards.size == 7
      ) {
        return;
      }

      const houseCard = this.parentGameState.game.getHouseCardById(
        message.houseCard
      );

      if (!this.getFilteredHouseCardsForHouse(house).includes(houseCard)) {
        return;
      }

      house.houseCards.set(houseCard.id, houseCard);
      this.entireGame.broadcastToClients({
        type: "update-house-cards",
        house: house.id,
        houseCards: house.houseCards.keys,
      });

      this.game.draftPool.delete(houseCard.id);
      this.entireGame.broadcastToClients({
        type: "update-draft-pool",
        houseCards: this.game.draftPool.keys,
      });

      if (house.houseCards.size == 7) {
        this.readyHouses.push(house);
        this.entireGame.broadcastToClients({
          type: "player-ready",
          userId: player.user.id,
        });

        this.ingame.log({
          type: "house-cards-chosen",
          house: house.id,
        });
      }

      if (this.participatingHouses.every((h) => h.houseCards.size == 7)) {
        this.parentGameState.onDraftHouseCardsGameStateEnd();
      }
    }
  }

  onServerMessage(message: ServerMessage): void {
    if (message.type == "player-ready") {
      const player = this.ingame.players.get(
        this.entireGame.users.get(message.userId)
      );
      this.readyHouses.push(player.house);
    }
  }

  serializeToClient(
    _admin: boolean,
    _player: Player | null
  ): SerializedThematicDraftHouseCardsGameState {
    return {
      type: "thematic-draft-house-cards",
      readyHouses: this.readyHouses.map((h) => h.id),
    };
  }

  static deserializeFromServer(
    draft: DraftGameState,
    data: SerializedThematicDraftHouseCardsGameState
  ): ThematicDraftHouseCardsGameState {
    const thematicDraftHouseCardsGameState =
      new ThematicDraftHouseCardsGameState(draft);
    thematicDraftHouseCardsGameState.readyHouses = data.readyHouses.map((hid) =>
      draft.ingame.game.houses.get(hid)
    );
    return thematicDraftHouseCardsGameState;
  }
}

export interface SerializedThematicDraftHouseCardsGameState {
  type: "thematic-draft-house-cards";
  readyHouses: string[];
}
