import {Component, ReactNode} from "react";
import classNames from "classnames";
import React from "react";
import {observer} from "mobx-react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import WesterosCardType from "../../../common/ingame-game-state/game-data-structure/westeros-card/WesterosCardType";
import westerosCardImages from "../../westerosCardImages";
import ConditionalWrap from "../../../client/utils/ConditionalWrap"
import { preventOverflow } from "@popperjs/core";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";
import ImagePopover from "../../utils/ImagePopover";
import trageImage from "../../../../public/images/icons/trade.svg";
import { Tooltip } from "react-bootstrap";

interface WesterosCardProps {
    cardType: WesterosCardType;
    westerosDeckI: number;
    size?: "tiny" | "small" | "medium";
    tooltip?: boolean;
    classNames?: string;
    selected?: boolean;
    showTitle?: boolean;
    wasReshuffled?: boolean;
    onClick?: () => void;
}

@observer
export default class WesterosCardComponent extends Component<WesterosCardProps> {
    render(): ReactNode {
        return <div>
                {this.props.showTitle &&
                <div className="text-center">
                    <ConditionalWrap condition={this.props.size == "small"} wrap={
                        child => <small>{child}</small>
                    }>
                        <>{this.props.cardType.name}</>
                    </ConditionalWrap>
                </div>}
                <OverlayTrigger
                    overlay={this.renderPopover()}
                    popperConfig={{modifiers: [preventOverflow]}}
                    delay={{show: 250, hide: 0}}
                    placement="auto"
                >
                    <div
                        className={classNames("horizontal-game-card hover-weak-outline", this.props.size, this.props.classNames, {"medium-outline hover-strong-outline": this.props.selected})}
                        style={{
                            backgroundImage: this.props.cardType ? `url(${westerosCardImages.get(this.props.westerosDeckI).get(this.props.cardType.id)})` : undefined,
                            margin: "auto"
                        }}
                        onClick={() => this.props.onClick ? this.props.onClick() : undefined}
                    />
                </OverlayTrigger>
                {this.props.wasReshuffled &&
                <div className="mt-1 text-center">
                    <OverlayTrigger
                        overlay={<Tooltip id={`was-reshuffled-${this.props.westerosDeckI}`}>Drawn after <b>Winter is Coming</b> was executed</Tooltip>}
                        popperConfig={{modifiers: [preventOverflow]}}
                        delay={{show: 250, hide: 0}}
                        placement="auto"
                    >
                        <img src={trageImage} width="36"/>
                    </OverlayTrigger>
                </div>}
            </div>;
    }

    private renderPopover(): OverlayChildren {
        return this.props.tooltip ?
            <ImagePopover className="horizontal-game-card bring-to-front"
                style={{backgroundImage: `url(${westerosCardImages.get(this.props.westerosDeckI).get(this.props.cardType.id)})`}}/>
            : <ImagePopover className="display-none"/>
    }
}
