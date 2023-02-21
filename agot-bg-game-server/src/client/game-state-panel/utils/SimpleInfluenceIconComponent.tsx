import {Component, default as React, ReactNode} from "react";
import Tooltip from "react-bootstrap/Tooltip";
import houseInfluenceImages from "../../houseInfluenceImages";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import { LobbyHouse } from "../../../common/lobby-game-state/LobbyGameState";
import { preventOverflow } from "@popperjs/core";
import classNames from "classnames";

interface SimpleInfluenceIconComponentProps {
    house: LobbyHouse | null;
    small?: boolean;
}

export default class SimpleInfluenceIconComponent extends Component<SimpleInfluenceIconComponentProps> {
    get house(): LobbyHouse | null {
        return this.props.house;
    }

    render(): ReactNode {
        const height = this.props.small ? "28px" : undefined;
        return <OverlayTrigger overlay={
                <Tooltip id="influence-icon">
                    <b>{this.house?.name ?? "Unknown house"}</b>
                </Tooltip>
            }
            placement="bottom"
            popperConfig={{modifiers: [preventOverflow]}}
        >
            <div className={classNames("influence-icon", {"invisible": this.house == null})}
                style={{backgroundImage: this.house ? `url(${houseInfluenceImages.get(this.house.id)})` : "none", height: height}}>
            </div>
        </OverlayTrigger>;
    }
}
