import { t, Trans, translateGameText } from "../i18n";
import MapContribution from "../MapContribution";
import { Component, ReactNode } from "react";
import React from "react";
import BetterMap from "../../utils/BetterMap";
import Unit from "../../common/ingame-game-state/game-data-structure/Unit";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import * as _ from "lodash";
import { observer } from "mobx-react";
import GameStateComponentProps from "./GameStateComponentProps";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import House from "../../common/ingame-game-state/game-data-structure/House";
import { action, observable } from "mobx";
import Row from "react-bootstrap/Row";
import { UnitOnMapProperties } from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";
import ResolveSinglePayDebtGameState from "../../common/ingame-game-state/pay-debts-game-state/resolve-single-pay-debt-game-state/ResolveSinglePayDebtGameState";
import joinReactNodes from "../utils/joinReactNodes";

@observer
export default class ResolveSinglePayDebtComponent extends Component<
  GameStateComponentProps<ResolveSinglePayDebtGameState>
> {
  @observable accessor unitsToRemove: BetterMap<Region, Unit[]> =
    new BetterMap();

  get house(): House {
    return this.props.gameState.house;
  }

  get resolver(): House {
    return this.props.gameState.resolver;
  }

  get selectedUnits(): Unit[] {
    return _.flatMap(this.unitsToRemove.values);
  }

  get selectableUnits(): Unit[] {
    const selected = this.selectedUnits;
    if (this.props.gameState.debt > selected.length) {
      return this.props.gameState.availableUnitsOfHouse;
    } else {
      return selected;
    }
  }

  render(): ReactNode {
    const selected = this.selectedUnits;
    const notEnough = selected.length < this.props.gameState.debt;
    return (
      <Row>
        <MapContribution
          mapControls={this.props.mapControls}
          gameState={this.props.gameState}
          units={this.modifyUnitsOnMap()}
        />
        <Col xs={12} className="text-center">
          <p>
            {t(
              "resolveSinglePayDebt.theHolderOfTheValyrianSteelBladeDestroysOnee4005a"
            )}
          </p>
          <p>
            <Trans
              i18nKey="resolveSinglePayDebt.mustDestroyOfHouse802a9b"
              components={{
                element0: <b />,
                value1: <>{this.resolver.name}</>,
                element2: <b />,
                value3: <>{this.props.gameState.debt}</>,
                value4: (
                  <>{t("common.unit", { count: this.props.gameState.debt })}</>
                ),
                element5: <b />,
                value6: <>{this.house.name}</>
              }}
            />
          </p>
        </Col>
        {this.props.gameClient.doesControlHouse(this.resolver) ? (
          <>
            <Col xs={12}>
              <Row
                className="justify-content-center"
                style={{ paddingBottom: 10 }}
              >
                <ul>
                  {this.unitsToRemove.entries.map(([region, units]) => (
                    <li key={`pay-single-debt_${region.id}`}>
                      <Trans
                        i18nKey="common.in"
                        components={{
                          value0: (
                            <>
                              {joinReactNodes(
                                units.map((u, i) => (
                                  <b
                                    key={`pay-single-debt_${region.id}_${u.id}_${i}`}
                                  >
                                    {translateGameText(u.type.name)}
                                  </b>
                                )),
                                ", "
                              )}
                            </>
                          ),
                          element1: <b />,
                          value2: <>{region.name}</>
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </Row>
              <Row className="justify-content-center">
                <Col xs="auto">
                  <Button
                    type="button"
                    variant="success"
                    disabled={notEnough}
                    onClick={() => this.confirm()}
                  >
                    {t("common.confirm")}
                  </Button>
                </Col>
                <Col xs="auto">
                  <Button
                    type="button"
                    variant="danger"
                    disabled={this.unitsToRemove.size == 0}
                    onClick={() => this.reset()}
                  >
                    {t("common.reset")}
                  </Button>
                </Col>
              </Row>
            </Col>
          </>
        ) : (
          <Col xs={12} className="text-center">
            <Trans
              i18nKey="common.waitingFor"
              components={{ houses: <>{this.resolver.name}</> }}
            />
          </Col>
        )}
      </Row>
    );
  }

  @action
  onUnitClick(unit: Unit): void {
    // If there's no array for this region, add one
    if (!this.unitsToRemove.has(unit.region)) {
      this.unitsToRemove.set(unit.region, []);
    }

    if (!this.unitsToRemove.get(unit.region).includes(unit)) {
      // Add the clicked unit
      this.unitsToRemove.get(unit.region).push(unit);
    } else {
      // Remove the clicked unit
      _.pull(this.unitsToRemove.get(unit.region), unit);
    }

    // If the array for this region is now empty, remove it
    if (this.unitsToRemove.get(unit.region).length == 0) {
      this.unitsToRemove.delete(unit.region);
    }
  }

  @action
  confirm(): void {
    this.props.gameState.sendPayDebt(this.unitsToRemove.entries);
    this.reset();
  }

  @action
  private reset(): void {
    this.unitsToRemove = new BetterMap();
  }

  modifyUnitsOnMap(): [Unit, PartialRecursive<UnitOnMapProperties>][] {
    if (this.props.gameClient.doesControlHouse(this.resolver)) {
      const selected = this.selectedUnits;
      return this.selectableUnits.map((u) => [
        u,
        {
          highlight: {
            active: true,
            color: selected.includes(u) ? "red" : "white"
          },
          onClick: () => {
            this.onUnitClick(u);
          }
        }
      ]);
    }

    return [];
  }
}
