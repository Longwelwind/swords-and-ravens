import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import { Col, Row } from "react-bootstrap";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import Game from "../common/ingame-game-state/game-data-structure/Game";
import { specialObjectiveCards, objectiveCards } from "../common/ingame-game-state/game-data-structure/static-data-structure/ObjectiveCards";
import ObjectiveCardComponent from "./game-state-panel/utils/ObjectiveCardComponent";
import GameClient from "./GameClient";
import _ from "lodash";
import Player from "../common/ingame-game-state/Player";

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
        const playersSecretObjectives = this.authenticatedPlayer ? _.sortBy(this.authenticatedPlayer.house.secretObjectives, oc => oc.name) : [];
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
        </Col>;
    }
}