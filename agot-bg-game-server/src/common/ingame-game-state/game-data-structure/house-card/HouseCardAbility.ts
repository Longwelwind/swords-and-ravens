import CombatGameState from "../../action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import House from "../House";
import HouseCard from "./HouseCard";
import AfterWinnerDeterminationGameState
    from "../../action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import Unit from "../Unit";
import Region from "../Region";

export default class HouseCardAbility {
    id: string;
    description: string;

    constructor(id: string, description: string) {
        this.id = id;
        this.description = description;
    }

    afterWinnerDetermination(afterWinnerDetermination: AfterWinnerDeterminationGameState, _house: House, _houseCard: HouseCard): void {
        afterWinnerDetermination.onHouseCardResolutionFinish();
    }

    modifyCombatStrength(_combat: CombatGameState, _house: House, _houseCard: HouseCard, _affectedHouseCard: HouseCard): number {
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
}
