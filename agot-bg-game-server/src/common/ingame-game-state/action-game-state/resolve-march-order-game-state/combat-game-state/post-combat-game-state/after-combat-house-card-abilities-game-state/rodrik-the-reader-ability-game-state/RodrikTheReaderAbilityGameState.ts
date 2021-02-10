import GameState from "../../../../../../../GameState";
import AfterCombatHouseCardAbilitiesGameState from "../AfterCombatHouseCardAbilitiesGameState";
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
import shuffle from "../../../../../../../../utils/shuffle";

export default class RodrikTheReaderAbilityGameState extends GameState<
    AfterCombatHouseCardAbilitiesGameState["childGameState"],
    SimpleChoiceGameState | SelectWesterosCardGameState<RodrikTheReaderAbilityGameState>
> {
    westerosCards: WesterosCard[];
    deckId: number;

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
            this.westerosCards = this.game.westerosDecks[choice-1];
            this.deckId = choice - 1;
            this.setChildGameState(new SelectWesterosCardGameState(this)).firstStart(house, this.westerosCards, this.deckId);
        }
    }

    onSelectWesterosCardFinish(house: House, westerosCard: WesterosCard, deckId: number): void {
        if (westerosCard == null) {
            return;
        }

        let westerosCards = this.game.westerosDecks[this.deckId].filter(wc => wc != westerosCard);
        westerosCards = shuffle([...westerosCards]);
        westerosCards.unshift(westerosCard);
        this.game.westerosDecks[this.deckId] = westerosCards;
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

    static deserializeFromServer(afterCombat: AfterCombatHouseCardAbilitiesGameState["childGameState"], data: SerializedRodrikTheReaderAbilityGameState): RodrikTheReaderAbilityGameState {
        const melisandreAbilityGameState = new RodrikTheReaderAbilityGameState(afterCombat);

        melisandreAbilityGameState.childGameState = melisandreAbilityGameState.deserializeChildGameState(data.childGameState);

        return melisandreAbilityGameState;
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
