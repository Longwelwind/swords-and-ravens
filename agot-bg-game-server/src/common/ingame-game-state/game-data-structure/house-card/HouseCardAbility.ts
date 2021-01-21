import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import House from "../House";
import HouseCard from "./HouseCard";
import AfterWinnerDeterminationGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import Unit from "../Unit";
import ImmediatelyHouseCardAbilitiesResolutionGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/ImmediatelyHouseCardAbilitiesResolutionGameState";
import AfterCombatHouseCardAbilitiesGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";
import CancelHouseCardAbilitiesGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/cancel-house-card-abilities-game-state/CancelHouseCardAbilitiesGameState";
import DefenseOrderType from "../order-types/DefenseOrderType";
import PostCombatGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/PostCombatGameState";

export default class HouseCardAbility {
    id: string;
    description: string;

    constructor(id: string, description: string) {
        this.id = id;
        this.description = description;
    }

    cancel(cancelResolutionState: CancelHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        cancelResolutionState.childGameState.onHouseCardResolutionFinish(house);
    }

    afterCombat(afterCombat: AfterCombatHouseCardAbilitiesGameState, house: House, _houseCard: HouseCard): void {
        afterCombat.childGameState.onHouseCardResolutionFinish(house);
    }

    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, house: House, _houseCard: HouseCard): void {
        afterWinnerDetermination.childGameState.onHouseCardResolutionFinish(house);
    }

    immediatelyResolution(immediatelyResolutionState: ImmediatelyHouseCardAbilitiesResolutionGameState, house: House, _houseCard: HouseCard): void {
        immediatelyResolutionState.childGameState.onHouseCardResolutionFinish(house);
    }

    modifyHouseCardCombatStrength(_combat: CombatGameState, _house: House, _houseCard: HouseCard, _affectedHouseCard: HouseCard): number {
        return 0;
    }

    modifyTotalCombatStrength(_combat: CombatGameState, _house: House, _houseCard: HouseCard, _houseSide: House, _currentStrength: number): number {
        return 0;
    }

    modifySwordIcons(_combat: CombatGameState, _house: House, _houseCard: HouseCard, _affectedHouseCard: HouseCard): number {
        return 0;
    }

    modifyTowerIcons(_combat: CombatGameState, _house: House, _houseCard: HouseCard, _affectedHouseCard: HouseCard): number {
        return 0;
    }

    modifyUnitCombatStrength(_combat: CombatGameState, _house: House, _houseCard: HouseCard, _houseSide: House, _affectedUnit: Unit, _support: boolean, _currentStrength: number): number {
        return 0;
    }

    modifyDefenseOrderBonus(_combat: CombatGameState, _house: House, _houseCard: HouseCard, _houseSide: House, _defenseOrderType: DefenseOrderType, _currentBonus: number): number {
        return 0;
    }

    doesPreventAttackingArmyFromMoving(_postCombat: PostCombatGameState, _house: House, _houseCard: HouseCard): boolean {
        return false;
    }

    doesPreventCasualties(_combat: CombatGameState, _house: House, _houseCard: HouseCard, _affectedHouse: House): boolean {
        return false;
    }

    overrideRetreatLocationChooser(_postCombat: PostCombatGameState, _house: House, _houseCard: HouseCard, _retreater: House): House | null {
        return null;
    }

    forcesValyrianSteelBladeDecision(_combat: CombatGameState, _valyrianSteelBladeHolder: House): boolean {
        return false;
    }
}
