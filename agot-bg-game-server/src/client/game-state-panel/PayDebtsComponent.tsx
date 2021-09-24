import { Component, ReactNode } from "react";
import { observer } from "mobx-react";
import renderChildGameState from "../utils/renderChildGameState";
import GameStateComponentProps from "./GameStateComponentProps";
import PayDebtsGameState from "../../common/ingame-game-state/pay-debts-game-state/PayDebtsGameState";
import ResolveSinglePayDebtGameState from "../../common/ingame-game-state/pay-debts-game-state/resolve-single-pay-debt-game-state/ResolveSinglePayDebtGameState";
import ResolveSinglePayDebtComponent from "./ResolveSinglePayDebtComponent";

@observer
export default class PayDebtsComponent extends Component<GameStateComponentProps<PayDebtsGameState>> {
    render(): ReactNode {
        return renderChildGameState(this.props, [
            [ResolveSinglePayDebtGameState, ResolveSinglePayDebtComponent]
        ]);
    }
}
