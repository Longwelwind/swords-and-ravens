import { observer } from "mobx-react";
import UseValyrianSteelBladeGameState from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/use-valyrian-steel-blade-game-state/UseValyrianSteelBladeGameState";
import { Component, ReactNode } from "react";
import React from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import House from "../../common/ingame-game-state/game-data-structure/House";
import { Alert } from "react-bootstrap";

@observer
export default class UseValyrianSteelBladeComponent extends Component<
  GameStateComponentProps<UseValyrianSteelBladeGameState>
> {
  get gameState(): UseValyrianSteelBladeGameState {
    return this.props.gameState;
  }
  get house(): House {
    return this.gameState.house;
  }
  render(): ReactNode {
    return this.gameState.combatGameState.stats.length > 0 ? (
      <></>
    ) : (
      <>
        <Col xs={12} className="text-center">
          {this.house.name} may choose to use the Valyrian Steel Blade to{" "}
          {this.gameState.forNewTidesOfBattleCard
            ? "draw a new Tides of Battle card"
            : "increase their combat strength by 1"}
          .
        </Col>
        <Col xs={12}>
          {this.props.gameClient.doesControlHouse(this.house) ? (
            <>
              {this.gameState.canBeSkipped(this.house) && (
                <Row className="justify-content-center">
                  <Col xs="auto">
                    <Alert variant="danger" className="text-center">
                      <Alert.Heading>Warning</Alert.Heading>
                      <p>
                        Using the Valyrian Steel Blade won&apos;t change the
                        outcome of the battle.
                      </p>
                    </Alert>
                  </Col>
                </Row>
              )}
              <Row className="justify-content-center">
                <Col xs="auto">
                  <Button
                    type="button"
                    variant="success"
                    onClick={() => this.choose(true)}
                  >
                    Use it
                  </Button>
                </Col>
                <Col xs="auto">
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => this.choose(false)}
                  >
                    Don&apos;t use it
                  </Button>
                </Col>
              </Row>
            </>
          ) : (
            <div className="text-center">
              Waiting for{" "}
              {
                this.gameState.ingame.getControllerOfHouse(this.house).house
                  .name
              }
              ...
            </div>
          )}
        </Col>
      </>
    );
  }

  choose(use: boolean): void {
    this.props.gameState.choose(use);
  }
}
