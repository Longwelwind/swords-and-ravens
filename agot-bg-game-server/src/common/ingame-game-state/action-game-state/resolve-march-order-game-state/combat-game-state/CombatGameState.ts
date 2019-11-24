import ActionGameState from "../../ActionGameState";
import GameState from "../../../../GameState";
import Region from "../../../game-data-structure/Region";
import Unit from "../../../game-data-structure/Unit";
import House from "../../../game-data-structure/House";
import ResolveMarchOrderGameState from "../ResolveMarchOrderGameState";
import IngameGameState from "../../../IngameGameState";
import World from "../../../game-data-structure/World";
import * as _ from "lodash";
import DeclareSupportGameState, {SerializedDeclareSupportGameState} from "./declare-support-game-state/DeclareSupportGameState";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import ChooseHouseCardGameState, {SerializedChooseHouseCardGameState} from "./choose-house-card-game-state/ChooseHouseCardGameState";
import EntireGame from "../../../../EntireGame";
import Game from "../../../game-data-structure/Game";
import UseValyrianSteelBladeGameState, {SerializedUseValyrianSteelBladeGameState} from "./use-valyrian-steel-blade-game-state/UseValyrianSteelBladeGameState";
import HouseCard from "../../../game-data-structure/house-card/HouseCard";
import DefenseOrderType from "../../../game-data-structure/order-types/DefenseOrderType";
import MarchOrderType from "../../../game-data-structure/order-types/MarchOrderType";
import BetterMap from "../../../../../utils/BetterMap";
import HouseCardAbility from "../../../game-data-structure/house-card/HouseCardAbility";
import PostCombatGameState, {SerializedPostCombatGameState} from "./post-combat-game-state/PostCombatGameState";
import SupportOrderType from "../../../game-data-structure/order-types/SupportOrderType";
import ImmediatelyHouseCardAbilitiesResolutionGameState
    , {SerializedImmediatelyHouseCardAbilitiesResolutionGameState} from "./immediately-house-card-abilities-resolution-game-state/ImmediatelyHouseCardAbilitiesResolutionGameState";


export interface HouseCombatData {
    army: Unit[];
    region: Region;
    houseCard: HouseCard | null;
}

export default class CombatGameState extends GameState<
    ResolveMarchOrderGameState,
    DeclareSupportGameState | ChooseHouseCardGameState | UseValyrianSteelBladeGameState
    | ImmediatelyHouseCardAbilitiesResolutionGameState | PostCombatGameState
> {
    winner: House | null;
    loser: House | null;

    attacker: House;
    defender: House;
    houseCombatDatas: BetterMap<House, HouseCombatData>;
    valyrianSteelBladeUser: House | null;

    // The key is the supporting house and the value is the supported house.
    // The value is always either attacker or defender or null if the supporter
    // decided to support no-one.
    supporters = new BetterMap<House, House | null>();

    get attackingRegion(): Region {
        return this.attackingHouseCombatData.region;
    }

    get defendingRegion(): Region {
        return this.defendingHouseCombatData.region;
    }

    get attackingArmy(): Unit[] {
        return this.attackingHouseCombatData.army;
    }

    get defendingArmy(): Unit[] {
        return this.defendingHouseCombatData.army;
    }

    get attackerHouseCard(): HouseCard | null {
        return this.attackingHouseCombatData.houseCard;
    }

    get defenderHouseCard(): HouseCard | null {
        return this.defendingHouseCombatData.houseCard;
    }

    get attackingHouseCombatData(): HouseCombatData {
        return this.houseCombatDatas.get(this.attacker);
    }

    get defendingHouseCombatData(): HouseCombatData {
        return this.houseCombatDatas.get(this.defender);
    }

    get resolveMarchOrderGameState(): ResolveMarchOrderGameState {
        return this.parentGameState;
    }

    get actionGameState(): ActionGameState {
        return this.resolveMarchOrderGameState.actionGameState;
    }

    get ingameGameState(): IngameGameState {
        return this.actionGameState.parentGameState;
    }

    get game(): Game {
        return this.ingameGameState.game;
    }

    get world(): World {
        return this.game.world;
    }

    get entireGame(): EntireGame {
        return this.resolveMarchOrderGameState.entireGame;
    }

    constructor(resolveMarchOrderGameState: ResolveMarchOrderGameState) {
        super(resolveMarchOrderGameState);
    }

    firstStart(attackerComingFrom: Region, combatRegion: Region, attacker: House, defender: House, army: Unit[]): void {
        this.attacker = attacker;
        this.defender = defender;
        this.houseCombatDatas = new BetterMap([
            [attacker, {region: attackerComingFrom, army: army, houseCard: null}],
            [defender, {region: combatRegion, army: combatRegion.units.values, houseCard: null}]
        ]);

        // Begin by the declaration of support
        if (!this.proceedNextSupportDeclaration()) {
            this.proceedToChooseGeneral();
        }
    }

    onDeclareSupportGameStateEnd(): void {
        if (this.proceedNextSupportDeclaration()) {
        } else {
            // Proceed to choose house card game state
            this.proceedToChooseGeneral();
        }
    }

    proceedResolveCombat(): void {
        this.setChildGameState(new PostCombatGameState(this)).firstStart();
    }

    getBaseCombatStrength(house: House): number {
        const army = this.houseCombatDatas.get(house).army;

        return this.getCombatStrengthOfArmy(house, army, false);
    }

    getCombatStrengthOfArmy(houseSide: House, army: Unit[], support: boolean): number {
        return army
            .filter(u => !u.wounded)
            .map(u => this.getCombatStrengthOfUnit(houseSide, u, support))
            .reduce(_.add, 0);
    }

    getCombatStrengthOfUnit(houseSide: House, unit: Unit, support: boolean): number {
        const attackingAStructure = this.isAttackingAStructure(unit.allegiance);

        return this.getOrderResolutionHouseCard().reduce((s, h) => {
            const houseCard = this.houseCombatDatas.get(h).houseCard;

            if (houseCard == null) {
                return s;
            }

            return houseCard.ability ? s + houseCard.ability.modifyUnitCombatStrength(this, h, houseCard, houseSide, unit, support, s) : s;
        }, unit.getCombatStrength(attackingAStructure));
    }

    getOrderBonus(house: House): number {
        const combatHouseData = this.houseCombatDatas.get(house);

        if (!this.actionGameState.ordersOnBoard.has(combatHouseData.region)) {
            return 0;
        }

        const order = this.actionGameState.ordersOnBoard.get(combatHouseData.region);

        if (house == this.attacker) {
            // This should technically always be true since the attack was triggered by
            // a march order in attackingRegion in the first place.
            if (order.type instanceof MarchOrderType) {
                return order.type.attackModifier;
            }
        } else {
            if (order.type instanceof DefenseOrderType) {
                return order.type.defenseModifier;
            }
        }

        return 0;
    }

    getSupportStrengthForSide(supportedHouse: House): number {
        return this.supporters.entries
            .filter(([_house, supHouse]) => supportedHouse == supHouse)
            .map(([house, _supHouse]) => {
                // Compute the total strength that this supporting house is bringing
                // to the combat
                return this.getPossibleSupportingRegions()
                    .filter(({region}) => region.getController() == house)
                    .map(({region}) => this.getCombatStrengthOfArmy(supportedHouse, region.units.values, true))
                    .reduce(_.add, 0);
            })
            .reduce(_.add, 0);
    }

    getValyrianBladeBonus(house: House): number {
        return house == this.valyrianSteelBladeUser ? 1 : 0;
    }

    isAttackingAStructure(house: House): boolean {
        if (house == this.attacker) {
            return this.defendingRegion.castleLevel > 0;
        }

        return false;
    }

    onUseValyrianSteelBladeGameStateEnd(): void {
        this.proceedResolveCombat();
    }

    onChooseHouseCardGameStateEnd(): void {
        this.proceedImmediatelyResolution();
    }

    proceedImmediatelyResolution(): void {
        this.setChildGameState(new ImmediatelyHouseCardAbilitiesResolutionGameState(this)).firstStart();
    }

    onImmediatelyResolutionFinish(): void {
        // Check if the sword has not been used this round
        if (!this.game.valyrianSteelBladeUsed) {
            // Check if one of the two participants can use the sword
            const valyrianSteelBladeHolder = this.game.valyrianSteelBladeHolder;
            if (this.attacker == valyrianSteelBladeHolder || this.defender == valyrianSteelBladeHolder) {
                // This player may use the sword
                this.setChildGameState(new UseValyrianSteelBladeGameState(this)).firstStart(valyrianSteelBladeHolder);
                return;
            }
        }

        // Otherwise, proceed
        this.proceedResolveCombat();
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "combat-immediately-killed-units") {
            const region = this.world.regions.get(message.regionId);
            const killedUnits = message.unitIds.map(uid => region.units.get(uid));

            killedUnits.forEach(u => region.units.delete(u.id));
        } else if (message.type == "units-wounded") {
            const region = this.world.regions.get(message.regionId);
            const units = message.unitIds.map(uid => region.units.get(uid));

            units.forEach(u => u.wounded = true);
        } else {
            this.childGameState.onServerMessage(message);
        }
    }

    proceedToChooseGeneral(): void {
        this.setChildGameState(new ChooseHouseCardGameState(this)).firstStart();
    }

    proceedNextSupportDeclaration(): boolean {
        const nextHouseToDeclareSupport = this.getNextHouseToDeclareSupport();

        if (!nextHouseToDeclareSupport) {
            // All the necessary houses have declared support
            return false;
        }

        this.setChildGameState(new DeclareSupportGameState(this)).firstStart(nextHouseToDeclareSupport);

        return true;
    }

    getNextHouseToDeclareSupport(): House | null {
        const possibleSupportingHouses = this.getPossibleSupportingHouses();

        for (const house of this.game.getTurnOrder()) {
            if (possibleSupportingHouses.includes(house) && !this.supporters.has(house)) {
                // This house may support this combat, but has not yet declared his support yet
                return house;
            }
        }

        return null;
    }

    getHouseCardCombatStrength(house: House): number {
        return this.getStatOfHouseCard(
            house,
            hc => hc.combatStrength,
            (h, hc, a, ahc) => a.modifyCombatStrength(this, h, hc, ahc)
        );
    }

    getHouseCardSwordIcons(house: House): number {
        return this.getStatOfHouseCard(
            house,
            hc => hc.swordIcons,
            (h, hc, a, ahc) => a.modifySwordIcons(this, h, hc, ahc)
        );
    }

    getHouseCardTowerIcons(house: House): number {
        return this.getStatOfHouseCard(
            house,
            hc => hc.towerIcons,
            (h, hc, a, ahc) => a.modifyTowerIcons(this, h, hc, ahc)
        );
    }

    getStatOfHouseCard(
        affectedHouse: House,
        baseAmount: (hc: HouseCard) => number,
        abilityModify: (house: House, houseCard: HouseCard, ability: HouseCardAbility, affectedHouseCard: HouseCard) => number
    ): number {
        const affectedHouseCard = this.houseCombatDatas.get(affectedHouse).houseCard;

        if (affectedHouseCard == null) {
            return 0;
        }

        return this.getOrderResolutionHouseCard().reduce((s, h) => {
            const houseCard = this.houseCombatDatas.get(h).houseCard;

            if (houseCard == null) {
                return s;
            }

            return houseCard.ability ? s + abilityModify(h, houseCard, houseCard.ability, affectedHouseCard) : s;
        }, baseAmount(affectedHouseCard));
    }


    getOrderResolutionHouseCard(): House[] {
        return _.sortBy(this.houseCombatDatas.keys, [h => this.game.ironThroneTrack.indexOf(h)]);
    }

    getPossibleSupportingRegions(): {region: Region; support: SupportOrderType}[] {
        return this.actionGameState.getPossibleSupportingRegions(this.defendingRegion);
    }

    getPossibleSupportingHouses(): House[] {
        return _.uniq(
            this.getPossibleSupportingRegions()
            // Since a region that contains units _must_ be controlled by a house,
            // r.getController() can be safely casted
            .map(({region}) => region.getController() as House)
        );
    }

    getTotalCombatStrength(house: House): number {
        return this.getBaseCombatStrength(house)
            + this.getOrderBonus(house)
            + this.getSupportStrengthForSide(house)
            + this.getValyrianBladeBonus(house)
            + this.getHouseCardCombatStrength(house);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedCombatGameState {
        return {
            type: "combat",
            attackerId: this.attacker.id,
            defenderId: this.defender.id,
            houseCombatDatas: this.houseCombatDatas.map((house, houseCombatData) => [house.id, {
                houseCardId: houseCombatData.houseCard ? houseCombatData.houseCard.id : null,
                army: houseCombatData.army.map(u => u.id),
                regionId: houseCombatData.region.id
            }]),
            supporters: this.supporters.entries.map(([house, supportedHouse]) => [house.id, supportedHouse ? supportedHouse.id : null]),
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(resolveMarchOrderGameState: ResolveMarchOrderGameState, data: SerializedCombatGameState): CombatGameState {
        const combatGameState = new CombatGameState(resolveMarchOrderGameState);

        combatGameState.attacker = resolveMarchOrderGameState.game.houses.get(data.attackerId);
        combatGameState.defender = resolveMarchOrderGameState.game.houses.get(data.defenderId);
        combatGameState.houseCombatDatas = new BetterMap(data.houseCombatDatas.map(([houseId, {regionId, houseCardId, army}]) => {
            const house = resolveMarchOrderGameState.game.houses.get(houseId);
            const region = resolveMarchOrderGameState.game.world.regions.get(regionId);

            return [
                house,
                {
                    army: army.map(uid => region.units.get(uid)),
                    region,
                    houseCard: houseCardId ? house.houseCards.get(houseCardId) : null
                }
            ]
        }));
        combatGameState.supporters = new BetterMap(
            data.supporters.map(([houseId, supportedHouseId]) => [
                resolveMarchOrderGameState.game.houses.get(houseId),
                supportedHouseId ? resolveMarchOrderGameState.game.houses.get(supportedHouseId) : null
            ])
        );
        combatGameState.childGameState = combatGameState.deserializeChildGameState(data.childGameState);

        return combatGameState;
    }

    deserializeChildGameState(data: SerializedCombatGameState["childGameState"]): CombatGameState["childGameState"] {
        switch (data.type) {
            case "support":
                return DeclareSupportGameState.deserializeFromServer(this, data);
            case "choose-house-card":
                return ChooseHouseCardGameState.deserializeFromServer(this, data);
            case "use-valyrian-steel-blade":
                return UseValyrianSteelBladeGameState.deserializeFromServer(this, data);
            case "post-combat":
                return PostCombatGameState.deserializeFromServer(this, data);
            case "immediately-house-card-abilities-resolution":
                return ImmediatelyHouseCardAbilitiesResolutionGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedCombatGameState {
    type: "combat";
    attackerId: string;
    defenderId: string;
    supporters: [string, string | null][];
    houseCombatDatas: [string, {houseCardId: string | null; army: number[]; regionId: string}][];
    childGameState: SerializedDeclareSupportGameState | SerializedChooseHouseCardGameState
        | SerializedUseValyrianSteelBladeGameState | SerializedPostCombatGameState
        | SerializedImmediatelyHouseCardAbilitiesResolutionGameState;
}
