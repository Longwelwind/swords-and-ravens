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
import Player from "../../common/ingame-game-state/Player";
import { Col } from "react-bootstrap";
import HouseCardComponent from "./utils/HouseCardComponent";
import House from "../../common/ingame-game-state/game-data-structure/House";

@observer
export default class DraftHouseCardsComponent extends Component<GameStateComponentProps<DraftHouseCardsGameState>> {
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
        const availableCards = this.player && !this.doesControlHouse ? this.props.gameState.getFilteredHouseCardsForHouse(this.player.house) : [];
        return (
            <>
                <ListGroupItem>
                    <Row className="mt-1 mb-3 justify-content-center">
                        <div style={{textAlign: "center"}}><b>{this.house.name}</b> must select one house card.</div>
                    </Row>
                    <Row>
                        <p>
                            <b>Note</b>: All house cards work in a generic way.<br/>
                            That means house card abilities (e.g. Salladhor) referring to specific houses are always available for any house you use.<br/>
                            Character references are equivalent to the same-strength character in your hand (e.g. Reek and any 3-strength card).<br/>
                            References to capitals always refer to your house&apos;s home territory (e.g. Littlefinger).
                        </p>
                    </Row>
                    {this.doesControlHouse &&
                    <Row>
                        {renderChildGameState(this.props, [
                            [SelectHouseCardGameState, SelectHouseCardComponent]
                        ])}
                    </Row>}
                    {this.player && !this.doesControlHouse &&
                    <Row>
                        <Col xs="12">These are the house cards you could pick on your next turn:</Col>
                        <Col xs="12">
                            <Row className="justify-content-center">
                                {this.props.gameState.getAllHouseCards().map(hc => (
                                    <Col xs="auto" key={hc.id}>
                                        <HouseCardComponent
                                            houseCard={hc}
                                            size="small"
                                            unavailable={!availableCards.includes(hc)}
                                        />
                                    </Col>
                                ))}
                            </Row>
                        </Col>
                    </Row>}
                </ListGroupItem>
            </>
        );
    }
}
