import {Component, default as React, ReactNode} from "react";
import {observer} from "mobx-react";
import HouseCard from "../../../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import houseCardImages from "../../houseCardImages";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import classNames from "classnames";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";
import { preventOverflow } from "@popperjs/core";
import ImagePopover from "../../utils/ImagePopover";

interface HouseCardComponentProps {
    houseCard: HouseCard;
    size?: "small" | "medium" | "tiny";
    selected?: boolean;
    unavailable?: boolean;
    onClick?: () => void;
}

@observer
export default class HouseCardComponent extends Component<HouseCardComponentProps> {
    render(): ReactNode {
        return <OverlayTrigger
                overlay={this.renderPopover()}
                popperConfig={{modifiers: [preventOverflow]}}
                delay={{show: 250, hide: 0}}
                placement="auto"
            >
                <img
                    className={classNames(
                        "vertical-game-card hover-weak-outline",
                        {"unavailable-monotone": this.props.unavailable},
                        this.props.size,
                        {"medium-outline hover-strong-outline": this.props.selected}
                    )}
                    src={houseCardImages.get(this.props.houseCard.id)}
                    onClick={() => this.props.onClick ? this.props.onClick() : undefined}
                />
            </OverlayTrigger>;
    }

    private renderPopover(): OverlayChildren {
        return <ImagePopover className="vertical-game-card bring-to-front" style={{
            backgroundImage: `url(${houseCardImages.get(this.props.houseCard.id)})`}}
        />;
    }
}
