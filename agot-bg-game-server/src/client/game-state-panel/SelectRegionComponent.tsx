import { t, Trans } from "../i18n";
import MapContribution from "../MapContribution";
import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import React from "react";
import { action, observable } from "mobx";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import GameStateComponentProps from "./GameStateComponentProps";
import { Row, Col, Button } from "react-bootstrap";
import SelectRegionGameState from "../../common/ingame-game-state/select-region-game-state/SelectRegionGameState";
import { RegionOnMapProperties } from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";

@observer
export default class SelectRegionComponent extends Component<
  GameStateComponentProps<SelectRegionGameState<any>>
> {
  @observable accessor selectedRegion: Region | null;

  render(): ReactNode {
    return (
      <>
        <MapContribution
          mapControls={this.props.mapControls}
          gameState={this.props.gameState}
          regions={this.modifyRegionsOnMap()}
        />
        <Col xs={12}>
          {this.props.gameClient.doesControlHouse(
            this.props.gameState.house
          ) ? (
            <>
              {this.selectedRegion && (
                <p className="text-center">
                  <Trans
                    i18nKey="selectRegion.selectedArea8b3a09"
                    components={{
                      element0: <b />,
                      value1: <>{this.selectedRegion.name}</>
                    }}
                  />
                </p>
              )}
              <Row className="justify-content-center">
                <Col xs="auto">
                  <Button
                    type="button"
                    variant="success"
                    onClick={() => this.confirm()}
                    disabled={this.selectedRegion == null}
                  >
                    {t("common.confirm")}
                  </Button>
                </Col>
                <Col xs="auto">
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => this.reset()}
                    disabled={this.selectedRegion == null}
                  >
                    {t("common.reset")}
                  </Button>
                </Col>
              </Row>
            </>
          ) : (
            <div className="text-center">
              <Trans
                i18nKey="common.waitingFor"
                components={{
                  houses: (
                    <>
                      {
                        this.props.gameState.ingame.getControllerOfHouse(
                          this.props.gameState.house
                        ).house.name
                      }
                    </>
                  )
                }}
              />
            </div>
          )}
        </Col>
      </>
    );
  }

  modifyRegionsOnMap(): [Region, PartialRecursive<RegionOnMapProperties>][] {
    if (this.props.gameClient.doesControlHouse(this.props.gameState.house)) {
      if (this.selectedRegion == null) {
        return this.props.gameState.regions.map((r) => [
          r,
          { highlight: { active: true }, onClick: () => this.onRegionClick(r) }
        ]);
      } else {
        return [
          [
            this.selectedRegion,
            {
              highlight: { active: true },
              onClick: () => this.onRegionClick(this.selectedRegion as Region)
            }
          ]
        ];
      }
    }

    return [];
  }

  @action
  private reset(): void {
    this.selectedRegion = null;
  }

  @action
  private onRegionClick(r: Region): void {
    if (this.selectedRegion == r) {
      this.reset();
    } else {
      this.selectedRegion = r;
    }
  }

  @action
  private confirm(): void {
    if (!this.selectedRegion) {
      return;
    }

    this.props.gameState.select(this.selectedRegion);
    this.reset();
  }
}
