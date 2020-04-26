import {observable} from "mobx";
import EntireGame from "./EntireGame";
import User from "../server/User";

type AnyGameState = GameState<any, any> | null;

export default class GameState<ParentGameState extends AnyGameState, ChildGameState extends AnyGameState = null> {
    @observable parentGameState: ParentGameState;
    @observable childGameState: ChildGameState;

    needsToBeTransmittedToClient = false;

    get entireGame(): EntireGame {
        if (this instanceof EntireGame) {
            return this;
        } else if (this.parentGameState) {
            return this.parentGameState.entireGame;
        } else {
            throw new Error();
        }
    }

    get leafState(): GameState<any, any> {
        return this.childGameState ? this.childGameState.leafState : this;
    }

    constructor(parentGameState: ParentGameState) {
        this.parentGameState = parentGameState;
    }

    getChildGameState<GS extends GameState<any, any>>(gameState: any): GS {
        if (this instanceof gameState) {
            // @ts-ignore
            return this as GS;
        } else {
            if (this.childGameState) {
                return this.childGameState.getChildGameState(gameState);
            } else {
                throw new Error(`No childGameState of type ${gameState.constructor.name}`);
            }
        }
    }

    hasChildGameState(gameState: any): boolean {
        return this instanceof gameState
            ? true
            : this.childGameState
                ? this.childGameState.hasChildGameState(gameState)
                : false;
    }

    getWaitedUsers(): User[] {
        if (this.childGameState) {
            return this.childGameState.getWaitedUsers();
        } else {
            throw new Error("getWaitedUsers should be overriden for leaf state");
        }
    }

    setChildGameState<E extends Exclude<ChildGameState, null>>(childGameState: E): E {
        this.childGameState = childGameState;
        this.childGameState.needsToBeTransmittedToClient = true;

        return childGameState;
    }

    getGameStateNthLevelDown(level: number): GameState<any, any> {
        if (level == 0) {
            return this;
        }

        if (this.childGameState) {
            return this.childGameState.getGameStateNthLevelDown(level - 1);
        } else {
            throw new Error();
        }
    }

    getFirstGameStateToBeRetransmitted(): {level: number; gameState: GameState<any, any> | null} {
        if (this.needsToBeTransmittedToClient) {
            return {level: 0, gameState: this};
        } else {
            if (this.childGameState) {
                const {level, gameState} = this.childGameState.getFirstGameStateToBeRetransmitted();
                if (gameState) {
                    return {level: level + 1, gameState};
                } else {
                    return {level, gameState};
                }
            } else {
                return {level: -1, gameState: null};
            }
        }
    }

    deserializeChildGameState(_data: any): ChildGameState {
        throw new Error(`"deserializeChildGameState" is not defined for class "${this.constructor.name}"`);
    }
}

export interface SerializedGameState {
    childGameState?: SerializedGameState;
}
