import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import { Col, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import Game from "../common/ingame-game-state/game-data-structure/Game";
import { specialObjectiveCards, objectiveCards } from "../common/ingame-game-state/game-data-structure/static-data-structure/ObjectiveCards";
import ObjectiveCardComponent from "./game-state-panel/utils/ObjectiveCardComponent";
import GameClient from "./GameClient";
import _ from "lodash";
import Player from "../common/ingame-game-state/Player";
import { preventOverflow } from "@popperjs/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBookReader, faQuestionCircle } from "@fortawesome/free-solid-svg-icons";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";

interface ObjectivesInfoComponentProps {
    ingame: IngameGameState;
    gameClient: GameClient;
}

@observer
export default class ObjectivesInfoComponent extends Component<ObjectivesInfoComponentProps> {
    get ingame(): IngameGameState {
        return this.props.ingame;
    }

    get game(): Game {
        return this.props.ingame.game;
    }

    get authenticatedPlayer(): Player | null {
        return this.props.gameClient.authenticatedPlayer;
    }

    render(): ReactNode {
        const allCompletedObjectives = _.flatMap(this.game.houses.values, h => h.completedObjectives);
        const playersSecretObjectives = this.authenticatedPlayer ? this.authenticatedPlayer.house.secretObjectives : [];
        const allAvailableObjectives = _.sortBy(_.without(objectiveCards.values, ...allCompletedObjectives, ...playersSecretObjectives), oc => oc.name);
        return <Col xs={12} className="h-100">
            {playersSecretObjectives.length > 0 && <Row className="justify-content-center">
                <Col xs={12}><h5 className="mb-0" style={{ textAlign: "center" }}>Your Secret Objectives</h5></Col>
                {playersSecretObjectives.map(oc =>
                    <Col xs="auto" key={oc.id}>
                        <ObjectiveCardComponent
                            objectiveCard={oc}
                            size="small"
                        />
                    </Col>)}
            </Row>}
            <Row className="justify-content-center mt-4">
                <Col xs={12}><h5 className="mb-0" style={{ textAlign: "center" }}>All Special Objectives</h5></Col>
                {specialObjectiveCards.values.map(oc =>
                    <Col xs="auto" key={oc.id}>
                        <ObjectiveCardComponent
                            objectiveCard={oc}
                            size="small"
                        />
                    </Col>)}
            </Row>
            {this.game.houses.values.filter(h => h.completedObjectives.length > 0).map(h =>
            <Row className="justify-content-center mt-4" key={`completed_objectives_${h.id}`}>
                <Col xs={12}><h5 className="mb-0" style={{ textAlign: "center" }}>{h.name}&apos;s Completed Objectives</h5></Col>
                {h.completedObjectives.map(oc =>
                    <Col xs="auto" key={oc.id}>
                        <ObjectiveCardComponent
                            objectiveCard={oc}
                            size="tiny"
                        />
                    </Col>)}
            </Row>)}
            <Row className="justify-content-center mt-4">
                <Col xs={12}><h5 className="mb-0" style={{ textAlign: "center" }}>{this.authenticatedPlayer || allCompletedObjectives.length > 0 ? "Remaining Objectives" : "All Objectives"}</h5></Col>
                {allAvailableObjectives.map(oc =>
                    <Col xs="auto" key={oc.id}>
                        <ObjectiveCardComponent
                            objectiveCard={oc}
                            size="tiny"
                        />
                    </Col>)}
            </Row>
            <Row className="justify-content-center mt-4">
                <Col xs={12}>
                    <OverlayTrigger overlay={this.renderRulesTooltip()}
                        popperConfig={{ modifiers: [preventOverflow] }}
                        placement="auto">
                            <h5 className="mb-0" style={{ textAlign: "center" }}>
                                <FontAwesomeIcon
                                    style={{ fontSize: "20px" }}
                                    icon={faBookReader} />
                                &nbsp;&nbsp;Rules&nbsp;&nbsp;
                                <FontAwesomeIcon
                                    style={{ fontSize: "20px" }}
                                    icon={faQuestionCircle} />
                            </h5>
                    </OverlayTrigger>
                </Col>
            </Row>
        </Col>;
    }

    renderRulesTooltip(): OverlayChildren {
        return <Tooltip id="affc-rules-tooltip" className="tooltip-w-50">
            <h5 style={{textAlign: "center"}}>Objectives</h5>
            The A Feast for Crows scenario introduces a new way for players to score victory points. Players no longer use the Victory track to record the number of Castles and Strongholds they control.
            Instead, each player now advances on the Victory track by completing the objectives described on his Objective cards, with the goal of being the first and only player to reach position 7.
            <br/><br/>
            <h5 style={{textAlign: "center"}}>Scoring and Supply</h5>
            After each Action phase, players resolve these additional steps:<br/>
            <ol>
                <li><b>Update Supply:</b> In turn order, all players update their supply levels (as if they were resolving the &quot;Supply&quot; Westeros card in the core game) and then reconcile their armies.</li>
                <li><b>Score Special Objectives:</b> Each round, during this step, each player may choose to score his Special Objective card (if the criterion described is fulfilled), moving his Victory Point token forward one space.</li>
                <li><b>Score Other Objectives:</b> In turn order, each player may choose to score one Objective card of his choice from his objective hand (if the criterion described is fulfilled),
                    placing the scored card faceup in his play areas and moving his Victory Point token forward a number of spaces equal to the number next to his House sigil on the scored card.
                    Scored Objective cards remain faceup in a player&apos;s play area for the remainder of the game.<br/>Note, unlike Special Objective cards, these cards can only be scored once.</li>
                <li><b>Draw Objective Cards:</b> Any player who does not have 3 Objective cards in his objective hand draws 1 new Objective card and adds it to his objective hand.</li>
            </ol>
            <br/><br/>
            <h5 style={{textAlign: "center"}}>Winning the Game</h5>
            After the Draw Objective Cards step, if any one player occupies position 7 of the Victory track, that player wins the game.
            If, at this time, two or more players tie by occupying position 7 of the Victory track, the tied player who controls more total land areas wins.
            If there is still a tie, the tied player who is highest on the Iron Throne Influence track wins.
            <br/><br/>
            <h5 style={{textAlign: "center"}}>FAQ</h5>
            <i>Q: When playing A Feast for Crows, what are the tiebreakers at the end of Round 10?</i><br/>
            A: If at the end of Round 10 no player has 7 victory points, the player with the most victory points who is in the highest position on the Iron Throne is the winner.
        </Tooltip>;
    }
}