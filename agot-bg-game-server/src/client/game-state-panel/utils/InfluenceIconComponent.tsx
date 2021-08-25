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
    name: string;
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
        let isTokenHolder = false;
        try {
            const tokenHolder = this.ingame.game.getTokenHolder(this.track);
            isTokenHolder = tokenHolder == this.house;

            if (this.props.name == "Fiefdoms") {
                // Highlight vassals of token holder as well
                const possibleCommander = this.ingame.game.vassalRelations.tryGet(this.house, null);
                if (possibleCommander == tokenHolder) {
                    isTokenHolder = true;
                }
            }
        } catch {
            // just swallow this
        }
        return this.props.ingame.rerender >= 0 && <OverlayTrigger overlay={
                <Tooltip id="influence-icon">
                    <b>{this.house.name}</b>
                </Tooltip>
            }
            placement="bottom"
        >
            <div className={classNames("influence-icon", {"medium-outline": isTokenHolder})}
                style={{backgroundImage: `url(${houseInfluenceImages.get(this.house.id)})`}}>
            </div>
        </OverlayTrigger>;
    }
}
