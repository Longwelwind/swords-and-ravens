import {Component, ReactNode} from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import * as React from "react";
import {Row} from "react-bootstrap";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import {observable} from "mobx";
import {observer} from "mobx-react";
import SelectWesterosCardGameState
    from "../../common/ingame-game-state/select-westeros-card-game-state/SelectWesterosCardGameState";
import WesterosCard from "../../common/ingame-game-state/game-data-structure/westeros-card/WesterosCard";
import WesterosCardComponent from "./utils/WesterosCardComponent";

@observer
export default class SelectWesterosCardComponent extends Component<GameStateComponentProps<SelectWesterosCardGameState<any>>> {
    @observable selectedWesterosCard: WesterosCard | null;
    render(): ReactNode {
        return (
            <>
                <Col xs={12}>
                    {this.props.gameClient.doesControlHouse(this.props.gameState.house) ? (
                        <Row className="justify-content-center">
                            <Col xs="12">
                                <Row className="justify-content-center">
                                    {this.props.gameState.westerosCards.map(wc => (
                                        // The house argument is used to decide which card-back is used
                                        // Since we will never show a back-card here, we can give whatever value fits.
                                        <Col xs="auto" key={wc.id}>
                                            <WesterosCardComponent
                                                cardType={wc.type}
                                                westerosDeckI={this.props.gameState.deckId}
                                                size="small"
                                                selected={this.selectedWesterosCard == wc}
                                                onClick={() => this.selectedWesterosCard != wc ? this.selectedWesterosCard = wc : this.selectedWesterosCard = null}
                                            />
                                        </Col>
                                    ))}
                                </Row>
                            </Col>
                            <Col xs="auto">
                                <Button onClick={() => this.confirm()} disabled={this.selectedWesterosCard == null}>
                                    Confirm
                                </Button>
                            </Col>
                        </Row>
                    ) : (
                        <div className="text-center">
                            Waiting for {this.props.gameState.house.name}...
                        </div>
                    )}
                </Col>
            </>
        );
    }

    confirm(): void {
        if (!this.selectedWesterosCard) {
            return;
        }
        this.props.gameState.select(this.selectedWesterosCard);
    }
}
