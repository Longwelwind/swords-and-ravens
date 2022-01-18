import {Component, default as React, ReactNode} from "react";
import {observer} from "mobx-react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import classNames from "classnames";
import ImagePopover from "./ImagePopover";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";
import { preventOverflow } from "@popperjs/core";
import objectiveCardImages from "../../objectiveCardImages";
import { ObjectiveCard, SpecialObjectiveCard } from "../../../common/ingame-game-state/game-data-structure/static-data-structure/ObjectiveCard";

interface ObjectiveCardComponentProps {
    objectiveCard: ObjectiveCard | SpecialObjectiveCard;
    size?: "small" | "smedium" | "medium" | "tiny";
    selected?: boolean;
    onClick?: () => void;
}

@observer
export default class ObjectiveCardComponent extends Component<ObjectiveCardComponentProps> {
    render(): ReactNode {
        return <OverlayTrigger
                overlay={this.renderPopover()}
                popperConfig={{modifiers: [preventOverflow]}}
                delay={{show: 120, hide: 0}}
                placement="auto"
            >
                <img
                    className={classNames(
                        "vertical-game-card hover-weak-outline",
                        this.props.size,
                        {"medium-outline hover-strong-outline": this.props.selected}
                    )}
                    src={objectiveCardImages.get(this.props.objectiveCard.id)}
                    onClick={() => this.props.onClick ? this.props.onClick() : undefined}
                />
            </OverlayTrigger>;
    }

    private renderPopover(): OverlayChildren {
        return <ImagePopover className="vertical-game-card" style={{
            backgroundImage: `url(${objectiveCardImages.get(this.props.objectiveCard.id)})`}}
        />;
    }
}
