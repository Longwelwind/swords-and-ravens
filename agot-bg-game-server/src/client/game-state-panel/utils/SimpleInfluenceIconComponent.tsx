import {Component, default as React, ReactNode} from "react";
import Tooltip from "react-bootstrap/Tooltip";
import houseInfluenceImages from "../../houseInfluenceImages";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import { LobbyHouse } from "../../../common/lobby-game-state/LobbyGameState";
import { preventOverflow } from "@popperjs/core";

interface SimpleInfluenceIconComponentProps {
    house: LobbyHouse;
}

export default class SimpleInfluenceIconComponent extends Component<SimpleInfluenceIconComponentProps> {
    get house(): LobbyHouse {
        return this.props.house;
    }

    render(): ReactNode {
        return <OverlayTrigger overlay={
                <Tooltip id="influence-icon">
                    <b>{this.house.name}</b>
                </Tooltip>
            }
            placement="bottom"
            popperConfig={{modifiers: [preventOverflow]}}
        >
            <div className="influence-icon"
                style={{backgroundImage: `url(${houseInfluenceImages.get(this.house.id)})`}}/>
        </OverlayTrigger>;
    }
}
