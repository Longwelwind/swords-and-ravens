import { t, Trans } from "../i18n";
import MapContribution from "../MapContribution";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import ReplaceOrderGameState from "../../common/ingame-game-state/action-game-state/use-raven-game-state/replace-order-game-state/ReplaceOrderGameState";
import React from "react";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import { action, observable } from "mobx";
import Order from "../../common/ingame-game-state/game-data-structure/Order";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import OrderGridComponent from "./utils/OrderGridComponent";
import { OrderOnMapProperties } from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";

@observer
export default class ReplaceOrderComponent extends Component<
  GameStateComponentProps<ReplaceOrderGameState>
> {
  @observable accessor selectedRegion: Region | null;
  @observable accessor selectedOrder: Order | null;

  render(): ReactNode {
    return (
      <>
        <MapContribution
          mapControls={this.props.mapControls}
          gameState={this.props.gameState}
          orders={this.modifyOrdersOnMap()}
        />
        <Col xs={12} className="text-center">
          {t("replaceOrder.theHolderOfTheRavenTokenMayNowChoose2ef071")}
        </Col>
        {this.props.gameClient.doesControlHouse(
          this.props.gameState.ravenHolder
        ) ? (
          <>
            {this.selectedRegion == null ? (
              <Col xs={12} className="text-center">
                {t("replaceOrder.clickTheOrderTokenOnTheMapYouWant15cff4")}
              </Col>
            ) : (
              <Col xs={12} className="text-center">
                <Trans
                  i18nKey="replaceOrder.chooseWhichOrderTokenToPlaceOn8932a6"
                  components={{
                    element0: <b />,
                    value1: <>{this.selectedRegion.name}</>,
                    element2: <br />,
                    element3: (
                      <OrderGridComponent
                        orders={this.props.gameState.ingameGameState.game.getOrdersListForHouse(
                          this.props.gameState.ravenHolder
                        )}
                        selectedOrder={this.selectedOrder}
                        availableOrders={this.props.gameState.getAvailableOrders(
                          this.selectedRegion
                        )}
                        restrictedOrders={this.props.gameState.ingameGameState.game.getRestrictedOrders(
                          this.selectedRegion,
                          this.props.gameState.parentGameState.parentGameState
                            .planningRestrictions,
                          true
                        )}
                        onOrderClick={(o) => this.selectOrder(o)}
                      />
                    )
                  }}
                />
              </Col>
            )}
            <Col xs={12}>
              <Col xs={12} className="d-flex justify-content-center">
                <Button
                  type="button"
                  variant="success"
                  onClick={() => this.replaceOrder()}
                  disabled={
                    this.selectedOrder == null || this.selectedRegion == null
                  }
                >
                  {t("replaceOrder.confirmOrderTokenReplacement411d63")}
                </Button>
              </Col>
              <Col xs={12} className="d-flex justify-content-center">
                <Button
                  type="button"
                  onClick={() => this.seeTopWildlingCardInstead()}
                  disabled={this.selectedOrder != null}
                >
                  {t("replaceOrder.lookAtTheTopWildlingCardInsteade2a4e9")}
                </Button>
              </Col>
              <Col xs={12} className="d-flex justify-content-center">
                <Button
                  type="button"
                  variant="danger"
                  disabled={
                    this.selectedOrder == null && this.selectedRegion == null
                  }
                  onClick={() => this.reset()}
                >
                  {t("common.reset")}
                </Button>
              </Col>
            </Col>
          </>
        ) : (
          <Col xs={12} className="text-center">
            <Trans
              i18nKey="common.waitingFor"
              components={{
                houses: <>{this.props.gameState.ravenHolder.name}</>
              }}
            />
          </Col>
        )}
      </>
    );
  }

  @action
  onOrderClick(region: Region): void {
    if (region.getController() == this.props.gameState.ravenHolder) {
      if (this.selectedRegion == region) {
        this.selectedRegion = null;
      } else {
        this.selectedRegion = region;
      }
      this.selectedOrder = null;
    }
  }

  selectOrder(order: Order): void {
    if (this.selectedOrder == order) {
      this.selectedOrder = null;
    } else {
      this.selectedOrder = order;
    }
  }

  replaceOrder(): void {
    if (this.selectedRegion && this.selectedOrder) {
      if (
        this.props.gameState.ingameGameState.game.isOrderRestricted(
          this.selectedRegion,
          this.selectedOrder,
          this.props.gameState.parentGameState.parentGameState
            .planningRestrictions
        )
      ) {
        if (
          !window.confirm(
            t(
              "replaceOrder.yourReplacedOrderIsRestrictedAndWillBeRemoved747ba6"
            )
          )
        ) {
          return;
        }
      }

      this.props.gameState.replaceOrder(
        this.selectedRegion,
        this.selectedOrder
      );
    }
  }

  seeTopWildlingCardInstead(): void {
    this.props.gameState.seeTopWildlingCardInstead();
  }

  modifyOrdersOnMap(): [Region, PartialRecursive<OrderOnMapProperties>][] {
    if (
      this.props.gameClient.doesControlHouse(this.props.gameState.ravenHolder)
    ) {
      return this.props.gameState.ingameGameState.game.world
        .getControlledRegions(this.props.gameState.ravenHolder)
        .map((r) => [
          r,
          {
            highlight: {
              active:
                this.selectedRegion == null ||
                this.selectedOrder == null ||
                this.selectedRegion == r
            },
            onClick: () => this.onOrderClick(r)
          }
        ]);
    }

    return [];
  }

  @action
  private reset(): void {
    this.selectedRegion = null;
    this.selectedOrder = null;
  }
}
