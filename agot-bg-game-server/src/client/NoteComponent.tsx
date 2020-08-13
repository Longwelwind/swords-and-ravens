import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import GameClient from "./GameClient";
import { FormControl } from "react-bootstrap";
import IngameGameState, { NOTE_MAX_LENGTH } from "../common/ingame-game-state/IngameGameState";
import Player from "../common/ingame-game-state/Player";

interface NoteComponentProps {
    gameClient: GameClient;
    ingame: IngameGameState;
}

@observer
export default class NoteComponent extends Component<NoteComponentProps> {
    render(): ReactNode {
        return (
            <>
                <FormControl
                    maxLength={NOTE_MAX_LENGTH}
                    as="textarea"
                    value={(this.props.gameClient.authenticatedPlayer as Player).note}
                    onChange={(e: any) => this.onNoteChange(e.target.value)}
                    style={{height: "100%"}}
                />
            </>
        );
    }

    onNoteChange(note: string): void {
        (this.props.gameClient.authenticatedPlayer as Player).note = note;
        this.props.ingame.updateNote(note);
    }
}