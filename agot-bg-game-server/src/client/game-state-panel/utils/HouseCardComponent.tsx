import {Component, default as React, ReactNode} from "react";
import {observer} from "mobx-react";
import HouseCard, {HouseCardState} from "../../../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import houseCardImages from "../../houseCardImages";
import Col from "react-bootstrap/Col";
import houseCardsBackImages from "../../houseCardsBackImages";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import {Placement} from "react-bootstrap/Overlay";
import House from "../../../common/ingame-game-state/game-data-structure/House";
import classNames = require("classnames");

interface HouseCardComponentProps {
    house: House;
    houseCard: HouseCard;
    placement: Placement;
    selected?: boolean;
    onClick?: () => void;
}

@observer
export default class HouseCardComponent extends Component<HouseCardComponentProps> {
    render(): ReactNode {
        return (
            <OverlayTrigger
                overlay={
                    <div className="house-card-full" style={{backgroundImage: `url(${houseCardImages.get(this.props.houseCard.id)})`}}/>
                }
                delay={{show: 120, hide: 0}}
                placement={this.props.placement}
            >
                <Col xs="auto">
                    <div
                        className={
                            classNames(
                                "house-card-icon hover-weak-outline",
                                {"medium-outline hover-strong-outline": this.props.selected}
                            )
                        }
                        style={{
                            backgroundImage: `url(${this.props.houseCard.state == HouseCardState.AVAILABLE ? houseCardImages.get(this.props.houseCard.id) : houseCardsBackImages.get(this.props.house.id)})`
                        }}
                        onClick={() => this.props.onClick ? this.props.onClick() : undefined}
                    >
                    </div>
                </Col>
            </OverlayTrigger>
        );
    }
}
