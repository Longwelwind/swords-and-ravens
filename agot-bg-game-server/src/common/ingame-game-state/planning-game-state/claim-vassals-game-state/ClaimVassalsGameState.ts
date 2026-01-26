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
  // Contains forbidden relations between commanders and vassals.
  // Key is the commander and value is the vassal.
  forbiddenRelations: BetterMap<House, House> = new BetterMap();

  get ingame(): IngameGameState {
    return this.game.ingame;
  }

  get game(): Game {
    return this.parentGameState.game;
  }

  firstStart(forbiddenRelation: [House | null, House] | null = null): void {
    if (forbiddenRelation && forbiddenRelation[0]) {
      this.forbiddenRelations.set(forbiddenRelation[0], forbiddenRelation[1]);
    }
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
                  this.ingame.getControllerOfHouse(h),
                ),
              ] as [House, House[]],
          ),
      );

      const lowestVassalCount = Math.min(
        ...housesAndTheirVassals.values.map((vassals) => vassals.length),
      );

      const randomHouseWithLowestCount = popRandom(
        housesAndTheirVassals.entries
          .filter(([_h, vassals]) => vassals.length == lowestVassalCount)
          .map(([h, _vassals]) => h),
      ) as House;

      const nextVassalToClaim = popRandom(vassalsToClaim) as House;

      this.game.vassalRelations.set(
        nextVassalToClaim,
        randomHouseWithLowestCount,
      );
      vassalRelationsChanged = true;

      this.ingame.log(
        {
          type: "vassals-claimed",
          house: randomHouseWithLowestCount.id,
          vassals: [nextVassalToClaim.id],
        },
        true,
      );
    }

    if (vassalRelationsChanged) {
      this.ingame.broadcastVassalRelations();
    }

    this.parentGameState.onClaimVassalsFinished();
  }

  proceedNextVassal(previousToClaim: House | null): void {
    const vassalsToClaim = this.ingame.getNonClaimedVassalHouses();

    if (vassalsToClaim.length == 0) {
      this.parentGameState.onClaimVassalsFinished();
      return;
    }

    const nextHouseToClaim =
      this.ingame.getNextNonVassalInTurnOrder(previousToClaim);

    // If it is the last house to claim vassals,
    // attribute all of them to him.
    // But if it is a forbidden relation, then assign the remaining vassals to the previous house (lastToClaim).
    const nonVassalTurnOrder = this.ingame.getTurnOrderWithoutVassals();
    const lastHouseToClaim = _.last(nonVassalTurnOrder);
    if (nextHouseToClaim == lastHouseToClaim) {
      const vassalAssignments = new BetterMap<House, House[]>();
      vassalsToClaim.forEach((v) => {
        // Check if the vassal is forbidden for the last house to claim
        if (this.isRelationForbidden(nextHouseToClaim, v)) {
          // Find the previous house to claim
          const reversedNonVassalTurnOrder = [...nonVassalTurnOrder].reverse();
          _.pull(reversedNonVassalTurnOrder, nextHouseToClaim);
          for (const h of reversedNonVassalTurnOrder) {
            if (this.isRelationForbidden(h, v)) {
              // If the relation is forbidden, continue to the next house
              continue;
            }
            // Assign the vassal to the previous house to claim
            vassalAssignments.set(
              h,
              vassalAssignments.tryGet(h, [] as House[]).concat(v),
            );
            return;
          }
        } else {
          vassalAssignments.set(
            nextHouseToClaim,
            vassalAssignments.tryGet(nextHouseToClaim, [] as House[]).concat(v),
          );
        }
      });

      vassalAssignments.entries.forEach(([house, vassals]) => {
        this.assignVassals(house, vassals, true);
      });

      this.parentGameState.onClaimVassalsFinished();
      return;
    }

    if (
      // Check if there are still vassals to claim after removing the forbidden ones
      _.without(
        vassalsToClaim,
        this.forbiddenRelations.tryGet(nextHouseToClaim, null),
      ).length == 0
    ) {
      this.proceedNextVassal(nextHouseToClaim);
      return;
    }

    // Depending on the number of vassals, a house might be able to take multiple
    // vassals.
    const countVassals = this.ingame.getVassalHouses().length;
    const countNonVassals = this.game.houses.size - countVassals;
    // Get the position in the Iron Throne track, but without considering the vassals
    // and houses that have all remaining vassals as forbidden
    const positionInTrack = this.game.ironThroneTrack
      .filter((h) => {
        if (this.ingame.isVassalHouse(h)) {
          return false;
        }
        // Exclude houses that have all remaining vassals forbidden
        const availableVassals = _.without(
          vassalsToClaim,
          this.forbiddenRelations.tryGet(h, null),
        );
        return availableVassals.length > 0;
      })
      .indexOf(nextHouseToClaim);
    const count =
      this.passedVassalsCount +
      (Math.floor(countVassals / countNonVassals) +
        (positionInTrack < countVassals % countNonVassals ? 1 : 0));

    this.setChildGameState(new ClaimVassalGameState(this)).firstStart(
      nextHouseToClaim,
      count,
    );
  }

  private isRelationForbidden(commander: House, vassal: House): boolean {
    return this.forbiddenRelations.entries.some(
      ([c, v]) => c == commander && v == vassal,
    );
  }

  onClaimVassalFinish(house: House): void {
    this.proceedNextVassal(house);
  }

  assignVassals(
    house: House,
    vassals: House[],
    resolvedAutomatically = false,
  ): void {
    vassals.forEach((v) => this.game.vassalRelations.set(v, house));

    this.ingame.broadcastVassalRelations();

    this.ingame.log(
      {
        type: "vassals-claimed",
        house: house.id,
        vassals: vassals.map((v) => v.id),
      },
      resolvedAutomatically,
    );
  }

  onServerMessage(_message: ServerMessage): void {}

  onPlayerMessage(player: Player, message: ClientMessage): void {
    this.childGameState.onPlayerMessage(player, message);
  }

  serializeToClient(
    admin: boolean,
    player: Player | null,
  ): SerializedClaimVassalsGameState {
    return {
      type: "claim-vassals",
      childGameState: this.childGameState.serializeToClient(admin, player),
      passedVassalsCount: this.passedVassalsCount,
      forbiddenRelations: this.forbiddenRelations.entries.map(
        ([commander, vassal]) => [commander.id, vassal.id] as [string, string],
      ),
    };
  }

  static deserializeFromServer(
    parent: ParentGameState,
    data: SerializedClaimVassalsGameState,
  ): ClaimVassalsGameState {
    const claimVassals = new ClaimVassalsGameState(parent);

    claimVassals.childGameState = claimVassals.deserializeChildGameState(
      data.childGameState,
    );
    claimVassals.passedVassalsCount = data.passedVassalsCount;
    claimVassals.forbiddenRelations = new BetterMap(
      data.forbiddenRelations
        ? data.forbiddenRelations.map(([commander, vassal]) => [
            claimVassals.game.houses.get(commander),
            claimVassals.game.houses.get(vassal),
          ])
        : [],
    );

    return claimVassals;
  }

  deserializeChildGameState(
    data: SerializedClaimVassalsGameState["childGameState"],
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
  forbiddenRelations: [string, string][];
}
