import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import GameClient from "./GameClient";
import { FormControl } from "react-bootstrap";
import IngameGameState, { NOTE_MAX_LENGTH } from "../common/ingame-game-state/IngameGameState";
import { observable } from "mobx";
import _ from "lodash";

interface NoteComponentProps {
    gameClient: GameClient;
    ingame: IngameGameState;
}

@observer
export default class NoteComponent extends Component<NoteComponentProps> {
    @observable note = this.props.gameClient.authenticatedUser?.note ?? "";

    render(): ReactNode {
        return (
            <>
                <FormControl
                    maxLength={NOTE_MAX_LENGTH}
                    as="textarea"
                    value={this.note}
                    onKeyUp={() => this.onNoteChange(this.note)}
                    onChange={e => this.note = e.target.value}
                    style={{height: "100%"}}
                    readOnly={this.props.gameClient.authenticatedPlayer == null}
                />
            </>
        );
    }

    onNoteChange = _.debounce((note: string) => {
        if (this.props.gameClient.authenticatedPlayer) {
            this.props.gameClient.authenticatedPlayer.user.note = note;
            this.props.ingame.updateNote(note);
        }
    }, 500, { trailing: true });
}