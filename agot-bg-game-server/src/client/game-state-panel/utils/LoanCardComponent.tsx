import {Component, default as React, ReactNode} from "react";
import {observer} from "mobx-react";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import { preventOverflow } from "@popperjs/core";
import { OverlayChildren } from "react-bootstrap/esm/Overlay";
import LoanCardType from "../../../common/ingame-game-state/game-data-structure/loan-card/LoanCardType";
import loanCardImages from "../../loanCardImages";
import ImagePopover from "../../utils/ImagePopover";

interface LoanCardComponentProps {
    loanCard: LoanCardType;
}

@observer
export default class LoanCardComponent extends Component<LoanCardComponentProps> {
    render(): ReactNode {
        return <OverlayTrigger
            overlay={this.renderPopover()}
            popperConfig={{modifiers: [preventOverflow]}}
            delay={{show: 250, hide: 0}}
            placement="auto"
        >
            <div
                className="vertical-game-card hover-weak-outline smedium"
                style={{
                    backgroundImage: `url(${loanCardImages.get(this.props.loanCard.id)})`
                }}
            />
        </OverlayTrigger>;
    }

    renderPopover(): OverlayChildren {
        return <ImagePopover className="vertical-game-card bring-to-front" style={{
            backgroundImage: `url(${loanCardImages.get(this.props.loanCard.id)})`}}
        />;
    }
}
