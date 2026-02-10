import { Component, ReactNode } from "react";
import * as React from "react";
import { observer } from "mobx-react";
import renderChildGameState from "../utils/renderChildGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import DraftHouseCardsGameState, {
  DraftStep,
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
  @observable nameFilter = "";
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
          (hc) => hc.houseId,
        )
      : [];
    return (
      this.props.gameState.currentColumnIndex > -1 &&
      this.props.gameState.currentRowIndex > -1 && (
        <>
          <Row className="mt-1 mb-3 justify-content-center">
            {this.draftStep == DraftStep.DECIDE ? (
              <div className="text-center">
                House <b>{this.house.name}</b> must decide whether to select a
                House card or an Influence track position.
              </div>
            ) : this.draftStep == DraftStep.HOUSE_CARD ? (
              <div className="text-center">
                House <b>{this.house.name}</b> must select a House card.
              </div>
            ) : this.draftStep == DraftStep.INFLUENCE_TRACK ? (
              <div className="text-center">
                House <b>{this.house.name}</b> must choose an Influence track.
              </div>
            ) : (
              <></>
            )}
          </Row>
          <Row>
            <small>
              <b>Note</b>: All House cards work in a generic way!
              <br />
              That means House card abilities (e.g. Salladhor) referring to
              specific houses are always available for any house you use.
              <br />
              Character references are equivalent to the same-strength character
              in your hand (e.g. Reek and any 3-strength card).
              <br />
              References to capitals always refer to your house&apos;s home
              territory (e.g. Littlefinger).
            </small>
            <p className="mt-2">
              These are the next houses:{" "}
              {joinReactNodes(
                this.props.gameState.getNextHouses().map((h, i) => (
                  <b key={`next-house_${h.id}_${i}`} style={{ color: h.color }}>
                    {h.name}
                  </b>
                )),
                ", ",
              )}
            </p>
          </Row>
          {this.doesControlHouse && (
            <Row>
              {renderChildGameState(this.props, [
                [SelectHouseCardGameState, SelectHouseCardComponent],
                [SimpleChoiceGameState, SimpleChoiceComponent],
              ])}
            </Row>
          )}
          {showCardsPreview && (
            <Row>
              <Col xs="12" className="text-center">
                These are the House cards from which you may choose one on your
                next turn:
              </Col>
              <Col xs="12">
                <Row className="justify-content-center mb-2">
                  <input
                    className="form-control"
                    placeholder="Filter by house card name or strength"
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
                      ),
                  )}
                </Row>
              </Col>
            </Row>
          )}
          {!this.player && (
            <Row>
              <Col xs="12" className="text-center">
                These are all remaining House cards:
              </Col>
              <Col xs="12">
                <Row className="justify-content-center mb-2">
                  <input
                    className="form-control"
                    placeholder="Filter by house card name or strength"
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
                      ),
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
