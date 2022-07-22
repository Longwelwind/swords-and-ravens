import {Component, default as React, ReactNode} from "react";
import {observer} from "mobx-react";
import Tooltip from "react-bootstrap/Tooltip";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import { LobbyHouse } from "../../../common/lobby-game-state/LobbyGameState";
import houseIconImages from "../../../client/houseIconImages";
import classNames from "classnames";


interface HouseIconComponentProps {
    house: LobbyHouse;
    small?: boolean;
    size?: number;
    makeGreyjoyBlack?: boolean;
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
            <div className={classNames("influence-icon", { "make-black": this.props.makeGreyjoyBlack && this.props.house.id == "greyjoy" })}
                style={{backgroundImage: `url(${houseIconImages.get(this.house.id)})`, height: size, width: size}}>
            </div>
        </OverlayTrigger>;
    }
}
