import { t, Trans } from "../i18n";
import { Component, ReactNode } from "react";
import * as React from "react";
import { observer } from "mobx-react";
import renderChildGameState from "../utils/renderChildGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import DraftHouseCardsGameState, {
  DraftStep
} from "../../common/ingame-game-state/draft-game-state/draft-house-cards-game-state/DraftHouseCardsGameState";
import SelectHouseCardGameState from "../../common/ingame-game-state/select-house-card-game-state/SelectHouseCardGameState";
import SelectHouseCardComponent from "./SelectHouseCardComponent";
import Player from "../../common/ingame-game-state/Player";
import { Col } from "react-bootstrap";
import HouseCardComponent from "./utils/HouseCardComponent";
import House from "../../common/ingame-game-state/game-data-structure/House";
import SimpleChoiceGameState from "../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import SimpleChoiceComponent from "./SimpleChoiceComponent";
import _ from "lodash";
import { observable } from "mobx";
import joinReactNodes from "../utils/joinReactNodes";

@observer
export default class DraftHouseCardsComponent extends Component<
  GameStateComponentProps<DraftHouseCardsGameState>
> {
  @observable accessor nameFilter = "";
  get house(): House {
    return this.props.gameState.childGameState.house;
  }

  get player(): Player | null {
    return this.props.gameClient.authenticatedPlayer;
  }

  get doesControlHouse(): boolean {
    return this.props.gameClient.doesControlHouse(this.house);
  }

  get draftStep(): DraftStep {
    return this.props.gameState.draftStep;
  }

  render(): ReactNode {
    const showCardsPreview =
      this.player &&
      (!this.doesControlHouse || this.draftStep == DraftStep.DECIDE);
    const availableCards =
      this.player && showCardsPreview
        ? this.props.gameState.getFilteredHouseCardsForHouse(this.player.house)
        : [];
    const remainingCardsForSpectators = !this.player
      ? _.sortBy(
          this.props.gameState.ingame.game.draftPool.values,
          (hc) => -hc.combatStrength,
          (hc) => hc.houseId
        )
      : [];
    return (
      this.props.gameState.currentColumnIndex > -1 &&
      this.props.gameState.currentRowIndex > -1 && (
        <>
          <Row className="mt-1 mb-3 justify-content-center">
            {this.draftStep == DraftStep.DECIDE ? (
              <div className="text-center">
                <Trans
                  i18nKey="draftHouseCards.houseMustDecideWhetherToSelectAHouseCard0540ce"
                  values={{ house: this.house.name }}
                  components={{
                    bold: <b style={{ color: this.house.color }} />
                  }}
                />
              </div>
            ) : this.draftStep == DraftStep.HOUSE_CARD ? (
              <div className="text-center">
                <Trans
                  i18nKey="draftHouseCards.houseMustSelectAHouseCard58199e"
                  values={{ house: this.house.name }}
                  components={{
                    bold: <b style={{ color: this.house.color }} />
                  }}
                />
              </div>
            ) : this.draftStep == DraftStep.INFLUENCE_TRACK ? (
              <div className="text-center">
                <Trans
                  i18nKey="draftHouseCards.houseMustChooseAnInfluenceTrackefe933"
                  values={{ house: this.house.name }}
                  components={{
                    bold: <b style={{ color: this.house.color }} />
                  }}
                />
              </div>
            ) : (
              <></>
            )}
          </Row>
          <Row>
            <small>
              <Trans
                i18nKey="common.noteAllHouseCardsWorkInAGenericWay"
                components={{
                  bold: <b />,
                  lineBreak: <br />,
                  lineBreak2: <br />,
                  lineBreak3: <br />
                }}
              />
            </small>
            <p className="mt-2">
              <Trans
                i18nKey="draftHouseCards.theseAreTheNextHouses551e40"
                components={{
                  houses: (
                    <>
                      {joinReactNodes(
                        this.props.gameState.getNextHouses().map((h, i) => (
                          <b
                            key={`next-house_${h.id}_${i}`}
                            style={{ color: h.color }}
                          >
                            {h.name}
                          </b>
                        )),
                        ", "
                      )}
                    </>
                  )
                }}
              />
            </p>
          </Row>
          {this.doesControlHouse && (
            <Row>
              {renderChildGameState(this.props, [
                [SelectHouseCardGameState, SelectHouseCardComponent],
                [SimpleChoiceGameState, SimpleChoiceComponent]
              ])}
            </Row>
          )}
          {showCardsPreview && (
            <Row className="mt-3 justify-content-center">
              <Col xs="12" className="text-center">
                {t(
                  "draftHouseCards.theseAreTheHouseCardsFromWhichYouMay0a3344"
                )}
              </Col>
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
                  {this.props.gameState.getAllHouseCards().map(
                    (hc) =>
                      (this.nameFilter == "" ||
                        hc.name
                          .toLowerCase()
                          .includes(this.nameFilter.toLowerCase()) ||
                        hc.combatStrength
                          .toString()
                          .includes(this.nameFilter)) && (
                        <Col xs="auto" key={`draft_${hc.id}`}>
                          <HouseCardComponent
                            houseCard={hc}
                            size="small"
                            unavailable={!availableCards.includes(hc)}
                          />
                        </Col>
                      )
                  )}
                </Row>
              </Col>
            </Row>
          )}
          {!this.player && (
            <Row className="mt-3 justify-content-center">
              <Col xs="12" className="text-center">
                {t("common.theseAreAllRemainingHouseCards")}
              </Col>
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
                  {remainingCardsForSpectators.map(
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
            </Row>
          )}
        </>
      )
    );
  }
}
