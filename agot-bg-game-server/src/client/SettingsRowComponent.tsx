import {observer} from "mobx-react";
import {Component, default as React, ReactNode} from "react";
import GameClient from "./GameClient";
import User from "../server/User";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Button from "react-bootstrap/Button";
import envelopeImage from "../../public/images/icons/envelope.svg";
import Col from "react-bootstrap/Col";

interface SettingsRowProps {
    gameClient: GameClient;
    authenticatedUser: User;
}

@observer
export default class SettingsRowComponent extends Component<SettingsRowProps> {
    render(): ReactNode {
        return (
            <Col xs="auto">
                <OverlayTrigger
                    overlay={
                        <Tooltip id="pbem">
                            <strong>PBEM</strong>
                        </Tooltip>
                    }
                    placement="auto"
                >
                    <Button
                        className="p-1"
                        variant={this.props.authenticatedUser.settings.pbemMode ? "light" : "outline-light"}
                        onClick={() => this.togglePbem()}
                    >
                        <img src={envelopeImage} width={32}/>
                    </Button>
                </OverlayTrigger>
            </Col>
        );
    }

    togglePbem(): void {
        this.props.authenticatedUser.settings.pbemMode = !this.props.authenticatedUser.settings.pbemMode;
        this.refreshSetting();
    }

    refreshSetting(): void {
        this.props.authenticatedUser.syncSettings();
    }
}
