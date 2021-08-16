import React from "react";
import { ReactNode } from "react";
import { Tooltip } from "react-bootstrap";
import Region from "../common/ingame-game-state/game-data-structure/Region";
// import joinReactNodes from "./utils/joinReactNodes";

export function renderRegionTooltip(region: Region): ReactNode {
    const controller =  region.getController();

    return <Tooltip id={`region-${region.id}-details`}>
        <div className="text-center mb-2">
            <b>{region.name}</b> {controller && (<small>of <b>{controller.name}</b></small>)}
            {region.castleLevel > 0 && <small><br/>{region.castleLevel == 1 ? "Castle" : "Stronghold"}</small>}
            {region.superControlPowerToken && region.superControlPowerToken == controller
            ? <>
                <br/><small>Capital{region.garrison > 0 && <>&nbsp;with&nbsp;Garrison&nbsp;of&nbsp;{region.garrison}</>}</small>
            </>
            : region.garrison > 0 && <small><br/>{!controller ? "Neutral\xa0force" : "Garrison"}&nbsp;of&nbsp;{region.garrison}</small>
            }
            {(region.supplyIcons > 0 || region.crownIcons > 0) && (
                <small>
                    <br />{region.supplyIcons > 0 && <>{region.supplyIcons} Barrel{region.supplyIcons > 1 && "s"}</>}
                    {(region.supplyIcons > 0 && region.crownIcons > 0) && " - "}
                    {region.crownIcons > 0 && <>{region.crownIcons} Crown{region.crownIcons > 1 && "s"}</>}
                </small>
            )}
            {region.controlPowerToken && (
                <><br/><small>Power token</small></>
            )}
            {/* {region.units.size > 0 && (
                <><br/>{joinReactNodes(region.units.values.map(u => u.wounded ? <s key={u.id}>{u.type.name}</s> : <b key={u.id}>{u.type.name}</b>), ", ")}</>
            )} */}
        </div>
    </Tooltip>;
}