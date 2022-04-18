import MusteringGameState
    from "../../common/ingame-game-state/westeros-game-state/mustering-game-state/MusteringGameState";
import {observer} from "mobx-react";
import {Component} from "react";
import PlayerMusteringComponent from "./PlayerMusteringComponent";
import * as React from "react";
import GameStateComponentProps from "./GameStateComponentProps";
import renderChildGameState from "../utils/renderChildGameState";
import PlayerMusteringGameState
    from "../../common/ingame-game-state/westeros-game-state/mustering-game-state/player-mustering-game-state/PlayerMusteringGameState";
import ListGroupItem from "react-bootstrap/ListGroupItem";
import Row from "react-bootstrap/Row";
import ConditionalWrap from "../utils/ConditionalWrap";
import WesterosGameState from "../../common/ingame-game-state/westeros-game-state/WesterosGameState";

@observer
export default class MusteringComponent extends Component<GameStateComponentProps<MusteringGameState>> {
    render(): React.ReactNode {
        return (
            <ConditionalWrap
                condition={this.props.gameState.parentGameState instanceof WesterosGameState}
                wrap={children =>
                    <ListGroupItem className="px-2">
                        {children}
                    </ListGroupItem>
                }>
                    <Row>
                        {renderChildGameState(this.props, [[PlayerMusteringGameState, PlayerMusteringComponent]])}
                    </Row>
            </ConditionalWrap>
        );
    }
}
