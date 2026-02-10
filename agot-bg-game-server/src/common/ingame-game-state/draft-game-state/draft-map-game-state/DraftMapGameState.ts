import IngameGameState from "../../IngameGameState";
import GameState from "../../../GameState";
import EntireGame from "../../../EntireGame";
import Player from "../../Player";
import { ClientMessage } from "../../../../messages/ClientMessage";
import { ServerMessage } from "../../../../messages/ServerMessage";
import House from "../../game-data-structure/House";
import Game from "../../game-data-structure/Game";
import _ from "lodash";
import User from "../../../../server/User";
import { observable } from "mobx";
import UnitType from "../../game-data-structure/UnitType";
import Region from "../../game-data-structure/Region";
import Unit from "../../game-data-structure/Unit";
import BetterMap from "../../../../utils/BetterMap";
import unitTypes, { dragon } from "../../game-data-structure/unitTypes";
import World from "../../game-data-structure/World";
import DraftGameState from "../DraftGameState";
import AgreeOnGameStartGameState from "../agree-on-game-start-game-state/AgreeOnGameStartGameState";

export default class DraftMapGameState extends GameState<DraftGameState> {
  @observable readyHouses: House[];
  initialSupplies: BetterMap<House, number> = new BetterMap();

  get ingame(): IngameGameState {
    return this.parentGameState.parentGameState;
  }

  get game(): Game {
    return this.ingame.game;
  }

  get world(): World {
    return this.game.world;
  }

  get entireGame(): EntireGame {
    return this.ingame.entireGame;
  }

  get allowedGarrisonStrengths(): number[] {
    return [2, 3, 4, 5, 6];
  }

  constructor(draftGameState: DraftGameState) {
    super(draftGameState);
  }

  firstStart(): void {
    this.readyHouses = [];
    this.ingame.game.nonVassalHouses.forEach((house) => {
      this.initialSupplies.set(house, house.supplyLevel);
    });
  }

  getNotReadyPlayers(): Player[] {
    return _.without(
      this.parentGameState.participatingHouses,
      ...this.readyHouses,
    ).map((h) => this.ingame.getControllerOfHouse(h));
  }

  getWaitedUsers(): User[] {
    return this.getNotReadyPlayers().map((p) => p.user);
  }

  getAvailableRegionsForHouse(house: House): Region[] {
    return this.game.draftMapRegionsPerHouse.has(house)
      ? this.game.draftMapRegionsPerHouse.get(house)
      : [];
  }

  getAvailableUnitsOfType(house: House, unitType: UnitType): number {
    if (unitType == dragon && this.entireGame.gameSettings.dragonWar) {
      return 3 - this.game.getCountUnitsOfType(house, dragon);
    }

    return this.game.getAvailableUnitsOfType(house, unitType);
  }

  isLegalUnitAdd(house: House, unitType: UnitType, region: Region): boolean {
    const addedUnits = new BetterMap<Region, UnitType[]>([
      [region, [unitType]],
    ]);
    return (
      this.getAvailableUnitsOfType(house, unitType) > 0 &&
      this.getAvailableRegionsForHouse(house).includes(region) &&
      unitType.walksOn == region.type.kind &&
      !this.game.hasTooMuchArmies(house, addedUnits)
    );
  }

  canRemoveUnit(house: House, unit: Unit): boolean {
    const region = unit.region;
    if (unit.allegiance != house) return false;
    if (region.supplyIcons == 0) return true;
    if (region.units.size > 1) return true;
    if (
      region.controlPowerToken == house ||
      region.superControlPowerToken == house
    )
      return true;

    const newSupply = Math.min(
      this.ingame.game.supplyRestrictions.length - 1,
      this.ingame.game.getControlledSupplyIcons(house) - region.supplyIcons,
    );

    const allowedArmySizes = this.ingame.game.supplyRestrictions[newSupply];
    const armySizes = this.ingame.game
      .getArmySizes(house, new BetterMap(), new BetterMap([[region, [unit]]]))
      .filter((a) => a > 1);

    if (armySizes.length > allowedArmySizes.length) {
      return false;
    }

    for (let i = 0; i < armySizes.length; i++) {
      if (armySizes[i] > allowedArmySizes[i]) {
        return false;
      }
    }

    return true;
  }

  isLegalPowerTokenAdd(house: House, region: Region): boolean {
    return (
      region.type.kind == "land" &&
      this.hasEnoughPowerTokens(house) &&
      region.controlPowerToken == null &&
      region.superControlPowerToken != house &&
      this.getAvailableRegionsForHouse(house).includes(region)
    );
  }

  canRemovePowerToken(house: House, region: Region): boolean {
    if (region.controlPowerToken != house) return false;
    if (region.superControlPowerToken == house) return true;
    if (region.supplyIcons == 0) return true;
    if (region.units.values.filter((u) => u.allegiance == house).length > 0)
      return true;

    const newSupply = Math.min(
      this.ingame.game.supplyRestrictions.length - 1,
      this.ingame.game.getControlledSupplyIcons(house) - region.supplyIcons,
    );

    const allowedArmySizes = this.ingame.game.supplyRestrictions[newSupply];
    const armySizes = this.ingame.game.getArmySizes(house).filter((a) => a > 1);

    if (armySizes.length > allowedArmySizes.length) {
      return false;
    }

    for (let i = 0; i < armySizes.length; i++) {
      if (armySizes[i] > allowedArmySizes[i]) {
        return false;
      }
    }

    return true;
  }

  isLegalGarrisonAdd(house: House, strength: number, region: Region): boolean {
    return (
      region.type.kind == "land" &&
      this.getAvailableRegionsForHouse(house).includes(region) &&
      this.allowedGarrisonStrengths.includes(strength)
    );
  }

  hasEnoughPowerTokens(house: House): boolean {
    const availablePower = house.powerTokens;
    const powerTokensOnBoard = this.game.countPowerTokensOnBoard(house);
    return house.maxPowerTokens - availablePower - powerTokensOnBoard > 0;
  }

  updateSupply(house: House): void {
    house.supplyLevel = Math.min(
      this.ingame.game.supplyRestrictions.length - 1,
      this.ingame.game.getControlledSupplyIcons(house),
    );

    this.ingame.entireGame.broadcastToClients({
      type: "supply-adjusted",
      supplies: [[house.id, house.supplyLevel]],
    });
  }

  onPlayerMessage(player: Player, message: ClientMessage): void {
    if (message.type == "ready") {
      if (!this.readyHouses.includes(player.house)) {
        this.readyHouses.push(player.house);
      }

      this.entireGame.broadcastToClients({
        type: "player-ready",
        userId: player.user.id,
      });

      if (this.getNotReadyPlayers().length == 0) {
        // All players are ready
        // Check if we have to update supplies
        const shouldUpdateSupplies = this.initialSupplies.entries.some(
          ([house, initialSupply]) => house.supplyLevel != initialSupply,
        );

        if (shouldUpdateSupplies) {
          this.ingame.game.updateSupplies();
        }

        // Then proceed to the next game state
        this.parentGameState
          .setChildGameState(
            new AgreeOnGameStartGameState(this.parentGameState),
          )
          .firstStart();
      }
    } else if (message.type == "unready") {
      _.pull(this.readyHouses, player.house);
      this.entireGame.broadcastToClients({
        type: "player-unready",
        userId: player.user.id,
      });
    } else if (message.type == "select-units") {
      const house = player.house;
      if (!this.parentGameState.participatingHouses.includes(house)) return;

      const unitIds = _.flatMap(message.units.map(([_rid, units]) => units));
      if (unitIds.length != 1) return;

      _.pull(this.readyHouses, house);
      this.entireGame.broadcastToClients({
        type: "player-unready",
        userId: player.user.id,
      });

      const unitId = unitIds[0];
      const region = this.world.regions.values.find((r) => r.units.has(unitId));

      if (region) {
        const unit = region.units.get(unitId);
        if (!this.canRemoveUnit(house, unit)) return;
        this.ingame.broadcastRemoveUnits(unit.region, [unit], true);
        unit.region.units.delete(unit.id);
        const newController = region.getController();
        if (region.supplyIcons > 0 && newController != house) {
          this.updateSupply(house);
        }
      }
    } else if (message.type == "add-power-token") {
      const region = this.world.regions.get(message.region);
      const oldController = region.getController();
      const house = player.house;
      if (!this.parentGameState.participatingHouses.includes(house)) return;
      if (!this.isLegalPowerTokenAdd(house, region)) return;

      _.pull(this.readyHouses, house);
      this.entireGame.broadcastToClients({
        type: "player-unready",
        userId: player.user.id,
      });

      region.controlPowerToken = house;
      this.ingame.sendMessageToUsersWhoCanSeeRegion(
        {
          type: "change-control-power-token",
          regionId: region.id,
          houseId: house.id,
        },
        region,
      );

      if (region.supplyIcons > 0 && oldController != house) {
        this.updateSupply(house);
      }
    } else if (message.type == "remove-power-token") {
      const region = this.world.regions.get(message.region);
      const house = player.house;
      if (!this.parentGameState.participatingHouses.includes(house)) return;

      if (!this.canRemovePowerToken(house, region)) return;

      region.controlPowerToken = null;
      this.ingame.sendMessageToUsersWhoCanSeeRegion(
        {
          type: "change-control-power-token",
          regionId: region.id,
          houseId: null,
        },
        region,
      );

      const newController = region.getController();
      if (region.supplyIcons > 0 && newController != house) {
        this.updateSupply(house);
      }
    } else if (message.type == "add-garrison") {
      const region = this.world.regions.get(message.region);
      const house = player.house;
      if (!this.parentGameState.participatingHouses.includes(house)) return;
      if (!this.isLegalGarrisonAdd(house, message.garrison, region)) return;

      region.garrison = message.garrison;

      _.pull(this.readyHouses, house);
      this.entireGame.broadcastToClients({
        type: "player-unready",
        userId: player.user.id,
      });

      this.ingame.sendMessageToUsersWhoCanSeeRegion(
        {
          type: "change-garrison",
          newGarrison: message.garrison,
          region: region.id,
        },
        region,
      );
    } else if (message.type == "remove-garrison") {
      const region = this.world.regions.get(message.region);
      const house = player.house;
      if (
        !this.parentGameState.participatingHouses.includes(house) ||
        !this.getAvailableRegionsForHouse(house).includes(region) ||
        region.garrison == 0
      )
        return;

      _.pull(this.readyHouses, house);
      this.entireGame.broadcastToClients({
        type: "player-unready",
        userId: player.user.id,
      });

      region.garrison = 0;
      this.ingame.sendMessageToUsersWhoCanSeeRegion(
        {
          type: "change-garrison",
          newGarrison: 0,
          region: region.id,
        },
        region,
      );
    } else if (message.type == "muster") {
      const house = player.house;
      if (!this.parentGameState.participatingHouses.includes(house)) return;

      const musterings = new BetterMap(
        message.units.map(([regionId, recruitements]) => {
          return [
            this.world.regions.get(regionId),
            recruitements.map(({ from, to, region }) => {
              const musteringRegion = this.world.regions.get(region);

              return {
                from: from ? musteringRegion.units.get(from) : null,
                region: musteringRegion,
                to: unitTypes.get(to),
              };
            }),
          ] as [
            Region,
            { from: UnitType | null; to: UnitType; region: Region }[],
          ];
        }),
      );

      if (musterings.size != 1 || musterings.values[0].length != 1) return;
      const newUnitType = musterings.values[0][0];

      if (!this.isLegalUnitAdd(house, newUnitType.to, newUnitType.region))
        return;

      _.pull(this.readyHouses, house);
      this.entireGame.broadcastToClients({
        type: "player-unready",
        userId: player.user.id,
      });

      const oldController = newUnitType.region.getController();

      const newUnit = this.game.createUnit(
        newUnitType.region,
        newUnitType.to,
        house,
      );
      newUnit.region.units.set(newUnit.id, newUnit);

      this.ingame.broadcastAddUnits(newUnit.region, [newUnit]);

      if (newUnitType.region.supplyIcons > 0 && oldController != house) {
        this.updateSupply(house);
      }
    }
  }

  // Client code:
  addUnit(type: UnitType, region: Region): void {
    this.entireGame.sendMessageToServer({
      type: "muster",
      units: [[region.id, [{ from: null, to: type.id, region: region.id }]]],
    });
  }

  addGarrison(region: Region, strength: number): void {
    this.entireGame.sendMessageToServer({
      type: "add-garrison",
      region: region.id,
      garrison: strength,
    });
  }

  removeGarrison(region: Region): void {
    this.entireGame.sendMessageToServer({
      type: "remove-garrison",
      region: region.id,
    });
  }

  addPowerToken(region: Region): void {
    this.entireGame.sendMessageToServer({
      type: "add-power-token",
      region: region.id,
    });
  }

  removePowerToken(region: Region): void {
    this.entireGame.sendMessageToServer({
      type: "remove-power-token",
      region: region.id,
    });
  }

  removeUnit(unit: Unit): void {
    this.entireGame.sendMessageToServer({
      type: "select-units",
      units: [[unit.region.id, [unit.id]]],
    });
  }

  setUnready(): void {
    this.entireGame.sendMessageToServer({
      type: "unready",
    });
  }

  setReady(): void {
    this.entireGame.sendMessageToServer({
      type: "ready",
    });
  }

  onServerMessage(message: ServerMessage): void {
    if (message.type == "player-ready") {
      const player = this.ingame.players.get(
        this.entireGame.users.get(message.userId),
      );
      if (!this.readyHouses.includes(player.house)) {
        this.readyHouses.push(player.house);
      }
    } else if (message.type == "player-unready") {
      const player = this.ingame.players.get(
        this.entireGame.users.get(message.userId),
      );
      _.pull(this.readyHouses, player.house);
    }
  }

  serializeToClient(
    _admin: boolean,
    _player: Player | null,
  ): SerializedDraftMapGameState {
    return {
      type: "draft-map",
      readyHouses: this.readyHouses.map((h) => h.id),
      initialSupplies: this.initialSupplies.entries.map(([h, supply]) => [
        h.id,
        supply,
      ]),
    };
  }

  static deserializeFromServer(
    draft: DraftGameState,
    data: SerializedDraftMapGameState,
  ): DraftMapGameState {
    const draftMapGameState = new DraftMapGameState(draft);
    draftMapGameState.readyHouses = data.readyHouses.map((hid) =>
      draft.ingame.game.houses.get(hid),
    );
    draftMapGameState.initialSupplies = new BetterMap(
      data.initialSupplies.map(([hid, supply]) => [
        draft.ingame.game.houses.get(hid),
        supply,
      ]),
    );
    return draftMapGameState;
  }
}

export interface SerializedDraftMapGameState {
  type: "draft-map";
  readyHouses: string[];
  initialSupplies: [string, number][];
}
