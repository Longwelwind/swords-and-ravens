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
import {ClientMessage, SupportTarget} from "../../../../../messages/ClientMessage";
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

export default class CombatGameState extends GameState<
    ResolveMarchOrderGameState,
    DeclareSupportGameState | ChooseHouseCardGameState | UseValyrianSteelBladeGameState
    | ChooseCasualtiesGameState | ChooseRetreatRegionGameState
> {
    attackingRegion: Region;
    combatRegion: Region;
    attacker: House;
    defender: House;
    army: Unit[];
    valyrianSteelBladeUser: House | null;
    attackerHouseCard: HouseCard | null;
    defenderHouseCard: HouseCard | null;
    winner: House | null;
    loser: House | null;

    supporters = new BetterMap<House, SupportTarget>();

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
        this.attackingRegion = attackerComingFrom;
        this.attacker = attacker;
        this.defender = defender;
        this.combatRegion = combatRegion;
        this.army = army;

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
        if (!this.attackerHouseCard || !this.defenderHouseCard) {
            throw new Error();
        }

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

        const locationLoserArmy = this.attacker == this.loser ? this.attackingRegion : this.combatRegion;
        const loserArmy = this.attacker == this.loser ? this.army : this.combatRegion.units.values;

        const winnerSwordIcons = this.attacker == this.winner ? this.attackerHouseCard.swordIcons : this.defenderHouseCard.swordIcons;
        const loserTowerIcons = this.attacker == this.loser ? this.attackerHouseCard.towerIcons : this.defenderHouseCard.towerIcons;

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

    getHouseCardCombatStrength(house: House): number {
        if (house != this.attacker && house != this.defender) {
            throw new Error(`getHouseCardCombatStrength was called with house "${house.id}" which isn't the attacker nor the defender`);
        }

        const houseCard = house == this.attacker ? this.attackerHouseCard : this.defenderHouseCard;

        return houseCard ? houseCard.combatStrength : 0;
    }

    getBaseCombatStrength(house: House): number {
        const army = this.attacker == house ? this.army : this.defender == house ? this.combatRegion.units.values : null;

        if (!army) {
            throw new Error("getBaseCombatStrength was called with house \"" + house.id + "\" which isn't the attacker nor the defender");
        }

        const isAttackingAStructure = this.isAttackingAStructure(house);

        return this.game.getCombatStrengthOfArmy(army, isAttackingAStructure);
    }

    getOrderBonus(house: House): number {
        const army = this.attacker == house ? this.army : this.defender == house ? this.combatRegion.units.values : null;

        if (!army) {
            throw new Error("getBaseCombatStrength was called with house \"" + house.id + "\" which isn't the attacker nor the defender");
        }

        if (this.attacker == house) {
            if (this.actionGameState.ordersOnBoard.has(this.attackingRegion)) {
                const order = this.actionGameState.ordersOnBoard.get(this.attackingRegion);

                // This should technically always be true since the attack was triggered by
                // a march order in attackingRegion in the first place.
                if (order.type instanceof MarchOrderType) {
                    return order.type.attackModifier;
                }
            }
        } else {
            if (this.actionGameState.ordersOnBoard.has(this.combatRegion)) {
                const order = this.actionGameState.ordersOnBoard.get(this.combatRegion);

                if (order.type instanceof DefenseOrderType) {
                    return order.type.defenseModifier;
                }
            }
        }

        return 0;
    }

    getSupportStrengthForSide(house: House): number {
        const target = house == this.attacker ? SupportTarget.ATTACKER : house == this.defender ? SupportTarget.DEFENDER : SupportTarget.NONE;

        if (target == SupportTarget.NONE) {
            throw new Error("getSupportStrength was called with house \"" + house.id + "\" which isn't the attacker nor the defender");
        }

        return this.supporters.entries
            .filter(([_house, supportTarget]) => supportTarget == target)
            .map(([house, _]) => this.actionGameState.getSupportCombatStrength(house, this.combatRegion))
            .reduce(_.add, 0);
    }

    getValyrianBladeBonus(house: House): number {
        return house == this.valyrianSteelBladeUser ? 1 : 0;
    }

    isAttackingAStructure(house: House): boolean {
        if (house == this.attacker) {
            return this.combatRegion.castleLevel > 0;
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
            if (this.combatRegion.units.size > 0) {
                if (this.world.getValidRetreatRegions(this.combatRegion, this.loser, this.combatRegion.units.values).length > 0) {
                    // The defender must choose a retreat location
                    this.setChildGameState(new ChooseRetreatRegionGameState(this)).firstStart(this.loser, this.combatRegion, this.combatRegion.units.values);

                    return;
                } else {
                    // If there are no available retreat regions, kill all the remaining units
                    this.combatRegion.units.values.forEach(u => this.combatRegion.units.delete(u.id));

                    this.entireGame.broadcastToClients({
                        type: "remove-units",
                        regionId: this.combatRegion.id,
                        unitIds: this.combatRegion.units.values.map(u => u.id)
                    });
                }
            }
        }

        this.proceedEndOfCombat();
    }

    proceedEndOfCombat(): void {
        // If the attacker won, move his units to the attacked region
        if (this.winner == this.attacker) {
            this.resolveMarchOrderGameState.moveUnits(this.attackingRegion, this.army, this.combatRegion);
        } else {
            // If he lost, wound his units
            this.army.forEach(u => u.wounded = true);

            this.entireGame.broadcastToClients({
                type: "units-wounded",
                regionId: this.attackingRegion.id,
                unitIds: this.army.map(u => u.id)
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
        this.markHouseAsUsed(this.attacker, this.attackerHouseCard);
        this.markHouseAsUsed(this.defender, this.defenderHouseCard);

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

    getPossibleSupportingHouses(): House[] {
        return _.uniq(
            this.actionGameState.getPossibleSupportingRegions(this.combatRegion)
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
            attackingRegionId: this.attackingRegion.id,
            combatRegionId: this.combatRegion.id,
            attackerId: this.attacker.id,
            defenderId: this.defender.id,
            army: this.army.map(u => u.id),
            attackerHouseCard: this.attackerHouseCard ? this.attackerHouseCard.id : null,
            defenderHouseCard: this.defenderHouseCard ? this.defenderHouseCard.id : null,
            winner: this.winner ? this.winner.id : null,
            loser: this.loser ? this.loser.id : null,
            supporters: this.supporters.entries.map(([house, supportTarget]) => [house.id, supportTarget]),
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(resolveMarchOrderGameState: ResolveMarchOrderGameState, data: SerializedCombatGameState): CombatGameState {
        const combatGameState = new CombatGameState(resolveMarchOrderGameState);

        combatGameState.attackingRegion = resolveMarchOrderGameState.world.regions.get(data.attackingRegionId);
        combatGameState.attacker = resolveMarchOrderGameState.game.houses.get(data.attackerId);
        combatGameState.defender = resolveMarchOrderGameState.game.houses.get(data.defenderId);
        combatGameState.winner = data.winner ? resolveMarchOrderGameState.game.houses.get(data.winner) : null;
        combatGameState.loser = data.loser ? resolveMarchOrderGameState.game.houses.get(data.loser) : null;
        combatGameState.army = data.army.map(uid => combatGameState.attackingRegion.units.get(uid));
        combatGameState.combatRegion = resolveMarchOrderGameState.world.regions.get(data.combatRegionId);
        combatGameState.supporters = new BetterMap<House, SupportTarget>(
            data.supporters.map(([houseId, supportTarget]) => [resolveMarchOrderGameState.game.houses.get(houseId), supportTarget])
        );
        combatGameState.attackerHouseCard = data.attackerHouseCard ? combatGameState.attacker.houseCards.get(data.attackerHouseCard) : null;
        combatGameState.defenderHouseCard = data.defenderHouseCard ? combatGameState.defender.houseCards.get(data.defenderHouseCard) : null;

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
    attackingRegionId: string;
    combatRegionId: string;
    attackerId: string;
    defenderId: string;
    winner: string | null;
    loser: string | null;
    army: number[];
    supporters: [string, SupportTarget][];
    attackerHouseCard: string | null;
    defenderHouseCard: string | null;
    childGameState: SerializedDeclareSupportGameState | SerializedChooseHouseCardGameState
        | SerializedUseValyrianSteelBladeGameState | SerializedChooseCasualtiesGameState
        | SerializedChooseRetreatRegionGameState;
}
