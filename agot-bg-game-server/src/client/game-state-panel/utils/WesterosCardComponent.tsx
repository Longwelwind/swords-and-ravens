import {Component, ReactNode} from "react";
import classNames from "classnames";
import React from "react";
import {observer} from "mobx-react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import WesterosCardType from "../../../common/ingame-game-state/game-data-structure/westeros-card/WesterosCardType";
import westerosCardImages from "../../westerosCardImages";

interface WesterosCardProps {
    cardType: WesterosCardType;
    westerosDeckI: number;
    size?: "small" | "medium";
    tooltip?: boolean;
    classNames?: string;
}

@observer
export default class WesterosCardComponent extends Component<WesterosCardProps> {
    render(): ReactNode {
        return (
            <OverlayTrigger
                overlay={
                    this.props.tooltip ? <div
                        className="horizontal-game-card"
                        style={{
                            backgroundImage: this.props.cardType ? `url(${westerosCardImages.get(this.props.westerosDeckI).get(this.props.cardType.id)})` : undefined
                        }}
                    /> : <div/>
                }
                popperConfig={{modifiers: {preventOverflow: {boundariesElement: "viewport"}}}}
                delay={{show: 120, hide: 0}}
                placement="auto"
            >
                <div
                    className={classNames("horizontal-game-card hover-weak-outline", this.props.size, this.props.classNames)}
                    style={{
                        backgroundImage: this.props.cardType ? `url(${westerosCardImages.get(this.props.westerosDeckI).get(this.props.cardType.id)})` : undefined
                    }}
                />
            </OverlayTrigger>
        );
    }
}
