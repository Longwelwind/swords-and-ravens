import {observer} from "mobx-react";
import {Component, default as React, ReactNode} from "react";
import { ListGroupItem, Row } from "react-bootstrap";
import ChooseRegionForLoyaltyTokenGameState from "../../../common/ingame-game-state/westeros-game-state/choose-region-for-loyalty-token-game-state/ChooseRegionForLoyaltyTokenGameState";
import renderChildGameState from "../../../client/utils/renderChildGameState";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import WesterosDeck4GameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/WesterosDeck4GameState";
import GameStateComponentProps from "../GameStateComponentProps";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import ChooseRegionForLoyaltyTokenComponent from "./ChooseRegionForLoyaltyTokenComponent";

@observer
export default class WesterosDeck4Component extends Component<GameStateComponentProps<WesterosDeck4GameState>> {
    render(): ReactNode {
        return <>
                <ListGroupItem className="px-2">
                    <Row>
                        {renderChildGameState<WesterosDeck4GameState>(this.props, [
                            [SimpleChoiceGameState, SimpleChoiceComponent],
                            [ChooseRegionForLoyaltyTokenGameState, ChooseRegionForLoyaltyTokenComponent]
                        ])}
                    </Row>
                </ListGroupItem>
            </>;
    }
}
