/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Component, ReactElement, ReactNode } from "react";
import * as React from "react";
import { observer } from "mobx-react";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import Player from "../../common/ingame-game-state/Player";
import { Button, Col, OverlayTrigger, Popover } from "react-bootstrap";
import DraftMapGameState from "../../common/ingame-game-state/draft-game-state/draft-map-game-state/DraftMapGameState";
import { faInfo } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import Unit from "../../common/ingame-game-state/game-data-structure/Unit";
import PartialRecursive from "../../utils/PartialRecursive";
import { RegionOnMapProperties, UnitOnMapProperties } from "../MapControls";
import { renderRegionTooltip } from "../regionTooltip";
import unitTypes from "../../common/ingame-game-state/game-data-structure/unitTypes";
import UnitType from "../../common/ingame-game-state/game-data-structure/UnitType";

import { preventOverflow } from "@popperjs/core";
import _ from "lodash";
import UnitIconComponent from "../UnitIconComponent";
import housePowerTokensImages from "../housePowerTokensImages";
import getGarrisonToken from "../garrisonTokens";

@observer
export default class DraftMapComponent extends Component<
  GameStateComponentProps<DraftMapGameState>
> {
  modifyRegionsOnMapCallback: any;
  modifyUnitsOnMapCallback: any;

  get player(): Player | null {
    return this.props.gameClient.authenticatedPlayer;
  }

  get isParticipatingInDraft(): boolean {
    return (
      this.player != null &&
      this.props.gameState.parentGameState.participatingHouses.includes(
        this.player.house,
      )
    );
  }

  render(): ReactNode {
    return (
      <>
        <Row className="justify-content-center">
          <Col xs={12} className="text-center">
            All players can add and remove pieces according to their unit and
            supply limits.
          </Col>
        </Row>
        {this.isParticipatingInDraft && this.player != null && (
          <Row className="justify-content-center">
            <Col xs="12" className="text-center text-normal">
              Click on a piece to remove it, or click on a highlighted region to
              add pieces.
            </Col>
            <Col xs="auto">
              <Button
                type="button"
                disabled={this.props.gameState.readyHouses.includes(
                  this.player.house,
                )}
                onClick={() => this.props.gameState.setReady()}
                variant="success"
              >
                Ready
              </Button>
            </Col>
            <Col xs="auto">
              <Button
                type="button"
                disabled={
                  !this.props.gameState.readyHouses.includes(this.player.house)
                }
                onClick={() => this.props.gameState.setUnready()}
                variant="danger"
              >
                Unready
              </Button>
            </Col>
          </Row>
        )}
        <Row className="mt-3 justify-content-center">
          <Col xs={12} className="text-center">
            Waiting for{" "}
            {this.props.gameState
              .getNotReadyPlayers()
              .map((p) => p.house.name)
              .join(", ")}
            ...
          </Col>
        </Row>
      </>
    );
  }

  private modifyRegionsOnMap(): [
    Region,
    PartialRecursive<RegionOnMapProperties>,
  ][] {
    if (this.isParticipatingInDraft && this.player != null) {
      return this.props.gameState
        .getAvailableRegionsForHouse(this.player.house)
        .map((modifiedRegion) => [
          modifiedRegion,
          {
            highlight: { active: true },
            wrap: (child: ReactElement) => (
              <OverlayTrigger
                placement="auto"
                trigger="click"
                rootClose
                overlay={this.renderMusteringPopover(modifiedRegion)}
              >
                {child}
              </OverlayTrigger>
            ),
          },
        ]);
    }

    return [];
  }

  private getValidUnitsForRegion(region: Region): UnitType[] {
    const gameState = this.props.gameState;
    const house =
      this.props.gameClient.authenticatedPlayer != null
        ? this.props.gameClient.authenticatedPlayer.house
        : null;

    if (
      !house ||
      !gameState.getAvailableRegionsForHouse(house).includes(region)
    ) {
      return [];
    }

    return unitTypes.values.filter(
      (ut) =>
        ut.walksOn == region.type.kind &&
        gameState.getAvailableUnitsOfType(house, ut) > 0,
    );
  }

  private renderMusteringPopover(region: Region): OverlayChildren {
    const validUnits = this.getValidUnitsForRegion(region);
    return (
      <Popover id={"region-mustering-popover-" + region.id} className="p-3">
        <Row className="justify-content-center align-items-center mb-3">
          <Col xs={10}>
            <h5 className="my-0 text-center">
              <b>{region.name}</b>
            </h5>
          </Col>
          <Col xs="auto">
            <OverlayTrigger
              overlay={renderRegionTooltip(region)}
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
        </Row>
        <Row className="justify-content-center">
          <>
            {validUnits.length > 0 && this.player != null && (
              <>
                {validUnits
                  .filter((ut) =>
                    this.props.gameState.isLegalUnitAdd(
                      this.player!.house,
                      ut,
                      region,
                    ),
                  )
                  .map((ut) => (
                    <Col xs="auto" key={region.id + "_add_" + ut.id}>
                      <Button
                        type="button"
                        onClick={() => this.props.gameState.addUnit(ut, region)}
                      >
                        <UnitIconComponent
                          house={this.player!.house}
                          unitType={ut}
                        />
                      </Button>
                    </Col>
                  ))}
              </>
            )}
            {this.player &&
              this.props.gameState.isLegalPowerTokenAdd(
                this.player.house,
                region,
              ) && (
                <Col xs="auto">
                  <Button
                    type="button"
                    onClick={() => this.props.gameState.addPowerToken(region)}
                  >
                    <img
                      className="house-power-token"
                      src={housePowerTokensImages.get(this.player.house.id)}
                    />
                  </Button>
                </Col>
              )}
          </>
        </Row>
        {this.player &&
          this.props.gameState.canRemovePowerToken(
            this.player.house,
            region,
          ) && (
            <Row className="justify-content-center">
              <Col xs="auto">
                <Button
                  type="button"
                  onClick={() => this.props.gameState.removePowerToken(region)}
                >
                  Remove Power token
                </Button>
              </Col>
            </Row>
          )}
        {this.player && region.garrison == 0 && (
          <Row className="justify-content-center">
            {this.props.gameState.allowedGarrisonStrengths.map((garrison) => {
              if (
                !this.props.gameState.isLegalGarrisonAdd(
                  this.player!.house,
                  garrison,
                  region,
                )
              ) {
                return null;
              }
              return (
                <Col xs="auto" key={garrison}>
                  <Button
                    type="button"
                    onClick={() =>
                      this.props.gameState.addGarrison(region, garrison)
                    }
                  >
                    <img
                      className="garrison-icon"
                      src={getGarrisonToken(garrison) ?? ""}
                    />
                  </Button>
                </Col>
              );
            })}
          </Row>
        )}
        {this.player &&
          region.garrison > 0 &&
          this.props.gameState
            .getAvailableRegionsForHouse(this.player.house)
            .includes(region) && (
            <Row className="justify-content-center">
              <Col xs="auto">
                <Button
                  type="button"
                  onClick={() => this.props.gameState.removeGarrison(region)}
                >
                  Remove Garrison
                </Button>
              </Col>
            </Row>
          )}
      </Popover>
    );
  }

  private modifyUnitsOnMap(): [Unit, PartialRecursive<UnitOnMapProperties>][] {
    if (this.isParticipatingInDraft && this.player != null) {
      return this.props.gameState.world
        .getUnitsOfHouse(this.player.house)
        .filter((u) =>
          this.props.gameState.canRemoveUnit(this.player!.house, u),
        )
        .map((u) => [
          u,
          {
            highlight: { active: true },
            onClick: () => {
              this.props.gameState.removeUnit(u);
            },
          },
        ]);
    }

    return [];
  }

  componentDidMount(): void {
    this.props.mapControls.modifyRegionsOnMap.push(
      (this.modifyRegionsOnMapCallback = () => this.modifyRegionsOnMap()),
    );
    this.props.mapControls.modifyUnitsOnMap.push(
      (this.modifyUnitsOnMapCallback = () => this.modifyUnitsOnMap()),
    );
  }

  componentWillUnmount(): void {
    _.pull(
      this.props.mapControls.modifyRegionsOnMap,
      this.modifyRegionsOnMapCallback,
    );
    _.pull(
      this.props.mapControls.modifyUnitsOnMap,
      this.modifyUnitsOnMapCallback,
    );
  }
}
