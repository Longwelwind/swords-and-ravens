import { t, Trans } from "../i18n";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import React from "react";
import ResolveRetreatGameState from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/resolve-retreat-game-state/ResolveRetreatGameState";
import SelectRegionComponent from "./SelectRegionComponent";
import GameStateComponentProps from "./GameStateComponentProps";
import renderChildGameState from "../utils/renderChildGameState";
import SelectRegionGameState from "../../common/ingame-game-state/select-region-game-state/SelectRegionGameState";
import SelectUnitsGameState from "../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import SelectUnitsComponent from "./SelectUnitsComponent";
import Col from "react-bootstrap/Col";
import { observable } from "mobx";
import Region from "../../common/ingame-game-state/game-data-structure/Region";

@observer
export default class ResolveRetreatComponent extends Component<
  GameStateComponentProps<ResolveRetreatGameState>
> {
  @observable accessor selectRegionComponent: SelectRegionComponent;

  render(): ReactNode {
    const unitCountToBeDestroyed =
      this.selectRegionComponent && this.selectRegionComponent.selectedRegion
        ? this.getUnitCountToBeDestroyedByRetreatTo(
            this.selectRegionComponent.selectedRegion
          )
        : 0;
    return (
      <>
        {this.props.gameState.childGameState instanceof
        SelectRegionGameState ? (
          <>
            <Col xs={12} className="text-center">
              <Trans
                i18nKey="resolveRetreat.houseMustChooseTheRetreatLocationOfTheDefeated39c8d3"
                values={{
                  childGameStateHouse:
                    this.props.gameState.childGameState.house.name
                }}
                components={{
                  bold: <b />
                }}
              />
            </Col>
            {unitCountToBeDestroyed > 0 &&
              this.selectRegionComponent &&
              this.selectRegionComponent.selectedRegion && (
                <Col xs={12} className="text-center">
                  <Trans
                    i18nKey="resolveRetreat.mustBeDestroyedIfYouRetreatToc07ed8"
                    values={{
                      unitCountToBeDestroyed: unitCountToBeDestroyed,
                      unit: t("common.unit", { count: unitCountToBeDestroyed }),
                      selectRegionComponentSelectedRegion:
                        this.selectRegionComponent.selectedRegion.name
                    }}
                    components={{
                      bold: <b />,
                      bold2: <b />
                    }}
                  />
                </Col>
              )}
          </>
        ) : this.props.gameState.childGameState instanceof
          SelectUnitsGameState ? (
          <Col xs={12} className="text-center">
            <Trans
              i18nKey="resolveRetreat.houseMustChooseAsCasualtiesForRemainingUnitsTo0a572b"
              values={{
                childGameStateHouse:
                  this.props.gameState.childGameState.house.name,
                childGameStateCount: this.props.gameState.childGameState.count,
                unit: t("common.unit", {
                  count: this.props.gameState.childGameState.count
                }),
                retreatRegion:
                  this.props.gameState.retreatRegion?.name ??
                  t("common.unknown")
              }}
              components={{
                bold: <b />,
                bold2: <b />,
                bold3: <b />
              }}
            />
          </Col>
        ) : null}
        {renderChildGameState(
          this.props,
          [
            [SelectRegionGameState, SelectRegionComponent],
            [SelectUnitsGameState, SelectUnitsComponent]
          ],
          (c) =>
            c instanceof SelectRegionComponent
              ? (this.selectRegionComponent = c)
              : null
        )}
      </>
    );
  }

  getUnitCountToBeDestroyedByRetreatTo(region: Region): number {
    return this.props.gameState.getCasualtiesOfRetreatRegion(region);
  }
}
