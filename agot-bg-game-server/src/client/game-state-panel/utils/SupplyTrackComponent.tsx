import { t, Trans } from "../../i18n";
import MapContribution from "../../MapContribution";
import { Component, default as React, ReactNode } from "react";
import { observer } from "mobx-react";
import Badge from "react-bootstrap/Badge";
import Col from "react-bootstrap/Col";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Row from "react-bootstrap/Row";
import Tooltip from "react-bootstrap/Tooltip";
import houseInfluenceImages from "../../houseInfluenceImages";
import House from "../../../common/ingame-game-state/game-data-structure/House";
import BetterMap from "../../../utils/BetterMap";
import barrelImage from "../../../../public/images/icons/barrel.svg";
import Region from "../../../common/ingame-game-state/game-data-structure/Region";
import PartialRecursive from "../../../utils/PartialRecursive";
import MapControls, {
  RegionOnMapProperties
} from "../../../client/MapControls";
import IngameGameState from "../../../common/ingame-game-state/IngameGameState";
import { action, observable } from "mobx";
import GameClient from "../../GameClient";

interface SupplyTrackComponentProps {
  gameClient: GameClient;
  supplyRestrictions: number[][];
  houses: House[];
  ingame: IngameGameState;
  mapControls: MapControls;
}

@observer
export default class SupplyTrackComponent extends Component<SupplyTrackComponentProps> {
  @observable accessor highlightedRegions = new BetterMap<
    Region,
    PartialRecursive<RegionOnMapProperties>
  >();

  get fogOfWar(): boolean {
    return this.props.ingame.fogOfWar;
  }

  render(): ReactNode {
    return (
      <Row>
        <MapContribution
          mapControls={this.props.mapControls}
          gameState={this.props.ingame}
          kind="hover"
          regions={this.modifyRegionsOnMap()}
        />
        <Col xs="auto">
          <OverlayTrigger
            overlay={
              <Tooltip id="supply-track">
                <Trans
                  i18nKey="supplyTrack.supplyTrackEachSupplyTrackColumnContainsAList352379"
                  components={{ bold: <b />, lineBreak: <br /> }}
                />
              </Tooltip>
            }
            placement="right"
          >
            <img width="32px" src={barrelImage} alt={t("common.supply")} />
          </OverlayTrigger>
        </Col>
        <Col>
          <Row className="justify-content-center">
            {this.props.supplyRestrictions.map((allowedArmies, i) => (
              <Col
                xs="auto"
                key={`supply-track_${i}`}
                className="d-flex flex-column align-items-center"
              >
                <div>
                  <OverlayTrigger
                    overlay={
                      <Tooltip id={`supply-track-col-${i}`}>
                        {i == 0 ? (
                          <>
                            {t(
                              "supplyTrack.playersMayHaveTwoArmiesWithAMaximumSize69834f"
                            )}
                          </>
                        ) : i == 1 ? (
                          <>
                            {t(
                              "supplyTrack.playersMayHaveTwoArmiesOneWithAMaximum47e8fb"
                            )}
                          </>
                        ) : i == 2 ? (
                          <>
                            {t(
                              "supplyTrack.playersMayHaveThreeArmiesOneWithAMaximum7d2a6b"
                            )}
                          </>
                        ) : i == 3 ? (
                          <>
                            {t(
                              "supplyTrack.playersMayHaveFourArmiesOneWithAMaximumdb0007"
                            )}
                          </>
                        ) : i == 4 ? (
                          <>
                            {t(
                              "supplyTrack.playersMayHaveFourArmiesTwoWithAMaximum03c157"
                            )}
                          </>
                        ) : i == 5 ? (
                          <>
                            {t(
                              "supplyTrack.playersMayHaveFourArmiesOneWithAMaximum17167e"
                            )}
                          </>
                        ) : (
                          <>
                            {t(
                              "supplyTrack.playersMayHaveFiveArmiesOneWithAMaximum4da918"
                            )}
                          </>
                        )}
                      </Tooltip>
                    }
                    placement="auto"
                  >
                    <Badge bg="secondary" style={{ fontSize: "1rem" }}>
                      {i}
                    </Badge>
                  </OverlayTrigger>
                </div>
                <div className="d-flex">
                  <div
                    style={{
                      width: "18px",
                      marginRight: "6px",
                      marginTop: "10px"
                    }}
                  >
                    {this.getHousesAtSupplyLevel(i)
                      .filter((h) =>
                        !this.fogOfWar
                          ? h
                          : this.props.gameClient.doesControlHouse(h)
                      )
                      .map((h) => (
                        <OverlayTrigger
                          key={`supply-for-house-tooltip_${h.id}`}
                          overlay={
                            <Tooltip id={`supply-house-${h.id}`}>
                              {h.name}
                            </Tooltip>
                          }
                          placement="auto"
                        >
                          <div
                            key={`supply-for-house_${h.id}`}
                            className="supply-icon hover-weak-outline"
                            style={{
                              backgroundImage: `url(${houseInfluenceImages.get(h.id)})`,
                              marginTop: "-5px"
                            }}
                            onMouseEnter={() => this.setHighlightedRegions(h)}
                            onMouseLeave={() => this.clearHighlightedRegions()}
                          ></div>
                        </OverlayTrigger>
                      ))}
                  </div>
                  <div>
                    {allowedArmies.map((size, i) => (
                      <div
                        style={{ marginBottom: "-6px" }}
                        key={`allowed-army-size_${i}`}
                      >
                        {size}
                      </div>
                    ))}
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Col>
      </Row>
    );
  }

  @action
  setHighlightedRegions(house: House): void {
    const regions = this.props.ingame.world.regions.values.filter(
      (r) => r.supplyIcons > 0 && r.getController() == house
    );
    this.highlightedRegions.clear();

    regions.forEach((r) => {
      this.highlightedRegions.set(r, {
        highlight: {
          active: true,
          color: house.getHighlightColor(),
          light: r.type.id == "sea",
          strong: r.type.id == "land",
          text: r.supplyIcons > 1 ? r.supplyIcons.toString() : undefined
        }
      });
    });

    this.props.ingame.world.regions.values.forEach((r) => {
      if (!this.highlightedRegions.has(r)) {
        this.highlightedRegions.set(r, { highlight: { active: false } });
      }
    });
  }

  getHousesAtSupplyLevel(supplyLevel: number): House[] {
    return this.props.houses.filter((h) => h.supplyLevel == supplyLevel);
  }

  modifyRegionsOnMap(): [Region, PartialRecursive<RegionOnMapProperties>][] {
    return this.highlightedRegions.entries;
  }

  @action
  clearHighlightedRegions(): void {
    this.highlightedRegions.clear();
  }
}
