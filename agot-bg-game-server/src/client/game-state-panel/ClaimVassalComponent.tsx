import React, { Component, ReactNode } from "react";
import { observer } from "mobx-react";
import GameStateComponentProps from "./GameStateComponentProps";
import ClaimVassalGameState from "../../common/ingame-game-state/planning-game-state/claim-vassals-game-state/claim-vassal-game-state/ClaimVassalGameState";
import Col from "react-bootstrap/Col";
import House from "../../common/ingame-game-state/game-data-structure/House";
import Form from "react-bootstrap/FormGroup";
import { FormCheck, Button } from "react-bootstrap";
import { observable } from "mobx";
import _ from "lodash";

@observer
export default class ClaimVassalComponent extends Component<GameStateComponentProps<ClaimVassalGameState>> {
    @observable selectedVassals: House[] = [];

    render(): ReactNode {
        return (
            <>
                <Col xs={12} className="text-center">
                    <strong>{this.props.gameState.house.name}</strong> may command <b>{this.props.gameState.count}</b> Vassal{this.props.gameState.count > 0 && "s"} house this turn.
                </Col>
                <Col xs={12} className="text-center">
                    {this.props.gameClient.doesControlHouse(this.props.gameState.house) ? (
                        <div>
                            {this.props.gameState.getClaimableVassals().map(h => (
                                <div key={h.id}>
                                    <FormCheck
                                        type="checkbox"
                                        id={"vassal-" + h.id}
                                        label={h.name}
                                        checked={this.selectedVassals.includes(h)}
                                        onChange={() => this.onChange(h)} />
                                </div>
                            ))}
                            <Button onClick={() => this.onClick()}>Claim</Button>
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

    onClick(): void {
        this.props.gameState.choose(this.selectedVassals);
    }
}
