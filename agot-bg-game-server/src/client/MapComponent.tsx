import { Component, ReactNode } from "react";
import GameClient from "./GameClient";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import * as React from "react";
import Region from "../common/ingame-game-state/game-data-structure/Region";
import Unit from "../common/ingame-game-state/game-data-structure/Unit";
import PlanningGameState from "../common/ingame-game-state/planning-game-state/PlanningGameState";
import MapControls, {
  OrderMoveAnimationEntry,
  OrderOnMapProperties,
  RegionOnMapProperties,
  UnitMoveAnimationEntry,
  UnitOnMapProperties
} from "./MapControls";
import { observer } from "mobx-react";
import ActionGameState from "../common/ingame-game-state/action-game-state/ActionGameState";
import Order from "../common/ingame-game-state/game-data-structure/Order";
import westerosImage from "../../public/images/westeros.jpg";
import westeros7pImage from "../../public/images/westeros-7p.jpg";
import westerosWithEssosImage from "../../public/images/westeros-with-essos.jpg";
import ffcEyrieWithPortImage from "../../public/images/ffc-eyrie-with-port.jpg";
import castleDegradeImage from "../../public/images/region-modifications/CastleDegrade.png";
import castleUpgradeImage from "../../public/images/region-modifications/CastleUpgrade.png";
import barrelImage from "../../public/images/region-modifications/Barrel.png";
import crownImage from "../../public/images/region-modifications/Crown.png";
import houseOrderImages from "./houseOrderImages";
import orderImages from "./orderImages";
import FlipIcon from "./FlipIcon";
import unitImages from "./unitImages";
import classNames from "classnames";
import housePowerTokensImages from "./housePowerTokensImages";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import ConditionalWrap from "./utils/ConditionalWrap";
import BetterMap from "../utils/BetterMap";
import _ from "lodash";
import PartialRecursive from "../utils/PartialRecursive";
import {
  land,
  sea
} from "../common/ingame-game-state/game-data-structure/regionTypes";
import PlaceOrdersGameState from "../common/ingame-game-state/planning-game-state/place-orders-game-state/PlaceOrdersGameState";
import PlaceOrdersForVassalsGameState from "../common/ingame-game-state/planning-game-state/place-orders-for-vassals-game-state/PlaceOrdersForVassalsGameState";
import UseRavenGameState from "../common/ingame-game-state/action-game-state/use-raven-game-state/UseRavenGameState";
import { renderRegionTooltip } from "./regionTooltip";
import getGarrisonToken from "./garrisonTokens";
import { ship } from "../common/ingame-game-state/game-data-structure/unitTypes";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";
import loyaltyTokenImage from "../../public/images/power-tokens/Loyalty.png";
import loanCardImages from "./loanCardImages";
import StaticIronBankView from "../common/ingame-game-state/game-data-structure/static-data-structure/StaticIronBankView";
import preventOverflow from "@popperjs/core/lib/modifiers/preventOverflow";
import IronBankInfosComponent from "./IronBankInfosComponent";
import invertColor from "./utils/invertColor";
import ImagePopover from "./utils/ImagePopover";
import renderLoanCardsToolTip from "./loanCardsTooltip";
import Xarrow from "react-xarrows";
import { getClassNameForDragonStrength } from "./WorldSnapshotComponent";
import House from "../common/ingame-game-state/game-data-structure/House";

export const MAP_HEIGHT = 1378;
export const MAP_WIDTH = 741;
export const DELUXE_MAT_WIDTH = 1204;

interface MapComponentProps {
  gameClient: GameClient;
  ingameGameState: IngameGameState;
  mapControls: MapControls;
}

interface MovingUnitProps {
  animation: UnitMoveAnimationEntry;
  dragonStrength: number;
}

class MovingUnit extends Component<MovingUnitProps> {
  element = React.createRef<HTMLDivElement>();
  sourceElement: HTMLElement | null = null;
  animationFrame: number | null = null;

  componentDidMount(): void {
    const element = this.element.current;
    const source = document.getElementById(
      `map-unit-${this.props.animation.unit.id}`
    );
    const layer = element?.parentElement;

    if (!element || !source || !layer || layer.offsetWidth == 0) {
      return;
    }

    const layerRect = layer.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();
    const scale = layerRect.width / layer.offsetWidth;
    const sourceX =
      (sourceRect.left + sourceRect.width / 2 - layerRect.left) / scale;
    const sourceY =
      (sourceRect.top + sourceRect.height / 2 - layerRect.top) / scale;

    element.style.left = `${sourceX}px`;
    element.style.top = `${sourceY}px`;
    element.style.width = `${sourceRect.width / scale}px`;
    element.style.height = `${sourceRect.height / scale}px`;
    this.sourceElement = source;

    // All moving pieces first record their source positions. On the next frame they leave
    // the flex layout together, then destination placeholders settle into their final slots.
    this.animationFrame = window.requestAnimationFrame(() => {
      source.style.display = "none";
      this.animationFrame = window.requestAnimationFrame(() => {
        const target = document.getElementById(
          `map-unit-move-target-${this.props.animation.id}`
        );
        if (!target) {
          return;
        }

        const targetRect = target.getBoundingClientRect();
        const targetX =
          (targetRect.left + targetRect.width / 2 - layerRect.left) / scale;
        const targetY =
          (targetRect.top + targetRect.height / 2 - layerRect.top) / scale;

        element.animate(
          [
            { transform: "translate(-50%, -50%) translate(0, 0)" },
            {
              transform: `translate(-50%, -50%) translate(${targetX - sourceX}px, ${targetY - sourceY}px)`
            }
          ],
          {
            duration: Math.max(0, this.props.animation.durationMs - 50),
            easing: "ease-in-out",
            fill: "forwards"
          }
        );
      });
    });
  }

  componentWillUnmount(): void {
    if (this.animationFrame != null) {
      window.cancelAnimationFrame(this.animationFrame);
    }
    if (this.sourceElement) {
      this.sourceElement.style.display = "";
    }
  }

  render(): ReactNode {
    const unit = this.props.animation.unit;
    const opacity = !unit.wounded ? 1 : unit.type == ship ? 0.5 : 0.7;
    const transform = !unit.wounded
      ? "none"
      : unit.type == ship
        ? "rotate(-38deg)"
        : "rotate(90deg)";

    return (
      <div ref={this.element} className="moving-unit">
        <div
          className={classNames(
            "unit-icon",
            getClassNameForDragonStrength(
              unit.type.id,
              this.props.dragonStrength
            )
          )}
          style={{
            backgroundImage: `url(${unitImages.get(unit.allegiance.id).get(unit.upgradedType ? unit.upgradedType.id : unit.type.id)})`,
            opacity,
            transform
          }}
        />
      </div>
    );
  }
}

interface MovingOrderProps {
  animation: OrderMoveAnimationEntry;
  borderColor?: string;
}

// Order slots are static map coordinates, so unlike MovingUnit no DOM measuring is needed.
class MovingOrder extends Component<MovingOrderProps> {
  element = React.createRef<HTMLDivElement>();

  componentDidMount(): void {
    const { from, to, durationMs } = this.props.animation;

    this.element.current?.animate(
      [
        { transform: "translate(-50%, -50%) translate(0, 0)" },
        {
          transform: `translate(-50%, -50%) translate(${to.orderSlot.x - from.orderSlot.x}px, ${to.orderSlot.y - from.orderSlot.y}px)`
        }
      ],
      {
        duration: Math.max(0, durationMs - 50),
        easing: "ease-in-out",
        fill: "forwards"
      }
    );
  }

  render(): ReactNode {
    const { order, from } = this.props.animation;
    const drawBorder = order.type.restrictedTo == sea.kind;

    return (
      <div
        ref={this.element}
        className="moving-order"
        style={{ left: from.orderSlot.x, top: from.orderSlot.y }}
      >
        <div
          className={classNames("order-icon", { "order-border": drawBorder })}
          style={{
            backgroundImage: `url(${orderImages.get(order.type.id)})`,
            borderColor: drawBorder ? this.props.borderColor : undefined
          }}
        />
      </div>
    );
  }
}

@observer
export default class MapComponent extends Component<MapComponentProps> {
  backgroundImage: string = westerosImage;
  mapWidth: number = MAP_WIDTH;

  get ingame(): IngameGameState {
    return this.props.ingameGameState;
  }

  get allRegionsWithControllers(): BetterMap<Region, House | null> {
    return this.props.gameClient.allRegionsWithControllersMap;
  }

  constructor(props: MapComponentProps) {
    super(props);
    const settings = this.ingame.entireGame.gameSettings;

    this.backgroundImage = settings.addPortToTheEyrie
      ? ffcEyrieWithPortImage
      : this.ingame.entireGame.gameSettings.playerCount == 7
        ? westeros7pImage
        : this.ingame.entireGame.gameSettings.playerCount >= 8
          ? westerosWithEssosImage
          : westerosImage;

    this.mapWidth =
      this.ingame.entireGame.gameSettings.playerCount >= 8
        ? DELUXE_MAT_WIDTH
        : MAP_WIDTH;
  }

  render(): ReactNode {
    void this.props.mapControls.revision;

    const ironBankView = this.ingame.world.ironBankView;
    const fogOfWarActive = this.ingame.fogOfWar;
    const garrisons = new BetterMap<Region, string | null>();
    const castleModifiers = new BetterMap<Region, number>();
    const barrelModifiers = new BetterMap<Region, number>();
    const crownModifiers = new BetterMap<Region, number>();
    const allRegions = this.ingame.world.regions.values;
    const visibleRegionsSet = this.props.gameClient.visibleRegionsSet;

    const isVisible = (region: Region): boolean =>
      (!fogOfWarActive || visibleRegionsSet?.has(region)) ?? false;

    for (const region of allRegions) {
      if (!isVisible(region)) {
        continue;
      }

      if (region.garrison > 0 && !region.isBlocked) {
        garrisons.set(region, getGarrisonToken(region.garrison));
      }

      if (region.castleModifier != 0) {
        castleModifiers.set(region, region.castleModifier);
      }

      if (region.barrelModifier != 0) {
        barrelModifiers.set(region, region.barrelModifier);
      }

      if (region.crownModifier != 0) {
        crownModifiers.set(region, region.crownModifier);
      }
    }

    const propertiesForRegions = this.getModifiedPropertiesForEntities<
      Region,
      RegionOnMapProperties
    >(allRegions, this.props.mapControls.modifyRegionsOnMap, {
      highlight: { active: false, color: "white" }
    });

    // If the user is to select a region, we disable the pointer events for units to forward the click event to the region.
    // This makes it easier to hit the ports!
    const disablePointerEventsForUnits =
      this.props.gameClient.authenticatedUser != null &&
      this.ingame.leafState
        .getWaitedUsers()
        .includes(this.props.gameClient.authenticatedUser) &&
      propertiesForRegions.values.some(
        (p) => p.onClick != undefined || p.wrap != undefined
      );

    const propertiesForUnits = this.getModifiedPropertiesForEntities<
      Unit,
      UnitOnMapProperties
    >(
      _.flatMap(allRegions.map((r) => r.allUnits)),
      this.props.mapControls.modifyUnitsOnMap,
      {}
    );

    return (
      <div
        className="map"
        style={{
          backgroundImage: `url(${this.backgroundImage})`,
          backgroundSize: "cover",
          borderRadius: "0.25rem"
        }}
      >
        <div style={{ position: "relative" }}>
          {allRegions.map((r) => (
            <div key={`map_${r.id}`}>
              {castleModifiers.has(r) && (
                <OverlayTrigger
                  overlay={renderRegionTooltip(r, isVisible(r))}
                  delay={{ show: 750, hide: 100 }}
                  placement="auto"
                  popperConfig={{ modifiers: [preventOverflow] }}
                >
                  <div
                    className="castle-modification"
                    style={{
                      backgroundImage:
                        castleModifiers.get(r) > 0
                          ? `url(${castleUpgradeImage})`
                          : `url(${castleDegradeImage})`,
                      left: r.castleSlot.x,
                      top: r.castleSlot.y
                    }}
                  />
                </OverlayTrigger>
              )}
              {(barrelModifiers.has(r) || crownModifiers.has(r)) &&
                this.renderImprovements(r, isVisible(r))}
              {r.overwrittenSuperControlPowerToken && (
                <OverlayTrigger
                  overlay={
                    <Tooltip id={"power-token-" + r.id}>
                      <div className="text-center">
                        <b>Printed Power token</b>
                        <small>
                          {" "}
                          of{" "}
                          <b>
                            {r.overwrittenSuperControlPowerToken.name}
                            <br />
                            {r.name}
                          </b>
                        </small>
                      </div>
                    </Tooltip>
                  }
                  key={"super-power-token-overlay-" + r.id}
                  delay={{ show: 500, hide: 100 }}
                  placement="auto"
                  popperConfig={{ modifiers: [preventOverflow] }}
                >
                  <div
                    className="power-token hover-weak-outline"
                    style={{
                      left: r.powerTokenSlot.x,
                      top: r.powerTokenSlot.y,
                      backgroundImage: `url(${housePowerTokensImages.get(r.overwrittenSuperControlPowerToken.id)})`
                    }}
                  ></div>
                </OverlayTrigger>
              )}
              {r.controlPowerToken && isVisible(r) && (
                <OverlayTrigger
                  overlay={
                    <Tooltip id={"power-token-" + r.id}>
                      <div className="text-center">
                        <b>Power token</b>
                        <small>
                          {" "}
                          of{" "}
                          <b>
                            {r.controlPowerToken.name}
                            <br />
                            {r.name}
                          </b>
                        </small>
                      </div>
                    </Tooltip>
                  }
                  key={"power-token-overlay-" + r.id}
                  delay={{ show: 500, hide: 100 }}
                  placement="auto"
                  popperConfig={{ modifiers: [preventOverflow] }}
                >
                  <div
                    className="power-token hover-weak-outline"
                    style={{
                      left: r.powerTokenSlot.x,
                      top: r.powerTokenSlot.y,
                      backgroundImage: `url(${housePowerTokensImages.get(r.controlPowerToken.id)})`
                    }}
                  ></div>
                </OverlayTrigger>
              )}
            </div>
          ))}
          {this.renderUnits(
            allRegions,
            propertiesForUnits,
            garrisons,
            fogOfWarActive,
            isVisible,
            disablePointerEventsForUnits
          )}
          {this.ingame.unitMoveAnimations.map((animation) => (
            <MovingUnit
              key={`moving-unit-${animation.id}`}
              animation={animation}
              dragonStrength={this.ingame.game.currentDragonStrength}
            />
          ))}
          {this.renderOrders(allRegions, isVisible)}
          {this.ingame.orderMoveAnimations.map((animation) => (
            <MovingOrder
              key={`moving-order-${animation.id}`}
              animation={animation}
              borderColor={this.allRegionsWithControllers
                .get(animation.from)
                ?.getHighlightColor()}
            />
          ))}
          {this.renderRegionTexts(propertiesForRegions, isVisible)}
          {this.renderIronBankInfos(ironBankView)}
          {this.renderLoanCardDeck(ironBankView)}
          {this.renderLoanCardSlots(ironBankView)}
          {this.renderMarchMarkers(
            propertiesForUnits,
            fogOfWarActive,
            isVisible
          )}
        </div>
        <svg style={{ width: `${this.mapWidth}px`, height: `${MAP_HEIGHT}px` }}>
          {this.renderRegions(propertiesForRegions, isVisible)}
        </svg>
      </div>
    );
  }

  renderMarchMarkers(
    propertiesForUnits: BetterMap<Unit, UnitOnMapProperties>,
    fogOfWarActive: boolean,
    isVisible: (region: Region) => boolean
  ): ReactNode[] {
    let markers = propertiesForUnits.entries
      .filter(([_u, uprop]) => uprop.targetRegion != undefined)
      .map(([u, uprop]) => [u, uprop.targetRegion] as [Unit, Region])
      .filter(([u, r]) => u.region != r);

    markers = fogOfWarActive
      ? markers.filter(([u, r]) => isVisible(u.region) && isVisible(r))
      : markers;

    return markers.map(([unit, to]) => (
      <Xarrow
        key={`arrow-${unit.id}-${to.id}`}
        start={`centered-unit-div-for-march-markers-${unit.id}`}
        end={`centered-units-container-div-for-march-markers-${to.id}`}
        color={unit.allegiance.getHighlightColor()}
        strokeWidth={5}
        curveness={0.7}
        dashness={{ animation: 3 }}
        path="smooth"
        showHead={true}
        showTail={true}
        headShape="arrow1"
        tailShape="circle"
        headSize={4}
        tailSize={2}
      />
    ));
  }

  private renderLoanCardSlots(
    ironBankView: StaticIronBankView | null
  ): ReactNode {
    return (
      ironBankView &&
      this.ingame.game.ironBank &&
      this.ingame.game.ironBank.loanSlots.map((lc, i) => (
        <OverlayTrigger
          key={`loan-slot_${i}`}
          overlay={
            <ImagePopover
              className="vertical-game-card bring-to-front"
              style={{
                backgroundImage: lc
                  ? `url(${loanCardImages.get(lc.type.id)})`
                  : "none"
              }}
            />
          }
          popperConfig={{ modifiers: [preventOverflow] }}
          delay={{ show: 250, hide: 0 }}
          placement="auto"
        >
          <div
            className="order-container"
            style={{
              left: ironBankView.loanSlots[i].point.x,
              top: ironBankView.loanSlots[i].point.y
            }}
          >
            <div
              className="iron-bank-content hover-weak-outline"
              style={{
                backgroundImage: lc
                  ? `url(${loanCardImages.get(lc.type.id)})`
                  : "none",
                width: ironBankView.loanSlots[i].width,
                height: ironBankView.loanSlots[i].height
              }}
            />
          </div>
        </OverlayTrigger>
      ))
    );
  }

  private renderLoanCardDeck(
    ironBankView: StaticIronBankView | null
  ): ReactNode {
    return (
      ironBankView && (
        <OverlayTrigger
          overlay={renderLoanCardsToolTip(this.ingame.game.theIronBank)}
          trigger="click"
          rootClose
          placement="auto"
        >
          <div
            id="loan-card-deck"
            className="order-container clickable"
            style={{
              left: ironBankView.deckSlot.point.x,
              top: ironBankView.deckSlot.point.y
            }}
          >
            <div
              className="iron-bank-content hover-weak-outline"
              style={{
                backgroundImage: `url(${loanCardImages.get("back")})`,
                width: ironBankView.deckSlot.width,
                height: ironBankView.deckSlot.height
              }}
            />
          </div>
        </OverlayTrigger>
      )
    );
  }

  private renderIronBankInfos(
    ironBankView: StaticIronBankView | null
  ): ReactNode {
    return (
      ironBankView && (
        <div
          id="iron-bank-info"
          style={{
            position: "absolute",
            left: ironBankView.infoComponentSlot.point.x,
            top: ironBankView.infoComponentSlot.point.y,
            height: ironBankView.infoComponentSlot.height,
            width: ironBankView.infoComponentSlot.width
          }}
        >
          <IronBankInfosComponent
            ingame={this.ingame}
            ironBank={this.ingame.game.theIronBank}
          />
        </div>
      )
    );
  }

  renderRegions(
    propertiesForRegions: BetterMap<Region, RegionOnMapProperties>,
    isVisible: (region: Region) => boolean
  ): ReactNode {
    return propertiesForRegions.entries.map(([region, properties]) => {
      const wrap = properties.wrap;
      const visible = isVisible(region);

      const fillColor = region.isBlocked
        ? "black"
        : !visible
          ? "#3d3d3d"
          : properties.highlight.color;

      return (
        <ConditionalWrap
          condition={!region.isBlocked}
          key={`map-region-polygon_${region.id}`}
          wrap={
            wrap
              ? wrap
              : (child) => (
                  <OverlayTrigger
                    overlay={renderRegionTooltip(region, visible)}
                    delay={{ show: 750, hide: 100 }}
                    placement="auto"
                    popperConfig={{ modifiers: [preventOverflow] }}
                  >
                    {child}
                  </OverlayTrigger>
                )
          }
        >
          <polygon
            points={this.getRegionPath(region)}
            fill={fillColor}
            fillRule="evenodd"
            className={classNames(
              region.isBlocked ? "blocked-region" : "region-area",
              !visible ? "region-area-fogged" : "",
              {
                clickable:
                  properties.onClick != undefined ||
                  properties.wrap != undefined
              },
              properties.highlight.active && {
                // Whatever the strength of the highlight defined, show the same
                // highlightness
                "highlighted-region-area": true,
                "highlighted-region-area-light": properties.highlight.light,
                "highlighted-region-area-strong": properties.highlight.strong
              }
            )}
            onClick={properties.onClick}
          />
        </ConditionalWrap>
      );
    });
  }

  renderRegionTexts(
    propertiesForRegions: BetterMap<Region, RegionOnMapProperties>,
    isVisible: (region: Region) => boolean
  ): ReactNode {
    return propertiesForRegions.entries
      .filter(
        ([region, properties]) => properties.highlight.text && isVisible(region)
      )
      .map(([region, properties]) => {
        const nameSlot = region.staticRegion.nameSlot;
        return (
          <div
            key={`region_text_${region.id}`}
            className="units-container"
            style={{
              left: nameSlot.x,
              top: nameSlot.y,
              textAlign: "center",
              fontWeight: "bold",
              fontFamily: "serif",
              fontSize: "4rem",
              color: invertColor(properties.highlight.color)
            }}
          >
            {properties.highlight.text ?? ""}
          </div>
        );
      });
  }

  renderUnits(
    allRegions: Region[],
    propertiesForUnits: BetterMap<Unit, UnitOnMapProperties>,
    garrisons: BetterMap<Region, string | null>,
    fogOfWarActive: boolean,
    isVisible: (region: Region) => boolean,
    disablePointerEvents: boolean
  ): ReactNode {
    const getDragonPrefix = (dragonStrength: number): ReactNode => {
      return dragonStrength <= -1 ? (
        <></>
      ) : dragonStrength <= 1 ? (
        <>Baby </>
      ) : dragonStrength <= 3 ? (
        <></>
      ) : dragonStrength <= 5 ? (
        <>Monster </>
      ) : (
        <></>
      );
    };

    const currentDragonStrength = this.ingame.game.currentDragonStrength;

    const isTargaryenPlayer =
      fogOfWarActive && this.ingame.game.targaryen
        ? this.props.gameClient.doesControlHouse(this.ingame.game.targaryen)
        : false;

    return allRegions.map((r) => {
      let disablePointerEventsForCurrentRegion = disablePointerEvents;
      // If there is a clickable unit (e.g. during mustering), don't disable pointer events!
      if (
        r.allUnits
          .map((u) => propertiesForUnits.get(u))
          .some((p) => p.onClick != undefined)
      ) {
        disablePointerEventsForCurrentRegion = false;
      }

      const controller = this.allRegionsWithControllers.get(r);
      return (
        <div
          key={`map-units_${r.id}`}
          className={classNames("units-container", {
            "disable-pointer-events": disablePointerEventsForCurrentRegion
          })}
          style={{
            left: r.unitSlot.point.x,
            top: r.unitSlot.point.y,
            width: r.unitSlot.width,
            flexWrap: r.type == land ? "wrap-reverse" : "wrap"
          }}
        >
          {isVisible(r) &&
            r.allUnits.map((u) => {
              const property = propertiesForUnits.get(u);
              let opacity: number;
              // css transform
              let transform: string;

              if (!u.wounded) {
                opacity = 1;
                transform = `none`;
              } else if (u.type == ship) {
                opacity = 0.5;
                transform = `rotate(-38deg)`;
              } else {
                opacity = 0.7;
                transform = `rotate(90deg)`;
              }

              const clickable = property.onClick != undefined;
              const dragonStrength =
                u.type.id == "dragon" ? currentDragonStrength : -1;
              const isMoving = this.ingame.unitMoveAnimations.some(
                (animation) => animation.unit == u
              );

              return (
                <OverlayTrigger
                  overlay={
                    <Tooltip
                      id={"unit-tooltip-" + u.id}
                      className="tooltip-w-100"
                    >
                      <div className="text-center">
                        <b>
                          {getDragonPrefix(dragonStrength)}
                          {u.type.name}
                        </b>
                        <small>
                          {" "}
                          of <b>{controller?.name ?? "Unknown"}</b>
                          <br />
                          <b>{r.name}</b>
                        </small>
                      </div>
                    </Tooltip>
                  }
                  key={`map-unit-_${controller?.id ?? "must-be-controlled"}_${u.id}`}
                  delay={{ show: 500, hide: 100 }}
                  placement="auto"
                  popperConfig={{ modifiers: [preventOverflow] }}
                >
                  <div
                    id={`map-unit-${u.id}`}
                    onClick={property.onClick ? property.onClick : undefined}
                    className={classNames(
                      "unit-icon",
                      {
                        "hover-weak-outline": !property.highlight?.active,
                        "clickable hover-strong-outline": clickable,
                        "medium-outline": property.highlight?.active,
                        "highlight-red":
                          property.highlight?.active &&
                          property.highlight.color == "red",
                        "highlight-yellow":
                          property.highlight?.active &&
                          property.highlight.color == "yellow",
                        "highlight-green":
                          property.highlight?.active &&
                          property.highlight.color == "green",
                        "hover-strong-outline-red":
                          property.highlight?.active &&
                          property.highlight.color == "red" &&
                          clickable,
                        "hover-strong-outline-yellow":
                          property.highlight?.active &&
                          property.highlight.color == "yellow" &&
                          clickable,
                        "hover-strong-outline-green":
                          property.highlight?.active &&
                          property.highlight.color == "green" &&
                          clickable,
                        "disable-pointer-events":
                          disablePointerEventsForCurrentRegion,
                        "pulsate-bck": property.animateAttention,
                        "pulsate-bck_fade-in": property.animateFadeIn,
                        "pulsate-bck_fade-out": property.animateFadeOut,
                        "v-hidden": isMoving
                      },
                      getClassNameForDragonStrength(u.type.id, dragonStrength)
                    )}
                    style={{
                      backgroundImage: `url(${unitImages.get(u.allegiance.id).get(u.upgradedType ? u.upgradedType.id : u.type.id)})`,
                      opacity: opacity,
                      transform: transform
                    }}
                  >
                    <div
                      id={`centered-unit-div-for-march-markers-${u.id}`}
                      className="center-relative-to-parent disable-pointer-events v-hidden"
                    />
                  </div>
                </OverlayTrigger>
              );
            })}
          {this.ingame.unitMoveAnimations
            .filter((animation) => animation.to == r)
            .map((animation) => (
              <div
                id={`map-unit-move-target-${animation.id}`}
                key={`map-unit-move-target-${animation.id}`}
                className={classNames(
                  "unit-icon",
                  "v-hidden",
                  getClassNameForDragonStrength(
                    animation.unit.type.id,
                    currentDragonStrength
                  )
                )}
              />
            ))}
          {garrisons.has(r) && (
            <OverlayTrigger
              overlay={
                <Tooltip id={"garrison-tooltip-" + r.id}>
                  <div className="text-center">
                    {this.allRegionsWithControllers.get(r) == null ? (
                      <b>Neutral Force token</b>
                    ) : (
                      <>
                        <b>Garrison</b>
                        <small>
                          {" "}
                          of{" "}
                          <b>
                            {this.allRegionsWithControllers.get(r)?.name ??
                              "Unknown"}
                          </b>
                        </small>
                      </>
                    )}
                    <br />
                    <small>
                      <b>{r.name}</b>
                    </small>
                  </div>
                </Tooltip>
              }
              key={"map-garrison_" + r.id}
              delay={{ show: 500, hide: 100 }}
              placement="auto"
              popperConfig={{ modifiers: [preventOverflow] }}
            >
              <div
                className="garrison-icon hover-weak-outline"
                style={{
                  backgroundImage: `url(${garrisons.get(r)})`,
                  left: r.unitSlot.point.x,
                  top: r.unitSlot.point.y
                }}
              ></div>
            </OverlayTrigger>
          )}
          {(isVisible(r) || isTargaryenPlayer) && r.loyaltyTokens > 0 && (
            <OverlayTrigger
              overlay={
                <Tooltip id={"loyalty-tooltip-" + r.id}>
                  <div className="text-center">
                    <b>Loyalty token</b>
                    <br />
                    <small>
                      <b>{r.name}</b>
                    </small>
                  </div>
                </Tooltip>
              }
              key={"map-loyalty-token-" + r.id}
              delay={{ show: 500, hide: 100 }}
              placement="auto"
              popperConfig={{ modifiers: [preventOverflow] }}
            >
              <div
                className="loyalty-icon hover-weak-outline"
                style={{
                  left: r.unitSlot.point.x,
                  top: r.unitSlot.point.y,
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
            </OverlayTrigger>
          )}
          <div
            id={`centered-units-container-div-for-march-markers-${r.id}`}
            className="center-relative-to-parent disable-pointer-events v-hidden"
          />
        </div>
      );
    });
  }

  renderImprovements(region: Region, isVisible: boolean): ReactNode {
    return (
      <div
        id={`improvement-${region.id}`}
        className="units-container"
        style={{
          left: region.improvementSlot.point.x,
          top: region.improvementSlot.point.y,
          width: region.improvementSlot.width,
          flexWrap: "wrap"
        }}
      >
        {_.range(0, region.barrelModifier).map((_, i) => {
          return (
            <OverlayTrigger
              key={`map-barrel-${region.id}-${i}`}
              overlay={renderRegionTooltip(region, isVisible)}
              delay={{ show: 750, hide: 100 }}
              placement="auto"
              popperConfig={{ modifiers: [preventOverflow] }}
            >
              <div
                className="unit-icon medium"
                style={{
                  backgroundImage: `url(${barrelImage})`
                }}
              />
            </OverlayTrigger>
          );
        })}
        {_.range(0, region.crownModifier).map((_, i) => {
          return (
            <OverlayTrigger
              key={`map-crown-${region.id}-${i}`}
              overlay={renderRegionTooltip(region, isVisible)}
              delay={{ show: 750, hide: 100 }}
              placement="auto"
              popperConfig={{ modifiers: [preventOverflow] }}
            >
              <div
                className="unit-icon medium"
                style={{
                  backgroundImage: `url(${crownImage})`
                }}
              />
            </OverlayTrigger>
          );
        })}
      </div>
    );
  }

  renderOrders(
    regions: Region[],
    isVisible: (region: Region) => boolean
  ): ReactNode {
    const propertiesForOrders = this.getModifiedPropertiesForEntities<
      Region,
      OrderOnMapProperties
    >(regions, this.props.mapControls.modifyOrdersOnMap, {});

    return propertiesForOrders.map((region, properties) => {
      if (!isVisible(region)) {
        return null;
      }
      let order: Order | null = null;
      let orderPresent = false;
      if (this.ingame.childGameState instanceof PlanningGameState) {
        const planning = this.ingame.childGameState;
        orderPresent = planning.placedOrders.has(region);
        order = orderPresent ? planning.placedOrders.get(region) : null;
      } else {
        orderPresent = this.ingame.ordersOnBoard.has(region);
        order = orderPresent ? this.ingame.ordersOnBoard.get(region) : null;
      }

      // Check if we need to animate flip. `properties` is already the merge of all
      // modifyOrdersOnMap contributors for this region, so this picks up any pending
      // order-reveal animation for it without querying orderAnimations directly.
      if (!orderPresent) {
        orderPresent = properties.animateFlip ?? false;
      }

      if (orderPresent) {
        const revealedUrl =
          order != null ? orderImages.get(order.type.id) : null;
        const controller = this.allRegionsWithControllers.get(region);
        const hiddenUrl = controller
          ? houseOrderImages.get(controller.id)
          : null;

        if (properties.animateFlip && hiddenUrl && revealedUrl) {
          // A real 3D flip needs both faces up front: the hidden, house-colored order back
          // (front face) and the already-revealed order (back face). ordersOnBoard is updated
          // immediately on "reveal-orders" (see IngameGameState), so both are available as
          // soon as the flip animation starts.
          //
          // Other still-mounting-out contributors (e.g. PlaceOrdersComponent) may still be
          // highlighting this exact region as "clickable to remove" for a brief moment while
          // the flip plays, since their unmount can lag behind the "reveal-orders" message.
          // Explicitly drop those interactive/highlight properties for the duration of the
          // flip so the order never looks clickable while it's being revealed.
          return this.renderOrder(
            region,
            order,
            hiddenUrl,
            {
              ...properties,
              highlight: undefined,
              onClick: undefined,
              wrap: undefined
            },
            revealedUrl
          );
        }

        const backgroundUrl = revealedUrl ?? hiddenUrl;
        if (backgroundUrl) {
          return this.renderOrder(region, order, backgroundUrl, properties);
        }
      }

      return null;
    });
  }

  /**
   * This is used to call modifyRegionOnMap, modifyUnitOnMap and merge the properties
   * of an entity (Region, Unit, ...) that have been modified by `...GameStateComponent` classes.
   * @param entities
   * @param modifyPropertiesFunctions
   * @param defaultProperties
   */
  getModifiedPropertiesForEntities<Entity, Property>(
    entities: Entity[],
    modifyPropertiesFunctions: (() => [Entity, PartialRecursive<Property>][])[],
    defaultProperties: Property
  ): BetterMap<Entity, Property> {
    // Create a Map of properties for all regions that will be shown.
    // Every entity needs its own copy as _.merge mutates its target which would leak
    // properties (onClick, wrap, highlight, ...) of one entity to all the others.
    const propertiesForEntities = new BetterMap<Entity, Property>();
    entities.forEach((entity) => {
      propertiesForEntities.set(entity, _.cloneDeep(defaultProperties));
    });

    modifyPropertiesFunctions.forEach((modifyPropertiesFunction) => {
      const modifiedPropertiesForEntities = modifyPropertiesFunction();

      modifiedPropertiesForEntities.forEach(([entity, modifiedProperties]) => {
        if (propertiesForEntities.has(entity)) {
          propertiesForEntities.set(
            entity,
            _.merge(propertiesForEntities.get(entity), modifiedProperties)
          );
        }
      });
    });

    return propertiesForEntities;
  }

  renderOrder(
    region: Region,
    order: Order | null,
    backgroundUrl: string,
    properties: OrderOnMapProperties,
    flipToBackgroundUrl?: string
  ): ReactNode {
    let planningOrAction =
      this.ingame.childGameState instanceof PlanningGameState ||
      this.ingame.childGameState instanceof ActionGameState
        ? this.ingame.childGameState
        : null;

    if (
      planningOrAction instanceof ActionGameState &&
      !(planningOrAction.childGameState instanceof UseRavenGameState)
    ) {
      // Do not highlight restricted orders after Raven state (during whole action phase)
      // because abilities like Doran may cause an order to be shown as restricted suddenly though it isn't
      planningOrAction = null;
    }

    const drawBorder = order?.type.restrictedTo == sea.kind;
    const hasPlaceOrders =
      this.ingame.hasChildGameState(PlaceOrdersGameState) ||
      this.ingame.hasChildGameState(PlaceOrdersForVassalsGameState);
    const controller =
      drawBorder || hasPlaceOrders
        ? this.allRegionsWithControllers.get(region)
        : null;
    const color =
      drawBorder && controller ? controller.getHighlightColor() : undefined;

    const wrap = properties.wrap;
    const clickable = properties.onClick != undefined || wrap != undefined;

    let placeAnimation = "";

    if (hasPlaceOrders && controller) {
      switch (controller.id) {
        case "stark":
        case "arryn":
          placeAnimation = "scale-in-top";
          break;
        case "targaryen":
        case "baratheon":
          placeAnimation = "scale-in-right";
          break;
        case "martell":
        case "tyrell":
          placeAnimation = "scale-in-bottom";
          break;
        case "greyjoy":
        case "lannister":
          placeAnimation = "scale-in-left";
          break;
      }
    }

    return (
      <ConditionalWrap
        condition={true}
        key={`map-order_${region.id}`}
        wrap={
          wrap
            ? wrap
            : (child) => (
                <OverlayTrigger
                  overlay={this.renderOrderTooltip(
                    order,
                    region,
                    this.allRegionsWithControllers.get(region)
                  )}
                  delay={{ show: 500, hide: 100 }}
                  placement="auto"
                  popperConfig={{ modifiers: [preventOverflow] }}
                >
                  {child}
                </OverlayTrigger>
              )
        }
      >
        <div
          className={classNames("order-container", {
            "hover-weak-outline":
              order != null && !properties.highlight?.active,
            "medium-outline hover-strong-outline":
              order &&
              properties.highlight?.active &&
              properties.highlight.color != "red" &&
              properties.highlight.color != "yellow" &&
              properties.highlight.color != "grey",
            "highlight-yellow hover-strong-outline-yellow":
              order &&
              properties.highlight?.active &&
              properties.highlight.color == "yellow",
            "highlight-red hover-strong-outline-red":
              order &&
              properties.highlight?.active &&
              properties.highlight.color == "red",
            "highlight-grey hover-strong-outline-grey":
              order &&
              properties.highlight?.active &&
              properties.highlight.color == "grey",
            "restricted-order":
              planningOrAction &&
              order &&
              this.ingame.game.isOrderRestricted(
                region,
                order,
                planningOrAction.planningRestrictions
              ),
            clickable: clickable
          })}
          style={{ left: region.orderSlot.x, top: region.orderSlot.y }}
          onClick={properties.onClick}
          key={`map-order-container-key_${region.id}`}
          id={`map-order-container_${region.id}`}
        >
          <FlipIcon
            // Force a fresh mount whenever this region enters or leaves flip mode, otherwise
            // React would reuse the same FlipIcon instance across the flip-scene <-> flat
            // fallback markup, which are structurally different (backface-visibility scene vs
            // a single flat div).
            key={`order-icon_${region.id}_${flipToBackgroundUrl ? "flip" : "static"}`}
            frontImage={backgroundUrl}
            backImage={flipToBackgroundUrl}
            boxClassName="order-icon"
            style={{ borderColor: color }}
            className={classNames(placeAnimation, {
              "order-border": drawBorder && !flipToBackgroundUrl,
              "pulsate-bck": properties.animateAttention,
              "pulsate-bck_fade-out": properties.animateFadeOut
            })}
            onAnimationEnd={properties.onAnimationEnd}
          />
        </div>
      </ConditionalWrap>
    );
  }

  private renderOrderTooltip(
    order: Order | null,
    region: Region,
    controller: House | null
  ): OverlayChildren {
    return (
      <Tooltip id={"order-info"} className="tooltip-w-100">
        <div className="text-center">
          <b>{order ? order.type.name : "Order token"}</b>
          <small>
            {" "}
            of{" "}
            <b>
              {controller?.name ?? "Unknown"}
              <br />
              {region.name}
            </b>
          </small>
        </div>
      </Tooltip>
    );
  }

  getRegionPath(region: Region): string {
    const points = this.ingame.world.getContinuousBorder(region);

    return points.map((p) => p.x + "," + p.y).join(" ");
  }
}
