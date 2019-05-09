import {Component, ReactNode} from "react";
import GameClient from "../GameClient";
import MapControls from "../MapControls";
import GameState from "../../common/GameState";
import * as React from "react";

export default function renderChildGameState<E extends GameState<any, any>>(
    props: {gameClient: GameClient; mapControls: MapControls; gameState: E},
    possibleChild: [any, typeof Component][]
): ReactNode {
    const childEntry = possibleChild.find(([GameStateClass, ComponentClass]) => props.gameState.childGameState instanceof GameStateClass);

    if (!childEntry) {
        throw new Error(`Couldn't find childGameState of type ${props.gameState.childGameState.constructor.name}`);
    }

    const [GameStateClass, ComponentClass] = childEntry;

    return <ComponentClass gameClient={props.gameClient} mapControls={props.mapControls} gameState={props.gameState.childGameState} />;
}
