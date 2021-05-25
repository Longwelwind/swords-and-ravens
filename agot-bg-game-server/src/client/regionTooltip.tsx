import React from "react";
import { ReactNode } from "react";
import { Tooltip } from "react-bootstrap";
import Region from "../common/ingame-game-state/game-data-structure/Region";
import joinReactNodes from "./utils/joinReactNodes";

export function renderRegionTooltip(region: Region): ReactNode {
    const controller =  region.getController();

    return <Tooltip id={`region-${region.id}-details`}>
        <b>{region.name}</b> {controller && (<small>of <b>{controller.name}</b></small>)} {region.castleLevel > 0 && (<small> ({region.castleLevel == 1 ? "Castle" : "Stronghold"})</small>)}
        {region.superControlPowerToken ? (
            <small><br/>Capital of {region.superControlPowerToken.name} {region.garrison > 0 && <>(Garrison of <b>{region.garrison}</b>)</>}</small>
        ) : (
            region.garrison > 0 && (<small><br />{!region.getController() ? "Neutral force" : "Garrison"} of <b>{region.garrison}</b></small>)
        )}
        {(region.supplyIcons > 0 || region.crownIcons) > 0 && (
            <>
                <br />{region.supplyIcons > 0 && <><b>{region.supplyIcons}</b> Barrel{region.supplyIcons > 1 && "s"}</>}
                {(region.supplyIcons > 0 && region.crownIcons > 0) && " - "}
                {region.crownIcons > 0 && <><b>{region.crownIcons}</b> Crown{region.crownIcons > 1 && "s"}</>}
            </>
        )}
        {region.units.size > 0 && (
            <><br/>{joinReactNodes(region.units.values.map(u => u.wounded ? <s key={u.id}>{u.type.name}</s> : <b key={u.id}>{u.type.name}</b>), ", ")}</>
        )}
    </Tooltip>;
}