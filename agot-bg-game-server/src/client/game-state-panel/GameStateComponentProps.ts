import GameState from "../../common/GameState";
import GameClient from "../GameClient";
import MapControls from "../MapControls";

export default interface GameStateComponentProps<E extends GameState<any, any>> {
    gameClient: GameClient;
    mapControls: MapControls;
    gameState: E;
}
