import GameState from "../../../../GameState";
import Region from "../../../game-data-structure/Region";
import Player from "../../../Player";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import IngameGameState from "../../../IngameGameState";
import EntireGame from "../../../../EntireGame";
import House from "../../../game-data-structure/House";
import Game from "../../../game-data-structure/Game";
import SimpleChoiceGameState, { SerializedSimpleChoiceGameState } from "../../../simple-choice-game-state/SimpleChoiceGameState";
import { ship } from "../../../game-data-structure/unitTypes";
import BetterMap from "../../../../../utils/BetterMap";
import UnitType from "../../../game-data-structure/UnitType";
import Unit from "../../../game-data-structure/Unit";
import ResolveMarchOrderGameState from "../ResolveMarchOrderGameState";

export default class TakeControlOfEnemyPortGameState extends GameState<ResolveMarchOrderGameState, SimpleChoiceGameState> {
    port: Region;
    newController: House;
    lastHouseThatResolvedMarchOrder: House;

    get ingame(): IngameGameState {
        return this.parentGameState.ingameGameState;
    }

    get entireGame(): EntireGame {
        return this.parentGameState.entireGame;
    }

    get game(): Game {
        return this.ingame.game;
    }

    firstStart(port: Region, newController: House, lastHouseThatResolvedMarchOrder: House): void {
        if (!port.units.values.every(u => u.type == ship)) {
            throw new Error(`A non ship unit is present in ${port.name}`);
        }

        if (port.units.size == 0) {
            throw new Error("We should never reach this state if there are no ships to take")
        }

        this.port = port;
        this.newController = newController;
        this.lastHouseThatResolvedMarchOrder = lastHouseThatResolvedMarchOrder;

        const availableShips = this.game.getAvailableUnitsOfType(newController, ship);
        const choices: string[] = [];

        // Default option 0: convert no ship. Kill all
        choices.push("0");

        // Check the other choices against supply and available Units
        for (let i=1;i<=port.units.size;i++) {
            if(i > availableShips) {
                break;
            }

            const addedUnits = new BetterMap<Region, UnitType[]>();
            addedUnits.set(port, Array.from({length: i}, (v, k) => ship));

            if (!this.game.hasTooMuchArmies(newController, addedUnits)) {
                choices.push(i.toString());
            }
        }

        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(newController, "", choices);
    }

    onSimpleChoiceGameStateEnd(choice: number) {
        // Remove ships from old controller
        const oldController = this.port.units.values[0].allegiance;
        this.parentGameState.destroyAllShipsInPort(this.port);

        if(choice > 0) {
            // Add ships for new controller
            let shipsToAdd: Unit[] = [];
            for(let i=0;i<choice;i++) {
                shipsToAdd.push(this.game.createUnit(ship, this.newController));
            }

            shipsToAdd.forEach(ship => this.port.units.set(ship.id, ship));

            this.entireGame.broadcastToClients({
                type: "add-units",
                units: [[this.port.id, shipsToAdd.map(ship => ship.serializeToClient())]]
            });

            this.ingame.log({
                type: "enemy-port-taken",
                oldController: oldController.name,
                newController: this.newController.name,
                shipCount: shipsToAdd.length,
                port: this.port.name
            });
        }

        this.parentGameState.onTakeControlOfEnemyPortFinish(this.lastHouseThatResolvedMarchOrder);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedTakeControlOfEnemyPortGameState {
        return {
            type: "take-control-of-enemy-port",
            childGameState: this.childGameState.serializeToClient(admin, player),
            portId: this.port.id,
            newControllerId: this.newController.id,
            lastHouseThatResolvedMarchOrderId: this.lastHouseThatResolvedMarchOrder.id
        };
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(_message: ServerMessage): void {
    }

    static deserializeFromServer(parentGameState: ResolveMarchOrderGameState, data: SerializedTakeControlOfEnemyPortGameState): TakeControlOfEnemyPortGameState {
        const takeControlOfEnemyPortGameState = new TakeControlOfEnemyPortGameState(parentGameState);
        takeControlOfEnemyPortGameState.port = parentGameState.world.regions.get(data.portId);
        takeControlOfEnemyPortGameState.newController = parentGameState.game.houses.get(data.newControllerId);
        takeControlOfEnemyPortGameState.lastHouseThatResolvedMarchOrder = parentGameState.game.houses.get(data.newControllerId);
        takeControlOfEnemyPortGameState.childGameState = takeControlOfEnemyPortGameState.deserializeChildGameState(data.childGameState);
        return takeControlOfEnemyPortGameState;
    }

    deserializeChildGameState(data: SerializedTakeControlOfEnemyPortGameState["childGameState"]): SimpleChoiceGameState {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedTakeControlOfEnemyPortGameState {
    type: "take-control-of-enemy-port";
    childGameState: SerializedSimpleChoiceGameState;
    portId: string;
    newControllerId: string;
    lastHouseThatResolvedMarchOrderId: string;
}
