import { Component, ReactNode } from "react";
import { observer } from "mobx-react";
import GameStateComponentProps from "./GameStateComponentProps";
import renderChildGameState from "../utils/renderChildGameState";
import ClaimVassalGameState from "../../common/ingame-game-state/planning-game-state/claim-vassals-game-state/claim-vassal-game-state/ClaimVassalGameState";
import ClaimVassalComponent from "./ClaimVassalComponent";
import ClaimVassalsGameState from "../../common/ingame-game-state/planning-game-state/claim-vassals-game-state/ClaimVassalsGameState";

@observer
export default class ClaimVassalsComponent extends Component<GameStateComponentProps<ClaimVassalsGameState>> {
    render(): ReactNode {
        return renderChildGameState(this.props, [
            [ClaimVassalGameState, ClaimVassalComponent],
        ]);
    }
}
