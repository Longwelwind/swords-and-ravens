import { t, Trans } from "../i18n";
import MapContribution from "../MapContribution";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import ResolveSingleRaidOrderGameState from "../../common/ingame-game-state/action-game-state/resolve-raid-order-game-state/resolve-single-raid-order-game-state/ResolveSingleRaidOrderGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import React from "react";
import { action, observable } from "mobx";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import Button from "react-bootstrap/Button";
import RaidOrderType from "../../common/ingame-game-state/game-data-structure/order-types/RaidOrderType";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import { OrderOnMapProperties } from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";
import RaidSupportOrderType from "../../common/ingame-game-state/game-data-structure/order-types/RaidSupportOrderType";
import House from "../../common/ingame-game-state/game-data-structure/House";

@observer
export default class ResolveSingleRaidOrderComponent extends Component<
  GameStateComponentProps<ResolveSingleRaidOrderGameState>
> {
  @observable accessor selectedOrderRegion: Region | null;
  @observable accessor selectedTargetRegion: Region | null;

  get house(): House {
    return this.props.gameState.house;
  }

  get orderInOrderRegion(): RaidOrderType | RaidSupportOrderType | null {
    if (!this.selectedOrderRegion) {
      return null;
    }

    return this.props.gameState.actionGameState.ordersOnBoard.get(
      this.selectedOrderRegion
    ).type as RaidOrderType | RaidSupportOrderType;
  }

  render(): ReactNode {
    return (
      <>
        <MapContribution
          mapControls={this.props.mapControls}
          gameState={this.props.gameState}
          orders={this.modifyOrdersOnMap()}
        />
        <Col xs={12} className="text-center">
          <Trans
            i18nKey="resolveSingleRaidOrder.houseMustResolveOneOfItsRaidOrdersafcaf3"
            components={{ element0: <b />, value1: <>{this.house.name}</> }}
          />
        </Col>
        {this.props.gameClient.doesControlHouse(this.house) ? (
          this.selectedOrderRegion == null ? (
            <Col xs={12} className="text-center">
              {t(
                "resolveSingleRaidOrder.selectARaidOrderTokenToResolveIt80410a"
              )}
            </Col>
          ) : (
            <>
              <Col xs={12} className="text-center">
                <p>
                  <Trans
                    i18nKey="resolveSingleRaidOrder.chosenRaidOrderd3858c"
                    components={{
                      element0: <b />,
                      value1: <>{this.selectedOrderRegion.name}</>
                    }}
                  />
                </p>
                {this.selectedTargetRegion == null ? (
                  <>
                    <p>
                      <Trans
                        i18nKey="resolveSingleRaidOrder.clickTheTargetOrderToRaidItOrClickaed65f"
                        components={{
                          element0: <b />,
                          value1: (
                            <>
                              {this.orderInOrderRegion instanceof
                              RaidSupportOrderType
                                ? t(
                                    "resolveSingleRaidOrder.useTheOrderAsSupport1Orderb16954"
                                  )
                                : t(
                                    "resolveSingleRaidOrder.removeYourRaidOrderc36902"
                                  )}
                            </>
                          )
                        }}
                      />
                    </p>
                  </>
                ) : (
                  <>
                    <Trans
                      i18nKey="resolveSingleRaidOrder.target2e5c89"
                      components={{
                        value0: <>{this.selectedTargetRegion.name}</>
                      }}
                    />
                  </>
                )}
              </Col>
              <Col xs={12}>
                <Row className="justify-content-center">
                  <Col xs="auto">
                    <Button
                      type="button"
                      variant="success"
                      onClick={() => this.confirm()}
                    >
                      {t("common.confirm")}
                    </Button>
                  </Col>
                  <Col xs="auto">
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => this.reset()}
                    >
                      {t("common.reset")}
                    </Button>
                  </Col>
                </Row>
              </Col>
            </>
          )
        ) : (
          <Col xs={12} className="text-center">
            <Trans
              i18nKey="common.waitingFor"
              components={{
                houses: (
                  <>
                    {
                      this.props.gameState.ingameGameState.getControllerOfHouse(
                        this.house
                      ).house.name
                    }
                  </>
                )
              }}
            />
          </Col>
        )}
      </>
    );
  }

  @action
  confirm(): void {
    if (this.selectedOrderRegion) {
      if (!this.selectedTargetRegion) {
        if (
          !window.confirm(
            t("resolveSingleRaidOrder.areYouSureNotToUseYourRaidOrder13ca73")
          )
        ) {
          return;
        }
      }

      this.props.gameState.resolveRaid(
        this.selectedOrderRegion,
        this.selectedTargetRegion
      );
      this.reset();
    }
  }

  @action
  private reset(): void {
    this.selectedOrderRegion = null;
    this.selectedTargetRegion = null;
  }

  @action
  onOrderClick(
    r: Region,
    _orderType: RaidOrderType | RaidSupportOrderType | null
  ): void {
    if (this.props.gameClient.doesControlHouse(this.house)) {
      if (this.selectedOrderRegion == null) {
        this.selectedOrderRegion = r;
      } else {
        this.selectedTargetRegion = r;
      }
    }
  }

  modifyOrdersOnMap(): [Region, PartialRecursive<OrderOnMapProperties>][] {
    if (this.props.gameClient.doesControlHouse(this.house)) {
      if (this.selectedOrderRegion == null || this.orderInOrderRegion == null) {
        // Highlight the Raid orders of the house
        return this.props.gameState.parentGameState
          .getRegionsWithRaidOrderOfHouse(this.house)
          .map(([r, ot]) => [
            r,
            {
              highlight: { active: true },
              onClick: () => this.onOrderClick(r, ot)
            }
          ]);
      } else {
        // Highlight the possible raidable orders from the selected Raid order
        return this.props.gameState
          .getRaidableRegions(this.selectedOrderRegion, this.orderInOrderRegion)
          .map((r) => [
            r,
            {
              highlight: { active: true },
              onClick: () => this.onOrderClick(r, null)
            }
          ]);
      }
    }

    return [];
  }
}
