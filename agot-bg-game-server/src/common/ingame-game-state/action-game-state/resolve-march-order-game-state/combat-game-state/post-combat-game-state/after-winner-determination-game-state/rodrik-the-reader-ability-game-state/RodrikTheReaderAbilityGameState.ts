import GameState from "../../../../../../../GameState";
import Player from "../../../../../../Player";
import {ClientMessage} from "../../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../../messages/ServerMessage";
import SelectWesterosCardGameState, {SerializedSelectWesterosCardGameState} from "../../../../../../select-westeros-card-game-state/SelectWesterosCardGameState";
import House from "../../../../../../game-data-structure/House";
import CombatGameState from "../../../CombatGameState";
import Game from "../../../../../../game-data-structure/Game";
import WesterosCard from "../../../../../../game-data-structure/westeros-card/WesterosCard";
import IngameGameState from "../../../../../../IngameGameState";
import SimpleChoiceGameState, { SerializedSimpleChoiceGameState } from "../../../../../../simple-choice-game-state/SimpleChoiceGameState";
import { rodrikTheReader } from "../../../../../../game-data-structure/house-card/houseCardAbilities";
import AfterWinnerDeterminationGameState from "../AfterWinnerDeterminationGameState";
import _ from "lodash";
import shuffleInPlace from "../../../../../../../../utils/shuffle";

export default class RodrikTheReaderAbilityGameState extends GameState<
    AfterWinnerDeterminationGameState["childGameState"],
    SimpleChoiceGameState | SelectWesterosCardGameState<RodrikTheReaderAbilityGameState>
> {
    get game(): Game {
        return this.combat().game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.parentGameState.parentGameState.ingameGameState;
    }

    combat(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    firstStart(house: House): void {
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
            house,
            "",
            ["Ignore", "First", "Second", "Third"]
        );
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const house = this.childGameState.house;
        if (choice == 0) {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: rodrikTheReader.id
            });
            this.parentGameState.onHouseCardResolutionFinish(house);
        }
        else {
            this.setChildGameState(new SelectWesterosCardGameState(this)).firstStart(house, choice-1);
        }
    }

    onSelectWesterosCardFinish(house: House, westerosCard: WesterosCard | null, deckId: number): void {
        if (westerosCard == null) {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: rodrikTheReader.id
            });

            this.parentGameState.onHouseCardResolutionFinish(house);
            return;
        }

        const westerosDeck = this.game.westerosDecks[deckId];
        const discardedCards = westerosDeck.filter(wc => wc.discarded);
        const unusedCards = shuffleInPlace(westerosDeck.filter(wc => wc != westerosCard && !wc.discarded));
        unusedCards.unshift(westerosCard);
        const newWesterosDeck = _.concat(unusedCards, discardedCards);
        if (westerosDeck.length != newWesterosDeck.length) {
            throw new Error(`Westeros deck ${deckId} is corrupt`);
        }
        this.game.westerosDecks[deckId] = newWesterosDeck;
        // Broadcast manipulated deck for "CoK Westeros Phase Variant"
        this.ingame.broadcastWesterosDecks();
        this.ingame.log({
            type: "rodrik-the-reader-used",
            house: house.id,
            westerosDeckI: deckId
        });
        this.parentGameState.onHouseCardResolutionFinish(house);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedRodrikTheReaderAbilityGameState {
        return {
            type: "rodrik-the-reader-ability",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(afterWinner: AfterWinnerDeterminationGameState["childGameState"], data: SerializedRodrikTheReaderAbilityGameState): RodrikTheReaderAbilityGameState {
        const rodrikTheReaderAbilityGameState = new RodrikTheReaderAbilityGameState(afterWinner);

        rodrikTheReaderAbilityGameState.childGameState = rodrikTheReaderAbilityGameState.deserializeChildGameState(data.childGameState);

        return rodrikTheReaderAbilityGameState;
    }

    deserializeChildGameState(data: SerializedRodrikTheReaderAbilityGameState["childGameState"]): SelectWesterosCardGameState<RodrikTheReaderAbilityGameState> | SimpleChoiceGameState {
        switch (data.type) {
            case "simple-choice":
                return SimpleChoiceGameState.deserializeFromServer(this, data);
            case "select-westeros-card":
                return SelectWesterosCardGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedRodrikTheReaderAbilityGameState {
    type: "rodrik-the-reader-ability";
    childGameState: SerializedSimpleChoiceGameState | SerializedSelectWesterosCardGameState;
}
