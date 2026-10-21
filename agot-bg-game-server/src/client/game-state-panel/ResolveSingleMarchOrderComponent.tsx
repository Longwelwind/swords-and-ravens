import MapContribution from "../MapContribution";
import GameClient from "../GameClient";
import { Component, ReactNode } from "react";
import ResolveSingleMarchOrderGameState from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/resolve-single-march-order-game-state/ResolveSingleMarchOrderGameState";
import React from "react";
import { action, observable } from "mobx";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import Unit from "../../common/ingame-game-state/game-data-structure/Unit";
import * as _ from "lodash";
import { observer } from "mobx-react";
import { Button, Form, OverlayTrigger, Tooltip } from "react-bootstrap";
import BetterMap from "../../utils/BetterMap";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import {
  OrderOnMapProperties,
  RegionOnMapProperties,
  UnitOnMapProperties
} from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";
import House from "../../common/ingame-game-state/game-data-structure/House";
import UnitIconComponent from "../UnitIconComponent";
import { preventOverflow } from "@popperjs/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfo } from "@fortawesome/free-solid-svg-icons";
import { OverlayChildren } from "react-bootstrap/Overlay";

@observer
export default class ResolveSingleMarchOrderComponent extends Component<
  GameStateComponentProps<ResolveSingleMarchOrderGameState>
> {
  @observable private accessor _selectedMarchOrderRegion: Region | null;
  @observable accessor selectedUnits: Unit[] = [];
  @observable accessor plannedMoves = new BetterMap<Region, Unit[]>();
  @observable accessor leavePowerToken: boolean | undefined = undefined;
  canLeavePowerToken = false;
  canLeavePowerTokenReason = "";

  private get gameState(): ResolveSingleMarchOrderGameState {
    return this.props.gameState;
  }
  private get gameClient(): GameClient {
    return this.props.gameClient;
  }

  resetTimeoutId = -1;

  get selectedMarchOrderRegion(): Region | null {
    return this._selectedMarchOrderRegion;
  }

  set selectedMarchOrderRegion(val: Region | null) {
    if (val && this._selectedMarchOrderRegion == null) {
      this.gameClient.sfxManager.playSoundWhenClickingMarchOrder(val);
    }

    if (val == null) {
      this.gameClient.sfxManager.fadeOutCurrentSfx();
    }

    this._selectedMarchOrderRegion = val;
  }

  get house(): House {
    return this.gameState.house;
  }

  get isVassalHouse(): boolean {
    return this.gameState.ingame.isVassalHouse(this.house);
  }

  get attackingUnits(): Unit[] {
    return _.flatMap(
      this.plannedMoves.entries
        .filter(([r, _u]) => this.gameState.doesMoveTriggerAttack(r))
        .map(([_r, u]) => u)
    );
  }

  get usedButStillValidTargetRegions(): Region[] {
    return this.selectedMarchOrderRegion != null &&
      this.selectedUnits.length > 0
      ? this.gameState.getUsedButStillValidTargetRegions(
          this.selectedMarchOrderRegion,
          this.plannedMoves,
          this.selectedUnits
        )
      : [];
  }

  get validTargetRegions(): Region[] {
    return this.selectedMarchOrderRegion != null &&
      this.selectedUnits.length > 0
      ? this.gameState.getValidTargetRegions(
          this.selectedMarchOrderRegion,
          this.plannedMoves.entries,
          this.selectedUnits
        )
      : [];
  }

  constructor(
    props: GameStateComponentProps<ResolveSingleMarchOrderGameState>
  ) {
    super(props);
    this.UNSAFE_componentWillUpdate();
  }

  getMarchableUnits(region: Region): Unit[] {
    return _.intersection(
      region.allUnits,
      this.gameState.getValidMarchUnits(region)
    );
  }

  render(): ReactNode {
    const movingUnits = _.flatMap(this.plannedMoves.values);
    const allUnitsWillLeaveStartingRegion = this.selectedMarchOrderRegion
      ? this.selectedMarchOrderRegion.units.size == movingUnits.length
      : false;
    const allUnitsSelected =
      this.selectedMarchOrderRegion?.allUnits.length ==
      this.selectedUnits.length;
    return (
      <>
        <MapContribution
          mapControls={this.props.mapControls}
          gameState={this.props.gameState}
          orders={this.modifyOrdersOnMap()}
          units={this.modifyUnitsOnMap()}
          regions={this.modifyRegionsOnMap()}
        />
        <Col xs={12} className="text-center">
          House <b>{this.house.name}</b> must resolve one of its March Orders.
        </Col>
        {this.gameClient.doesControlHouse(this.house) ? (
          <>
            <Col xs={12}>
              <Row className="d-flex justify-content-center align-items-center">
                <Col xs={10} className="text-center">
                  {this.selectedMarchOrderRegion == null ? (
                    <>
                      Click on one of your March Orders.
                      <br />
                      Double-click the order to select all units in that area.
                    </>
                  ) : this.selectedUnits.length == 0 &&
                    !allUnitsWillLeaveStartingRegion ? (
                    <>
                      Click on a subset of the troops in{" "}
                      <b>{this.selectedMarchOrderRegion.name}</b>.
                      <br />
                      Double-click the march order to select all units in that
                      area.
                    </>
                  ) : this.selectedUnits.length != 0 &&
                    this.validTargetRegions.length == 0 &&
                    this.usedButStillValidTargetRegions.length == 0 ? (
                    <>
                      There are no valid target areas for your current
                      selection!
                    </>
                  ) : !allUnitsWillLeaveStartingRegion ? (
                    <>
                      Click on a neighbouring area
                      {!allUnitsSelected && (
                        <>
                          , or click on other units in{" "}
                          <b>{this.selectedMarchOrderRegion.name}</b>
                        </>
                      )}
                      .
                      {!allUnitsSelected && (
                        <>
                          <br />
                          Double-click the march order to select all units in
                          that area.
                        </>
                      )}
                    </>
                  ) : (
                    <></>
                  )}
                </Col>
                {!allUnitsWillLeaveStartingRegion && (
                  <Col xs="auto">
                    <OverlayTrigger
                      overlay={this.renderColorLegendTooltip()}
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
                )}
              </Row>
            </Col>
            {this.selectedMarchOrderRegion && this.plannedMoves.size > 0 && (
              <Col xs={12} className="mt-2">
                <div>
                  <div style={{ marginBottom: "20px" }}>
                    Planned moves from{" "}
                    <b>{this.selectedMarchOrderRegion.name}</b>:
                  </div>
                  {this.plannedMoves.entries.map(([region, units]) => (
                    <div
                      key={`planned-moves_${region.id}`}
                      style={{ marginLeft: "20px" }}
                    >
                      {units.map((unit, i) => (
                        <div
                          key={`planned_units_${this.house.id}_${unit.id}_${i}`}
                          style={{ display: "inline" }}
                        >
                          <UnitIconComponent
                            house={this.house}
                            unitType={unit.type}
                            size="smedium"
                            makeGreyjoyUnitsBlack={true}
                            /* Moving units never can be wounded so we don't need to set it here */
                          />
                        </div>
                      ))}
                      <div style={{ display: "inline", verticalAlign: "top" }}>
                        &nbsp;=&gt;&nbsp;{region.name}
                      </div>
                    </div>
                  ))}
                </div>
              </Col>
            )}
            {this.selectedMarchOrderRegion != null && (
              <>
                {this.renderLeavePowerToken(
                  this.selectedMarchOrderRegion,
                  allUnitsWillLeaveStartingRegion
                )}
                <Col xs={12}>
                  <Row className="justify-content-center">
                    <Col xs="auto">
                      <Button
                        type="button"
                        variant="success"
                        onClick={() => this.confirm()}
                        disabled={this.leavePowerToken == undefined}
                      >
                        Confirm
                      </Button>
                    </Col>
                    <Col xs="auto">
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => this.reset()}
                      >
                        Reset
                      </Button>
                    </Col>
                  </Row>
                </Col>
              </>
            )}
            {this.gameState.supportersAgainstNeutralForce == null &&
              (this.gameState.getPossibleSupportingHousesAgainstNeutralForces()
                ?.size ?? -1) > 0 && (
                <Col xs={12}>
                  <Row className="justify-content-center">
                    <Col xs="auto">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() =>
                          this.callForSupportAgainstNeutralForces()
                        }
                      >
                        Call for Support against Neutral Forces
                      </Button>
                    </Col>
                  </Row>
                </Col>
              )}
          </>
        ) : (
          <Col xs={12} className="text-center">
            Waiting for{" "}
            {this.gameState.ingame.getControllerOfHouse(this.house).house.name}
            ...
          </Col>
        )}
      </>
    );
  }

  renderColorLegendTooltip(): OverlayChildren {
    return (
      <Tooltip id={`color-legend-tooltip`} className="tooltip-w-100">
        <Col>
          <h6>Highlighted units legend</h6>
          <div>
            <b>White</b>: Selectable
          </div>
          <div>
            <b style={{ color: "yellow" }}>Yellow</b>: Selected
          </div>
          <div>
            <b style={{ color: "red" }}>Red</b>: Attacking
          </div>
        </Col>
      </Tooltip>
    );
  }

  callForSupportAgainstNeutralForces(): void {
    this.gameState.callForSupportAgainstNeutralForces();
  }

  @action
  UNSAFE_componentWillUpdate(): any {
    const { success, reason } = this.selectedMarchOrderRegion
      ? this.gameState.canLeavePowerToken(
          this.selectedMarchOrderRegion,
          this.plannedMoves
        )
      : { success: false, reason: "no-all-units-go" };

    if (this.canLeavePowerToken != success) {
      // Set undefined here to actively force a user decision when a move was done which changed canLeavePowerToken
      this.leavePowerToken = undefined;
    }

    this.canLeavePowerToken = success;
    this.canLeavePowerTokenReason = reason;

    if (!this.canLeavePowerToken) {
      this.leavePowerToken = false;
    }

    if (this.isVassalHouse && this.canLeavePowerToken) {
      this.leavePowerToken = true;
    }
  }

  renderLeavePowerToken(
    startingRegion: Region,
    allUnitsWillLeaveStartingRegion: boolean
  ): ReactNode | null {
    const portRegion =
      startingRegion.game.world.getAdjacentPortOfCastle(startingRegion);
    const hasShipsInPort =
      portRegion == null ? false : portRegion.units.size > 0;
    const unitOwner = startingRegion.units.values[0].allegiance;
    const moveWillLoseControlOverRegion =
      startingRegion.controlPowerToken == null &&
      allUnitsWillLeaveStartingRegion;
    const superTokenOwner = startingRegion.superControlPowerToken;
    const superTokenOwnerName =
      superTokenOwner != null ? superTokenOwner.name : "";
    const warningToShow =
      moveWillLoseControlOverRegion &&
      superTokenOwner == null &&
      portRegion != null &&
      hasShipsInPort ? (
        <small>
          If you do not leave a token, the ships in <b>{portRegion.name}</b>{" "}
          will be destroyed.
        </small>
      ) : moveWillLoseControlOverRegion &&
        superTokenOwner != null &&
        superTokenOwner != unitOwner &&
        portRegion != null &&
        hasShipsInPort ? (
        <small>
          If you do not leave a token, <b>{superTokenOwnerName}</b> will regain
          control of <b>{startingRegion.name}</b> and capture your ships in{" "}
          <b>{portRegion.name}</b>.
        </small>
      ) : moveWillLoseControlOverRegion &&
        superTokenOwner != null &&
        superTokenOwner != unitOwner &&
        portRegion != null &&
        !hasShipsInPort ? (
        <small>
          If you do not leave a token, <b>{superTokenOwnerName}</b> will regain
          control of <b>{startingRegion.name}</b>.
        </small>
      ) : null;

    const showLeavePowerTokenPrompt = this.canLeavePowerTokenReason == "ok";

    return (
      this.plannedMoves.size > 0 && (
        <Col xs={12} className="text-center">
          <Form>
            <fieldset>
              <Form.Group className="mb-3">
                {showLeavePowerTokenPrompt ? (
                  <>
                    <Col xs={12} className="mb-0 pb-0">
                      <Form.Label>
                        Do you want to leave a Power token in{" "}
                        <b>{startingRegion.name}</b> to keep control?
                      </Form.Label>
                    </Col>
                    <Col xs={12} className="mt-0 pt-0">
                      <Form.Check
                        id="chk-leave-pt"
                        name="leave-pt-radios"
                        inline
                        type="radio"
                        label="Yes"
                        checked={this.leavePowerToken}
                        onChange={() => this.onLeavePowerTokenChange(true)}
                      />
                      <Form.Check
                        id="chk-dont-leave-pt"
                        name="leave-pt-radios"
                        inline
                        type="radio"
                        label="No"
                        checked={this.leavePowerToken == false}
                        onChange={() => this.onLeavePowerTokenChange(false)}
                      />
                    </Col>
                  </>
                ) : this.canLeavePowerTokenReason ==
                  "vassals-always-leave-power-token" ? (
                  <Col xs={12} className="text-center mb-0 pb-0">
                    <small>
                      Vassals automatically leave a Power token behind to
                      maintain control of <b>{startingRegion.name}</b>.
                    </small>
                  </Col>
                ) : this.canLeavePowerTokenReason ==
                  "no-power-token-available" ? (
                  <Col xs={12} className="text-center mb-0 pb-0">
                    You don&apos;t have any Power tokens left and will lose
                    control over {startingRegion.name}!
                  </Col>
                ) : (
                  <></>
                )}
                {this.leavePowerToken == false && warningToShow != null && (
                  <Col xs={12} className="mt-1 pt-0 mb-0 pb-0">
                    <Form.Label>{warningToShow}</Form.Label>
                  </Col>
                )}
              </Form.Group>
            </fieldset>
          </Form>
        </Col>
      )
    );
  }

  @action
  onLeavePowerTokenChange(leaveToken: boolean): void {
    if (this.isVassalHouse) {
      return;
    }

    if (!this.leavePowerToken && !this.canLeavePowerToken) {
      return;
    }

    this.leavePowerToken = leaveToken;
  }

  @action
  onUnitClick(_region: Region, unit: Unit): void {
    if (this.selectedUnits.includes(unit)) {
      _.pull(this.selectedUnits, unit);
    } else {
      this.selectedUnits.push(unit);
    }
  }

  @action
  onRegionClick(region: Region): void {
    const alreadyGoingUnits: Unit[] = this.plannedMoves.has(region)
      ? this.plannedMoves.get(region)
      : [];

    const newGoingArmy = alreadyGoingUnits.concat(this.selectedUnits);

    this.plannedMoves.set(region, newGoingArmy);

    // Make non combat moves directly visible by help of new/removedUnits to easily restore the original gameState by resetting new/removedUnits
    if (
      this.selectedMarchOrderRegion &&
      !this.gameState.doesMoveTriggerAttack(region)
    ) {
      region.newUnits = newGoingArmy;
      this.selectedMarchOrderRegion.removedUnits = _.concat(
        this.selectedMarchOrderRegion.removedUnits,
        newGoingArmy
      );
    }

    this.selectedUnits = [];
  }

  @action
  onOrderClick(event: React.MouseEvent<HTMLDivElement>, region: Region): void {
    if (this.selectedMarchOrderRegion == region) {
      if (event.detail == 1) {
        this.resetTimeoutId = window.setTimeout(() => {
          this.reset();
          this.resetTimeoutId = -1;
        }, 500);
      } else if (event.detail > 1) {
        if (this.resetTimeoutId > -1) {
          window.clearTimeout(this.resetTimeoutId);
          this.resetTimeoutId = -1;
        }
        this.selectAllUnits(this.selectedMarchOrderRegion);
      }
    } else {
      // this.selectedMarchOrderRegion == null
      if (event.detail > 1) {
        this.selectAllUnits(region);
      }

      this.selectedMarchOrderRegion = region;
    }
  }

  @action
  selectAllUnits(region: Region): void {
    this.selectedUnits = _.difference(
      this.getMarchableUnits(region),
      this.attackingUnits
    );
  }

  @action
  private reset(): void {
    if (this.selectedMarchOrderRegion) {
      this.selectedMarchOrderRegion.removedUnits = [];
    }
    this.plannedMoves.keys.forEach((r) => (r.newUnits = []));

    this.selectedMarchOrderRegion = null;
    this.selectedUnits = [];
    this.plannedMoves = new BetterMap<Region, Unit[]>();
    this.leavePowerToken = undefined;
  }

  @action
  confirm(): void {
    if (this.leavePowerToken == undefined) {
      return;
    }

    if (!this.selectedMarchOrderRegion) {
      return;
    }

    if (this.plannedMoves.size == 0) {
      if (!confirm("Do you want to remove your March Order?")) {
        return;
      }
    }

    this.gameState.sendMoves(
      this.selectedMarchOrderRegion,
      this.plannedMoves,
      this.leavePowerToken
    );

    this.reset();
  }

  modifyOrdersOnMap(): [Region, PartialRecursive<OrderOnMapProperties>][] {
    if (this.gameClient.doesControlHouse(this.house)) {
      const regions = this.selectedMarchOrderRegion
        ? [this.selectedMarchOrderRegion]
        : this.gameState.getRegionsWithMarchOrder();

      return regions.map((r) => [
        r,
        {
          highlight: {
            active: true,
            color: this.selectedMarchOrderRegion != null ? "yellow" : "white"
          },
          onClick: (e: React.MouseEvent<HTMLDivElement>) =>
            this.onOrderClick(e, r)
        }
      ]);
    }

    return [];
  }

  modifyUnitsOnMap(): [Unit, PartialRecursive<UnitOnMapProperties>][] {
    if (this.gameClient.doesControlHouse(this.house)) {
      if (!this.selectedMarchOrderRegion) {
        return [];
      }

      const attackingUnits = this.attackingUnits;

      const marchableUnits = this.getMarchableUnits(
        this.selectedMarchOrderRegion
      ).map(
        (u) =>
          [
            u,
            {
              highlight: {
                active: true,
                color: attackingUnits.includes(u)
                  ? "red"
                  : this.selectedUnits.includes(u)
                    ? "yellow"
                    : "white"
              },
              onClick: !attackingUnits.includes(u)
                ? () =>
                    this.onUnitClick(this.selectedMarchOrderRegion as Region, u)
                : undefined
            }
          ] as [Unit, PartialRecursive<UnitOnMapProperties>]
      );

      const movedUnits = _.flatMap(
        this.gameState.world.regions.values.map((r) => r.newUnits)
      ).map(
        (u) =>
          [
            u,
            {
              highlight: {
                active: true,
                color: "yellow"
              }
            }
          ] as [Unit, PartialRecursive<UnitOnMapProperties>]
      );

      return _.concat(marchableUnits, movedUnits);
    }

    return [];
  }

  modifyRegionsOnMap(): [Region, PartialRecursive<RegionOnMapProperties>][] {
    if (this.gameClient.doesControlHouse(this.house)) {
      const targetRegions = this.validTargetRegions;
      const usedButStillValidTargetRegions =
        this.usedButStillValidTargetRegions;
      const combatRegions = this.plannedMoves.keys.filter((r) =>
        this.gameState.doesMoveTriggerAttack(r)
      );

      return _.concat(
        targetRegions,
        usedButStillValidTargetRegions,
        combatRegions
      ).map((r) => [
        r,
        {
          highlight: {
            active: true,
            color: combatRegions.includes(r) ? "yellow" : "white"
          },
          onClick:
            targetRegions.includes(r) ||
            usedButStillValidTargetRegions.includes(r)
              ? () => this.onRegionClick(r)
              : undefined
        }
      ]);
    }

    return [];
  }

  componentWillUnmount(): void {
    // Discard any pending, unsent moves so they don't corrupt the shared game model
    this.reset();
  }
}
