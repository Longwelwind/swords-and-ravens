import {Component, ReactNode} from "react";
import classNames from "classnames";
import React from "react";
import {observer} from "mobx-react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import {Placement} from "react-bootstrap/Overlay";
import WesterosCardType from "../../../common/ingame-game-state/game-data-structure/westeros-card/WesterosCardType";
import westerosCardImages from "../../westerosCardImages";

interface WesterosCardProps {
    cardType: WesterosCardType;
    size?: "small" | "medium";
    tooltip?: boolean;
}

@observer
export default class WesterosCardComponent extends Component<WesterosCardProps> {
    render(): ReactNode {
        return (
            <OverlayTrigger
                overlay={
                    this.props.tooltip ? <div
                        className="horizontal-card"
                        style={{
                            backgroundImage: this.props.cardType ? `url(${westerosCardImages.get(this.props.cardType.id)})` : undefined
                        }}
                    /> : <div/>
                }
                popperConfig={{modifiers: {preventOverflow: {boundariesElement: "viewport"}}}}
                delay={{show: 120, hide: 0}}
                placement="auto"
            >
                <div
                    className={classNames("horizontal-card hover-weak-outline", this.props.size, {"slot": this.props.cardType == null})}
                    style={{
                        backgroundImage: this.props.cardType ? `url(${westerosCardImages.get(this.props.cardType.id)})` : undefined
                    }}
                />
            </OverlayTrigger>
        );
    }
}
