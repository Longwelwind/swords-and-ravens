import GameState from "../../../GameState";
import ClaimVassalGameState, {
  SerializedClaimVassalGameState,
} from "./claim-vassal-game-state/ClaimVassalGameState";
import House from "../../game-data-structure/House";
import { ServerMessage } from "../../../../messages/ServerMessage";
import { ClientMessage } from "../../../../messages/ClientMessage";
import Game from "../../game-data-structure/Game";
import Player from "../../Player";
import IngameGameState from "../../IngameGameState";
import _ from "lodash";
import BetterMap from "../../../../utils/BetterMap";
import popRandom from "../../../../utils/popRandom";

interface ParentGameState extends GameState<any, any> {
  game: Game;
  onClaimVassalsFinished: () => void;
}

export default class ClaimVassalsGameState extends GameState<
  ParentGameState,
  ClaimVassalGameState
> {
  passedVassalsCount = 0;

  get ingame(): IngameGameState {
    return this.game.ingame;
  }

  get game(): Game {
    return this.parentGameState.game;
  }

  firstStart(): void {
    if (this.ingame.getVassalHouses().length > 0) {
      this.ingame.log({
        type: "claim-vassals-began",
      });
    }

    if (this.ingame.entireGame.gameSettings.randomVassalAssignment) {
      this.proceedRandomVassalAssignment();
    } else {
      this.proceedNextVassal(null);
    }
  }

  proceedRandomVassalAssignment(): void {
    const vassalsToClaim = this.ingame.getNonClaimedVassalHouses();
    let vassalRelationsChanged = false;

    while (vassalsToClaim.length > 0) {
      const housesAndTheirVassals = new BetterMap(
        this.ingame
          .getTurnOrderWithoutVassals()
          .map(
            (h) =>
              [
                h,
                this.ingame.getControlledHouses(
                  this.ingame.getControllerOfHouse(h)
                ),
              ] as [House, House[]]
          )
      );

      const lowestVassalCount = Math.min(
        ...housesAndTheirVassals.values.map((vassals) => vassals.length)
      );

      const randomHouseWithLowestCount = popRandom(
        housesAndTheirVassals.entries
          .filter(([_h, vassals]) => vassals.length == lowestVassalCount)
          .map(([h, _vassals]) => h)
      ) as House;

      const nextVassalToClaim = popRandom(vassalsToClaim) as House;

      this.game.vassalRelations.set(
        nextVassalToClaim,
        randomHouseWithLowestCount
      );
      vassalRelationsChanged = true;

      this.ingame.log(
        {
          type: "vassals-claimed",
          house: randomHouseWithLowestCount.id,
          vassals: [nextVassalToClaim.id],
        },
        true
      );
    }

    if (vassalRelationsChanged) {
      this.ingame.broadcastVassalRelations();
    }

    this.parentGameState.onClaimVassalsFinished();
  }

  proceedNextVassal(lastToClaim: House | null): void {
    const vassalsToClaim = this.ingame.getNonClaimedVassalHouses();

    if (vassalsToClaim.length == 0) {
      this.parentGameState.onClaimVassalsFinished();
      return;
    }

    const nextHouseToClaim =
      this.ingame.getNextNonVassalInTurnOrder(lastToClaim);

    // If it is the last house to claim vassals,
    // attribute all of them to him
    if (nextHouseToClaim == _.last(this.ingame.getTurnOrderWithoutVassals())) {
      this.assignVassals(nextHouseToClaim, vassalsToClaim, true);

      this.parentGameState.onClaimVassalsFinished();
      return;
    }

    // Depending on the number of vassals, a house might be able to take multiple
    // vassals.
    const countVassals = this.ingame.getVassalHouses().length;
    const countNonVassals = this.game.houses.size - countVassals;
    // Get the position in the Iron Throne track, but without considering the vassals
    const positionInTrack = this.game.ironThroneTrack
      .filter((h) => !this.ingame.isVassalHouse(h))
      .indexOf(nextHouseToClaim);
    const count =
      this.passedVassalsCount +
      (Math.floor(countVassals / countNonVassals) +
        (positionInTrack < countVassals % countNonVassals ? 1 : 0));

    this.setChildGameState(new ClaimVassalGameState(this)).firstStart(
      nextHouseToClaim,
      count
    );
  }

  onClaimVassalFinish(house: House): void {
    this.proceedNextVassal(house);
  }

  assignVassals(
    house: House,
    vassals: House[],
    resolvedAutomatically = false
  ): void {
    vassals.forEach((v) => this.game.vassalRelations.set(v, house));

    this.ingame.broadcastVassalRelations();

    this.ingame.log(
      {
        type: "vassals-claimed",
        house: house.id,
        vassals: vassals.map((v) => v.id),
      },
      resolvedAutomatically
    );
  }

  onServerMessage(_message: ServerMessage): void {}

  onPlayerMessage(player: Player, message: ClientMessage): void {
    this.childGameState.onPlayerMessage(player, message);
  }

  serializeToClient(
    admin: boolean,
    player: Player | null
  ): SerializedClaimVassalsGameState {
    return {
      type: "claim-vassals",
      childGameState: this.childGameState.serializeToClient(admin, player),
      passedVassalsCount: this.passedVassalsCount,
    };
  }

  static deserializeFromServer(
    parent: ParentGameState,
    data: SerializedClaimVassalsGameState
  ): ClaimVassalsGameState {
    const claimVassals = new ClaimVassalsGameState(parent);

    claimVassals.childGameState = claimVassals.deserializeChildGameState(
      data.childGameState
    );
    claimVassals.passedVassalsCount = data.passedVassalsCount;

    return claimVassals;
  }

  deserializeChildGameState(
    data: SerializedClaimVassalsGameState["childGameState"]
  ): ClaimVassalsGameState["childGameState"] {
    switch (data.type) {
      case "claim-vassal":
        return ClaimVassalGameState.deserializeFromServer(this, data);
    }
  }
}

export interface SerializedClaimVassalsGameState {
  type: "claim-vassals";
  childGameState: SerializedClaimVassalGameState;
  passedVassalsCount: number;
}
