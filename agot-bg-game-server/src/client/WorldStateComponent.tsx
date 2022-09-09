import { Component, ReactNode } from "react";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import * as React from "react";
import Region, { RegionState } from "../common/ingame-game-state/game-data-structure/Region";
import westerosImage from "../../public/images/westeros.jpg";
import westeros7pImage from "../../public/images/westeros-7p.jpg";
import westerosWithEssosImage from "../../public/images/westeros-with-essos.jpg";
import ffcEyrieWithPortImage from "../../public/images/ffc-eyrie-with-port.jpg";
import castleDegradeImage from "../../public/images/region-modifications/CastleDegrade.png"
import castleUpgradeImage from "../../public/images/region-modifications/CastleUpgrade.png"
import barrelImage from "../../public/images/region-modifications/Barrel.png"
import crownImage from "../../public/images/region-modifications/Crown.png"
import orderImages from "./orderImages";
import unitImages from "./unitImages";
import classNames from "classnames";
import housePowerTokensImages from "./housePowerTokensImages";
import BetterMap from "../utils/BetterMap";
import _ from "lodash";
import getGarrisonToken from "./garrisonTokens";
import loyaltyTokenImage from "../../public/images/power-tokens/Loyalty.png"

export const MAP_HEIGHT = 1378;
export const MAP_WIDTH = 741;
export const DELUXE_MAT_WIDTH = 1204;

interface WorldStateComponentProps {
    ingameGameState: IngameGameState;
    worldState: RegionState[];
}

export default class WorldStateComponent extends Component<WorldStateComponentProps> {
    backgroundImage: string = westerosImage;
    mapWidth: number = MAP_WIDTH;

    get ingame(): IngameGameState {
        return this.props.ingameGameState;
    }

    constructor(props: WorldStateComponentProps) {
        super(props);
        const settings = this.ingame.entireGame.gameSettings;

        this.backgroundImage = settings.addPortToTheEyrie
            ? ffcEyrieWithPortImage
            : this.ingame.entireGame.gameSettings.playerCount == 7
                ? westeros7pImage
                : this.ingame.entireGame.gameSettings.playerCount >= 8
                    ? westerosWithEssosImage
                    : westerosImage;

        this.mapWidth = this.ingame.entireGame.gameSettings.playerCount >= 8 ? DELUXE_MAT_WIDTH : MAP_WIDTH;
    }

    render(): ReactNode {
        const regions = this.ingame.world.regions;
        const garrisons = new BetterMap<string, string | null>();

        for (const region of this.props.worldState) {
            if (region.garrison && region.garrison > 0 && region.garrison != 1000) {
                garrisons.set(region.id, getGarrisonToken(region.garrison));
            }
        }

        return (
            <div className="map"
                style={{ backgroundImage: `url(${this.backgroundImage})`, backgroundSize: "cover", borderRadius: "0.25rem" }}>
                <div style={{ position: "relative" }}>
                    {this.props.worldState.map(r => (
                        <div key={`world-state_${r.id}`}>
                            {r.castleModifier !== undefined && (
                                <div
                                    className="castle-modification"
                                    style={{
                                        backgroundImage: r.castleModifier > 0 ? `url(${castleUpgradeImage})` : `url(${castleDegradeImage})`,
                                        left: regions.get(r.id).castleSlot.x, top: regions.get(r.id).castleSlot.y
                                    }}
                                />
                            )}
                            {(r.barrelModifier !== undefined || r.crownModifier !== undefined) && this.renderImprovements(regions.get(r.id))}
                            {r.overwrittenSuperControlPowerToken !== undefined &&
                                <div
                                    className="power-token"
                                    style={{
                                        left: regions.get(r.id).powerTokenSlot.x,
                                        top: regions.get(r.id).powerTokenSlot.y,
                                        backgroundImage: `url(${housePowerTokensImages.get(r.overwrittenSuperControlPowerToken)})`
                                    }}
                                />
                            }
                            {r.controlPowerToken !== undefined && (
                                <div
                                    className="power-token"
                                    style={{
                                        left: regions.get(r.id).powerTokenSlot.x,
                                        top: regions.get(r.id).powerTokenSlot.y,
                                        backgroundImage: `url(${housePowerTokensImages.get(r.controlPowerToken)})`
                                    }}
                                />
                            )}
                        </div>
                    ))}
                    {this.renderUnits(garrisons)}
                    {this.renderOrders()}
                </div>
                <svg style={{ width: `${this.mapWidth}px`, height: `${MAP_HEIGHT}px` }}>
                    {this.renderRegions()}
                </svg>
            </div>
        )
    }

    renderRegions(): ReactNode {
        const regions = this.ingame.world.regions;
        return this.props.worldState.map(region => {
            const blocked = region.garrison == 1000;
            return <polygon key={`world-state_region-polygon_${region.id}`}
                        points={this.getRegionPath(regions.get(region.id))}
                        fill={blocked ? "black" : undefined}
                        fillRule="evenodd"
                        className={blocked ? "blocked-region" : "region-area-no-hover"}
                    />;
        });
    }

    renderUnits(garrisons: BetterMap<string, string | null>): ReactNode {
        const regions = this.ingame.world.regions;

        return this.props.worldState.map(r => {
            return <div
                key={`world-state_units-container_${r.id}`}
                className="units-container"
                style={{ left: regions.get(r.id).unitSlot.point.x, top: regions.get(r.id).unitSlot.point.y, width: regions.get(r.id).unitSlot.width,
                    flexWrap: regions.get(r.id).type.id == "land" ? "wrap-reverse" : "wrap" }}
            >
                {r.units !== undefined && r.units.map((u, i) => {
                    let opacity: number;
                    // css transform
                    let transform: string;

                    if (!u.wounded) {
                        opacity = 1;
                        transform = "none";
                    } else if (u.type == "ship") {
                        opacity = 0.5;
                        transform = "none";
                    } else {
                        opacity = 0.7;
                        transform = "rotate(90deg)";
                    }

                    return <div
                        key={`world-state_unit-${u.type}-${u.house}-${i}-in-${r.id}`}
                        className="unit-icon"
                        style={{
                            backgroundImage: `url(${unitImages.get(u.house).get(u.type)})`,
                            opacity: opacity,
                            transform: transform
                        }}
                    />;
                })}
                {garrisons.has(r.id) && (
                    <div
                        className="garrison-icon"
                        style={{
                            backgroundImage: `url(${garrisons.get(r.id)})`,
                            left: regions.get(r.id).unitSlot.point.x, top: regions.get(r.id).unitSlot.point.y
                        }}
                    />
                )}
                {r.loyaltyTokens !== undefined && (
                    <div
                        className="loyalty-icon"
                        style={{
                            left: regions.get(r.id).unitSlot.point.x,
                            top: regions.get(r.id).unitSlot.point.y,
                            backgroundImage: `url(${loyaltyTokenImage})`,
                            textAlign: "center",
                            fontWeight: "bold",
                            fontFamily: "serif",
                            fontSize: "1.5rem",
                            color: "white"
                        }}
                    >
                        {r.loyaltyTokens > 1 ? r.loyaltyTokens : ""}
                    </div>
                )}
            </div>
        });
    }

    renderImprovements(region: Region): ReactNode {
        return <div id={`improvement-${region.id}`}
            className="units-container"
            style={{ left: region.improvementSlot.point.x, top: region.improvementSlot.point.y, width: region.improvementSlot.width, flexWrap: "wrap" }}
        >
            {_.range(0, region.barrelModifier).map((_, i) => {
                return <div key={`world-state_barrel-${region.id}-${i}`}
                    className="unit-icon medium"
                    style={{
                        backgroundImage: `url(${barrelImage})`,
                    }}
                />
            })}
            {_.range(0, region.crownModifier).map((_, i) => {
                return <div key={`world-state_crown-${region.id}-${i}`}
                    className="unit-icon medium"
                    style={{
                        backgroundImage: `url(${crownImage})`,
                    }}
                />
            })}
        </div>
    }

    renderOrders(): ReactNode {
        return this.props.worldState.map(region => {
            return region.order ? this.renderOrder(region) : null;
        });
    }

    renderOrder(regionState: RegionState): ReactNode {
        if (!regionState.order) {
            return null;
        }

        const region = this.ingame.world.regions.get(regionState.id);
        const backgroundUrl = orderImages.get(regionState.order.type);

        const drawBorder = regionState.order.type.includes("sea-");
        const controller = regionState.controller ? this.ingame.game.houses.get(regionState.controller) : null;
        const color = drawBorder && controller
            ? controller.id != "greyjoy"
                ? controller.color
                : "black"
            : undefined;

        return (
            <div className={classNames(
                "order-container",
                {
                    "restricted-order": regionState.order.restricted
                }
            )}
                style={{ left: region.orderSlot.x, top: region.orderSlot.y}}
                key={"world-state_order-in-region-" + region.id}
            >
                <div className={classNames("order-icon", { "order-border": drawBorder } )}
                    style={{ backgroundImage: `url(${backgroundUrl})`, borderColor: color }} />
            </div>
        );
    }

    getRegionPath(region: Region): string {
        const points = this.ingame.world.getContinuousBorder(region);

        return points.map(p => p.x + "," + p.y).join(" ");
    }
}
