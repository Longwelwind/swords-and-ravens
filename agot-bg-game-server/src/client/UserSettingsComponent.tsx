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

interface UserSettingsComponentProps {
  entireGame: EntireGame;
  user: User | null;
}

@observer
export default class UserSettingsComponent extends Component<UserSettingsComponentProps> {
  @observable mapScrollbar = false;
  @observable chatHouseNames = false;
  @observable responsiveLayout = false;

  render(): ReactNode {
    return (
      <>
        {this.props.user &&
          this.props.entireGame.childGameState instanceof IngameGameState && (
            <div className="mt-3">
              <Row>
                <Col xs="auto">
                  <FormCheck
                    id="chat-house-names-setting"
                    type="switch"
                    label={
                      <OverlayTrigger
                        overlay={
                          <Tooltip id="chat-house-names-tooltip">
                            Show house names instead of user names in chat
                            windows.
                          </Tooltip>
                        }
                      >
                        <label htmlFor="chat-house-names-setting">
                          House names for chat
                        </label>
                      </OverlayTrigger>
                    }
                    checked={this.chatHouseNames}
                    onChange={() => {
                      this.chatHouseNames = !this.chatHouseNames;
                      this.changeUserSettings();
                    }}
                  />
                </Col>
              </Row>
              <Row>
                <Col xs="auto">
                  <FormCheck
                    id="map-scrollbar-setting"
                    type="switch"
                    label={
                      <OverlayTrigger
                        overlay={
                          <Tooltip id="map-scrollbar-tooltip">
                            Enables a fixed game map with a scrollbar. The map
                            height then resizes with the actual window height.
                            Keeping it activated won&apos;t affect the mobile
                            experience.
                          </Tooltip>
                        }
                      >
                        <label htmlFor="map-scrollbar-setting">
                          Map scrollbar (Desktop only)
                        </label>
                      </OverlayTrigger>
                    }
                    checked={this.mapScrollbar}
                    onChange={() => {
                      this.mapScrollbar = !this.mapScrollbar;
                      this.changeUserSettings();
                    }}
                  />
                </Col>
              </Row>
              <Row>
                <Col xs="auto">
                  <FormCheck
                    id="game-state-column-right-setting"
                    type="switch"
                    label={
                      <OverlayTrigger
                        overlay={
                          <Tooltip id="game-state-column-right-setting-tooltip">
                            This setting swaps the houses column with the game
                            state column, so that the game state column is
                            displayed to the right of the map.
                          </Tooltip>
                        }
                      >
                        <label htmlFor="game-state-column-right-setting">
                          Game state column on the right
                        </label>
                      </OverlayTrigger>
                    }
                    checked={this.responsiveLayout}
                    onChange={() => {
                      this.responsiveLayout = !this.responsiveLayout;
                      this.changeUserSettings();
                    }}
                  />
                </Col>
              </Row>
              <Row className="justify-content-center mt-1 mb-1">
                <a
                  href="https://faq.swordsandravens.net"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  FAQ
                </a>
              </Row>
            </div>
          )}
      </>
    );
  }

  componentDidMount(): void {
    if (this.props.user) {
      this.mapScrollbar = this.props.user.settings.mapScrollbar;
      this.chatHouseNames = this.props.user.settings.chatHouseNames;
      this.responsiveLayout = this.props.user.settings.responsiveLayout;
    }
  }

  changeUserSettings(): void {
    if (this.props.user) {
      this.props.user.settings.mapScrollbar = this.mapScrollbar;
      this.props.user.settings.chatHouseNames = this.chatHouseNames;
      this.props.user.settings.responsiveLayout = this.responsiveLayout;
      this.props.user.syncSettings();
    }
  }
}
