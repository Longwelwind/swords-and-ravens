import { Component, ReactNode } from "react";
import React from "react";
import present from "../../public/images/icons/present.svg"
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import House from "../common/ingame-game-state/game-data-structure/House";
import { Button, Col, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import Player from "../common/ingame-game-state/Player";
import Game from "../common/ingame-game-state/game-data-structure/Game";
import { observer } from "mobx-react";
import { observable } from "mobx";
import { preventOverflow } from "@popperjs/core";

interface GiftPowerTokensComponentProps {
    toHouse: House;
    ingame: IngameGameState;
    authenticatedPlayer: Player;
}

@observer
export default class GiftPowerTokensComponent extends Component<GiftPowerTokensComponentProps> {
    @observable powerTokens = 0;

    get house(): House {
        return this.props.authenticatedPlayer.house;
    }

    get toHouse(): House {
        return this.props.toHouse;
    }

    get game(): Game {
        return this.props.ingame.game;
    }

    render(): ReactNode {
        return <>
            <Col xs={12}>
                <Row className="justify-content-center">
                    <Col xs="auto">
                        <OverlayTrigger overlay={
                            <Tooltip id="gift-power-tokens-tooltip">
                                Gift Power tokens to<br/>house <b>{this.toHouse.name}</b>
                            </Tooltip>}
                            popperConfig={{modifiers: [preventOverflow]}}
                            placement="auto">
                            <div style={{backgroundImage: `url(${present})`, width: 24, height: 24}}/>
                        </OverlayTrigger>
                    </Col>
                    <Col xs="auto">
                        <input
                            type="range"
                            className="custom-range"
                            min={0}
                            max={this.house.powerTokens}
                            value={this.powerTokens}
                            onChange={e => {
                                this.powerTokens = parseInt(e.target.value);
                            }}
                            disabled={!this.canGiftPowerTokens()}
                        />
                    </Col>
                    <Col xs="auto">
                        <div style={{ marginLeft: "5px" }}>
                            <b>{this.powerTokens}</b>
                        </div>
                    </Col>
                </Row>
            </Col>
            <Col xs="auto" className="text-center">
                <Button
                    onClick={() => {
                        this.props.ingame.giftPowerTokens(this.toHouse, this.powerTokens);
                        this.powerTokens = 0;
                        document.body.click();
                    }}
                    disabled={!this.canGiftPowerTokens()}
                >
                    Confirm
                </Button>
            </Col>
        </>;
    }

    canGiftPowerTokens(): boolean {
        return this.house.powerTokens > 0 && this.props.ingame.canGiftPowerTokens();
    }
}