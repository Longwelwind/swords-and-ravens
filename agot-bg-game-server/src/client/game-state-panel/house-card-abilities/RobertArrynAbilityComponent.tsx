import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import GameStateComponentProps from "../GameStateComponentProps";
import renderChildGameState from "../../utils/renderChildGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import RobertArrynAbilityGameState from "../../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/robert-arryn-ability-game-state/RobertArrynAbilityGameState";
import SelectHouseCardGameState from "../../../common/ingame-game-state/select-house-card-game-state/SelectHouseCardGameState";
import SelectHouseCardComponent from "../SelectHouseCardComponent";
import joinReactNodes from "../../../client/utils/joinReactNodes";
import House from "../../../common/ingame-game-state/game-data-structure/House";

@observer
export default class RobertArrynAbilityComponent extends Component<GameStateComponentProps<RobertArrynAbilityGameState>> {
    get gameState(): RobertArrynAbilityGameState {
        return this.props.gameState;
    }

    get house(): House {
        return this.gameState.childGameState.house;
    }

    get simpleChoice(): SimpleChoiceGameState | null {
        return this.gameState.childGameState instanceof SimpleChoiceGameState ? this.gameState.childGameState : null;
    }

    get selectHouseCard(): SelectHouseCardGameState<RobertArrynAbilityGameState> | null {
        return this.gameState.childGameState instanceof SelectHouseCardGameState ? this.gameState.childGameState : null;
    }

    render(): ReactNode {
        const possibleHouseCardToRemove = this.props.gameState.possibleEnemyHouseCards;
        return (
            <>
                {this.simpleChoice && (
                    <Col xs={12}>
                        <b>Robert Arryn</b>: House <b>{this.house.name}</b> may
                        remove <b>Robert Arryn</b> {possibleHouseCardToRemove && <>and {joinReactNodes(possibleHouseCardToRemove.map(hc => <b key={`robert_arryn_${hc.id}`}>{hc.name}</b>), " or ")} </>}from the game.
                    </Col>
                )}
                {this.selectHouseCard && (
                    <Col xs={12}>
                        <b>Robert Arryn</b>: Iron Throne holder <b>{this.house.name}</b> has to decide which house card to remove from the game.
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
