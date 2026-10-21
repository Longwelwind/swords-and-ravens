import { t, Trans } from "../i18n";
import MapContribution, { wrapMapElement } from "../MapContribution";
import { observer } from "mobx-react";
import React, { Component, ReactNode } from "react";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import { action, observable } from "mobx";
import House from "../../common/ingame-game-state/game-data-structure/House";
import { Button, OverlayTrigger, Popover } from "react-bootstrap";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { OrderOnMapProperties } from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";
import ResolveSingleConsolidatePowerGameState from "../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/resolve-single-consolidate-power-game-state/ResolveSingleConsolidatePowerGameState";
import ConsolidatePowerOrderType from "../../common/ingame-game-state/game-data-structure/order-types/ConsolidatePowerOrderType";
import IronBankOrderType from "../../common/ingame-game-state/game-data-structure/order-types/IronBankOrderType";
import DefenseMusterOrderType from "../../common/ingame-game-state/game-data-structure/order-types/DefenseMusterOrderType";
import IronBank from "../../common/ingame-game-state/game-data-structure/IronBank";

@observer
export default class ResolveSingleConsolidatePowerComponent extends Component<
  GameStateComponentProps<ResolveSingleConsolidatePowerGameState>
> {
  @observable accessor selectedOrderRegion: Region | null = null;
  @observable accessor selectedOrderType:
    | ConsolidatePowerOrderType
    | IronBankOrderType
    | DefenseMusterOrderType
    | null = null;

  get house(): House {
    return this.props.gameState.house;
  }

  get doesControlCurrentHouse(): boolean {
    return this.props.gameClient.doesControlHouse(this.house);
  }

  get gameState(): ResolveSingleConsolidatePowerGameState {
    return this.props.gameState;
  }

  get defenseMusterOrderRegion(): Region | null {
    const regions =
      this.gameState.actionGameState.getRegionsWithDefenseMusterOrderOfHouse(
        this.house
      );
    if (regions.length == 1) {
      return regions[0][0];
    }

    return null;
  }

  get ironBank(): IronBank | null {
    return this.gameState.ingame.game.ironBank;
  }

  render(): ReactNode {
    const availableOrders =
      this.props.gameState.parentGameState.getAvailableOrdersOfHouse(
        this.house
      );
    return (
      <>
        <MapContribution
          mapControls={this.props.mapControls}
          gameState={this.props.gameState}
          orders={this.modifyOrdersOnMap()}
        />
        <Col xs={12} className="text-center">
          {this.gameState.ingame.isVassalHouse(this.house) ? (
            <>
              <Trans
                i18nKey="resolveSingleConsolidatePower.vassalHouseMustResolveTheirMusterOrder4ea409"
                components={{
                  element0: <b />,
                  value1: <>{this.house.name}</>,
                  value2: (
                    <>
                      {this.defenseMusterOrderRegion && (
                        <>
                          <Trans
                            i18nKey="resolveSingleConsolidatePower.in567ab8"
                            components={{
                              element0: <b />,
                              value1: <>{this.defenseMusterOrderRegion.name}</>
                            }}
                          />
                        </>
                      )}
                    </>
                  )
                }}
              />
            </>
          ) : (
            <>
              <Trans
                i18nKey="resolveSingleConsolidatePower.houseMustResolveOneOfItsConsolidatePowerOrdersd2abe9"
                components={{
                  element0: <b />,
                  value1: <>{this.house.name}</>,
                  value2: (
                    <>
                      {availableOrders.values.some(
                        (ot) => ot instanceof IronBankOrderType
                      )
                        ? t("resolveSingleConsolidatePower.orIronBankd17b1f")
                        : ""}
                    </>
                  )
                }}
              />
            </>
          )}
        </Col>
        {this.doesControlCurrentHouse ? (
          <>
            {this.selectedOrderRegion && this.selectedOrderType ? (
              this.renderGameStateControls(
                this.selectedOrderRegion,
                this.selectedOrderType
              )
            ) : (
              <Col xs={12} className="text-center">
                <p>
                  {t(
                    "resolveSingleConsolidatePower.clickTheOrderYouWantToResolve7b4c93"
                  )}
                </p>
              </Col>
            )}
            <Col xs={12} className="d-flex justify-content-center">
              <Button
                type="button"
                variant="danger"
                onClick={() => this.reset()}
              >
                {t("common.reset")}
              </Button>
            </Col>
          </>
        ) : (
          <Col xs={12} className="text-center">
            <Trans
              i18nKey="common.waitingFor"
              components={{
                houses: (
                  <>
                    {
                      this.gameState.ingame.getControllerOfHouse(this.house)
                        .house.name
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

  private renderGameStateControls(
    orderRegion: Region,
    orderType:
      ConsolidatePowerOrderType | IronBankOrderType | DefenseMusterOrderType
  ): ReactNode {
    return (
      <>
        <Col xs={12} className="text-center">
          <p>
            <Trans
              i18nKey="common.in89ff9d"
              components={{
                element0: <b />,
                value1: <>{orderType.name}</>,
                element2: <b />,
                value3: <>{orderRegion.name}</>
              }}
            />
          </p>
        </Col>
        <Col xs={12}>
          <Row className="justify-content-center">
            {orderType instanceof DefenseMusterOrderType && (
              <>
                <Col xs={12} className="d-flex justify-content-center">
                  <Button
                    type="button"
                    variant="success"
                    onClick={() => {
                      this.gameState.chooseMustering(orderRegion as Region);
                      this.reset();
                    }}
                  >
                    <Trans
                      i18nKey="resolveSingleConsolidatePower.musterIn709abb"
                      components={{ value0: <>{orderRegion.name}</> }}
                    />
                  </Button>
                </Col>
                <Col xs={12} className="d-flex justify-content-center">
                  <Button
                    type="button"
                    variant="warning"
                    onClick={() => {
                      this.gameState.chooseRemoveOrder(orderRegion as Region);
                      this.reset();
                    }}
                  >
                    {t(
                      "resolveSingleConsolidatePower.ignoreAndRemoveOrderf800df"
                    )}
                  </Button>
                </Col>
              </>
            )}
            {orderType instanceof ConsolidatePowerOrderType && (
              <>
                {orderType.starred && orderRegion.castleLevel > 0 && (
                  <Col xs="auto">
                    <Button
                      type="button"
                      variant="success"
                      onClick={() => {
                        this.gameState.chooseMustering(orderRegion as Region);
                        this.reset();
                      }}
                    >
                      <Trans
                        i18nKey="resolveSingleConsolidatePower.musterIn709abb"
                        components={{ value0: <>{orderRegion.name}</> }}
                      />
                    </Button>
                  </Col>
                )}
                <Col xs="auto">
                  <Button
                    type="button"
                    onClick={() => {
                      this.gameState.chooseGainPowerTokens(
                        orderRegion as Region
                      );
                      this.reset();
                    }}
                  >
                    {this.getPowerTokenButtonText(
                      this.gameState.getPotentialGainedPowerTokens(
                        orderRegion,
                        this.house
                      )
                    )}
                  </Button>
                </Col>
              </>
            )}
            {orderType instanceof IronBankOrderType && this.ironBank && (
              <>
                {this.ironBank
                  .getPurchasableLoans(this.house)
                  .map((purchasable) => (
                    <Col
                      xs={12}
                      className="d-flex justify-content-center"
                      key={`loan-button-${purchasable.loan.id}`}
                    >
                      <Button
                        type="button"
                        variant="success"
                        onClick={() => {
                          this.gameState.choosePurchaseLoan(
                            purchasable.slotIndex,
                            orderRegion as Region
                          );
                          this.reset();
                        }}
                      >
                        <Trans
                          i18nKey="resolveSingleConsolidatePower.payToPurchase679165"
                          components={{
                            value0: <>{purchasable.costs}</>,
                            value1: (
                              <>
                                {t("common.PowertokenLabel", {
                                  count: purchasable.costs
                                })}
                              </>
                            ),
                            value2: <>{purchasable.loan.name}</>
                          }}
                        />
                      </Button>
                    </Col>
                  ))}
                <Col xs={12} className="d-flex justify-content-center">
                  <Button
                    type="button"
                    variant="warning"
                    onClick={() => {
                      this.gameState.chooseRemoveOrder(orderRegion as Region);
                      this.reset();
                    }}
                  >
                    {t(
                      "resolveSingleConsolidatePower.ignoreAndRemoveOrderf800df"
                    )}
                  </Button>
                </Col>
              </>
            )}
          </Row>
        </Col>
      </>
    );
  }

  private getPowerTokenButtonText(powerTokenCount: number): string {
    return t("common.gainPowerTokens", { count: powerTokenCount });
  }

  private modifyOrdersOnMap(): [
    Region,
    PartialRecursive<OrderOnMapProperties>
  ][] {
    if (this.doesControlCurrentHouse) {
      const availableOrders =
        this.gameState.parentGameState.getAvailableOrdersOfHouse(
          this.gameState.house
        );
      return availableOrders.entries.map(([r, ot]) => [
        r,
        {
          highlight: { active: true },
          onClick: () => this.onOrderClick(r, ot),
          wrap: wrapMapElement(
            <OverlayTrigger
              placement="auto-start"
              trigger="click"
              rootClose
              overlay={
                <Popover
                  id={"resolve-cp-order-popover_region_" + r.id}
                  className="p-1"
                >
                  {this.renderGameStateControls(r, ot)}
                </Popover>
              }
            >
              <span />
            </OverlayTrigger>
          )
        }
      ]);
    }

    return [];
  }

  @action
  private onOrderClick(
    region: Region,
    orderType:
      ConsolidatePowerOrderType | IronBankOrderType | DefenseMusterOrderType
  ): void {
    if (this.selectedOrderRegion == region) {
      this.reset();
    } else {
      this.selectedOrderRegion = region;
      this.selectedOrderType = orderType;
    }
  }

  @action
  private reset(): void {
    this.selectedOrderRegion = null;
    this.selectedOrderType = null;
    document.body.click();
  }
}
