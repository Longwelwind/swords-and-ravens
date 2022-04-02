import _ from "lodash";
import React from "react";
import { Col, Tooltip } from "react-bootstrap";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";
import Region from "../common/ingame-game-state/game-data-structure/Region";
import joinReactNodes from "./utils/joinReactNodes";
import barrelImage from "../../public/images/region-modifications/Barrel.png"
import crownImage from "../../public/images/region-modifications/Crown.png"
import housePowerTokensImages from "./housePowerTokensImages";
import loyaltyTokenImage from "../../public/images/power-tokens/Loyalty.png"


export function renderRegionTooltip(region: Region): OverlayChildren {
    const controller =  region.getController();
    const loyaltyTokenCount = region.loyaltyTokens > 0 ? region.loyaltyTokens : region.superLoyaltyToken ? 1 : 0;

    return <Tooltip id={`region-${region.id}-details`} className="tooltip-w-100">
        <Col className="text-center">
            <h5 style={{display: "inline"}}>{region.name}{controller && (<small> of <b>{controller.name}</b></small>)}</h5>
            {region.castleLevel > 0 && <><br/>{region.castleLevel == 1 ? "Castle" : "Stronghold"}</>}
            {region.superControlPowerToken && region.superControlPowerToken == controller
            ? <>
                <br/>Capital{region.garrison > 0 && <>&nbsp;with&nbsp;Garrison&nbsp;of&nbsp;<b>{region.garrison}</b></>}
            </>
            : region.garrison > 0 && <><br/>{!controller ? "Neutral\xa0force" : "Garrison"}&nbsp;of&nbsp;<b>{region.garrison}</b></>
            }
            <div className="d-flex flex-row justify-content-center mt-2">
                {_.range(0, region.supplyIcons).map((_, i) => {
                    return <div key={`barrel-icon-${region.id}-${i}`}
                        className="unit-icon medium mr-1"
                        style={{ backgroundImage: `url(${barrelImage})` }}
                    />})}
                {_.range(0, region.crownIcons).map((_, i) => {
                    return <div key={`crown-icon-${region.id}-${i}`}
                        className="unit-icon medium mr-1"
                        style={{ backgroundImage: `url(${crownImage})` }}
                    />})}
                {region.controlPowerToken && (
                    <div
                        className="tooltip-power-token mr-1"
                        style={{ backgroundImage: `url(${housePowerTokensImages.get(region.controlPowerToken.id)})` }}
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
                <div className="mt-2">{joinReactNodes(region.units.values.map(u => u.wounded ? <span key={u.id}><s>{u.type.name}</s></span> : <span key={u.id}>{u.type.name}</span>), ", ")}</div>
            )}
        </Col>
    </Tooltip>;
}