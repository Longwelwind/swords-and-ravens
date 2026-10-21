import { t, Trans } from "../i18n";
import { Component, ReactNode } from "react";
import * as React from "react";
import { observer } from "mobx-react";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import Player from "../../common/ingame-game-state/Player";
import { Button, Col } from "react-bootstrap";
import HouseCardComponent from "./utils/HouseCardComponent";
import { observable } from "mobx";
import HouseCard from "../../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import SelectedRandomDraftGameState from "../../common/ingame-game-state/draft-game-state/selected-random-draft-game-state/SelectedRandomDraftGameState";
import _ from "lodash";

@observer
export default class SelectedRandomDraftComponent extends Component<
  GameStateComponentProps<SelectedRandomDraftGameState>
> {
  @observable accessor nameFilter = "";
  @observable accessor selectedHouseCard: HouseCard | null = null;

  get player(): Player | null {
    return this.props.gameClient.authenticatedPlayer;
  }

  render(): ReactNode {
    return (
      <>
        <Row className="justify-content-center">
          <Col xs={12} className="text-center">
            {t(
              "selectedRandomDraft.allHousesChooseHouseCardsWhichThenAreRandomly235f23"
            )}
          </Col>
        </Row>
        <Row>
          <small>
            <Trans
              i18nKey="common.noteAllHouseCardsWorkInAGenericWay"
              components={{
                element0: <b />,
                element1: <br />,
                element2: <br />,
                element3: <br />
              }}
            />
          </small>
        </Row>
        {this.player &&
        this.props.gameState.unreadyPlayers.includes(this.player) ? (
          <>
            <Row className="mt-3 justify-content-center">
              <Col xs="12" className="text-center">
                {t("common.pleaseSelectAHouseCard")}
              </Col>
            </Row>
            <Row className="justify-content-center mb-2">
              <input
                className="form-control"
                placeholder={t("common.filterByHouseCardNameOrStrength")}
                type="text"
                value={this.nameFilter}
                onChange={(e) => (this.nameFilter = e.target.value)}
                style={{ width: 300 }}
              />
            </Row>
            <Row className="justify-content-center">
              <Col xs="12">
                <Row className="justify-content-center">
                  {this.props.gameState
                    .getFilteredHouseCardsForHouse(this.player.house)
                    .filter(
                      (hc) =>
                        this.nameFilter == "" ||
                        hc.name
                          .toLowerCase()
                          .includes(this.nameFilter.toLowerCase()) ||
                        hc.combatStrength.toString().includes(this.nameFilter)
                    )
                    .map((hc) => (
                      <Col xs="auto" key={`thematic-draft-${hc.id}`}>
                        <HouseCardComponent
                          houseCard={hc}
                          size="small"
                          selected={this.selectedHouseCard == hc}
                          onClick={() =>
                            (this.selectedHouseCard =
                              this.selectedHouseCard != hc ? hc : null)
                          }
                        />
                      </Col>
                    ))}
                </Row>
              </Col>
              <Col xs="auto">
                <Button
                  type="button"
                  variant="success"
                  onClick={() => this.confirm()}
                  disabled={this.selectedHouseCard == null}
                >
                  {t("common.confirm")}
                </Button>
              </Col>
            </Row>
          </>
        ) : (
          <>
            <Row className="mt-3 justify-content-center">
              <Col xs="12" className="text-center">
                {t("common.theseAreAllRemainingHouseCards")}
              </Col>
            </Row>
            <Col xs="12">
              <Row className="justify-content-center mb-2">
                <input
                  className="form-control"
                  placeholder={t("common.filterByHouseCardNameOrStrength")}
                  type="text"
                  value={this.nameFilter}
                  onChange={(e) => (this.nameFilter = e.target.value)}
                  style={{ width: 300 }}
                />
              </Row>
              <Row className="justify-content-center">
                {_.sortBy(
                  this.props.gameState.ingame.game.draftPool.values,
                  (hc) => -hc.combatStrength,
                  (hc) => hc.houseId
                ).map(
                  (hc) =>
                    (this.nameFilter == "" ||
                      hc.name
                        .toLowerCase()
                        .includes(this.nameFilter.toLowerCase()) ||
                      hc.combatStrength
                        .toString()
                        .includes(this.nameFilter)) && (
                      <Col xs="auto" key={`draft-spectator_${hc.id}`}>
                        <HouseCardComponent houseCard={hc} size="small" />
                      </Col>
                    )
                )}
              </Row>
            </Col>
          </>
        )}
        <Row className="mt-3 justify-content-center">
          <Col xs={12} className="text-center">
            <Trans
              i18nKey="common.waitingFor"
              components={{
                houses: (
                  <>
                    {this.props.gameState.unreadyPlayers
                      .map((p) => p.house.name)
                      .join(", ")}
                  </>
                )
              }}
            />
          </Col>
        </Row>
      </>
    );
  }

  confirm(): void {
    if (!this.selectedHouseCard) {
      return;
    }

    this.props.gameState.select(this.selectedHouseCard);
    this.selectedHouseCard = null;
  }

  componentDidUpdate(): void {
    if (!this.player) {
      return;
    }
    if (
      this.selectedHouseCard &&
      !this.props.gameState
        .getFilteredHouseCardsForHouse(this.player.house)
        .includes(this.selectedHouseCard)
    ) {
      this.selectedHouseCard = null;
    }
  }
}
