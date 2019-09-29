import CombatGameState from "../CombatGameState";
import GameState from "../../../../../GameState";
import Unit from "../../../../game-data-structure/Unit";
import Region from "../../../../game-data-structure/Region";
import Player from "../../../../Player";
import {ServerMessage} from "../../../../../../messages/ServerMessage";
import {ClientMessage} from "../../../../../../messages/ClientMessage";
import IngameGameState from "../../../../IngameGameState";
import EntireGame from "../../../../../EntireGame";
import SelectUnitsGameState, {SerializedSelectUnitsGameState} from "../../../../select-units-game-state/SelectUnitsGameState";
import House from "../../../../game-data-structure/House";
import Game from "../../../../game-data-structure/Game";

export default class ChooseCasualtiesGameState extends GameState<CombatGameState, SelectUnitsGameState<ChooseCasualtiesGameState>> {

    get combatGameState(): CombatGameState {
        return this.parentGameState;
    }

    get ingameGameState(): IngameGameState {
        return this.combatGameState.ingameGameState;
    }

    get entireGame(): EntireGame {
        return this.combatGameState.entireGame;
    }

    get game(): Game {
        return this.ingameGameState.game;
    }

    firstStart(house: House, possibleCasualties: Unit[], casualties: number): void {
        this.setChildGameState(new SelectUnitsGameState(this)).firstStart(house, possibleCasualties, casualties);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedChooseCasualtiesGameState {
        return {
            type: "choose-casualties",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onSelectUnitsEnd(_house: House, selectedUnits: [Region, Unit[]][]): void {
        const [region, units] = selectedUnits[0];

        this.combatGameState.onChooseCasualtiesGameStateEnd(region, units);
    }

    onServerMessage(_message: ServerMessage): void {

    }

    getPhaseName(): string {
        return "Choose casualties";
    }

    static deserializeFromServer(combatGameState: CombatGameState, data: SerializedChooseCasualtiesGameState): ChooseCasualtiesGameState {
        const chooseCasualtiesGameState = new ChooseCasualtiesGameState(combatGameState);

        chooseCasualtiesGameState.childGameState = chooseCasualtiesGameState.deserializeChildGameState(data.childGameState);

        return chooseCasualtiesGameState;
    }

    deserializeChildGameState(data: SerializedChooseCasualtiesGameState["childGameState"]): ChooseCasualtiesGameState["childGameState"] {
        return SelectUnitsGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedChooseCasualtiesGameState {
    type: "choose-casualties";
    childGameState: SerializedSelectUnitsGameState;
}
