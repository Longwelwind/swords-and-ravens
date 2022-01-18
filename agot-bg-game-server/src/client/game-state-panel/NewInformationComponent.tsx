import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import renderChildGameState from "../utils/renderChildGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import Col from "react-bootstrap/Col";
import SelectObjectiveCardsGameState from "../../common/ingame-game-state/select-objective-cards-game-state/SelectObjectiveCardsGameState";
import SelectObjectiveCardsComponent from "./SelectObjectiveCardsComponent";
import NewInformationGameState from "../../common/ingame-game-state/westeros-game-state/new-information-game-state/NewInformationGameState";

@observer
export default class NewInformationComponent extends Component<GameStateComponentProps<NewInformationGameState>> {
    render(): ReactNode {
        return <>
                <Col xs={12} className="text-center">
                    Each house draws one Objective card and then chooses one Objective card in their hand and shuffles it back into the objective deck.
                </Col>
                {renderChildGameState(this.props, [
                    [SelectObjectiveCardsGameState, SelectObjectiveCardsComponent]
                ])}
        </>;
    }
}
