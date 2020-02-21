import {observer} from "mobx-react";
import * as React from "react";
import {Component} from "react";
import ChooseHouseCardGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/choose-house-card-game-state/ChooseHouseCardGameState";
import HouseCard from "../../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import HouseCardComponent from "./utils/HouseCardComponent";
import { observable } from "mobx";

@observer
export default class ChooseHouseCardComponent extends Component<GameStateComponentProps<ChooseHouseCardGameState>> {
    @observable selectedHouseCard: HouseCard | null;
    
    render(): JSX.Element {
        return (
            <>
                <Col xs={12}>
                    The attacker and the defender must choose a House Card
                </Col>
                <Col xs={12}>
                    {this.shouldChooseHouseCard() ? (
                        <Row className="justify-content-center">
                            {this.getChoosableHouseCards().map(hc => (
                                <Col xs="auto" key={hc.id}>
                                    <HouseCardComponent
                                        houseCard={hc}
                                        size="small"
                                        selected={this.selectedHouseCard == hc}
                                        onClick={() => this.selectedHouseCard != hc ? this.selectedHouseCard = hc : this.selectedHouseCard = null}
                                    />
                                </Col>
                            ))}
                        </Row>
                    ) : (
                        <div>
                            Waiting for {this.props.gameState.getWaitingForHouses().map(h => h.name).join(" and ")} to choose their House Cards...
                        </div>
                    )}
                </Col>
                {this.shouldChooseHouseCard() && (
                    <Col xs="auto">
                        <Button onClick={() => this.chooseHouseCard()} disabled={this.selectedHouseCard == null}>
                            Confirm
                        </Button>
                    </Col>
                )}
            </>
        );
    }

    chooseHouseCard(): void {
        if(!this.selectedHouseCard) {
            return;
        }

        this.props.gameState.chooseHouseCard(this.selectedHouseCard);
    }

    shouldChooseHouseCard(): boolean {
        return this.props.gameState.getWaitingForHouses().some(h => this.props.gameClient.doesControlHouse(h));
    }

    getChoosableHouseCards(): HouseCard[] {
        if (!this.props.gameClient.authenticatedPlayer) {
            return [];
        }

        return this.props.gameState.getChoosableCards(this.props.gameClient.authenticatedPlayer.house).sort((a, b) => a.combatStrength - b.combatStrength);
    }
}
