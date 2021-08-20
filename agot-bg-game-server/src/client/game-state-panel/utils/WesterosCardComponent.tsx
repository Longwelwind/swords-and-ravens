import {Component, ReactNode} from "react";
import classNames from "classnames";
import React from "react";
import {observer} from "mobx-react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import WesterosCardType from "../../../common/ingame-game-state/game-data-structure/westeros-card/WesterosCardType";
import westerosCardImages from "../../westerosCardImages";
import ImagePopover from "./ImagePopover";
import ConditionalWrap from "../../../client/utils/ConditionalWrap";

interface WesterosCardProps {
    cardType: WesterosCardType;
    westerosDeckI: number;
    size?: "small" | "medium";
    tooltip?: boolean;
    classNames?: string;
    selected?: boolean;
    showTitle?: boolean;
    onClick?: () => void;
}

@observer
export default class WesterosCardComponent extends Component<WesterosCardProps> {
    render(): ReactNode {
        return <OverlayTrigger
            overlay={this.renderPopover()}
            popperConfig={{modifiers: {preventOverflow: {boundariesElement: "viewport"}}}}
            delay={{show: 120, hide: 0}}
            placement="auto"
        >
            <div>
                {this.props.showTitle &&
                <div className="text-center">
                    <ConditionalWrap condition={this.props.size == "small"} wrap={
                        child => <small>{child}</small>
                    }>
                        <>{this.props.cardType.name}</>
                    </ConditionalWrap>
                </div>}
                <div
                    className={classNames("horizontal-game-card hover-weak-outline", this.props.size, this.props.classNames, {"medium-outline hover-strong-outline": this.props.selected})}
                    style={{
                        backgroundImage: this.props.cardType ? `url(${westerosCardImages.get(this.props.westerosDeckI).get(this.props.cardType.id)})` : undefined,
                        margin: "auto"
                    }}
                    onClick={() => this.props.onClick ? this.props.onClick() : undefined}
                />
            </div>
        </OverlayTrigger>;
    }

    private renderPopover(): ReactNode {
        return this.props.tooltip ?
            <ImagePopover className="horizontal-game-card"
                style={{backgroundImage: `url(${westerosCardImages.get(this.props.westerosDeckI).get(this.props.cardType.id)})`}}/>
            : <ImagePopover className="invisible"/>
    }
}
