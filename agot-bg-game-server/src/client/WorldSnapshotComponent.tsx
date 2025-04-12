import { Component, ReactNode } from "react";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import * as React from "react";
import westerosImage from "../../public/images/westeros.jpg";
import westeros7pImage from "../../public/images/westeros-7p.jpg";
import westerosWithEssosImage from "../../public/images/westeros-with-essos.jpg";
import ffcEyrieWithPortImage from "../../public/images/ffc-eyrie-with-port.jpg";
import castleDegradeImage from "../../public/images/region-modifications/CastleDegrade.png";
import castleUpgradeImage from "../../public/images/region-modifications/CastleUpgrade.png";
import barrelImage from "../../public/images/region-modifications/Barrel.png";
import crownImage from "../../public/images/region-modifications/Crown.png";
import orderImages from "./orderImages";
import unitImages from "./unitImages";
import classNames from "classnames";
import housePowerTokensImages from "./housePowerTokensImages";
import BetterMap from "../utils/BetterMap";
import _ from "lodash";
import getGarrisonToken from "./garrisonTokens";
import loyaltyTokenImage from "../../public/images/power-tokens/Loyalty.png";
import StaticIronBankView from "../common/ingame-game-state/game-data-structure/static-data-structure/StaticIronBankView";
import { OverlayTrigger } from "react-bootstrap";
import ImagePopover from "./utils/ImagePopover";
import preventOverflow from "@popperjs/core/lib/modifiers/preventOverflow";
import loanCardImages from "./loanCardImages";
import IronBankSnapshotComponent from "./IronBankSnapshotComponent";
import IRegionSnapshot from "../common/ingame-game-state/game-data-structure/game-replay/IRegionSnapshot";
import Region from "../common/ingame-game-state/game-data-structure/Region";
import GameSnapshot from "../common/ingame-game-state/game-data-structure/game-replay/GameSnapshot";
import { observer } from "mobx-react";

export const MAP_HEIGHT = 1378;
export const MAP_WIDTH = 741;
export const DELUXE_MAT_WIDTH = 1204;

export function getClassNameForDragonStrength(
  unitType: string,
  strength: number | undefined
): string {
  if (unitType != "dragon" || strength === undefined || strength <= -1) {
    return "";
  } else if (strength <= 1) {
    return " baby-dragon";
  } else if (strength <= 3) {
    return "";
  } else if (strength <= 5) {
    return " monster-dragon";
  } else {
    return "";
  }
}

interface WorldSnapshotComponentProps {
  ingameGameState: IngameGameState;
}

@observer
export default class WorldSnapshotComponent extends Component<WorldSnapshotComponentProps> {
  backgroundImage: string = westerosImage;
  mapWidth: number = MAP_WIDTH;

  get ingame(): IngameGameState {
    return this.props.ingameGameState;
  }

  get worldSnapshot(): IRegionSnapshot[] {
    return this.ingame.replayManager.selectedSnapshot?.worldSnapshot ?? [];
  }

  get gameSnapshot(): GameSnapshot | undefined {
    return this.ingame.replayManager.selectedSnapshot?.gameSnapshot;
  }

  constructor(props: WorldSnapshotComponentProps) {
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
    const regions = this.ingame.world.regions;
    const garrisons = new BetterMap<string, string | null>();

    for (const region of this.worldSnapshot) {
      if (region.garrison && region.garrison > 0 && region.garrison != 1000) {
        garrisons.set(region.id, getGarrisonToken(region.garrison));
      }
    }

    const ironBankView = this.ingame.world.ironBankView;

    return (
      <div
        className="map animate__animated animate__fadeIn"
        style={{
          backgroundImage: `url(${this.backgroundImage})`,
          backgroundSize: "cover",
          borderRadius: "0.25rem",
        }}
      >
        <div style={{ position: "relative" }}>
          {this.worldSnapshot.map((r) => (
            <div key={`world-state_${r.id}`}>
              {r.castleModifier !== undefined && (
                <div
                  className="castle-modification"
                  style={{
                    backgroundImage:
                      r.castleModifier > 0
                        ? `url(${castleUpgradeImage})`
                        : `url(${castleDegradeImage})`,
                    left: regions.get(r.id).castleSlot.x,
                    top: regions.get(r.id).castleSlot.y,
                  }}
                />
              )}
              {(r.barrelModifier !== undefined ||
                r.crownModifier !== undefined) &&
                this.renderImprovements(regions.get(r.id))}
              {r.overwrittenSuperControlPowerToken !== undefined && (
                <div
                  className="power-token"
                  style={{
                    left: regions.get(r.id).powerTokenSlot.x,
                    top: regions.get(r.id).powerTokenSlot.y,
                    backgroundImage: `url(${housePowerTokensImages.get(r.overwrittenSuperControlPowerToken)})`,
                  }}
                />
              )}
              {r.controlPowerToken !== undefined && (
                <div
                  className="power-token"
                  style={{
                    left: regions.get(r.id).powerTokenSlot.x,
                    top: regions.get(r.id).powerTokenSlot.y,
                    backgroundImage: `url(${housePowerTokensImages.get(r.controlPowerToken)})`,
                  }}
                />
              )}
            </div>
          ))}
          {this.renderUnits(garrisons)}
          {this.renderOrders()}
          {this.renderIronBankInfos(ironBankView)}
          {this.renderLoanCardDeck(ironBankView)}
          {this.renderLoanCardSlots(ironBankView)}
        </div>
        <svg style={{ width: `${this.mapWidth}px`, height: `${MAP_HEIGHT}px` }}>
          {this.renderRegions()}
        </svg>
      </div>
    );
  }

  private renderLoanCardSlots(
    ironBankView: StaticIronBankView | null
  ): ReactNode {
    return (
      ironBankView &&
      this.gameSnapshot?.ironBank &&
      this.gameSnapshot?.ironBank.loanSlots.map((lc, i) => (
        <OverlayTrigger
          key={`loan-slot_${i}`}
          overlay={
            <ImagePopover
              className="vertical-game-card bring-to-front"
              style={{
                backgroundImage: lc ? `url(${loanCardImages.get(lc)})` : "none",
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
              top: ironBankView.loanSlots[i].point.y,
            }}
          >
            <div
              className="iron-bank-content hover-weak-outline"
              style={{
                backgroundImage: lc ? `url(${loanCardImages.get(lc)})` : "none",
                width: ironBankView.loanSlots[i].width,
                height: ironBankView.loanSlots[i].height,
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
        <div
          id="loan-card-deck"
          className="order-container"
          style={{
            left: ironBankView.deckSlot.point.x,
            top: ironBankView.deckSlot.point.y,
          }}
        >
          <div
            className="iron-bank-content"
            style={{
              backgroundImage: `url(${loanCardImages.get("back")})`,
              width: ironBankView.deckSlot.width,
              height: ironBankView.deckSlot.height,
            }}
          />
        </div>
      )
    );
  }

  private renderIronBankInfos(
    ironBankView: StaticIronBankView | null
  ): ReactNode {
    return (
      ironBankView &&
      this.gameSnapshot?.ironBank && (
        <div
          id="iron-bank-info"
          style={{
            position: "absolute",
            left: ironBankView.infoComponentSlot.point.x,
            top: ironBankView.infoComponentSlot.point.y,
            height: ironBankView.infoComponentSlot.height,
            width: ironBankView.infoComponentSlot.width,
          }}
        >
          <IronBankSnapshotComponent
            ingame={this.ingame}
            ironBank={this.gameSnapshot?.ironBank}
          />
        </div>
      )
    );
  }

  renderRegions(): ReactNode {
    const regions = this.ingame.world.regions;
    return this.worldSnapshot.map((region) => {
      const blocked = region.garrison == 1000;
      const highlightColor =
        this.ingame.replayManager.regionsToHighlight.tryGet(
          region.id,
          undefined
        );
      return (
        <polygon
          key={`world-state_region-polygon_${region.id}`}
          points={this.getRegionPath(regions.get(region.id))}
          fill={blocked ? "black" : highlightColor}
          fillRule="evenodd"
          className={classNames(
            blocked ? "blocked-region" : "region-area-no-hover",
            {
              "highlighted-region-area": highlightColor !== undefined,
            }
          )}
        />
      );
    });
  }

  renderUnits(garrisons: BetterMap<string, string | null>): ReactNode {
    const regions = this.ingame.world.regions;

    return this.worldSnapshot.map((r) => {
      return (
        <div
          key={`world-state_units-container_${r.id}`}
          className="units-container"
          style={{
            left: regions.get(r.id).unitSlot.point.x,
            top: regions.get(r.id).unitSlot.point.y,
            width: regions.get(r.id).unitSlot.width,
            flexWrap:
              regions.get(r.id).type.id == "land" ? "wrap-reverse" : "wrap",
          }}
        >
          {r.units !== undefined &&
            r.units.map((u, i) => {
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

              return (
                <div
                  key={`world-state_unit-${u.type}-${u.house}-${i}-in-${r.id}`}
                  className={
                    "unit-icon" +
                    getClassNameForDragonStrength(
                      u.type,
                      this.gameSnapshot?.dragonStrength
                    )
                  }
                  style={{
                    backgroundImage: `url(${unitImages.get(u.house).get(u.type)})`,
                    opacity: opacity,
                    transform: transform,
                  }}
                />
              );
            })}
          {garrisons.has(r.id) && (
            <div
              className="garrison-icon"
              style={{
                backgroundImage: `url(${garrisons.get(r.id)})`,
                left: regions.get(r.id).unitSlot.point.x,
                top: regions.get(r.id).unitSlot.point.y,
              }}
            />
          )}
          {(r.loyaltyTokens ?? -1) > 0 && (
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
                color: "white",
              }}
            >
              {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                r.loyaltyTokens! > 1 ? r.loyaltyTokens : ""
              }
            </div>
          )}
        </div>
      );
    });
  }

  renderImprovements(region: Region): ReactNode {
    return (
      <div
        id={`improvement-${region.id}`}
        className="units-container"
        style={{
          left: region.improvementSlot.point.x,
          top: region.improvementSlot.point.y,
          width: region.improvementSlot.width,
          flexWrap: "wrap",
        }}
      >
        {_.range(0, region.barrelModifier).map((_, i) => {
          return (
            <div
              key={`world-state_barrel-${region.id}-${i}`}
              className="unit-icon medium"
              style={{
                backgroundImage: `url(${barrelImage})`,
              }}
            />
          );
        })}
        {_.range(0, region.crownModifier).map((_, i) => {
          return (
            <div
              key={`world-state_crown-${region.id}-${i}`}
              className="unit-icon medium"
              style={{
                backgroundImage: `url(${crownImage})`,
              }}
            />
          );
        })}
      </div>
    );
  }

  renderOrders(): ReactNode {
    return this.worldSnapshot.map((region) => {
      return region.order ? this.renderOrder(region) : null;
    });
  }

  renderOrder(regionSnapshot: IRegionSnapshot): ReactNode {
    if (!regionSnapshot.order) {
      return null;
    }

    const region = this.ingame.world.regions.get(regionSnapshot.id);
    const backgroundUrl = orderImages.get(regionSnapshot.order.type);

    const drawBorder = regionSnapshot.order.type.includes("sea-");
    const controller = regionSnapshot.controller
      ? this.ingame.game.houses.get(regionSnapshot.controller)
      : null;
    const color =
      drawBorder && controller
        ? controller.id != "greyjoy"
          ? controller.color
          : "black"
        : undefined;

    return (
      <div
        className={classNames("order-container", {
          "restricted-order": regionSnapshot.order.restricted,
        })}
        style={{ left: region.orderSlot.x, top: region.orderSlot.y }}
        key={"world-state_order-in-region-" + region.id}
      >
        <div
          className={classNames("order-icon", { "order-border": drawBorder })}
          style={{
            backgroundImage: `url(${backgroundUrl})`,
            borderColor: color,
          }}
        />
      </div>
    );
  }

  getRegionPath(region: Region): string {
    const points = this.ingame.world.getContinuousBorder(region);

    return points.map((p) => p.x + "," + p.y).join(" ");
  }
}
