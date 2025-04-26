import GameState from "../../../../../GameState";
import CombatGameState from "../CombatGameState";
import { ClientMessage } from "../../../../../../messages/ClientMessage";
import Player from "../../../../Player";
import HouseCard, {
  HouseCardState,
} from "../../../../game-data-structure/house-card/HouseCard";
import EntireGame from "../../../../../EntireGame";
import { ServerMessage } from "../../../../../../messages/ServerMessage";
import { observable } from "mobx";
import House from "../../../../game-data-structure/House";
import BetterMap from "../../../../../../utils/BetterMap";
import IngameGameState from "../../../../IngameGameState";
import _ from "lodash";
import User from "../../../../../../server/User";
import { PlayerActionType } from "../../../../../ingame-game-state/game-data-structure/GameLog";
import shuffleInPlace from "../../../../../../utils/shuffleInPlace";

export default class ChooseHouseCardGameState extends GameState<CombatGameState> {
  choosableHouseCards: BetterMap<House, HouseCard[]>;
  // A null value for a value can be present client-side, it indicates
  // that a house card was chosen but it may not be shown to the player.
  @observable houseCards = new BetterMap<House, HouseCard | null>();
  @observable selectedHouseCard: HouseCard | null;

  get combatGameState(): CombatGameState {
    return this.parentGameState;
  }

  get entireGame(): EntireGame {
    return this.combatGameState.entireGame;
  }

  get ingameGameState(): IngameGameState {
    return this.combatGameState.ingameGameState;
  }

  // To support assigning the same vassal cards after Refuse support has been triggered
  // we allow passing the previous chosen house cards
  firstStart(
    choosableHouseCards: BetterMap<House, HouseCard[]> | null = null
  ): void {
    // Setup the choosable house cards
    const vassalHouseCards = shuffleInPlace(
      this.ingameGameState.game.vassalHouseCards.values
    );
    if (choosableHouseCards) {
      _.pull(vassalHouseCards, ..._.flatMap(choosableHouseCards.values));
    }

    this.choosableHouseCards = new BetterMap(
      this.combatGameState.houseCombatDatas.keys.map((h) => {
        // If the house a player-controlled house, return the available cards.
        // If it a vassal, then randomly choose 3 of them.
        let houseCards: HouseCard[];
        if (choosableHouseCards && choosableHouseCards.has(h)) {
          houseCards = choosableHouseCards.get(h);
        } else {
          houseCards = (
            !this.ingameGameState.isVassalHouse(h)
              ? h.houseCards.values.filter(
                  (hc) => hc.state == HouseCardState.AVAILABLE
                )
              : vassalHouseCards.splice(0, 3)
          ).sort((a, b) => a.combatStrength - b.combatStrength);
        }

        // Assign the chosen house cards to the vassal house as some abilities require a hand during resolution
        if (this.ingameGameState.isVassalHouse(h)) {
          h.houseCards = new BetterMap(houseCards.map((hc) => [hc.id, hc]));
          h.houseCards.values.forEach((hc) => {
            if (hc.state == HouseCardState.USED) {
              hc.state = HouseCardState.AVAILABLE;
              if (this.entireGame.onCaptureSentryMessage) {
                this.entireGame.onCaptureSentryMessage(
                  `Vassal house card ${hc.id} is marked as USED`,
                  "error"
                );
              }
            }
          });
        }

        return [h, houseCards];
      })
    );

    // In case a house just has one house card left it maybe can be chosen automatically.
    // But if the house received support or holds the unused VSB we cannot automatically choose the last card,
    // to allow the house to refuse their granted support (e.g. due to Roose Bolton or Stannis DWD)
    // or to burn the VSB now in this game state.

    if (
      this.canAutomaticallyChooseLastHouseCard(this.combatGameState.attacker) &&
      this.canAutomaticallyChooseLastHouseCard(this.combatGameState.defender)
    ) {
      // Both last house cards can be chosen automatically, so this game-state-will be resolved automatically.
      // In rare cases the whole combat may be fast-tracked by the game server. This can happen when no abilities are involved,
      // casualties can be fast-tracked (loser just has 1 unit or units are all of the same type),
      // and retreat is fast-tracked as well (e.g. attacker retreats back to the starting reagion).

      // So we will send an extra game-state-change here to force all connected clients to update their client game state tree to combat.
      // This will ensure, that the combat dialog will be displayed at least for 5 seconds and all combat related server messages will be received
      this.entireGame.checkGameStateChanged(true);
    }

    this.tryAutomaticallyChooseLastHouseCard(this.combatGameState.attacker);
    this.tryAutomaticallyChooseLastHouseCard(this.combatGameState.defender);

    this.checkAndProceedEndOfChooseHouseCardGameState();
  }

  onServerMessage(message: ServerMessage): void {
    if (message.type == "house-card-chosen") {
      const house = this.combatGameState.game.houses.get(message.houseId);
      this.houseCards.set(
        house,
        message.houseCardId
          ? this.combatGameState.game.getHouseCardById(message.houseCardId)
          : null
      );

      this.combatGameState.houseCombatDatas.get(house).houseCardChosen = true;
      this.combatGameState.valyrianSteelBladeUser =
        message.valyrianSteelBladeUser
          ? this.combatGameState.game.houses.get(message.valyrianSteelBladeUser)
          : null;
      this.combatGameState.rerender++;
    } else if (message.type == "support-refused") {
      const house = this.combatGameState.game.houses.get(message.houseId);
      this.removeSupportForHouse(house);
      this.combatGameState.houseCombatDatas.keys.forEach((h) => {
        const hcd = this.combatGameState.houseCombatDatas.get(h);
        hcd.houseCardChosen = false;
        hcd.houseCard = null;
      });
      this.combatGameState.rerender++;
    } else if (message.type == "replaced-by-vassal") {
      this.combatGameState.houseCombatDatas.keys.forEach((h) => {
        const hcd = this.combatGameState.houseCombatDatas.get(h);
        hcd.houseCardChosen = false;
        hcd.houseCard = null;
      });
      this.combatGameState.rerender++;
    }
  }

  onPlayerMessage(player: Player, message: ClientMessage): void {
    if (message.type == "choose-house-card") {
      if (!this.combatGameState.isCommandingHouseInCombat(player.house)) {
        return;
      }

      const commandedHouse = this.combatGameState.getCommandedHouseInCombat(
        player.house
      );
      const houseCard = this.getChoosableCards(commandedHouse).find(
        (hc) => hc.id == message.houseCardId
      );

      if (!houseCard) {
        return;
      }

      this.houseCards.set(commandedHouse, houseCard);

      if (
        message.burnValyrianSteelBlade &&
        player.house == this.combatGameState.game.valyrianSteelBladeHolder &&
        !this.combatGameState.game.valyrianSteelBladeUsed
      ) {
        this.combatGameState.valyrianSteelBladeUser = commandedHouse;
      }

      if (
        !message.burnValyrianSteelBlade &&
        player.house == this.combatGameState.game.valyrianSteelBladeHolder
      ) {
        this.combatGameState.valyrianSteelBladeUser = null;
      }

      this.entireGame.sendMessageToClients(
        _.without(this.entireGame.users.values, player.user),
        {
          type: "house-card-chosen",
          houseId: commandedHouse.id,
          houseCardId: null,
        }
      );

      player.user.send({
        type: "house-card-chosen",
        houseId: commandedHouse.id,
        houseCardId: houseCard.id,
        valyrianSteelBladeUser:
          this.ingameGameState.getControllerOfHouse(
            this.ingameGameState.game.valyrianSteelBladeHolder
          ) == player
            ? (this.combatGameState.valyrianSteelBladeUser?.id ?? null)
            : null,
      });

      this.ingameGameState.log({
        type: "player-action",
        house: player.house.id,
        action: PlayerActionType.HOUSE_CARD_CHOSEN,
        forHouses:
          commandedHouse != player.house ? [commandedHouse.id] : undefined,
      });

      this.checkAndProceedEndOfChooseHouseCardGameState();
    } else if (message.type == "refuse-support") {
      const commandedHouse =
        this.combatGameState.tryGetCommandedHouseInCombat(player);
      if (commandedHouse == null || !this.canRefuseSupport(commandedHouse)) {
        return;
      }

      this.removeSupportForHouse(commandedHouse);
      this.combatGameState.ingameGameState.log({
        type: "support-refused",
        house: commandedHouse.id,
      });

      this.entireGame.broadcastToClients({
        type: "support-refused",
        houseId: commandedHouse.id,
      });

      const vassals = this.choosableHouseCards.keys.filter((h) =>
        this.ingameGameState.isVassalHouse(h)
      );
      const choosableHouseCards =
        vassals.length > 0
          ? new BetterMap(
              vassals.map((h) => [h, this.choosableHouseCards.get(h)])
            )
          : null;

      // Reset combatGameState.clientGameState to retrigger ChooseHouseCardGameState
      this.combatGameState.proceedToChooseGeneral(choosableHouseCards);
    }
  }

  private removeSupportForHouse(supportedHouse: House): void {
    const supportingHouses = this.combatGameState.supporters.entries
      .filter(([_supporting, supported]) => supported == supportedHouse)
      .map(([supportingHouse, _supported]) => supportingHouse);

    supportingHouses.forEach((h) => this.combatGameState.supporters.delete(h));

    this.selectedHouseCard = null;
  }

  getWaitingForHouses(): House[] {
    return _.difference(
      this.combatGameState.houseCombatDatas.keys,
      this.houseCards.keys
    );
  }

  getWaitedUsers(): User[] {
    return this.getWaitingForHouses().map(
      (h) => this.ingameGameState.getControllerOfHouse(h).user
    );
  }

  getChoosableCards(house: House): HouseCard[] {
    return this.choosableHouseCards.get(house);
  }

  chooseHouseCard(houseCard: HouseCard, burnValyrianSteelBlade: boolean): void {
    this.entireGame.sendMessageToServer({
      type: "choose-house-card",
      houseCardId: houseCard.id,
      burnValyrianSteelBlade: burnValyrianSteelBlade,
    });
  }

  serializeToClient(
    admin: boolean,
    player: Player | null
  ): SerializedChooseHouseCardGameState {
    return {
      type: "choose-house-card",
      choosableHouseCards: this.choosableHouseCards.map((house, houseCards) => {
        // If a player requested the serialized version, only give his own house cards
        // to avoid revealing the 3 shuffled vassal house cards
        // In case a player replaces a commander during battle he will have to refresh to get the choosable house cards
        if (
          admin ||
          !this.ingameGameState.isVassalHouse(house) ||
          this.ingameGameState.getControllerOfHouse(house) == player
        ) {
          return [house.id, houseCards.map((hc) => hc.id)];
        } else {
          return [house.id, []];
        }
      }),
      houseCards: this.houseCards.map((h, hc) => {
        // If a player requested the serialized version, only give his own house card.
        if (
          hc &&
          (admin ||
            (player && this.ingameGameState.getControllerOfHouse(h) == player))
        ) {
          return [h.id, hc.id];
        } else {
          return [h.id, null];
        }
      }),
    };
  }

  private checkAndProceedEndOfChooseHouseCardGameState(): void {
    if (this.houseCards.size == 2) {
      this.houseCards.forEach(
        (houseCard, house) =>
          (this.combatGameState.houseCombatDatas.get(house).houseCard =
            houseCard)
      );

      // "this.combatGameState.attackingHouseCombatData.houseCard" and
      // "this.combatGameState.defendingHouseCombatData.houseCard" will always be non-null
      // since they have just been set before, thus the two "ts-ignore". They could be later set to null
      // because of Tyrion Lannister, for example.
      this.ingameGameState.log({
        type: "combat-house-card-chosen",
        houseCards: [
          // @ts-expect-error House card is never null here
          [
            this.combatGameState.attacker.id,
            this.combatGameState.attackingHouseCombatData.houseCard.id,
          ],
          // @ts-expect-error House card is never null here
          [
            this.combatGameState.defender.id,
            this.combatGameState.defendingHouseCombatData.houseCard.id,
          ],
        ],
      });

      this.entireGame.broadcastToClients({
        type: "change-combat-house-card",
        // Same here, the houseCards will always be non-null
        // @ts-expect-error House card is never null here
        houseCardIds: this.combatGameState.houseCombatDatas.map((h, hcd) => [
          h.id,
          hcd.houseCard.id,
        ]),
        animate: _.every(
          this.combatGameState.houseCombatDatas.values,
          (hcd) =>
            hcd.houseCard?.ability == null ||
            !hcd.houseCard.ability.changesEnemyHouseCardImmediately()
        ),
      });

      this.combatGameState.onChooseHouseCardGameStateEnd();
    }
  }

  canRefuseSupport(house: House | null): boolean {
    // Support can only be refused if house is supported
    return (
      house != null && this.combatGameState.supporters.values.includes(house)
    );
  }

  refuseSupport(): void {
    this.entireGame.sendMessageToServer({
      type: "refuse-support",
    });
  }

  actionAfterVassalReplacement(newVassal: House): void {
    if (this.combatGameState.houseCombatDatas.keys.includes(newVassal)) {
      this.combatGameState.ingameGameState.resetAllWaitedForData();
      this.combatGameState.proceedToChooseGeneral();
      this.entireGame.broadcastToClients({
        type: "replaced-by-vassal",
      });
    }
  }

  private tryAutomaticallyChooseLastHouseCard(house: House): void {
    if (this.canAutomaticallyChooseLastHouseCard(house)) {
      this.houseCards.set(house, this.getChoosableCards(house)[0]);
      this.ingameGameState.log(
        {
          type: "player-action",
          house: house.id,
          action: PlayerActionType.HOUSE_CARD_CHOSEN,
        },
        true
      );
    }
  }

  private canAutomaticallyChooseLastHouseCard(house: House): boolean {
    const choosableCards = this.getChoosableCards(house);
    if (choosableCards.length != 1) {
      return false;
    }

    const ingame = this.ingameGameState;

    const houseCanBurnTheVsb =
      !ingame.game.valyrianSteelBladeUsed &&
      (ingame.game.valyrianSteelBladeHolder == house ||
        ingame
          .getVassalsControlledByPlayer(
            ingame.getControllerOfHouse(ingame.game.valyrianSteelBladeHolder)
          )
          .includes(house));

    return (
      !this.combatGameState.supporters.values.includes(house) &&
      !houseCanBurnTheVsb
    );
  }

  static deserializeFromServer(
    combatGameState: CombatGameState,
    data: SerializedChooseHouseCardGameState
  ): ChooseHouseCardGameState {
    const chooseHouseCardGameState = new ChooseHouseCardGameState(
      combatGameState
    );

    chooseHouseCardGameState.choosableHouseCards = new BetterMap(
      data.choosableHouseCards.map(([hid, hcids]) => {
        const house = combatGameState.game.houses.get(hid);
        return [
          house,
          hcids.map((hcid) => combatGameState.game.getHouseCardById(hcid)),
        ];
      })
    );

    chooseHouseCardGameState.houseCards = new BetterMap(
      data.houseCards.map(([hid, hcid]) => {
        const house = combatGameState.game.houses.get(hid);

        return [
          house,
          hcid
            ? combatGameState.ingameGameState.game.getHouseCardById(hcid)
            : null,
        ];
      })
    );

    const combat = chooseHouseCardGameState.combatGameState;
    chooseHouseCardGameState.houseCards.keys.forEach((h) => {
      combat.houseCombatDatas.get(h).houseCardChosen = true;
    });

    return chooseHouseCardGameState;
  }
}

export interface SerializedChooseHouseCardGameState {
  type: "choose-house-card";
  choosableHouseCards: [string, string[]][];
  houseCards: [string, string | null][];
}
