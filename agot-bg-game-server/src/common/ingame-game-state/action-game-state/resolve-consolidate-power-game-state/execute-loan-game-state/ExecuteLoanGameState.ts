import IngameGameState from "../../../../../common/ingame-game-state/IngameGameState";
import GameState from "../../../../../common/GameState";
import ResolveConsolidatePowerGameState from "../ResolveConsolidatePowerGameState";
import LoanCardType from "../../../../../common/ingame-game-state/game-data-structure/loan-card/LoanCardType";
import Game from "../../../../../common/ingame-game-state/game-data-structure/Game";
import House from "../../../../../common/ingame-game-state/game-data-structure/House";
import Player from "../../../../../common/ingame-game-state/Player";
import { ClientMessage } from "../../../../../messages/ClientMessage";
import { ServerMessage } from "../../../../../messages/ServerMessage";
import loanCardTypes, { expertArtificer, fullHost, loyalMaester, masterAtArms, pyromancer, savvySteward, seaRaiders, siegeEngineers, theFacelessMen, vanguardCavalry } from "../../../../../common/ingame-game-state/game-data-structure/loan-card/loanCardTypes";
import { footman, knight, ship, siegeEngine } from "../../../../../common/ingame-game-state/game-data-structure/unitTypes";
import PlaceSellswordsGameState, { SerializedPlaceSellswordsGameState } from "./place-sellwords-game-state/PlaceSellswordsGameState";
import TheFacelessMenGameState, { SerializedTheFacelessMenGameState } from "./the-faceless-men-game-state/TheFacelessMenGameState";
import PyromancerGameState, { SerializedPyromancerGameState } from "./pyromancer-game-state/PyromancerGameState";
import ExpertArtificerGameState, { SerializedExpertArtificerGameState } from "./expert-artificer-game-state/ExpertArtificerGameState";
import LoyalMaesterGameState, { SerializedLoyalMaesterGameState } from "./loyal-maester-game-state/LoyalMaesterGameState";
import MasterAtArmsGameState, { SerializedMasterAtArmsGameState } from "./master-at-arms-game-state/MasterAtArmsGameState";
import SavvyStewardGameState, { SerializedSavvyStewardGameState } from "./savvy-steward-game-state/SavvyStewardGameState";

export default class ExecuteLoanGameState extends GameState<ResolveConsolidatePowerGameState,
    PlaceSellswordsGameState | TheFacelessMenGameState | PyromancerGameState | ExpertArtificerGameState | LoyalMaesterGameState
    | MasterAtArmsGameState | SavvyStewardGameState> {
    loanCardType: LoanCardType;

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    get game(): Game {
        return this.ingame.game;
    }

    firstStart(house: House, loan: LoanCardType): void {
        if (!this.game.ironBank) {
            this.onExecuteLoanFinish(house);
            return;
        }

        this.loanCardType = loan;

        switch(loan.id) {
            case siegeEngineers.id:
                this.setChildGameState(new PlaceSellswordsGameState(this)).firstStart(house, [footman, siegeEngine, siegeEngine]);
                break;
            case seaRaiders.id:
                this.setChildGameState(new PlaceSellswordsGameState(this)).firstStart(house, [footman, ship, ship, ship]);
                break;
            case vanguardCavalry.id:
                this.setChildGameState(new PlaceSellswordsGameState(this)).firstStart(house, [knight, knight, knight]);
                break;
            case fullHost.id:
                this.setChildGameState(new PlaceSellswordsGameState(this)).firstStart(house, [footman, knight, siegeEngine, ship]);
                break;
            case theFacelessMen.id:
                this.setChildGameState(new TheFacelessMenGameState(this)).firstStart(house);
                break;
            case pyromancer.id:
                this.setChildGameState(new PyromancerGameState(this)).firstStart(house);
                break;
            case expertArtificer.id:
                this.setChildGameState(new ExpertArtificerGameState(this)).firstStart(house);
                break;
            case loyalMaester.id:
                this.setChildGameState(new LoyalMaesterGameState(this)).firstStart(house);
                break;
            case masterAtArms.id:
                this.setChildGameState(new MasterAtArmsGameState(this)).firstStart(house);
                break;
            case savvySteward.id:
                this.setChildGameState(new SavvyStewardGameState(this)).firstStart(house);
                break;
            default:
                this.onExecuteLoanFinish(house);
        }
    }

    onExecuteLoanFinish(house: House): void {
        this.parentGameState.proceedNextResolve(house);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedExecuteLoanGameState {
        return {
            type: "execute-loan",
            loanCardType: this.loanCardType.id,
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(resolveConsolidatePower: ResolveConsolidatePowerGameState, data: SerializedExecuteLoanGameState): ExecuteLoanGameState {
        const gameState = new ExecuteLoanGameState(resolveConsolidatePower);

        gameState.loanCardType = loanCardTypes.get(data.loanCardType);
        gameState.childGameState = gameState.deserializeChildGameState(data.childGameState);

        return gameState;
    }

    deserializeChildGameState(data: SerializedExecuteLoanGameState["childGameState"]): ExecuteLoanGameState["childGameState"] {
        if (data.type == "place-sellswords") {
            return PlaceSellswordsGameState.deserializeFromServer(this, data);
        } else if (data.type == "the-faceless-men") {
            return TheFacelessMenGameState.deserializeFromServer(this, data);
        } else if (data.type == "pyromancer") {
            return PyromancerGameState.deserializeFromServer(this, data);
        } else if (data.type == "expert-artificer") {
            return ExpertArtificerGameState.deserializeFromServer(this, data);
        } else if (data.type == "loyal-maester") {
            return LoyalMaesterGameState.deserializeFromServer(this, data);
        } else if (data.type == "master-at-arms") {
            return MasterAtArmsGameState.deserializeFromServer(this, data);
        } else if (data.type == "savvy-steward") {
            return SavvyStewardGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedExecuteLoanGameState {
    type: "execute-loan";
    loanCardType: string;
    childGameState: SerializedPlaceSellswordsGameState | SerializedTheFacelessMenGameState | SerializedPyromancerGameState
        | SerializedExpertArtificerGameState | SerializedLoyalMaesterGameState | SerializedMasterAtArmsGameState | SerializedSavvyStewardGameState;
}
