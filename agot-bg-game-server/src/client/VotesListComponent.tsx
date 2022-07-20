import React from "react";
import { Component, ReactNode } from "react";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import GameClient from "./GameClient";
import VoteComponent from "./VoteComponent";
import _ from "lodash";

interface VotesListComponentProps {
    ingame: IngameGameState;
    gameClient: GameClient;
}

export default class VotesListComponent extends Component<VotesListComponentProps> {
    render(): ReactNode {
        const votes = _.sortBy(this.props.ingame.votes.values, v => v.createdAt);

        return votes.map(v => <VoteComponent key={v.id} vote={v} gameClient={this.props.gameClient} ingame={this.props.ingame} />);
    }
}