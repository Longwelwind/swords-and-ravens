import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import TyrionLannisterAbilityGameState
    from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/cancel-house-card-abilities-game-state/tyrion-lannister-ability-game-state/TyrionLannisterAbilityGameState";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import SelectHouseCardGameState
    from "../../../common/ingame-game-state/select-house-card-game-state/SelectHouseCardGameState";
import SelectHouseCardComponent from "../SelectHouseCardComponent";
import CombatGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import House from "../../../common/ingame-game-state/game-data-structure/House";

@observer
export default class TyrionLannisterAbilityComponent extends Component<GameStateComponentProps<TyrionLannisterAbilityGameState>> {
    get gameState(): TyrionLannisterAbilityGameState {
        return this.props.gameState;
    }

    get combat(): CombatGameState {
        return this.gameState.combatGameState;
    }

    get simpleChoice(): SimpleChoiceGameState | null {
        return this.gameState.childGameState instanceof SimpleChoiceGameState ? this.gameState.childGameState : null;
    }

    get selectHouseCards(): SelectHouseCardGameState<TyrionLannisterAbilityGameState> | null {
        return this.gameState.childGameState instanceof SelectHouseCardGameState ? this.gameState.childGameState : null;
    }

    get house(): House {
        if (this.simpleChoice) {
            return this.gameState.childGameState.house;
        } else if (this.selectHouseCards) {
            return this.combat.getEnemy(this.gameState.childGameState.house);
        }

        throw new Error("Tyrion Lannister childGameState must be instance of SimpleChoice or SelectHouseCard!");
    }

    get enemy(): House {
        return this.combat.getEnemy(this.house);
    }

    render(): ReactNode {
        return (
            <>
                {this.simpleChoice && (
                    <Col xs={12}>
                        <b>Tyrion Lannister</b>: House <b>{this.house.name}</b> may
                        cancel <b>{this.enemy.name}&apos;s</b> house card.
                    </Col>
                )}
                {this.selectHouseCards && (
                    <Col xs={12}>
                        <b>Tyrion Lannister</b>: House <b>{this.enemy.name}</b> has to choose a new house card.
                    </Col>
                )}
                {renderChildGameState(this.props, [
                    [SimpleChoiceGameState, SimpleChoiceComponent],
                    [SelectHouseCardGameState, SelectHouseCardComponent]
                ])}
            </>
        );
    }
}
