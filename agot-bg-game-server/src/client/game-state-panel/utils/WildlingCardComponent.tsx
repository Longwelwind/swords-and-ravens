import {Component, ReactNode} from "react";
import classNames from "classnames";
import React from "react";
import {observer} from "mobx-react";
import WildlingCardType from "../../../common/ingame-game-state/game-data-structure/wildling-card/WildlingCardType";
import wildlingCardImages from "../../wildlingCardImages";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import {OverlayChildren} from "react-bootstrap/Overlay";
import { preventOverflow } from "@popperjs/core";
import ImagePopover from "../../utils/ImagePopover";

interface WildlingCardProps {
    cardType: WildlingCardType;
    size?: "tiny" | "small" | "smedium" | "medium" | "fairly";
    tooltip?: boolean;
}

@observer
export default class WildlingCardComponent extends Component<WildlingCardProps> {
    render(): ReactNode {
        return <OverlayTrigger
            overlay={this.renderPopover()}
            delay={{show: 250, hide: 0}}
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
        return this.props.tooltip
            ? <ImagePopover className="vertical-game-card bring-to-front"
                style={{
                    backgroundImage: `url(${wildlingCardImages.get(this.props.cardType.id)})`}}
              />
            : <ImagePopover className="display-none"/>;
    }
}
