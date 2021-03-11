import {Component, default as React, ReactNode} from "react";
import {observer} from "mobx-react";
import Tooltip from "react-bootstrap/Tooltip";
import houseInfluenceImages from "../../houseInfluenceImages";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import House from "../../../common/ingame-game-state/game-data-structure/House";
import IngameGameState from "../../../common/ingame-game-state/IngameGameState";
import classNames from "classnames";

interface InfluenceIconComponentProps {
    house: House;
    ingame: IngameGameState;
    track: House[];
}

@observer
export default class InfluenceIconComponent extends Component<InfluenceIconComponentProps> {
    get house(): House {
        return this.props.house;
    }

    get track(): House[] {
        return this.props.track;
    }

    get ingame(): IngameGameState {
        return this.props.ingame;
    }

    render(): ReactNode {
        return (
            <OverlayTrigger overlay={
                    <Tooltip id="influence-icon">
                        <b>{this.house.name}</b>
                    </Tooltip>
                }
                placement="bottom"
            >
                <div className={classNames("influence-icon", {"medium-outline": this.ingame.game.getTokenHolder(this.track) == this.house})}
                    style={{backgroundImage: `url(${houseInfluenceImages.get(this.house.id)})`}}>
                </div>
            </OverlayTrigger>
        );
    }
}
