import { t, Trans, translateGameText } from "../i18n";
import MapContribution, { wrapMapElement } from "../MapContribution";
import PlayerMusteringGameState, {
  Mustering,
  MusteringRule,
  PlayerMusteringType
} from "../../common/ingame-game-state/westeros-game-state/mustering-game-state/player-mustering-game-state/PlayerMusteringGameState";
import { observer } from "mobx-react";
import React, { Component, ReactNode } from "react";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import BetterMap from "../../utils/BetterMap";
import { action, observable } from "mobx";
import House from "../../common/ingame-game-state/game-data-structure/House";
import * as _ from "lodash";
import { Button, OverlayTrigger, Popover } from "react-bootstrap";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import {
  OrderOnMapProperties,
  RegionOnMapProperties,
  UnitOnMapProperties
} from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";
import Unit from "../../common/ingame-game-state/game-data-structure/Unit";
import { OverlayChildren } from "react-bootstrap/Overlay";
import { renderRegionTooltip } from "../regionTooltip";
import {
  faArrowRight,
  faInfo,
  faTimes
} from "@fortawesome/free-solid-svg-icons";
import { preventOverflow } from "@popperjs/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import UnitIconComponent from "../UnitIconComponent";

type MusteringPopoverTrigger = "region" | "order";

@observer
export default class PlayerMusteringComponent extends Component<
  GameStateComponentProps<PlayerMusteringGameState>
> {
  @observable accessor musterings = new BetterMap<Region, Mustering[]>();
  @observable accessor openMusteringPopover: {
    region: Region;
    trigger: MusteringPopoverTrigger;
  } | null = null;

  get house(): House {
    return this.props.gameState.house;
  }

  get isStarredConsolidatePowerMusteringType(): boolean {
    return this.props.gameState.isStarredConsolidatePowerMusteringType;
  }

  get doesControlCurrentHouse(): boolean {
    return this.props.gameClient.doesControlHouse(this.house);
  }

  render(): ReactNode {
    return (
      <>
        <MapContribution
          mapControls={this.props.mapControls}
          gameState={this.props.gameState}
          regions={this.modifyRegionsOnMap()}
          orders={this.modifyOrdersOnMap()}
          units={this.modifyUnitsOnMap()}
        />
        <Col xs={12} className="text-center">
          {this.isStarredConsolidatePowerMusteringType ? (
            <>
              <Trans
                i18nKey="playerMustering.houseCanResolveTheirSpecialConsolidatePowerOrderIn6c7652"
                components={{
                  element0: <b />,
                  value1: <>{this.house.name}</>,
                  value2: (
                    <>
                      {this.props.gameState.regions[0]?.name ??
                        t("common.unknown")}
                    </>
                  )
                }}
              />
            </>
          ) : this.props.gameState.type ==
            PlayerMusteringType.MUSTERING_WESTEROS_CARD ? (
            this.props.gameState.ingame.isVassalHouse(this.house) ? (
              <>
                <Trans
                  i18nKey="playerMustering.vassalHouseCanMusterUnitsInTheirHomeArea9124d8"
                  components={{
                    element0: <b />,
                    value1: <>{this.house.name}</>
                  }}
                />
              </>
            ) : (
              <>
                {t(
                  "playerMustering.playersCanMusterUnitsInTheirControlledStrongholdsAnd9f096f"
                )}
              </>
            )
          ) : this.props.gameState.type ==
            PlayerMusteringType.THE_HORDE_DESCENDS_WILDLING_CARD ? (
            <>
              <Trans
                i18nKey="playerMustering.houseCanMusterUnitsInOneOfTheirControlledc78cef"
                components={{ element0: <b />, value1: <>{this.house.name}</> }}
              />
            </>
          ) : this.props.gameState.type ==
            PlayerMusteringType.DEFENSE_MUSTER_ORDER ? (
            <>
              <Trans
                i18nKey="playerMustering.vassalHouseCanResolveTheirDefenseMusterOrderIn31fde9"
                components={{
                  element0: <b />,
                  value1: <>{this.house.name}</>,
                  value2: (
                    <>
                      {this.props.gameState.regions[0]?.name ??
                        t("common.unknown")}
                    </>
                  )
                }}
              />
            </>
          ) : (
            this.props.gameState.type ==
              PlayerMusteringType.RALLY_THE_MEN_WESTEROS_CARD && (
              <>
                {t(
                  "playerMustering.playersCanMusterUnitsInTheirControlledCastles1984fa"
                )}
              </>
            )
          )}
        </Col>
        {this.doesControlCurrentHouse && (
          <>
            {this.musterings.size > 0 && (
              <Col xs={12}>
                <>
                  {this.musterings.values[0].length > 0 && (
                    <p>{t("playerMustering.yourRecruitments21ef76")}</p>
                  )}
                  {this.musterings.entries.map(([r, musterings]) => (
                    <div key={`planned-recruitments_${r.id}`}>
                      <Trans
                        i18nKey="playerMustering.from72f2df"
                        components={{
                          element0: <b />,
                          value1: <>{r.name}</>,
                          element2: (
                            <ul>
                              {musterings.map(({ region, from, to }, i) => (
                                <li
                                  onClick={() =>
                                    this.removeMustering(musterings, i)
                                  }
                                  key={`planned-mustering_${i}`}
                                >
                                  <Trans
                                    i18nKey="playerMustering.acff809"
                                    components={{
                                      value0: (
                                        <>
                                          {from
                                            ? t(
                                                "playerMustering.upgradingTo2578a5"
                                              )
                                            : t(
                                                "playerMustering.recruiting0291f3"
                                              )}
                                        </>
                                      ),
                                      value1: <>{translateGameText(to.name)}</>,
                                      value2: (
                                        <>
                                          {r != region &&
                                            t("playerMustering.in2e716c", {
                                              value0: region.name
                                            })}
                                        </>
                                      )
                                    }}
                                  />
                                </li>
                              ))}
                            </ul>
                          )
                        }}
                      />
                    </div>
                  ))}
                </>
              </Col>
            )}
            {(this.musterings.size == 0 ||
              ((this.props.gameState.type ==
                PlayerMusteringType.MUSTERING_WESTEROS_CARD ||
                this.props.gameState.type ==
                  PlayerMusteringType.RALLY_THE_MEN_WESTEROS_CARD) &&
                this.props.gameState.anyUsablePointsLeft(this.musterings))) && (
              <Col xs={12} className="text-center">
                {this.props.gameState.regions.length == 1 ? (
                  <>
                    <Trans
                      i18nKey="playerMustering.clickIntoToInitiateARecruitmentFromThere0b91db"
                      components={{
                        value0: (
                          <>
                            {this.isStarredConsolidatePowerMusteringType ? (
                              <>
                                <Trans
                                  i18nKey="playerMustering.theSpecialConsolidatePowerOrderOr93d429"
                                  components={{ element0: <b /> }}
                                />
                              </>
                            ) : this.props.gameState.type ==
                              PlayerMusteringType.DEFENSE_MUSTER_ORDER ? (
                              <>
                                <Trans
                                  i18nKey="playerMustering.theDefenseMusterOrderOred843f"
                                  components={{ element0: <b /> }}
                                />
                              </>
                            ) : (
                              <></>
                            )}
                          </>
                        ),
                        element1: <b />,
                        value2: <>{this.props.gameState.regions[0].name}</>
                      }}
                    />
                  </>
                ) : (
                  <>
                    {t(
                      "playerMustering.clickOnARegionToInitiateARecruitmentFrom356687"
                    )}
                  </>
                )}
              </Col>
            )}
            <Col xs={12}>
              <Row className="justify-content-center">
                <Col xs="auto">
                  <Button
                    type="button"
                    variant="success"
                    disabled={!this.canSubmit()}
                    onClick={() => this.submit()}
                  >
                    {t("common.submit")}
                  </Button>
                </Col>
                <Col xs="auto">
                  <Button
                    type="button"
                    variant="danger"
                    disabled={this.musterings.size == 0}
                    onClick={() => this.reset()}
                  >
                    {t("common.reset")}
                  </Button>
                </Col>
              </Row>
            </Col>
            {this.isStarredConsolidatePowerMusteringType &&
              this.musterings.size == 0 && (
                <Col xs={12} className="text-center">
                  <small>
                    {t(
                      "playerMustering.noteIfYouDontRecruitAnyUnitsYourOrder2e72b2"
                    )}
                  </small>
                </Col>
              )}
          </>
        )}
        {(!this.doesControlCurrentHouse ||
          this.props.gameState.ingame.isVassalHouse(this.house)) && (
          <Col xs={12} className="text-center">
            <Trans
              i18nKey="common.waitingFor"
              components={{
                houses: (
                  <>
                    {
                      this.props.gameState.ingame.getControllerOfHouse(
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
  private removeMustering(musterings: Mustering[], i: number): void {
    const removedMustering = musterings.splice(i, 1)[0];

    if (removedMustering.affectedUnit) {
      if (removedMustering.from) {
        removedMustering.affectedUnit.upgradedType = undefined;
      } else {
        removedMustering.region.newUnits =
          removedMustering.region.newUnits.filter(
            (u) => u != removedMustering.affectedUnit
          );
      }
    }

    this.removeEmptyMusterings();
  }

  @action
  private removeEmptyMusterings(): void {
    this.musterings.keys.forEach((r) => {
      const mustering = this.musterings.get(r);
      if (mustering.length == 0) {
        this.musterings.delete(r);
      }
    });
  }

  private canSubmit(): boolean {
    switch (this.props.gameState.type) {
      case PlayerMusteringType.MUSTERING_WESTEROS_CARD:
      case PlayerMusteringType.RALLY_THE_MEN_WESTEROS_CARD:
        return true;
      case PlayerMusteringType.STARRED_CONSOLIDATE_POWER:
      case PlayerMusteringType.THE_HORDE_DESCENDS_WILDLING_CARD:
      case PlayerMusteringType.DEFENSE_MUSTER_ORDER:
        return this.musterings.size <= 1;
    }
  }

  @action
  private addMustering(initiatingRegion: Region, rule: Mustering): void {
    const musterings: Mustering[] = this.musterings.tryGet(
      initiatingRegion,
      []
    );

    if (rule.from) {
      const potentialUnit = this.props.gameState.getPotentialUnitForUpgrading(
        this.musterings,
        rule.region,
        rule.from.type
      );
      if (!potentialUnit) {
        throw new Error("An upgrade was added but there is no unit to upgrade");
      }
      rule.affectedUnit = potentialUnit;
      rule.affectedUnit.upgradedType = rule.to;
    } else {
      rule.affectedUnit = this.props.gameState.game.createUnit(
        rule.region,
        rule.to,
        this.house
      );
      rule.region.newUnits.push(rule.affectedUnit);
    }

    musterings.push(rule);
    this.musterings.set(initiatingRegion, musterings);

    this.removeEmptyMusterings();

    if (
      this.props.gameState.getPointsLeft(initiatingRegion, this.musterings) == 0
    ) {
      document.body.click();
    }
  }

  @action
  submit(): void {
    if (this.props.gameState.anyUsablePointsLeft(this.musterings)) {
      if (
        !confirm(
          t("playerMustering.youHaveNotUsedAllOfYourMusteringPoints2c14a2")
        )
      ) {
        return;
      }
    }

    this.props.gameState.muster(this.musterings);
    this.reset();
  }

  private modifyRegionsOnMap(): [
    Region,
    PartialRecursive<RegionOnMapProperties>
  ][] {
    if (this.doesControlCurrentHouse) {
      let regionsToModify = this.props.gameState.regions.filter(
        (r) =>
          this.props.gameState.getValidMusteringRulesForRegion(
            r,
            this.musterings
          ).length > 0
      );

      if (
        this.props.gameState.type ==
        PlayerMusteringType.THE_HORDE_DESCENDS_WILDLING_CARD
      ) {
        if (this.musterings.size == 1) {
          regionsToModify = regionsToModify.filter(
            (r) => r == this.musterings.keys[0]
          );
        }
      }

      if (
        this.props.gameState.type ==
          PlayerMusteringType.MUSTERING_WESTEROS_CARD &&
        this.props.gameState.ingame.isVassalHouse(this.house)
      ) {
        regionsToModify = regionsToModify.filter(
          (r) => r.superControlPowerToken == this.house
        );
      }

      return regionsToModify.map((modifiedRegion) => [
        modifiedRegion,
        {
          highlight: { active: true },
          wrap: wrapMapElement(
            <OverlayTrigger
              placement="auto"
              trigger="click"
              rootClose
              show={this.isMusteringPopoverOpen(modifiedRegion, "region")}
              onToggle={(show) =>
                this.toggleMusteringPopover(modifiedRegion, "region", show)
              }
              overlay={this.renderMusteringPopover(modifiedRegion)}
            >
              <span />
            </OverlayTrigger>
          )
        }
      ]);
    }

    return [];
  }

  private renderMusteringPopover(modifiedRegion: Region): OverlayChildren {
    return (
      <Popover
        id={"region-mustering-popover-" + modifiedRegion.id}
        className="p-3"
      >
        <Row className="justify-content-center align-items-center mb-2">
          <Col>
            <h5 className="my-0 text-center">
              <b>{modifiedRegion.name}</b>{" "}
              <small>
                (
                {this.props.gameState.getUsedPointsForRegion(
                  modifiedRegion,
                  this.musterings
                )}{" "}
                / {modifiedRegion.castleLevel})
              </small>
            </h5>
          </Col>
          <Col xs="auto">
            <OverlayTrigger
              overlay={renderRegionTooltip(modifiedRegion)}
              popperConfig={{ modifiers: [preventOverflow] }}
              placement="auto"
            >
              <div
                style={{ width: 24, height: 24 }}
                className="circle-border d-flex justify-content-center align-items-center"
              >
                <FontAwesomeIcon icon={faInfo} />
              </div>
            </OverlayTrigger>
          </Col>
          <Col xs="auto">
            <Button
              type="button"
              variant="link"
              className="text-light p-1"
              aria-label={t("playerMustering.closeMusteringPopover866447")}
              onClick={() => this.setOpenMusteringPopover(null)}
            >
              <FontAwesomeIcon icon={faTimes} />
            </Button>
          </Col>
        </Row>
        <Row className="justify-content-center">
          <>
            {this.props.gameState.getValidMusteringRulesForRegion(
              modifiedRegion,
              this.musterings
            ).length > 0 && (
              <>
                {this.props.gameState
                  .getValidMusteringRules(modifiedRegion, this.musterings)
                  .map(({ rules }) =>
                    rules.map((rule, i) => (
                      <Col
                        xs="auto"
                        key={modifiedRegion.id + "_muster-rule_" + i}
                      >
                        <Button
                          type="button"
                          onClick={() =>
                            this.addMustering(modifiedRegion, rule)
                          }
                        >
                          {this.renderMusteringButton(modifiedRegion, rule)}
                        </Button>
                      </Col>
                    ))
                  )}
              </>
            )}
          </>
        </Row>
      </Popover>
    );
  }

  @action
  private setOpenMusteringPopover(
    openMusteringPopover: {
      region: Region;
      trigger: MusteringPopoverTrigger;
    } | null
  ): void {
    this.openMusteringPopover = openMusteringPopover;
  }

  private isMusteringPopoverOpen(
    region: Region,
    trigger: MusteringPopoverTrigger
  ): boolean {
    return (
      this.openMusteringPopover?.region == region &&
      this.openMusteringPopover.trigger == trigger
    );
  }

  @action
  private toggleMusteringPopover(
    region: Region,
    trigger: MusteringPopoverTrigger,
    show: boolean
  ): void {
    if (show) {
      this.setOpenMusteringPopover({ region, trigger });
    } else if (this.isMusteringPopoverOpen(region, trigger)) {
      this.setOpenMusteringPopover(null);
    }
  }

  renderMusteringButton(
    initiatingRegion: Region,
    rule: MusteringRule
  ): React.ReactNode {
    return (
      <div className="d-flex flex-nowrap overflow-x-auto">
        {rule.from != null && (
          <>
            <UnitIconComponent house={this.house} unitType={rule.from.type} />
            <FontAwesomeIcon icon={faArrowRight} size="2x" />
          </>
        )}
        <UnitIconComponent house={this.house} unitType={rule.to} />
        {initiatingRegion != rule.region && (
          <>
            <Trans
              i18nKey="playerMustering.tobb94fd"
              components={{ element0: <b />, value1: <>{rule.region.name}</> }}
            />
          </>
        )}
        <>
          <small style={{ position: "absolute", bottom: 6, right: 10 }}>
            {rule.cost}
          </small>
        </>
      </div>
    );
  }

  private modifyOrdersOnMap(): [
    Region,
    PartialRecursive<OrderOnMapProperties>
  ][] {
    if (this.doesControlCurrentHouse) {
      if (
        this.isStarredConsolidatePowerMusteringType ||
        this.props.gameState.type == PlayerMusteringType.DEFENSE_MUSTER_ORDER
      ) {
        return this.props.gameState.regions.map((r) => [
          r,
          {
            highlight: { active: true },
            wrap: wrapMapElement(
              <OverlayTrigger
                placement="auto"
                trigger="click"
                rootClose
                show={this.isMusteringPopoverOpen(r, "order")}
                onToggle={(show) =>
                  this.toggleMusteringPopover(r, "order", show)
                }
                overlay={this.renderMusteringPopover(r)}
              >
                <span />
              </OverlayTrigger>
            )
          }
        ]);
      }
    }

    return [];
  }

  private modifyUnitsOnMap(): [Unit, PartialRecursive<UnitOnMapProperties>][] {
    if (this.doesControlCurrentHouse) {
      const allMusteredToRegions = _.uniq(
        _.flatMap(this.musterings.values).map((m) => m.region)
      );
      const allMusteredUnitsOfHouse = _.flatMap(
        allMusteredToRegions.map((r) =>
          _.concat(
            r.newUnits,
            r.units.values.filter((u) => u.upgradedType != undefined)
          )
        )
      );

      return allMusteredUnitsOfHouse.map((u) => [
        u,
        {
          highlight: {
            active: true,
            color: u.upgradedType ? "yellow" : "green"
          },
          onClick: () => {
            this.onUnitClick(u);
          }
        }
      ]);
    }

    return [];
  }

  componentDidMount(): void {
    if (
      this.props.gameState.regions.length != 1 ||
      !this.doesControlCurrentHouse
    ) {
      return;
    }

    if (
      this.props.gameState.type ==
        PlayerMusteringType.STARRED_CONSOLIDATE_POWER ||
      this.props.gameState.type == PlayerMusteringType.DEFENSE_MUSTER_ORDER
    ) {
      this.setOpenMusteringPopover({
        region: this.props.gameState.regions[0],
        trigger: "order"
      });
    }
  }

  componentWillUnmount(): void {
    // Discard any pending, unsent musterings so they don't corrupt the shared game model
    // (e.g. when the component is torn down by switching to replay mode instead of submitting)
    this.reset();
  }

  @action
  private onUnitClick(unit: Unit): void {
    for (const musteredRegion of this.musterings.keys) {
      const musterings = this.musterings.get(musteredRegion);

      for (let i = 0; i < musterings.length; i++) {
        const mustering = musterings[i];
        if (mustering.affectedUnit == unit) {
          this.removeMustering(musterings, i);
          return;
        }
      }
    }
  }

  @action
  private reset(): void {
    _.flatMap(this.musterings.values).forEach((r) => {
      r.region.newUnits = [];
      r.region.units.values.forEach((u) => (u.upgradedType = undefined));
    });

    this.musterings = new BetterMap();
  }
}
