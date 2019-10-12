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
import HouseCard, {HouseCardState} from "../../../game-data-structure/house-card/HouseCard";
import ChooseCasualtiesGameState, {SerializedChooseCasualtiesGameState} from "./choose-casualties-game-state/ChooseCasualtiesGameState";
import ChooseRetreatRegionGameState, {SerializedChooseRetreatRegionGameState} from "./choose-retreat-region-game-state/ChooseRetreatRegionGameState";
import DefenseOrderType from "../../../game-data-structure/order-types/DefenseOrderType";
import MarchOrderType from "../../../game-data-structure/order-types/MarchOrderType";
import BetterMap from "../../../../../utils/BetterMap";
import HouseCardAbility from "../../../game-data-structure/house-card/HouseCardAbility";


export interface HouseCombatData {
    army: Unit[];
    region: Region;
    houseCard: HouseCard | null;
}

export default class CombatGameState extends GameState<
    ResolveMarchOrderGameState,
    DeclareSupportGameState | ChooseHouseCardGameState | UseValyrianSteelBladeGameState
    | ChooseCasualtiesGameState | ChooseRetreatRegionGameState
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
        const attackerTotalStrength = this.getTotalCombatStrength(this.attacker);
        const defenderTotalStrength = this.getTotalCombatStrength(this.defender);

        this.winner = attackerTotalStrength > defenderTotalStrength
            ? this.attacker
            : defenderTotalStrength > attackerTotalStrength
                ? this.defender
                : this.game.whoIsAheadInTrack(this.game.fiefdomsTrack, this.attacker, this.defender);
        this.loser = this.winner == this.attacker ? this.defender : this.attacker;

        this.entireGame.broadcastToClients({
            type: "combat-finished",
            winnerId: this.winner.id,
            loserId: this.loser.id
        });

        const locationLoserArmy = this.attacker == this.loser ? this.attackingRegion : this.defendingRegion;
        const loserArmy = this.attacker == this.loser ? this.attackingArmy : this.defendingArmy;

        const winnerSwordIcons = this.attacker == this.winner
            ? this.getHouseCardSwordIcons(this.attacker)
            : this.getHouseCardSwordIcons(this.defender);
        const loserTowerIcons = this.attacker == this.loser
            ? this.attackerHouseCard
                ? this.attackerHouseCard.towerIcons
                : 0
            : this.defenderHouseCard
                ? this.defenderHouseCard.towerIcons
                : 0;

        const loserCasualtiesCount = Math.max(0, winnerSwordIcons - loserTowerIcons);

        // All units of the loser army that can't retreat or are wounded are immediately killed
        const immediatelyKilledLoserUnits = loserArmy.filter(u => u.wounded || !u.type.canRetreat);

        if (immediatelyKilledLoserUnits.length > 0) {
            immediatelyKilledLoserUnits.forEach(u => locationLoserArmy.units.delete(u.id));

            this.entireGame.broadcastToClients({
                type: "combat-immediately-killed-units",
                regionId: locationLoserArmy.id,
                unitIds: immediatelyKilledLoserUnits.map(u => u.id)
            });
        }

        const loserArmyLeft = _.difference(loserArmy, immediatelyKilledLoserUnits);

        this.entireGame.log(
            `Combat result`,
            ``,
            `| | Attacker | Defender |`,
            `|-|-|-|`,
            `| Army | ${this.getBaseCombatStrength(this.attacker)} (+${this.getOrderBonus(this.attacker)}) | ${this.getBaseCombatStrength(this.defender)} (+${this.getOrderBonus(this.defender)}) |`,
            `| Support | ${this.getSupportStrengthForSide(this.attacker)} | ${this.getSupportStrengthForSide(this.defender)} |`,
            `| House Card | ${this.getHouseCardCombatStrength(this.attacker)} | ${this.getHouseCardCombatStrength(this.defender)} |`,
            `| Valyrian Steel Blade | ${this.getValyrianBladeBonus(this.attacker)} | ${this.getValyrianBladeBonus(this.defender)} |`,
            `| Total | ${this.getTotalCombatStrength(this.attacker)} | ${this.getTotalCombatStrength(this.defender)} |`
        );

        if (loserCasualtiesCount > 0) {
            if (loserCasualtiesCount < loserArmyLeft.length) {
                this.setChildGameState(new ChooseCasualtiesGameState(this)).firstStart(this.loser, loserArmyLeft, loserCasualtiesCount);
            } else {
                // If the count of casualties is bigger or equal than the remaining army, a ChooseCasualtiesGameSTate
                // is not needed. The army left can be exterminated.
                this.onChooseCasualtiesGameStateEnd(locationLoserArmy, loserArmyLeft);
            }
        } else {
            this.proceedRetreat();
        }
    }

    getBaseCombatStrength(house: House): number {
        const army = this.houseCombatDatas.get(house).army;

        const isAttackingAStructure = this.isAttackingAStructure(house);

        return this.game.getCombatStrengthOfArmy(army, isAttackingAStructure);
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
            .map(([house, _]) => this.actionGameState.getSupportCombatStrength(house, this.defendingRegion))
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
        } else if (message.type == "combat-finished") {
            this.winner = this.game.houses.get(message.winnerId);
            this.loser = this.game.houses.get(message.loserId);
        } else {
            this.childGameState.onServerMessage(message);
        }
    }

    onChooseCasualtiesGameStateEnd(region: Region, selectedCasualties: Unit[]): void {
        // Remove the selected casualties
        selectedCasualties.forEach(u => region.units.delete(u.id));

        this.entireGame.broadcastToClients({
            type: "remove-units",
            regionId: region.id,
            unitIds: selectedCasualties.map(u => u.id)
        });

        if (this.loser == this.defender) {
            this.proceedRetreat();
            return;
        }

        this.proceedEndOfCombat();
    }

    proceedRetreat(): void {
        if (!this.loser) {
            throw new Error();
        }

        if (this.loser == this.defender) {
            // A retreat doesn't need to be done if there are no units left
            if (this.defendingRegion.units.size > 0) {
                if (this.world.getValidRetreatRegions(this.defendingRegion, this.loser, this.defendingRegion.units.values).length > 0) {
                    // The defender must choose a retreat location
                    this.setChildGameState(new ChooseRetreatRegionGameState(this)).firstStart(this.loser, this.defendingRegion, this.defendingRegion.units.values);

                    return;
                } else {
                    // If there are no available retreat regions, kill all the remaining units
                    this.defendingRegion.units.values.forEach(u => this.defendingRegion.units.delete(u.id));

                    this.entireGame.broadcastToClients({
                        type: "remove-units",
                        regionId: this.defendingRegion.id,
                        unitIds: this.defendingRegion.units.values.map(u => u.id)
                    });
                }
            }
        }

        this.proceedEndOfCombat();
    }

    proceedEndOfCombat(): void {
        // If the attacker won, move his units to the attacked region
        if (this.winner == this.attacker) {
            this.resolveMarchOrderGameState.moveUnits(this.attackingRegion, this.attackingArmy, this.defendingRegion);
        } else {
            // If he lost, wound his units
            this.attackingArmy.forEach(u => u.wounded = true);

            this.entireGame.broadcastToClients({
                type: "units-wounded",
                regionId: this.attackingRegion.id,
                unitIds: this.attackingArmy.map(u => u.id)
            });
        }

        // Remove the order
        // The order may not be present in the attacking region, e.g. with Loras Tyrell
        if (this.actionGameState.ordersOnBoard.has(this.attackingRegion)) {
            this.actionGameState.ordersOnBoard.delete(this.attackingRegion);
            this.entireGame.broadcastToClients({
                type: "action-phase-change-order",
                region: this.attackingRegion.id,
                order: null
            });
        }

        // Put the house cards as used, and if it's the last, retrieve all house cards.
        this.houseCombatDatas.forEach(({houseCard}, house) => this.markHouseAsUsed(house, houseCard));

        this.resolveMarchOrderGameState.onCombatGameStateEnd(this.attacker);
    }

    markHouseAsUsed(house: House, houseCard: HouseCard | null): void {
        if (houseCard) {
            houseCard.state = HouseCardState.USED;

            this.entireGame.broadcastToClients({
                type: "change-state-house-card",
                houseId: house.id,
                cardIds: [houseCard.id],
                state: HouseCardState.USED
            });
        }

        // If all cards are used or discarded, put all used as available,
        // except the one that has been used.
        if (house.houseCards.values.every(hc => hc.state == HouseCardState.USED || hc.state == HouseCardState.DISCARDED)) {
            const houseCardsToMakeAvailable = house.houseCards.values
                .filter(hc => hc != houseCard)
                .filter(hc => hc.state == HouseCardState.USED);

            houseCardsToMakeAvailable.forEach(hc => hc.state = HouseCardState.AVAILABLE);

            this.entireGame.broadcastToClients({
                type: "change-state-house-card",
                houseId: house.id,
                cardIds: houseCardsToMakeAvailable.map(hc => hc.id),
                state: HouseCardState.AVAILABLE
            });
        }
    }

    onChooseRetreatLocationGameStateEnd(house: House, startingRegion: Region, army: Unit[], retreatRegion: Region): void {
        // Mark those as wounded
        army.forEach(u => u.wounded = true);

        this.entireGame.broadcastToClients({
            type: "units-wounded",
            regionId: startingRegion.id,
            unitIds: army.map(u => u.id)
        });

        // Retreat those unit to this location
        army.forEach(u => startingRegion.units.delete(u.id));
        army.forEach(u => retreatRegion.units.set(u.id, u));

        this.entireGame.broadcastToClients({
            type: "move-units",
            from: startingRegion.id,
            to: retreatRegion.id,
            units: army.map(u => u.id)
        });

        this.proceedEndOfCombat();
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

    getPossibleSupportingHouses(): House[] {
        return _.uniq(
            this.actionGameState.getPossibleSupportingRegions(this.defendingRegion)
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
            winner: this.winner ? this.winner.id : null,
            loser: this.loser ? this.loser.id : null,
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
        combatGameState.winner = data.winner ? resolveMarchOrderGameState.game.houses.get(data.winner) : null;
        combatGameState.loser = data.loser ? resolveMarchOrderGameState.game.houses.get(data.loser) : null;
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

    deserializeChildGameState(data: SerializedCombatGameState["childGameState"]): DeclareSupportGameState | ChooseHouseCardGameState | UseValyrianSteelBladeGameState | ChooseCasualtiesGameState | ChooseRetreatRegionGameState {
        if (data.type == "support") {
            return DeclareSupportGameState.deserializeFromServer(this, data);
        } else if (data.type == "choose-house-card") {
            return ChooseHouseCardGameState.deserializeFromServer(this, data);
        } else if (data.type == "use-valyrian-steel-blade") {
            return UseValyrianSteelBladeGameState.deserializeFromServer(this, data);
        } else if (data.type == "choose-casualties") {
            return ChooseCasualtiesGameState.deserializeFromServer(this, data);
        } else if (data.type == "choose-retreat-region") {
            return ChooseRetreatRegionGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedCombatGameState {
    type: "combat";
    attackerId: string;
    defenderId: string;
    winner: string | null;
    loser: string | null;
    supporters: [string, string | null][];
    houseCombatDatas: [string, {houseCardId: string | null; army: number[]; regionId: string}][];
    childGameState: SerializedDeclareSupportGameState | SerializedChooseHouseCardGameState
        | SerializedUseValyrianSteelBladeGameState | SerializedChooseCasualtiesGameState
        | SerializedChooseRetreatRegionGameState;
}
