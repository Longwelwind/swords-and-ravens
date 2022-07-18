import {Component, default as React, ReactNode} from "react";
import {observer} from "mobx-react";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import { LobbyHouse } from "../../../common/lobby-game-state/LobbyGameState";
import houseIconImages from "../../../client/houseIconImages";


interface HouseIconComponentProps {
    house: LobbyHouse;
    small?: boolean;
    size?: number;
}

@observer
export default class HouseIconComponent extends Component<HouseIconComponentProps> {
    get house(): LobbyHouse{
        return this.props.house;
    }

    render(): ReactNode {
        const size = this.props.size ? `${this.props.size}px`
            : this.props.small
                ? "28px"
                : undefined;
        return <OverlayTrigger overlay={
                <Tooltip id="house-icon">
                    <b>{this.house.name}</b>
                </Tooltip>
            }
            placement="bottom"
        >
            <div className="influence-icon"
                style={{backgroundImage: `url(${houseIconImages.get(this.house.id)})`, height: size, width: size}}>
            </div>
        </OverlayTrigger>;
    }
}
