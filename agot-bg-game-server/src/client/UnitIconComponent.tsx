import classNames from "classnames";
import { Component, default as React, ReactNode } from "react";
import House from "../common/ingame-game-state/game-data-structure/House";
import UnitType from "../common/ingame-game-state/game-data-structure/UnitType";
import unitImages from "./unitImages";

interface UnitIconComponentProps {
    house: House;
    unitType: UnitType,
    size?: "small" | "smedium"| "medium" | undefined,
    makeGreyjoyUnitsBlack?: boolean | undefined
}

export default class UnitIconComponent extends Component<UnitIconComponentProps> {
    render(): ReactNode {
        return <div
            className={classNames("unit-icon", this.props.size, { "make-black": this.props.makeGreyjoyUnitsBlack && this.props.house.id == "greyjoy" })}
            style={{
                backgroundImage: `url(${unitImages.get(this.props.house.id).get(this.props.unitType.id)})`,
                display: "inline-block"
            }}
        />
    }
}
