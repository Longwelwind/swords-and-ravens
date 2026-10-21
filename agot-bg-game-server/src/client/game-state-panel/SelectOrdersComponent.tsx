import { t, Trans, translateGameText } from "../i18n";
import MapContribution from "../MapContribution";
import { Component, ReactNode } from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import { observer } from "mobx-react";
import SelectOrdersGameState, {
  ParentGameState
} from "../../common/ingame-game-state/select-orders-game-state/SelectOrdersGameState";
import React from "react";
import Col from "react-bootstrap/Col";
import { Row } from "react-bootstrap";
import Button from "react-bootstrap/Button";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import { action, observable } from "mobx";
import _ from "lodash";
import { OrderOnMapProperties } from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";
import joinReactNodes from "../utils/joinReactNodes";
import Order from "../../common/ingame-game-state/game-data-structure/Order";

@observer
export default class SelectOrdersComponent extends Component<
  GameStateComponentProps<SelectOrdersGameState<ParentGameState>>
> {
  @observable accessor selectedRegions: Region[] = [];

  render(): ReactNode {
    return (
      <>
        <MapContribution
          mapControls={this.props.mapControls}
          gameState={this.props.gameState}
          orders={this.modifyOrdersOnMap()}
        />
        <Col xs={12}>
          {this.props.gameClient.doesControlHouse(
            this.props.gameState.house
          ) ? (
            <>
              {this.selectedRegions.length > 0 && (
                <Row className="justify-content-center">
                  <p className="text-center">
                    <Trans
                      i18nKey="selectOrders.selectedOrder13dece"
                      components={{
                        value0: (
                          <>
                            {t("common.token", {
                              count: this.selectedRegions.length
                            })}
                          </>
                        ),
                        element1: <br />,
                        value2: (
                          <>
                            {joinReactNodes(
                              this.selectedRegions.map((r) => (
                                <span key={`select-order_${r.id}`}>
                                  <Trans
                                    i18nKey="common.in89ff9d"
                                    components={{
                                      element0: <b />,
                                      value1: (
                                        <>
                                          {translateGameText(
                                            this.getOrderInRegion(r)?.type.name
                                          ) ?? t("common.unknown")}
                                        </>
                                      ),
                                      element2: <b />,
                                      value3: <>{r.name}</>
                                    }}
                                  />
                                </span>
                              )),
                              ", "
                            )}
                          </>
                        )
                      }}
                    />
                  </p>
                </Row>
              )}
              <Row className="justify-content-center">
                <Col xs="auto">
                  <Button
                    type="button"
                    variant="success"
                    onClick={() => this.confirm()}
                    disabled={
                      this.selectedRegions.length != this.props.gameState.count
                    }
                  >
                    {t("common.confirm")}
                  </Button>
                </Col>
                <Col xs="auto">
                  <Button
                    type="button"
                    onClick={() => this.reset()}
                    variant="danger"
                    disabled={this.selectedRegions.length == 0}
                  >
                    {t("common.reset")}
                  </Button>
                </Col>
              </Row>
            </>
          ) : (
            <div className="text-center">
              <Trans
                i18nKey="common.waitingFor"
                components={{ houses: <>{this.props.gameState.house.name}</> }}
              />
            </div>
          )}
        </Col>
      </>
    );
  }

  getOrderInRegion(region: Region): Order | null {
    return this.props.gameState.parentGameState.actionGameState.ordersOnBoard.tryGet(
      region,
      null
    );
  }

  @action
  private reset(): void {
    this.selectedRegions = [];
  }

  @action
  confirm(): void {
    this.props.gameState.selectOrders(this.selectedRegions);
  }

  @action
  onOrderClick(region: Region): void {
    if (!this.selectedRegions.includes(region)) {
      this.selectedRegions.push(region);
    } else {
      _.pull(this.selectedRegions, region);
    }
  }

  modifyOrdersOnMap(): [Region, PartialRecursive<OrderOnMapProperties>][] {
    if (this.props.gameClient.doesControlHouse(this.props.gameState.house)) {
      if (this.selectedRegions.length < this.props.gameState.count) {
        return this.props.gameState.possibleRegions.map((r) => [
          r,
          { highlight: { active: true }, onClick: () => this.onOrderClick(r) }
        ]);
      }
    }

    return [];
  }
}
