import {Component, default as React, ReactNode} from "react";
import {observer} from "mobx-react";
import Tooltip from "react-bootstrap/Tooltip";
import houseInfluenceImages from "../../houseInfluenceImages";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import House from "../../../common/ingame-game-state/game-data-structure/House";

interface InfluenceIconComponentProps {
    house: House;
}

@observer
export default class InfluenceIconComponent extends Component<InfluenceIconComponentProps> {
    render(): ReactNode {
        return (
            <OverlayTrigger overlay={
                    <Tooltip id="influence-icon">
                        <b>{this.props.house.name}</b>
                    </Tooltip>
                }
                placement="bottom"
            >
                <div className="influence-icon hover-weak-outline"
                    style={{backgroundImage: `url(${houseInfluenceImages.get(this.props.house.id)})`}}>
                </div>
            </OverlayTrigger>
        );
    }
}
