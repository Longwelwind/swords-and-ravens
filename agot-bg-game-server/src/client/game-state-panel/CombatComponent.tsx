import {observer} from "mobx-react";
import {Component} from "react";
import CombatGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import DeclareSupportGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/declare-support-game-state/DeclareSupportGameState";
import DeclareSupportComponent from "./DeclareSupportComponent";
import * as React from "react";
import ChooseHouseCardGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/choose-house-card-game-state/ChooseHouseCardGameState";
import ChooseHouseCardComponent from "./ChooseHouseCardComponent";
import UseValyrianSteelBladeGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/use-valyrian-steel-blade-game-state/UseValyrianSteelBladeGameState";
import UseValyrianSteelBladeComponent from "./UseValyrianSteelBladeComponent";
import ChooseCasualtiesGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/choose-casualties-game-state/ChooseCasualtiesGameState";
import ChooseCasualtiesComponent from "./ChooseCasualtiesComponent";
import ChooseRetreatRegionGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/choose-retreat-region-game-state/ChooseRetreatRegionGameState";
import ChooseRetreatRegionComponent from "./ChooseRetreatRegionComponent";
import House from "../../common/ingame-game-state/game-data-structure/House";
import GameStateComponentProps from "./GameStateComponentProps";
import renderChildGameState from "../utils/renderChildGameState";
import Table from "react-bootstrap/Table";

@observer
export default class CombatComponent extends Component<GameStateComponentProps<CombatGameState>> {
    get combatGameState(): CombatGameState {
        return this.props.gameState;
    }

    get attacker(): House {
        return this.combatGameState.attacker;
    }

    get defender(): House {
        return this.combatGameState.defender;
    }

    render() {
        return (
            <>
                <div>
                    <Table size="sm">
                        <thead>
                            <tr>
                                <th></th>
                                <th>Attacker ({this.props.gameState.attacker.name})</th>
                                <th>Defender ({this.props.gameState.defender.name})</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Region</td>
                                <td>{this.combatGameState.attackingRegion.name}</td>
                                <td>{this.combatGameState.combatRegion.name}</td>
                            </tr>
                            <tr>
                                <td>Army</td>
                                <td>
                                    {this.combatGameState.getBaseCombatStrength(this.attacker)} (+
                                    {this.combatGameState.getOrderBonus(this.combatGameState.attacker)})
                                </td>
                                <td>
                                    {this.combatGameState.getBaseCombatStrength(this.defender)} (+
                                    {this.combatGameState.getOrderBonus(this.combatGameState.defender)})
                                </td>
                            </tr>
                            <tr>
                                <td>Support</td>
                                <td>{this.combatGameState.getSupportStrengthForSide(this.attacker)}</td>
                                <td>{this.combatGameState.getSupportStrengthForSide(this.defender)}</td>
                            </tr>
                            <tr>
                                <td>House Card</td>
                                <td>{this.combatGameState.getHouseCardCombatStrength(this.attacker)}</td>
                                <td>{this.combatGameState.getHouseCardCombatStrength(this.defender)}</td>
                            </tr>
                            <tr>
                                <td>Valyrian Steel Blade</td>
                                <td>{this.combatGameState.getValyrianBladeBonus(this.attacker)}</td>
                                <td>{this.combatGameState.getValyrianBladeBonus(this.defender)}</td>
                            </tr>
                            <tr>
                                <td>Total</td>
                                <td>{this.combatGameState.getTotalCombatStrength(this.attacker)}</td>
                                <td>{this.combatGameState.getTotalCombatStrength(this.defender)}</td>
                            </tr>
                        </tbody>
                    </Table>
                </div>
                {renderChildGameState(this.props, [
                    [DeclareSupportGameState, DeclareSupportComponent],
                    [ChooseHouseCardGameState, ChooseHouseCardComponent],
                    [UseValyrianSteelBladeGameState, UseValyrianSteelBladeComponent],
                    [ChooseCasualtiesGameState, ChooseCasualtiesComponent],
                    [ChooseRetreatRegionGameState, ChooseRetreatRegionComponent]
                ])}
            </>
        );
    }
}
