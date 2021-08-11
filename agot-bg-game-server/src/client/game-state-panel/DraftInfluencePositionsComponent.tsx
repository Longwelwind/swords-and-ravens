import {Component, ReactNode} from "react";
import * as React from "react";
import {observer} from "mobx-react";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import renderChildGameState from "../utils/renderChildGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import Player from "../../common/ingame-game-state/Player";
import House from "../../common/ingame-game-state/game-data-structure/House";
import SimpleChoiceGameState from "../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "./SimpleChoiceComponent";
import DraftInfluencePositionsGameState from "../../common/ingame-game-state/draft-influence-positions-game-state/DraftInfluencePositionsGameState";

@observer
export default class DraftInfluencePositionsComponent extends Component<GameStateComponentProps<DraftInfluencePositionsGameState>> {
    get house(): House {
        return this.props.gameState.childGameState.house;
    }

    get player(): Player | null {
        return this.props.gameClient.authenticatedPlayer;
    }

    get doesControlHouse(): boolean {
        return this.props.gameClient.doesControlHouse(this.house);
    }

    render(): ReactNode {
        return (
            <>
                {this.props.gameState.currentColumnIndex > -1 && this.props.gameState.currentRowIndex > -1 &&
                <ListGroupItem>
                    <Row className="mt-1 mb-3 justify-content-center">
                        <div style={{textAlign: "center"}}><b>{this.house.name}</b> must choose one Influence track.</div>
                    </Row>
                    <Row>
                        <p>
                            These are the next houses: {this.props.gameState.getNextHouses().map(h => h.name).join(", ")}
                        </p>
                    </Row>
                    {this.doesControlHouse &&
                    <Row>
                        {renderChildGameState(this.props, [
                            [SimpleChoiceGameState, SimpleChoiceComponent]
                        ])}
                    </Row>}
                </ListGroupItem>}
            </>
        );
    }
}
