import { Component, ReactNode } from "react";
import * as React from "react";
import FormCheck from "react-bootstrap/FormCheck";
import Col from "react-bootstrap/Col";
import { OverlayTrigger, Tooltip, Row } from "react-bootstrap";
import User from "../server/User";
import EntireGame from "../common/EntireGame";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import { observable } from "mobx";
import { observer } from "mobx-react";
import IngameComponent from "./IngameComponent";

interface UserSettingsComponentProps {
    entireGame: EntireGame;
    user: User | null;
    parent?: IngameComponent;
}

@observer
export default class UserSettingsComponent extends Component<UserSettingsComponentProps> {
    @observable mapScrollbar = false;

    render(): ReactNode {
        return (
            <>
                {this.props.user && this.props.entireGame.childGameState instanceof IngameGameState && (
                    <>
                        <Row>
                            <Col xs="auto">
                                <FormCheck
                                    id="map-scrollbar-setting"
                                    type="checkbox"
                                    label={
                                        <OverlayTrigger overlay={
                                            <Tooltip id="map-scrollbar-tooltip">
                                                Enables a fixed game map with a scrollbar. The map height then resizes with the actual window height.
                                            </Tooltip>}>
                                            <label htmlFor="map-scrollbar-setting">Map scrollbar</label>
                                        </OverlayTrigger>}
                                    checked={this.mapScrollbar}
                                    onChange={() => {
                                        this.mapScrollbar = !this.mapScrollbar;
                                        this.changeUserSettings();
                                    }}
                                />
                            </Col>
                        </Row>
                    </>
                )}
            </>
        );
    }

    componentDidMount(): void {
        if (this.props.user) {
            this.mapScrollbar = this.props.user.settings.mapScrollbar;
        }
    }

    changeUserSettings(): void {
        if (this.props.user) {
            this.props.user.settings.mapScrollbar = this.mapScrollbar;
            this.props.user.syncSettings();
        }

        if (this.props.parent) {
            this.props.parent.adjustMapHeight();
        }
    }
}