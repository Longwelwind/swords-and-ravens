import { Trans, t, translateGameText } from "./i18n";
import _ from "lodash";
import React from "react";
import { Tooltip } from "react-bootstrap";
import { OverlayChildren } from "react-bootstrap/Overlay";
import Region from "../common/ingame-game-state/game-data-structure/Region";
import joinReactNodes from "./utils/joinReactNodes";
import barrelImage from "../../public/images/region-modifications/Barrel.png";
import crownImage from "../../public/images/region-modifications/Crown.png";
import housePowerTokensImages from "./housePowerTokensImages";
import loyaltyTokenImage from "../../public/images/power-tokens/Loyalty.png";

export function renderRegionTooltip(
  region: Region,
  forceNormalToolTip = false
): OverlayChildren {
  if (region.game.ingame.fogOfWar && !forceNormalToolTip) {
    // This tooltip only shows static data about the region,
    // and not the dynamic data (like units, garrison, etc.) that is hidden by fog of war.
    return (
      <Tooltip id={`region-${region.id}-details`} className="tooltip-w-100">
        <div className="text-center">
          <b>{region.name}</b>
          {region.staticRegion.castleLevel > 0 && (
            <>
              <br />
              {region.staticRegion.castleLevel == 1
                ? t("regionTooltip.castle419fb3")
                : t("regionTooltip.strongholdf3fec0")}
            </>
          )}
          <div className="d-flex flex-row justify-content-center mt-2">
            {_.range(0, region.staticRegion.supplyIcons).map((_, i) => {
              return (
                <div
                  key={`barrel-icon-${region.id}-${i}`}
                  className="unit-icon medium me-1"
                  style={{ backgroundImage: `url(${barrelImage})` }}
                />
              );
            })}
            {_.range(0, region.staticRegion.crownIcons).map((_, i) => {
              return (
                <div
                  key={`crown-icon-${region.id}-${i}`}
                  className="unit-icon medium me-1"
                  style={{ backgroundImage: `url(${crownImage})` }}
                />
              );
            })}
          </div>
        </div>
      </Tooltip>
    );
  }
  const controller = region.getController();
  const loyaltyTokenCount =
    region.loyaltyTokens > 0
      ? region.loyaltyTokens
      : region.superLoyaltyToken
        ? 1
        : 0;

  return (
    <Tooltip id={`region-${region.id}-details`} className="tooltip-w-100">
      <div className="text-center">
        <b>{region.name}</b>
        {controller && (
          <small>
            <Trans
              i18nKey="common.of"
              components={{ element0: <b />, value1: <>{controller.name}</> }}
            />
          </small>
        )}
        {region.castleLevel > 0 && (
          <>
            <br />
            {region.castleLevel == 1
              ? t("regionTooltip.castle419fb3")
              : t("regionTooltip.strongholdf3fec0")}
          </>
        )}
        {region.superControlPowerToken &&
        region.superControlPowerToken == controller ? (
          <>
            <Trans
              i18nKey="regionTooltip.capital59fab3"
              components={{
                element0: <br />,
                value1: (
                  <>
                    {region.garrison > 0 && (
                      <>
                        <Trans
                          i18nKey="regionTooltip.withGarrisonOf5aa47b"
                          components={{
                            element0: <b />,
                            value1: <>{region.garrison}</>
                          }}
                        />
                      </>
                    )}
                  </>
                )
              }}
            />
          </>
        ) : (
          region.garrison > 0 && (
            <>
              <Trans
                i18nKey="regionTooltip.ofab5d26"
                components={{
                  element0: <br />,
                  value1: (
                    <>
                      {!controller
                        ? t("regionTooltip.neutralForceeeb1ae")
                        : t("common.garrison")}
                    </>
                  ),
                  element2: <b />,
                  value3: <>{region.garrison}</>
                }}
              />
            </>
          )
        )}
        <div className="d-flex flex-row justify-content-center mt-2">
          {_.range(0, region.supplyIcons).map((_, i) => {
            return (
              <div
                key={`barrel-icon-${region.id}-${i}`}
                className="unit-icon medium me-1"
                style={{ backgroundImage: `url(${barrelImage})` }}
              />
            );
          })}
          {_.range(0, region.crownIcons).map((_, i) => {
            return (
              <div
                key={`crown-icon-${region.id}-${i}`}
                className="unit-icon medium me-1"
                style={{ backgroundImage: `url(${crownImage})` }}
              />
            );
          })}
          {region.controlPowerToken && (
            <div
              className="tooltip-power-token me-1"
              style={{
                backgroundImage: `url(${housePowerTokensImages.get(region.controlPowerToken.id)})`
              }}
            />
          )}
          {loyaltyTokenCount > 0 && (
            <div
              className="loyalty-icon"
              style={{
                backgroundImage: `url(${loyaltyTokenImage})`,
                textAlign: "center",
                fontWeight: "bold",
                fontFamily: "serif",
                fontSize: "1.5rem",
                color: "white"
              }}
            >
              {region.loyaltyTokens > 1 ? region.loyaltyTokens : ""}
            </div>
          )}
        </div>
        {region.units.size > 0 && (
          <small className="mt-2">
            {joinReactNodes(
              region.units.values.map((u, i) =>
                u.wounded ? (
                  <span key={`region-tooltip_wounded_${u.id}_${i}`}>
                    <s>{translateGameText(u.type.name)}</s>
                  </span>
                ) : (
                  <span key={`region-tooltip_unit_${u.id}_${i}`}>
                    {translateGameText(u.type.name)}
                  </span>
                )
              ),
              ", "
            )}
          </small>
        )}
      </div>
    </Tooltip>
  );
}
