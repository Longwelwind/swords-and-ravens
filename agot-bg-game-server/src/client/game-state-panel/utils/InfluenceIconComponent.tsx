import {Component, default as React, ReactNode} from "react";
import {observer} from "mobx-react";
import Tooltip from "react-bootstrap/Tooltip";
import houseInfluenceImages from "../../houseInfluenceImages";
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import House from "../../../common/ingame-game-state/game-data-structure/House";
import IngameGameState from "../../../common/ingame-game-state/IngameGameState";
import classNames from "classnames";

interface InfluenceIconComponentProps {
    house: House | null;
    ingame: IngameGameState;
    track: House[];
    name: string;
}

@observer
export default class InfluenceIconComponent extends Component<InfluenceIconComponentProps> {
    get house(): House | null {
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
            const tokenHolder = this.props.name == "Iron Throne" ? this.ingame.game.ironThroneHolder : this.ingame.game.getTokenHolder(this.track);
            isTokenHolder = tokenHolder == this.house;

            if (this.props.name == "Fiefdoms" && this.house) {
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
                    <b>{this.house?.name ?? "Unknown"}</b>
                </Tooltip>
            }
            placement="bottom"
        >
            <div className={classNames("influence-icon", {"medium-outline": isTokenHolder}, {"invisible": this.house == null})}
                style={{backgroundImage: this.house ? `url(${houseInfluenceImages.get(this.house.id)})` : "none"}}>
            </div>
        </OverlayTrigger>;
    }
}
