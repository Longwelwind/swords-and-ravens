import User from "../../../server/User";
import BetterMap from "../../../utils/BetterMap";
import VoteType, { SerializedVoteType } from "./VoteType";
import IngameGameState from "../IngameGameState";
import { observable } from "mobx";
import House from "../game-data-structure/House";

export enum VoteState {
    ONGOING,
    ACCEPTED,
    REFUSED,
    CANCELLED
}

export default class Vote {
    ingame: IngameGameState;

    id: string;
    initiator: User;
    type: VoteType;
    @observable votes: BetterMap<House, boolean>;
    createdAt: Date;
    cancelled: boolean;

    get positiveCountToPass(): number {
        return Math.floor(this.ingame.players.size * 2 / 3);
    }

    get state(): VoteState {
        if (this.cancelled) {
            return VoteState.CANCELLED;
        }

        const positiveCount = this.votes.values.filter(v => v).length;
        const negativeCount = this.votes.values.filter(v => !v).length;

        if (positiveCount >= this.positiveCountToPass) {
            return VoteState.ACCEPTED;
        } else if (negativeCount > this.ingame.players.size - this.positiveCountToPass) {
            return VoteState.REFUSED;
        } else {
            return VoteState.ONGOING;
        }
    }

    constructor(
        ingame: IngameGameState, id: string, initiator: User, type: VoteType,
        votes: BetterMap<House, boolean> = new BetterMap(),
        createdAt = new Date(),
        cancelled = false
    ) {
        this.ingame = ingame;
        this.id = id;
        this.initiator = initiator;
        this.type = type;
        this.votes = votes;
        this.createdAt = createdAt;
        this.cancelled = cancelled;
    }

    checkVoteFinished(): void {
        if (this.state == VoteState.ACCEPTED) {
            this.type.executeAccepted(this);
        }
    }

    cancelVote(): void {
        this.cancelled = true;

        this.ingame.entireGame.broadcastToClients({
            type: "vote-cancelled",
            vote: this.id
        });
    }

    vote(choice: boolean): void {
        this.ingame.entireGame.sendMessageToServer({
            type: "vote",
            vote: this.id,
            choice: choice
        });
    }

    serializeToClient(): SerializedVote {
        return {
            id: this.id,
            initiator: this.initiator.id,
            type: this.type.serializeToClient(),
            createdAt: this.createdAt.getTime(),
            votes: this.votes.entries.map(([h, v]) => [h.id, v]),
            cancelled: this.cancelled
        };
    }

    static deserializeFromServer(ingame: IngameGameState, data: SerializedVote): Vote {
        const initiator = ingame.entireGame.users.get(data.initiator);

        const type = VoteType.deserializeFromServer(ingame, data.type);
        const votes = new BetterMap(data.votes.map(([hid, vote]) => {
            const house = ingame.game.houses.get(hid);
            return [house, vote];
        }));

        return new Vote(ingame, data.id, initiator, type, votes, new Date(data.createdAt), data.cancelled);
    }
}

export interface SerializedVote {
    id: string;
    initiator: string;
    type: SerializedVoteType;
    createdAt: number;
    votes: [string, boolean][];
    cancelled: boolean;
}