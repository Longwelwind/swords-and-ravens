import { t, Trans, translateGameText } from "../../i18n";
import MapContribution, { wrapMapElement } from "../../MapContribution";
import { observer } from "mobx-react";
import React, { Component, ReactNode } from "react";
import Region from "../../../common/ingame-game-state/game-data-structure/Region";
import BetterMap from "../../../utils/BetterMap";
import { action, observable } from "mobx";
import House from "../../../common/ingame-game-state/game-data-structure/House";
import * as _ from "lodash";
import { Button, OverlayTrigger, Popover } from "react-bootstrap";
import GameStateComponentProps from "../GameStateComponentProps";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { RegionOnMapProperties, UnitOnMapProperties } from "../../MapControls";
import PartialRecursive from "../../../utils/PartialRecursive";
import Unit from "../../../common/ingame-game-state/game-data-structure/Unit";
import PlaceSellswordsGameState from "../../../common/ingame-game-state/action-game-state/resolve-consolidate-power-game-state/execute-loan-game-state/place-sellwords-game-state/PlaceSellswordsGameState";
import UnitType from "../../../common/ingame-game-state/game-data-structure/UnitType";
import UnitIconComponent from "../../../client/UnitIconComponent";

@observer
export default class PlaceSellswordsComponent extends Component<
  GameStateComponentProps<PlaceSellswordsGameState>
> {
  @observable accessor placedSellswords = new BetterMap<Region, Unit[]>();

  get house(): House {
    return this.props.gameState.house;
  }

  get doesControlCurrentHouse(): boolean {
    return this.props.gameClient.doesControlHouse(this.house);
  }

  get placedSellswordTypes(): BetterMap<Region, UnitType[]> {
    return new BetterMap(
      this.placedSellswords.entries.map(([region, sellswords]) => [
        region,
        sellswords.map((s) => s.type)
      ])
    );
  }

  render(): ReactNode {
    return (
      <>
        <MapContribution
          mapControls={this.props.mapControls}
          gameState={this.props.gameState}
          regions={this.modifyRegionsOnMap()}
          units={this.modifyUnitsOnMap()}
        />
        {this.doesControlCurrentHouse && (
          <>
            {this.placedSellswords.size > 0 && (
              <Col xs={12}>
                <>
                  {this.placedSellswords.size > 0 && (
                    <p>{t("placeSellswords.yourPlacements5abb57")}</p>
                  )}
                  {this.placedSellswords.entries.map(([r, placements]) => (
                    <div key={`sellsword-placements_${r.id}`}>
                      <b>{r.name}</b>
                      <ul>
                        {placements.map((unit, i) => (
                          <li
                            onClick={() => this.removePlacement(placements, i)}
                            key={`sellsword-placements_${r.id}_${i}`}
                          >
                            {translateGameText(unit.type.name)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </>
              </Col>
            )}
            {this.props.gameState.anyPlacementPossible(
              this.placedSellswordTypes
            ) && (
              <Col xs={12} className="text-center">
                {this.props.gameState.regions.length == 1 ? (
                  <>
                    <Trans
                      i18nKey="placeSellswords.clickIntoToPlaceASellswordThere876165"
                      values={{ regions: this.props.gameState.regions[0].name }}
                      components={{
                        bold: <b />
                      }}
                    />
                  </>
                ) : (
                  <>
                    {t(
                      "placeSellswords.clickOnAAreaToPlaceASellswordTherecb1e61"
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
                    disabled={this.placedSellswords.size == 0}
                    onClick={() => this.reset()}
                  >
                    {t("common.reset")}
                  </Button>
                </Col>
              </Row>
            </Col>
          </>
        )}
        {(!this.doesControlCurrentHouse ||
          this.props.gameState.ingame.isVassalHouse(this.house)) && (
          <Col xs={12} className="text-center">
            <Trans
              i18nKey="common.waitingFor"
              values={{ houses: this.house.name }}
            />
          </Col>
        )}
      </>
    );
  }

  private removePlacement(sellswords: Unit[], i: number): void {
    const removedUnit = sellswords.splice(i, 1)[0];

    removedUnit.region.newUnits = removedUnit.region.newUnits.filter(
      (u) => u != removedUnit
    );

    this.removeEmptyPlacements();
  }

  @action
  private removeEmptyPlacements(): void {
    this.placedSellswords.keys.forEach((r) => {
      const placements = this.placedSellswords.get(r);
      if (placements.length == 0) {
        this.placedSellswords.delete(r);
      }
    });
  }

  private canSubmit(): boolean {
    return this.props.gameState.isPlacementValid(this.placedSellswordTypes);
  }

  @action
  submit(): void {
    if (this.props.gameState.anyPlacementPossible(this.placedSellswordTypes)) {
      if (
        !confirm(
          t("placeSellswords.youHaveNotPlacedAllOfYourSellswordsContinue2bc53c")
        )
      ) {
        return;
      }
    }

    this.props.gameState.sendPlaceSellswors(this.placedSellswordTypes);
    this.reset();
  }

  private modifyRegionsOnMap(): [
    Region,
    PartialRecursive<RegionOnMapProperties>
  ][] {
    if (this.doesControlCurrentHouse) {
      const regionsToModify = this.props.gameState.regions.filter(
        (r) =>
          this.props.gameState.getValidUnitsForRegion(
            r,
            this.placedSellswordTypes
          ).length > 0
      );

      return regionsToModify.map((modifiedRegion) => [
        modifiedRegion,
        {
          highlight: { active: true },
          wrap: wrapMapElement(
            <OverlayTrigger
              placement="auto"
              trigger="click"
              rootClose
              overlay={
                <Popover
                  id={"region-popover-" + modifiedRegion.id}
                  className="p-2"
                >
                  <Col xs="12">
                    <h5 className="text-center">{modifiedRegion.name}</h5>
                    <Row className="justify-content-center">
                      {this.props.gameState
                        .getValidUnitsForRegion(
                          modifiedRegion,
                          this.placedSellswordTypes
                        )
                        .map((ut, i) => (
                          <Col
                            xs="auto"
                            key={modifiedRegion.id + "_sellsword_" + i}
                          >
                            <Button
                              type="button"
                              onClick={() =>
                                this.addPlacement(modifiedRegion, ut)
                              }
                            >
                              <UnitIconComponent
                                house={this.house}
                                unitType={ut}
                              />
                            </Button>
                          </Col>
                        ))}
                    </Row>
                  </Col>
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
  private addPlacement(region: Region, unitType: UnitType): void {
    const placements: Unit[] = this.placedSellswords.tryGet(region, []);
    const newUnit = this.props.gameState.game.createUnit(
      region,
      unitType,
      this.house
    );
    region.newUnits.push(newUnit);

    placements.push(newUnit);
    this.placedSellswords.set(region, placements);

    this.removeEmptyPlacements();

    if (
      this.props.gameState.getValidUnitsForRegion(
        region,
        this.placedSellswordTypes
      ).length == 0
    ) {
      document.body.click();
    }
  }

  private modifyUnitsOnMap(): [Unit, PartialRecursive<UnitOnMapProperties>][] {
    if (this.doesControlCurrentHouse) {
      const allPlacedRegions = _.uniq(
        _.flatMap(this.placedSellswords.values).map((m) => m.region)
      );
      const allPlacedSellswords = _.flatMap(
        allPlacedRegions.map((r) => r.newUnits)
      );

      return allPlacedSellswords.map((u) => [
        u,
        {
          highlight: { active: true, color: "green" },
          onClick: () => {
            this.onUnitClick(u);
          }
        }
      ]);
    }

    return [];
  }

  componentWillUnmount(): void {
    // Discard any pending, unsent sellsword placements so they don't corrupt the shared game model
    this.reset();
  }

  @action
  private onUnitClick(unit: Unit): void {
    for (const region of this.placedSellswords.keys) {
      const placements = this.placedSellswords.get(region);

      for (let i = 0; i < placements.length; i++) {
        const placedSellsword = placements[i];
        if (placedSellsword == unit) {
          this.removePlacement(placements, i);
          return;
        }
      }
    }
  }

  @action
  private reset(): void {
    _.flatMap(this.placedSellswords.values).forEach((r) => {
      r.region.newUnits = [];
      r.region.units.values.forEach((u) => (u.upgradedType = undefined));
    });

    this.placedSellswords = new BetterMap();
  }
}
