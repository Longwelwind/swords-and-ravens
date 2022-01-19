import {Component, default as React, ReactNode} from "react";
import {observer} from "mobx-react";
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
import MapControls, { RegionOnMapProperties } from "../../../client/MapControls";
import IngameGameState from "../../../common/ingame-game-state/IngameGameState";
import { observable } from "mobx";
import _ from "lodash";

interface SupplyTrackComponentProps {
    supplyRestrictions: number[][];
    houses: BetterMap<string, House>;
    ingame: IngameGameState;
    mapControls: MapControls;
}

@observer
export default class SupplyTrackComponent extends Component<SupplyTrackComponentProps> {
    modifyRegionsOnMapCallback: any;
    @observable highlightedRegions = new BetterMap<Region, PartialRecursive<RegionOnMapProperties>>();

    render(): ReactNode {
        return (
            <Row>
                <Col xs="auto">
                    <OverlayTrigger overlay={
                        <Tooltip id="supply-track">
                            <b>Supply Track</b><br />
                            Each supply track column contains a list of numbers illustrating the
                            maximum size and count of each player&apos;s armies. (An army is made up
                            of two or more units within the same land or sea area.) The supply
                            track is updated from game effects, such as the &quot;Supply&quot; Westeros
                            card. The updated supply position is determined by the number of
                            Supply icons printed in areas that the player controls.
                        </Tooltip>
                        }
                        placement="right"
                    >
                        <img width="32px" src={barrelImage} alt="Supply"/>
                    </OverlayTrigger>
                </Col>
                <Col>
                    <Row className="justify-content-center">
                        {this.props.supplyRestrictions.map((allowedArmies, i) => (
                            <Col xs="auto" key={i} className="d-flex flex-column align-items-center">
                                <div>
                                    <OverlayTrigger
                                        overlay={
                                            <Tooltip id={`supply-track-col-${i}`}>
                                                {i == 0 ? (
                                                    <>
                                                        Players may have two armies with a maximum size of 2 units each.
                                                    </>
                                                ) : i == 1 ? (
                                                    <>
                                                        Players may have two armies. One with a maximum size of 3 units
                                                        and another with a maximum size of 2 units.
                                                    </>
                                                ) : i == 2 ? (
                                                    <>
                                                        Players may have three armies. One with a maximum size of 3 units
                                                        and two others with a maximum size of 2 units each.
                                                    </>
                                                ) : i == 3 ? (
                                                    <>
                                                        Players may have four armies. One with a maximum size of 3 units
                                                        and three others with a maximum size of 2 units each.
                                                    </>
                                                ) : i == 4 ? (
                                                    <>
                                                        Players may have four armies. Two with a maximum size of 3 units
                                                        each and two others with a maximum size of 2 units each.
                                                    </>
                                                ) : i == 5 ? (
                                                    <>
                                                        Players may have four armies. One with a maximum size of 4 units,
                                                        another with a maximum size of 3 units, and two others with a
                                                        maximum size of 2 units each.
                                                    </>
                                                ) : (
                                                    <>
                                                        Players may have five armies. One with a maximum size of 4 units,
                                                        another with a maximum size of 3 units, and three others with a
                                                        maximum size of 2 units each.
                                                    </>
                                                )}
                                            </Tooltip>
                                        }
                                        placement="auto"
                                    >
                                        <Badge variant="secondary" style={{fontSize: "14px"}}>
                                            {i}
                                        </Badge>
                                    </OverlayTrigger>
                                </div>
                                <div className="d-flex">
                                    <div style={{width: "18px", marginRight: "6px", marginTop: "10px"}}>
                                        {this.getHousesAtSupplyLevel(i).map(h => (
                                            <OverlayTrigger
                                                key={h.id}
                                                overlay={
                                                    <Tooltip id={`supply-house-${h.id}`}>
                                                        {h.name}
                                                    </Tooltip>
                                                }
                                                placement="auto">
                                                    <div
                                                        key={h.id}
                                                        className="supply-icon hover-weak-outline"
                                                        style={{
                                                            backgroundImage: `url(${houseInfluenceImages.get(h.id)})`,
                                                            marginTop: "-5px"
                                                        }}
                                                        onMouseEnter={() => this.setHighlightedRegions(h)} onMouseLeave={() => this.highlightedRegions.clear()}
                                                    >
                                                    </div>
                                            </OverlayTrigger>
                                        ))}
                                    </div>
                                    <div>
                                        {allowedArmies.map((size, i) => (
                                            <div style={{marginBottom: "-6px"}} key={i}>
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

    setHighlightedRegions(house: House): void {
        const regions = this.props.ingame.world.regions.values.filter(r => r.supplyIcons > 0 && r.getController() == house);
        this.highlightedRegions.clear();

        regions.forEach(r => {
            this.highlightedRegions.set(r, {
                highlight: {
                    active: true,
                    color: house.id != "greyjoy" ? house.color : "#000000",
                    light: r.type.id == "sea",
                    strong: r.type.id == "land",
                    text: r.supplyIcons > 1 ? r.supplyIcons.toString(): undefined
                }
            });
        });

        this.props.ingame.world.regions.values.forEach(r => {
            if (!this.highlightedRegions.has(r)) {
                this.highlightedRegions.set(r, { highlight: { active: false } } );
            }
        });
    }

    getHousesAtSupplyLevel(supplyLevel: number): House[] {
        return this.props.houses.values.filter(h => h.supplyLevel == supplyLevel);
    }

    modifyRegionsOnMap(): [Region, PartialRecursive<RegionOnMapProperties>][] {
        return this.highlightedRegions.entries;
    }

    componentDidMount(): void {
        this.props.mapControls.modifyRegionsOnMap.push(this.modifyRegionsOnMapCallback = () => this.modifyRegionsOnMap());
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.modifyRegionsOnMap, this.modifyRegionsOnMapCallback);
    }
}
