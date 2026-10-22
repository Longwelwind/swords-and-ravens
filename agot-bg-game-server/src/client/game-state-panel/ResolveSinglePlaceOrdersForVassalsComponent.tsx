import { t, Trans } from "../i18n";
import { action } from "mobx";
import MapContribution, { wrapMapElement } from "../MapContribution";
import { Component, ReactNode } from "react";
import { observer } from "mobx-react";
import React from "react";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import * as _ from "lodash";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import OrderGridComponent from "./utils/OrderGridComponent";
import { OrderOnMapProperties, RegionOnMapProperties } from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";
import Player from "../../common/ingame-game-state/Player";
import House from "../../common/ingame-game-state/game-data-structure/House";
import { OverlayTrigger, Popover } from "react-bootstrap";
import BetterMap from "../../utils/BetterMap";
import WesterosCardComponent from "./utils/WesterosCardComponent";
import PlanningRestriction from "../../common/ingame-game-state/game-data-structure/westeros-card/planning-restriction/PlanningRestriction";
import {
  noMarchPlusOneOrder,
  noDefenseOrder,
  noSupportOrder,
  noRaidOrder,
  noConsolidatePowerOrder
} from "../../common/ingame-game-state/game-data-structure/westeros-card/planning-restriction/planningRestrictions";
import WesterosCardType from "../../common/ingame-game-state/game-data-structure/westeros-card/WesterosCardType";
import {
  rainsOfAutumn,
  stormOfSwords,
  webOfLies,
  seaOfStorms,
  feastForCrows
} from "../../common/ingame-game-state/game-data-structure/westeros-card/westerosCardTypes";
import { renderRegionTooltip } from "../regionTooltip";
import { preventOverflow } from "@popperjs/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfo } from "@fortawesome/free-solid-svg-icons";
import ResolveSinglePlaceOrdersForVassalsGameState from "../../common/ingame-game-state/planning-game-state/place-orders-for-vassals-game-state/resolve-single-place-orders-for-vassals-game-state/ResolveSinglePlaceOrdersForVassalsGameState";
import joinNaturalLanguage from "../utils/joinNaturalLanguage";

@observer
export default class ResolveSinglePlaceOrdersForVassalsComponent extends Component<
  GameStateComponentProps<ResolveSinglePlaceOrdersForVassalsGameState>
> {
  restrictionToWesterosCardTypeMap = new BetterMap<
    PlanningRestriction,
    { deckId: number; westerosCardType: WesterosCardType }
  >([
    [noMarchPlusOneOrder, { deckId: 2, westerosCardType: rainsOfAutumn }],
    [noDefenseOrder, { deckId: 2, westerosCardType: stormOfSwords }],
    [noSupportOrder, { deckId: 2, westerosCardType: webOfLies }],
    [noRaidOrder, { deckId: 2, westerosCardType: seaOfStorms }],
    [noConsolidatePowerOrder, { deckId: 2, westerosCardType: feastForCrows }]
  ]);

  get player(): Player {
    if (!this.props.gameClient.authenticatedPlayer) {
      throw new Error();
    }

    return this.props.gameClient.authenticatedPlayer;
  }

  get housesToPlaceOrdersFor(): House[] {
    return this.singlePlaceOrders.placeOrdersGameState.getHousesToPutOrdersForPlayer(
      this.player
    );
  }

  get singlePlaceOrders(): ResolveSinglePlaceOrdersForVassalsGameState {
    return this.props.gameState;
  }

  get doesControlCurrentHouse(): boolean {
    return this.props.gameClient.doesControlHouse(this.house);
  }

  get house(): House {
    return this.singlePlaceOrders.house;
  }

  get playerOfCurrentHouse(): Player {
    return this.singlePlaceOrders.ingame.getControllerOfHouse(this.house);
  }

  render(): ReactNode {
    const houses = this.singlePlaceOrders.placeOrdersGameState
      .getHousesToPutOrdersForPlayer(this.playerOfCurrentHouse)
      .map((h) => h.name);
    return (
      <Col>
        <MapContribution
          mapControls={this.props.mapControls}
          gameState={this.props.gameState}
          regions={this.modifyRegionsOnMap()}
          orders={this.modifyOrdersOnMap()}
        />
        <Row className="justify-content-center">
          <Col xs={12} className="text-center">
            <>
              <Trans
                i18nKey="resolveSinglePlaceOrdersForVassals.houseMustNowPlaceOrdersForb23e23"
                components={{
                  element0: <b />,
                  value1: <>{this.house.name}</>,
                  value2: (
                    <>
                      {houses.length == 1 ? (
                        <>
                          <Trans
                            i18nKey="resolveSinglePlaceOrdersForVassals.house275ad0"
                            components={{ value0: <>{houses[0]}</> }}
                          />
                        </>
                      ) : (
                        <> {joinNaturalLanguage(houses)}</>
                      )}
                    </>
                  )
                }}
              />
            </>
          </Col>
          {this.singlePlaceOrders.planningGameState.planningRestrictions
            .map((pr) => this.restrictionToWesterosCardTypeMap.tryGet(pr, null))
            .map((prWc) =>
              prWc != null ? (
                <Col
                  xs={12}
                  key={`prwc_${prWc.westerosCardType.id}`}
                  className="d-flex flex-column align-items-center"
                >
                  <WesterosCardComponent
                    cardType={prWc.westerosCardType}
                    size="medium"
                    tooltip={true}
                    westerosDeckI={prWc.deckId}
                  />
                </Col>
              ) : (
                <></>
              )
            )}
          <Col xs={12}>
            {this.props.gameClient.authenticatedPlayer &&
              this.doesControlCurrentHouse && (
                <Row className="justify-content-center">
                  <Col xs="auto">
                    <Button
                      type="button"
                      disabled={
                        !this.singlePlaceOrders.placeOrdersGameState.canSubmit(
                          this.props.gameClient.authenticatedPlayer
                        ).status
                      }
                      onClick={() => this.onSubmitClick()}
                      variant="success"
                    >
                      {t("common.submit")}
                    </Button>
                  </Col>
                </Row>
              )}
            <Row>
              <Col xs={12} className="text-center mt-3">
                <Trans
                  i18nKey="common.waitingFor"
                  components={{ houses: <>{this.house.name}</> }}
                />
              </Col>
            </Row>
          </Col>
        </Row>
      </Col>
    );
  }

  modifyRegionsOnMap(): [Region, PartialRecursive<RegionOnMapProperties>][] {
    if (this.doesControlCurrentHouse) {
      const possibleRegions = _.flatMap(
        this.housesToPlaceOrdersFor.map((h) =>
          this.singlePlaceOrders.placeOrdersGameState.getPossibleRegionsForOrders(
            h
          )
        )
      );

      return possibleRegions.map(
        (r) =>
          [
            r,
            {
              // Highlight areas with no order
              highlight: {
                active: !this.singlePlaceOrders.placedOrders.has(r)
              },
              wrap: wrapMapElement(
                <OverlayTrigger
                  placement="auto-start"
                  trigger="click"
                  rootClose
                  overlay={
                    <Popover
                      id={"place-order-popover_region_" + r.id}
                      className="p-3"
                    >
                      <Row className="justify-content-center align-items-center mb-2">
                        <Col xs="auto">
                          <h5 className="my-0">
                            <b>{r.name}</b>
                          </h5>
                        </Col>
                        <Col xs="auto">
                          <OverlayTrigger
                            overlay={renderRegionTooltip(r)}
                            popperConfig={{ modifiers: [preventOverflow] }}
                            placement="auto"
                          >
                            <div
                              style={{ width: 28, height: 28 }}
                              className="circle-border d-flex justify-content-center align-items-center"
                            >
                              <FontAwesomeIcon icon={faInfo} fontSize="16px" />
                            </div>
                          </OverlayTrigger>
                        </Col>
                      </Row>
                      <Row>
                        <OrderGridComponent
                          orders={this.singlePlaceOrders.placeOrdersGameState.getOrdersList(
                            r.getController() as House
                          )}
                          selectedOrder={null}
                          availableOrders={this.singlePlaceOrders.placeOrdersGameState.getAvailableOrders(
                            r.getController() as House
                          )}
                          restrictedOrders={this.singlePlaceOrders.ingame.game.getRestrictedOrders(
                            r,
                            this.singlePlaceOrders.planningGameState
                              .planningRestrictions,
                            true
                          )}
                          onOrderClick={(o) => {
                            this.singlePlaceOrders.assignOrder(r, o);
                            document.body.click();
                          }}
                        />
                      </Row>
                    </Popover>
                  }
                >
                  <span />
                </OverlayTrigger>
              )
            }
          ] as [Region, PartialRecursive<RegionOnMapProperties>]
      );
    }

    return [];
  }

  modifyOrdersOnMap(): [Region, PartialRecursive<OrderOnMapProperties>][] {
    if (this.doesControlCurrentHouse) {
      return _.flatMap(
        this.housesToPlaceOrdersFor.map((h) =>
          this.singlePlaceOrders.placeOrdersGameState
            .getPossibleRegionsForOrders(h)
            .map(
              (r) =>
                [
                  r,
                  {
                    highlight: { active: true },
                    onClick: () => this.onOrderClick(r)
                  }
                ] as [Region, PartialRecursive<OrderOnMapProperties>]
            )
        )
      );
    }

    return [];
  }

  @action
  onOrderClick(region: Region): void {
    if (!this.doesControlCurrentHouse) {
      return;
    }

    this.singlePlaceOrders.assignOrder(region, null);
  }

  @action
  onSubmitClick(): void {
    if (
      !this.doesControlCurrentHouse ||
      !this.props.gameClient.authenticatedPlayer
    ) {
      return;
    }

    const readyState = this.singlePlaceOrders.placeOrdersGameState.canSubmit(
      this.props.gameClient.authenticatedPlayer
    );

    if (readyState.reason == "not-all-regions-filled") {
      if (
        !window.confirm(
          t("resolveSinglePlaceOrdersForVassals.confirmFewerOrders", {
            maxOrders: this.singlePlaceOrders.placeOrdersGameState.maxOrders
          })
        )
      ) {
        return;
      }
    }

    this.singlePlaceOrders.submit();
  }
}
