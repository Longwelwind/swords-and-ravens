import { t } from "./i18n";
import { Component, ReactNode } from "react";
import * as React from "react";
import FormCheck from "react-bootstrap/FormCheck";
import Col from "react-bootstrap/Col";
import { OverlayTrigger, Tooltip, Row } from "react-bootstrap";
import User from "../server/User";
import EntireGame from "../common/EntireGame";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import { observable, runInAction } from "mobx";
import { observer } from "mobx-react";

interface UserSettingsComponentProps {
  entireGame: EntireGame;
  user: User | null;
}

@observer
export default class UserSettingsComponent extends Component<UserSettingsComponentProps> {
  @observable accessor mapScrollbar = false;
  @observable accessor chatHouseNames = false;
  @observable accessor gameStateColumnRight = false;

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
                            {t(
                              "userSettings.showHouseNamesInsteadOfUserNamesInChat39166c"
                            )}
                          </Tooltip>
                        }
                      >
                        <label htmlFor="chat-house-names-setting">
                          {t("userSettings.houseNamesForChat3f6aa0")}
                        </label>
                      </OverlayTrigger>
                    }
                    checked={this.chatHouseNames}
                    onChange={() => {
                      runInAction(() => {
                        this.chatHouseNames = !this.chatHouseNames;
                        this.changeUserSettings();
                      });
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
                            {t(
                              "userSettings.enablesAFixedGameMapWithAScrollbarTheab9619"
                            )}
                          </Tooltip>
                        }
                      >
                        <label htmlFor="map-scrollbar-setting">
                          {t("userSettings.mapScrollbarDesktopOnlye10676")}
                        </label>
                      </OverlayTrigger>
                    }
                    checked={this.mapScrollbar}
                    onChange={() => {
                      runInAction(() => {
                        this.mapScrollbar = !this.mapScrollbar;
                        this.changeUserSettings();
                      });
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
                            {t(
                              "userSettings.thisSettingSwapsTheHousesColumnWithTheGamef7fbda"
                            )}
                          </Tooltip>
                        }
                      >
                        <label htmlFor="game-state-column-right-setting">
                          {t("userSettings.gameStateColumnOnTheRight623f5d")}
                        </label>
                      </OverlayTrigger>
                    }
                    checked={this.gameStateColumnRight}
                    onChange={() => {
                      runInAction(() => {
                        this.gameStateColumnRight = !this.gameStateColumnRight;
                        this.changeUserSettings();
                      });
                    }}
                  />
                </Col>
              </Row>
              <Row className="justify-content-center mt-1 mb-1">
                <Col xs="auto" className="p-0">
                  <a
                    href="https://faq.swordsandravens.net"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("common.faq")}
                  </a>
                </Col>
              </Row>
            </div>
          )}
      </>
    );
  }

  componentDidMount(): void {
    if (this.props.user) {
      const user = this.props.user;
      runInAction(() => {
        this.mapScrollbar = user.settings.mapScrollbar;
        this.chatHouseNames = user.settings.chatHouseNames;
        this.gameStateColumnRight = user.settings.gameStateColumnRight;
      });
    }
  }

  changeUserSettings(): void {
    if (this.props.user) {
      this.props.user.settings.mapScrollbar = this.mapScrollbar;
      this.props.user.settings.chatHouseNames = this.chatHouseNames;
      this.props.user.settings.gameStateColumnRight = this.gameStateColumnRight;
      this.props.user.syncSettings();
    }
  }
}
