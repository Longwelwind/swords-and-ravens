import {Component, ReactNode} from "react";
import classNames from "classnames";
import React from "react";
import {observer} from "mobx-react";
import WildlingCardType from "../../../common/ingame-game-state/game-data-structure/wildling-card/WildlingCardType";
import wildlingCardImages from "../../wildlingCardImages";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import {OverlayChildren} from "react-bootstrap/Overlay";
import ImagePopover from "./ImagePopover";
import { preventOverflow } from "@popperjs/core";

interface WildlingCardProps {
    cardType: WildlingCardType;
    size?: "tiny" | "small" | "smedium" | "medium";
    tooltip?: boolean;
}

@observer
export default class WildlingCardComponent extends Component<WildlingCardProps> {
    render(): ReactNode {
        return <OverlayTrigger
            overlay={this.renderPopover()}
            delay={{show: 120, hide: 0}}
            popperConfig={{modifiers: [preventOverflow]}}
            placement="auto"
        >
            <div
                className={classNames("vertical-game-card hover-weak-outline", this.props.size, {"slot": this.props.cardType == null})}
                style={{
                    backgroundImage: this.props.cardType ? `url(${wildlingCardImages.get(this.props.cardType.id)})` : undefined
                }}
            />
        </OverlayTrigger>;
    }

    renderPopover(): OverlayChildren {
        return this.props.tooltip ? <ImagePopover className="vertical-game-card bring-to-front"
            style={{
                backgroundImage: `url(${wildlingCardImages.get(this.props.cardType.id)})`}}
            />
            : <ImagePopover className="invisible"/>;
    }
}
