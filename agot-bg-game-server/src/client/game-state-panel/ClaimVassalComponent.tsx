import React, { Component, ReactNode } from "react";
import { observer } from "mobx-react";
import GameStateComponentProps from "./GameStateComponentProps";
import ClaimVassalGameState from "../../common/ingame-game-state/planning-game-state/claim-vassals-game-state/claim-vassal-game-state/ClaimVassalGameState";
import Col from "react-bootstrap/Col";
import House from "../../common/ingame-game-state/game-data-structure/House";
import { FormCheck, Button, Row } from "react-bootstrap";
import { observable } from "mobx";
import _ from "lodash";

@observer
export default class ClaimVassalComponent extends Component<GameStateComponentProps<ClaimVassalGameState>> {
    @observable selectedVassals: House[] = [];

    // todo vassals: Polish the UI
    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">
                    <strong>{this.props.gameState.house.name}</strong> may command <b>{this.props.gameState.count}</b> Vassal{this.props.gameState.count > 0 && "s"} house this turn.
                </Col>
                <Col xs={12}>
                    {this.props.gameClient.doesControlHouse(this.props.gameState.house) ? (
                        <div>
                            {this.props.gameState.claimableVassals.map(h => (
                                <Row key={h.id} className="mb-1">
                                    <FormCheck
                                        type="checkbox"
                                        id={"vassal-" + h.id}
                                        label={h.name}
                                        checked={this.selectedVassals.includes(h)}
                                        onChange={() => this.onChange(h)} />
                                </Row>
                            ))}
                            <Row>
                                <Button disabled={this.selectedVassals.length == 0} onClick={() => this.onClaimClick()}>Claim</Button>
                                <Button onClick={() => this.onPassClick()}>Pass</Button>
                            </Row>
                        </div>
                    ) : (
                        <>Waiting for {this.props.gameState.house.name}...</>
                    )}
                </Col>
            </>
        );
    }

    onChange(h: House): void {
        if (this.selectedVassals.includes(h)) {
            _.pull(this.selectedVassals, h);
        } else {
            if (this.selectedVassals.length == this.props.gameState.count) {
                return;
            } else {
                this.selectedVassals.push(h);
            }
        }
    }

    onClaimClick(): void {
        if (this.selectedVassals.length == 0) {
            return;
        }

        this.props.gameState.choose(this.selectedVassals);
    }

    
    onPassClick(): void {
        this.props.gameState.choose([]);
    }
}
