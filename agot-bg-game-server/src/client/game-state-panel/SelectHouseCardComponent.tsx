import {Component, ReactNode} from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import * as React from "react";
import {Row} from "react-bootstrap";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import {observable} from "mobx";
import {observer} from "mobx-react";
import SelectHouseCardGameState
    from "../../common/ingame-game-state/select-house-card-game-state/SelectHouseCardGameState";
import HouseCard from "../../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import HouseCardComponent from "./utils/HouseCardComponent";
import DraftHouseCardsGameState from "../../common/ingame-game-state/draft-house-cards-game-state/DraftHouseCardsGameState";
import _ from "lodash";

@observer
export default class SelectHouseCardComponent extends Component<GameStateComponentProps<SelectHouseCardGameState<any>>> {
    @observable selectedHouseCard: HouseCard | null;
    @observable nameFilter = "";

    render(): ReactNode {
        return (
            <>
                {this.props.gameClient.doesControlHouse(this.props.gameState.house) ? (
                <Col xs={12}>
                    {this.props.gameState.entireGame.hasChildGameState(DraftHouseCardsGameState) && <Row className="justify-content-center mb-2">
                        <input
                            className="form-control"
                            placeholder="Filter by house card name or strength"
                            type="text"
                            value={this.nameFilter}
                            onChange={e => this.nameFilter = e.target.value}
                            style={{width: 300}}
                        />
                    </Row>}
                    <Row className="justify-content-center">
                        <Col xs="12">
                            <Row className="justify-content-center">
                                {_.sortBy(this.props.gameState.houseCards, hc => -hc.combatStrength).map(hc => (
                                    // The house argument is used to decide which card-back is used
                                    // Since we will never show a back-card here, we can give whatever value fits.
                                    (this.nameFilter == "" || hc.name.toLowerCase().includes(this.nameFilter.toLowerCase()) || hc.combatStrength.toString().includes(this.nameFilter)) &&
                                    <Col xs="auto" key={`select-house-card_${hc.id}`}>
                                        <HouseCardComponent
                                            houseCard={hc}
                                            size="small"
                                            selected={this.selectedHouseCard == hc}
                                            onClick={() => this.selectedHouseCard != hc ? this.selectedHouseCard = hc : this.selectedHouseCard = null}
                                        />
                                    </Col>
                                ))}
                            </Row>
                        </Col>
                        <Col xs="auto" className="mt-3">
                            <Button variant="success" onClick={() => this.confirm()} disabled={this.selectedHouseCard == null}>
                                Confirm
                            </Button>
                        </Col>
                    </Row>
                </Col>)
                : (<Col xs={12}>
                    <Row className="justify-content-center">
                        Waiting for {this.props.gameState.house.name}...
                    </Row>
                </Col>)}
            </>
        );
    }

    confirm(): void {
        if (!this.selectedHouseCard) {
            return;
        }

        this.props.gameState.select(this.selectedHouseCard);
    }
}
