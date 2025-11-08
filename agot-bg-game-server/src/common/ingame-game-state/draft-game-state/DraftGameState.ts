import IngameGameState from "../IngameGameState";
import GameState from "../../GameState";
import Player from "../Player";
import DraftHouseCardsGameState, {
  SerializedDraftHouseCardsGameState,
} from "./draft-house-cards-game-state/DraftHouseCardsGameState";
import ThematicDraftHouseCardsGameState, {
  SerializedThematicDraftHouseCardsGameState,
} from "./thematic-draft-house-cards-game-state/ThematicDraftHouseCardsGameState";
import AgreeOnGameStartGameState, {
  SerializedAgreeOnGameStartGameState,
} from "./agree-on-game-start-game-state/AgreeOnGameStartGameState";
import DraftMapGameState, {
  SerializedDraftMapGameState,
} from "./draft-map-game-state/DraftMapGameState";
import { ServerMessage } from "../../../messages/ServerMessage";
import { ClientMessage } from "../../../messages/ClientMessage";
import Game from "../game-data-structure/Game";
import World from "../game-data-structure/World";
import EntireGame from "../../../common/EntireGame";
import House from "../game-data-structure/House";
import BetterMap from "../../../utils/BetterMap";
import popRandom from "../../../utils/popRandom";
import HouseCard from "../game-data-structure/house-card/HouseCard";
import shuffleInPlace from "../../../utils/shuffleInPlace";
import _ from "lodash";

export const draftOrders: number[][][] = [
  [[0]],
  [
    [0, 1],
    [1, 0],
  ],
  [
    [0, 1, 2],
    [1, 2, 0],
    [2, 0, 1],
  ],
  [
    [0, 1, 2, 3],
    [2, 3, 1, 0],
    [1, 0, 3, 2],
    [3, 2, 0, 1],
  ],
  [
    [0, 1, 2, 3, 4],
    [2, 4, 3, 1, 0],
    [1, 0, 4, 2, 3],
    [4, 3, 1, 0, 2],
    [3, 2, 0, 4, 1],
  ],
  [
    [0, 1, 2, 3, 4, 5],
    [3, 5, 4, 2, 1, 0],
    [2, 0, 1, 4, 5, 3],
    [4, 3, 5, 1, 0, 2],
    [1, 2, 0, 5, 3, 4],
    [5, 4, 3, 0, 2, 1],
  ],
  [
    [0, 1, 2, 3, 4, 5, 6],
    [3, 6, 5, 4, 1, 2, 0],
    [2, 0, 6, 1, 5, 3, 4],
    [1, 4, 3, 0, 2, 6, 5],
    [6, 5, 4, 2, 0, 1, 3],
    [4, 3, 1, 5, 6, 0, 2],
    [5, 2, 0, 6, 3, 4, 1],
  ],
  [
    [0, 1, 2, 3, 4, 5, 6, 7],
    [4, 7, 6, 5, 3, 2, 1, 0],
    [3, 0, 1, 2, 5, 6, 7, 4],
    [2, 4, 5, 7, 6, 1, 0, 3],
    [6, 3, 7, 0, 1, 4, 5, 2],
    [5, 2, 4, 1, 7, 0, 3, 6],
    [1, 6, 3, 4, 0, 7, 2, 5],
    [7, 5, 0, 6, 2, 3, 4, 1],
  ],
];

export const houseCardCombatStrengthAllocations = new BetterMap<number, number>(
  [
    [0, 1],
    [1, 2],
    [2, 2],
    [3, 1],
    [4, 1],
  ]
);

const influenceTrackIndices: number[][][] = [
  [[0], [0], [0]],
  [
    [0, 1],
    [1, 0],
    [0, 1],
  ],
  [
    [0, 1, 2],
    [2, 0, 1],
    [1, 2, 0],
  ],
  [
    [0, 1, 2, 3],
    [3, 2, 0, 1],
    [1, 2, 0, 3],
  ],
  [
    [0, 1, 2, 3, 4],
    [4, 3, 2, 0, 1],
    [1, 2, 3, 0, 4],
  ],
  [
    [0, 1, 2, 3, 4, 5],
    [4, 5, 3, 2, 0, 1],
    [1, 2, 3, 0, 5, 4],
  ],
  [
    [0, 1, 2, 3, 4, 5, 6],
    [4, 5, 3, 6, 2, 0, 1],
    [1, 2, 3, 5, 6, 0, 4],
  ],
  // No need to define 8p indices, as Targaryen is always last on all tracks
  // and the 7p indices are used for 8p games
];
export default class DraftGameState extends GameState<
  IngameGameState,
  | DraftHouseCardsGameState
  | ThematicDraftHouseCardsGameState
  | DraftMapGameState
  | AgreeOnGameStartGameState
> {
  get ingame(): IngameGameState {
    return this.parentGameState;
  }

  get game(): Game {
    return this.ingame.game;
  }

  get participatingHouses(): House[] {
    return this.game.nonVassalHouses;
  }

  get world(): World {
    return this.game.world;
  }

  get entireGame(): EntireGame {
    return this.ingame.entireGame;
  }

  constructor(ingameGameState: IngameGameState) {
    super(ingameGameState);
  }

  firstStart(): void {
    // In case of blind or random draft we want to assign the random house cards before drafting the map
    // to transmit the house cards with the game state change to IngameGameState
    if (this.isBlindOrRandom()) {
      this.assignRandomHouseCardsAndTracks();
    } else {
      this.proceedDraft();
    }
  }

  private isBlindOrRandom(): boolean {
    return (
      this.entireGame.gameSettings.blindDraft ||
      this.entireGame.gameSettings.randomDraft
    );
  }

  private proceedDraft(): void {
    if (
      // Only remove houses from influence tracks when drafting house cards and influence tracks
      this.entireGame.gameSettings.draftHouseCards &&
      // but not in blind or random draft where the initial order is necessary to randomly switch positions
      !this.isBlindOrRandom() &&
      // and not in thematic draft mode, where only house cards are drafted and influence tracks remain unchanged
      !this.entireGame.gameSettings.thematicDraft
    ) {
      // Remove player houses but not Targaryen from the influence tracks
      // allowing to draft the tracks as well
      const playerHouses = this.ingame.players.values.map((p) => p.house.id);
      this.game.ironThroneTrack = this.game.ironThroneTrack.filter(
        (h) => !playerHouses.includes(h.id) || h.id == "targaryen"
      );
      this.game.fiefdomsTrack = this.game.fiefdomsTrack.filter(
        (h) => !playerHouses.includes(h.id) || h.id == "targaryen"
      );
      this.game.kingsCourtTrack = this.game.kingsCourtTrack.filter(
        (h) => !playerHouses.includes(h.id) || h.id == "targaryen"
      );
    }
    if (this.entireGame.gameSettings.draftMap) {
      this.beginDraftMap();
    } else {
      this.beginDraftHouseCards();
    }
  }

  private beginDraftMap(): void {
    this.setChildGameState(new DraftMapGameState(this)).firstStart();
  }

  private beginDraftHouseCards(): void {
    if (this.isBlindOrRandom()) {
      this.onDraftHouseCardsGameStateEnd();
      return;
    }

    if (this.entireGame.gameSettings.thematicDraft) {
      this.setChildGameState(
        new ThematicDraftHouseCardsGameState(this)
      ).firstStart();
    } else if (this.entireGame.gameSettings.draftHouseCards) {
      this.setChildGameState(new DraftHouseCardsGameState(this)).firstStart();
    }
  }

  private get requiredHouseCardsCount(): number {
    return this.ingame.players.size * 7;
  }

  private canRemoveCardFromDraftPool(): boolean {
    return this.game.draftPool.size - 1 >= this.requiredHouseCardsCount;
  }

  private removeCardFromDraftPool(id: string): void {
    if (this.game.draftPool.has(id) && this.canRemoveCardFromDraftPool()) {
      this.game.draftPool.delete(id);
    }
  }

  private assignRandomHouseCardsAndTracks(): void {
    this.removeCardFromDraftPool("khal-drogo");
    this.removeCardFromDraftPool("doran-martell-dwd");

    if (this.entireGame.gameSettings.perpetuumRandom) {
      this.removeCardFromDraftPool("roose-bolton");
    }

    if (!this.entireGame.gameSettings.dragonWar) {
      this.removeCardFromDraftPool("daenerys-targaryen-a");
    }

    houseCardCombatStrengthAllocations.entries.forEach(
      ([hcStrength, count]) => {
        for (let i = 0; i < count; i++) {
          this.ingame.players.values.forEach((p) => {
            const house = p.house;
            const availableCards = this.game.draftPool.values.filter(
              (hc) => hc.combatStrength == hcStrength
            );
            const houseCard = popRandom(availableCards) as HouseCard;
            house.houseCards.set(houseCard.id, houseCard);
            this.game.draftPool.delete(houseCard.id);
          });
        }
      }
    );

    // Use the current Iron Throne track as the baseline order to shuffle
    // Filter out Targaryen if present since they're handled separately
    const baseIronThroneOrder = this.game.ironThroneTrack.filter(
      (h) => h != this.game.targaryen
    );

    const influenceIndices =
      influenceTrackIndices[baseIronThroneOrder.length - 1];

    // Shuffle the houses array to randomize which house goes into which position
    const shuffledHouses = baseIronThroneOrder.slice();
    shuffleInPlace(shuffledHouses);

    // Ensure at least half of the houses changed positions (rounded up)
    // This prevents barely-shuffled arrangements while allowing valid shuffles
    const minChangedPositions = Math.ceil(shuffledHouses.length / 2);
    let unchangedCount = 0;
    for (let i = 0; i < shuffledHouses.length; i++) {
      if (shuffledHouses[i] === baseIronThroneOrder[i]) {
        unchangedCount++;
      }
    }

    // Re-shuffle if too many positions remained unchanged
    while (
      shuffledHouses.length > 1 &&
      unchangedCount > shuffledHouses.length - minChangedPositions
    ) {
      shuffleInPlace(shuffledHouses);
      unchangedCount = 0;
      for (let i = 0; i < shuffledHouses.length; i++) {
        if (shuffledHouses[i] === baseIronThroneOrder[i]) {
          unchangedCount++;
        }
      }
    }

    // Apply the track index patterns to the shuffled houses array
    // This maintains the balance between tracks (e.g., Valyrian holder stays last on Kings Court)
    const influenceTracks = influenceIndices.map((trackIndices) => {
      return trackIndices.map((index) => shuffledHouses[index]);
    });

    this.moveVassalsToBottom(influenceTracks);

    influenceTracks.forEach((track, index) => {
      this.ingame.setInfluenceTrack(index, track);
    });

    this.proceedDraft();
  }

  private moveVassalsToBottom(tracks: House[][]): void {
    const playerHouses = this.ingame.players.values.map((p) => p.house);

    tracks.forEach((track) => {
      const areVassalsInTopThreeSpaces = _.take(track, 3).some(
        (h) => !playerHouses.includes(h)
      );

      if (areVassalsInTopThreeSpaces) {
        const vassals = track.filter((h) => !playerHouses.includes(h));
        _.remove(track, (h) => vassals.includes(h));
        track.push(...vassals);
      }
    });
  }

  onDraftHouseCardsGameStateEnd(): void {
    this.ingame.onDraftGameStateEnd();
  }

  onDraftMapGameStateEnd(): void {
    this.game.draftMapRegionsPerHouse.clear();
    if (this.entireGame.gameSettings.draftHouseCards) {
      this.beginDraftHouseCards();
    } else {
      this.ingame.onDraftGameStateEnd();
    }
  }

  onPlayerMessage(player: Player, message: ClientMessage): void {
    this.childGameState.onPlayerMessage(player, message);
  }

  onServerMessage(message: ServerMessage): void {
    this.childGameState.onServerMessage(message);
  }

  serializeToClient(
    admin: boolean,
    player: Player | null
  ): SerializedDraftGameState {
    return {
      type: "draft",
      childGameState: this.childGameState.serializeToClient(admin, player),
    };
  }

  deserializeChildGameState(
    data: SerializedDraftGameState["childGameState"]
  ): DraftGameState["childGameState"] {
    switch (data.type) {
      case "draft-house-cards":
        return DraftHouseCardsGameState.deserializeFromServer(this, data);
      case "thematic-draft-house-cards":
        return ThematicDraftHouseCardsGameState.deserializeFromServer(
          this,
          data
        );
      case "draft-map":
        return DraftMapGameState.deserializeFromServer(this, data);
      case "agree-on-game-start":
        return AgreeOnGameStartGameState.deserializeFromServer(this, data);
      default:
        throw new Error();
    }
  }

  static deserializeFromServer(
    ingame: IngameGameState,
    data: SerializedDraftGameState
  ): DraftGameState {
    const draft = new DraftGameState(ingame);
    draft.childGameState = draft.deserializeChildGameState(data.childGameState);
    return draft;
  }
}

export interface SerializedDraftGameState {
  type: "draft";
  childGameState:
    | SerializedDraftHouseCardsGameState
    | SerializedThematicDraftHouseCardsGameState
    | SerializedDraftMapGameState
    | SerializedAgreeOnGameStartGameState;
}
