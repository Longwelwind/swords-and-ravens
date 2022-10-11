import GameState from "../../GameState";
import Region from "../game-data-structure/Region";
import Player from "../Player";
import {ServerMessage} from "../../../messages/ServerMessage";
import {ClientMessage} from "../../../messages/ClientMessage";
import IngameGameState from "../IngameGameState";
import EntireGame from "../../EntireGame";
import House from "../game-data-structure/House";
import Game from "../game-data-structure/Game";
import SimpleChoiceGameState, { SerializedSimpleChoiceGameState } from "../simple-choice-game-state/SimpleChoiceGameState";
import { ship } from "../game-data-structure/unitTypes";
import BetterMap from "../../../utils/BetterMap";
import UnitType from "../game-data-structure/UnitType";
import Unit from "../game-data-structure/Unit";
import { destroyAllShipsInPort } from "../port-helper/PortHelper";
import ActionGameState from "../action-game-state/ActionGameState";

interface ParentGameState extends GameState<any, any> {
    ingame: IngameGameState;
    action: ActionGameState | null;

    onTakeControlOfEnemyPortFinish(previousHouse: House | null): void;
}

export default class TakeControlOfEnemyPortGameState extends GameState<ParentGameState, SimpleChoiceGameState> {
    port: Region;
    newController: House;
    previousHouse: House | null;

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    get entireGame(): EntireGame {
        return this.parentGameState.entireGame;
    }

    get game(): Game {
        return this.ingame.game;
    }

    firstStart(port: Region, newController: House, previousHouse: House | null = null): void {
        if (!port.units.values.every(u => u.type == ship)) {
            throw new Error(`A non ship unit is present in ${port.name}`);
        }

        if (port.units.size == 0) {
            throw new Error("We should never reach this state if there are no ships to take")
        }

        this.port = port;
        this.newController = newController;
        this.previousHouse = previousHouse;

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
            addedUnits.set(port, Array.from({length: i}, () => ship));

            if (!this.game.hasTooMuchArmies(newController, addedUnits)) {
                choices.push(i.toString());
            }
        }

        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(newController, "", choices);
    }

    onSimpleChoiceGameStateEnd(choice: number, resolvedAutomatically: boolean): void {
        // Remove ships from old controller
        const oldController = this.port.units.values[0].allegiance;
        destroyAllShipsInPort(this.port, this.ingame, this.parentGameState.action, choice == 0);

        if(choice > 0) {
            // Add ships for new controller
            const shipsToAdd: Unit[] = [];
            for(let i=0;i<choice;i++) {
                shipsToAdd.push(this.game.createUnit(this.port, ship, this.newController));
            }

            shipsToAdd.forEach(ship => this.port.units.set(ship.id, ship));

            this.entireGame.broadcastToClients({
                type: "add-units",
                regionId: this.port.id,
                units: shipsToAdd.map(ship => ship.serializeToClient()),
                isTransform: true
            });
        }

        this.ingame.log({
            type: "enemy-port-taken",
            oldController: oldController.id,
            newController: this.newController.id,
            shipCount: choice,
            port: this.port.id,
        }, resolvedAutomatically);

        this.parentGameState.onTakeControlOfEnemyPortFinish(this.previousHouse);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedTakeControlOfEnemyPortGameState {
        return {
            type: "take-control-of-enemy-port",
            childGameState: this.childGameState.serializeToClient(admin, player),
            portId: this.port.id,
            newControllerId: this.newController.id,
            previousHouseId: this.previousHouse ? this.previousHouse.id : null
        };
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(_message: ServerMessage): void {
    }

    static deserializeFromServer(parentGameState: ParentGameState, data: SerializedTakeControlOfEnemyPortGameState): TakeControlOfEnemyPortGameState {
        const takeControlOfEnemyPortGameState = new TakeControlOfEnemyPortGameState(parentGameState);
        takeControlOfEnemyPortGameState.port = parentGameState.ingame.world.regions.get(data.portId);
        takeControlOfEnemyPortGameState.newController = parentGameState.ingame.game.houses.get(data.newControllerId);
        takeControlOfEnemyPortGameState.previousHouse = data.previousHouseId ? parentGameState.ingame.game.houses.get(data.previousHouseId) : null;
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
    previousHouseId: string | null;
}
