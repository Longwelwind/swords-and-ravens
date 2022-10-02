import { observer } from "mobx-react";
import { Component, default as React, ReactNode } from "react";
import { Row } from "react-bootstrap";
import ChooseRegionForLoyaltyTokenGameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/choose-region-for-loyalty-token-game-state/ChooseRegionForLoyaltyTokenGameState";
import renderChildGameState from "../../../client/utils/renderChildGameState";
import SimpleChoiceGameState from "../../../common/ingame-game-state/simple-choice-game-state/SimpleChoiceGameState";
import WesterosDeck4GameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/WesterosDeck4GameState";
import GameStateComponentProps from "../GameStateComponentProps";
import SimpleChoiceComponent from "../SimpleChoiceComponent";
import ChooseRegionForLoyaltyTokenComponent from "./ChooseRegionForLoyaltyTokenComponent";
import ChooseMultipleRegionsForLoyaltyTokenGameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/choose-multiple-regions-for-loyalty-token-game-state/ChooseMultipleRegionsForLoyaltyTokenGameState";
import ChooseMultipleRegionsForLoyaltyTokenComponent from "./ChooseMultipleRegionsForLoyaltyTokenComponent";
import FireMadeFleshGameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/fire-made-flesh-game-state/FireMadeFleshGameState";
import FireMadeFleshComponent from "./FireMadeFleshComponent";
import PlayingWithFireGameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/playing-with-fire-game-state/PlayingWithFireGameState";
import PlayingWithFireComponent from "./PlayingWithFireComponent";
import TheLongPlanGameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/the-long-plan-game-state/TheLongPlanGameState";
import TheLongPlanComponent from "./TheLongPlanComponent";
import MoveLoyaltyTokensGameState from "../../../common/ingame-game-state/westeros-game-state/westeros-deck-4-game-state/move-loyalty-tokens-game-state/MoveLoyaltyTokensGameState";
import MoveLoyaltyTokensComponent from "./MoveLoyaltyTokensComponent";

@observer
export default class WesterosDeck4Component extends Component<GameStateComponentProps<WesterosDeck4GameState>> {
    render(): ReactNode {
        return <Row>
            {renderChildGameState<WesterosDeck4GameState>(this.props, [
                [SimpleChoiceGameState, SimpleChoiceComponent],
                [ChooseRegionForLoyaltyTokenGameState, ChooseRegionForLoyaltyTokenComponent],
                [ChooseMultipleRegionsForLoyaltyTokenGameState, ChooseMultipleRegionsForLoyaltyTokenComponent],
                [FireMadeFleshGameState, FireMadeFleshComponent],
                [PlayingWithFireGameState, PlayingWithFireComponent],
                [TheLongPlanGameState, TheLongPlanComponent],
                [MoveLoyaltyTokensGameState, MoveLoyaltyTokensComponent]
            ])}
        </Row>;
    }
}
