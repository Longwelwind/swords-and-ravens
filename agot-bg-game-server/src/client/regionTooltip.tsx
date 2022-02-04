import React from "react";
import { Col, Tooltip } from "react-bootstrap";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";
import Region from "../common/ingame-game-state/game-data-structure/Region";
import joinReactNodes from "./utils/joinReactNodes";
// import joinReactNodes from "./utils/joinReactNodes";

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
            {(region.supplyIcons > 0 || region.crownIcons > 0) && (
                <>
                    <br />{region.supplyIcons > 0 && <><b>{region.supplyIcons}</b> Barrel{region.supplyIcons > 1 && "s"}</>}
                    {(region.supplyIcons > 0 && region.crownIcons > 0) && " - "}
                    {region.crownIcons > 0 && <><b>{region.crownIcons}</b> Crown{region.crownIcons > 1 && "s"}</>}
                </>
            )}
            {region.controlPowerToken && (
                <><br/>Power token</>
            )}
            {loyaltyTokenCount > 0 && (
                <><br/><b>{loyaltyTokenCount}</b> Loyalty token{loyaltyTokenCount > 1 && "s"}</>
            )}
            {region.units.size > 0 && (
                <div className="mt-2">{joinReactNodes(region.units.values.map(u => u.wounded ? <span key={u.id}><s>{u.type.name}</s></span> : <span key={u.id}>{u.type.name}</span>), ", ")}</div>
            )}
        </Col>
    </Tooltip>;
}