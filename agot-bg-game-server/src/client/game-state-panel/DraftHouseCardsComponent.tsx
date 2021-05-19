import {Component, ReactNode} from "react";
import * as React from "react";
import {observer} from "mobx-react";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import renderChildGameState from "../utils/renderChildGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import DraftHouseCardsGameState from "../../common/ingame-game-state/draft-house-cards-game-state/DraftHouseCardsGameState";
import SelectHouseCardGameState from "../../common/ingame-game-state/select-house-card-game-state/SelectHouseCardGameState";
import SelectHouseCardComponent from "./SelectHouseCardComponent";

@observer
export default class DraftHouseCardsComponent extends Component<GameStateComponentProps<DraftHouseCardsGameState>> {
    render(): ReactNode {
        return (
            <>
                <ListGroupItem>
                    <Row className="mt-1 mb-3 justify-content-center">
                        <div style={{textAlign: "center"}}><b>{this.props.gameState.childGameState.house.name}</b> must select one house card.</div>
                    </Row>
                    <Row>
                        {renderChildGameState(this.props, [
                            [SelectHouseCardGameState, SelectHouseCardComponent]
                        ])}
                    </Row>
                </ListGroupItem>
            </>
        );
    }
}
