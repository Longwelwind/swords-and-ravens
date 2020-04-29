import GameState from "../../GameState";
import IngameGameState from "../IngameGameState";
import WesterosCard from "../game-data-structure/westeros-card/WesterosCard";
import Game, {MAX_WILDLING_STRENGTH} from "../game-data-structure/Game";
import World from "../game-data-structure/World";
import {observable} from "mobx";
import getById from "../../../utils/getById";
import Player from "../Player";
import EntireGame from "../../EntireGame";
import * as _ from "lodash";
import WildlingsAttackGameState, {SerializedWildlingsAttackGameState} from "./wildlings-attack-game-state/WildlingsAttackGameState";
import {ClientMessage} from "../../../messages/ClientMessage";
import {ServerMessage} from "../../../messages/ServerMessage";
import ReconcileArmiesGameState, {SerializedReconcileArmiesGameState} from "./reconcile-armies-game-state/ReconcileArmiesGameState";
import MusteringGameState, {SerializedMusteringGameState} from "./mustering-game-state/MusteringGameState";
import ClashOfKingsGameState, {SerializedClashOfKingsGameState} from "./clash-of-kings-game-state/ClashOfKingsGameState";
import PlanningRestriction from "../game-data-structure/westeros-card/planning-restriction/PlanningRestriction";
import planningRestrictions from "../game-data-structure/westeros-card/planning-restriction/planningRestrictions";
import PutToTheSwordGameState, {SerializedPutToTheSwordGameState} from "./put-to-the-swords-game-state/PutToTheSwordGameState";
import AThroneOfBladesGameState, {SerializedAThroneOfBladesGameState} from "./thrones-of-blades-game-state/AThroneOfBladesGameState";
import DarkWingsDarkWordsGameState, {SerializedDarkWingsDarkWordsGameState} from "./dark-wings-dark-words-game-state/DarkWingsDarkWordsGameState";
import shuffle from "../../../utils/shuffle";

export default class WesterosGameState extends GameState<IngameGameState,
    WildlingsAttackGameState | ReconcileArmiesGameState<WesterosGameState> | MusteringGameState | ClashOfKingsGameState
    | PutToTheSwordGameState | AThroneOfBladesGameState | DarkWingsDarkWordsGameState
> {
    revealedCards: WesterosCard[];
    @observable currentCardI = -1;
    /**
     * List of restrictions that will be applied to the planning phase.
     * Elements are added by WesterosCardType.
     */
    planningRestrictions: PlanningRestriction[] = [];

    get currentCard(): WesterosCard {
        return this.revealedCards[this.currentCardI];
    }

    get ingame(): IngameGameState {
        return this.parentGameState;
    }

    get game(): Game {
        return this.ingame.game;
    }

    get world(): World {
        return this.game.world;
    }

    get entireGame(): EntireGame {
        return this.ingame.entireGame;
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "proceed-westeros-card") {
            this.currentCardI = message.currentCardI;
        } else {
            this.childGameState.onServerMessage(message);
        }
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedWesterosGameState {
        return {
            type: "westeros",
            revealedCardIds: this.revealedCards.map(c => c.id),
            currentCardI: this.currentCardI,
            planningRestrictions: this.planningRestrictions.map(pr => pr.id),
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    firstStart(): void {
        this.ingame.log({
            type: "westeros-phase-began"
        });

        // Reveal the top cards of each deck
        this.revealedCards = this.game.westerosDecks.map(deck => {
            const card = deck.shift() as WesterosCard;

            card.discarded = true;

            // Burry the card at the bottom of the deck
            deck.push(card);

            return card;
        });

        // Execute all immediately effects
        for(let i=0; i<this.game.westerosDecks.length; i++) {
            this.revealedCards[i].type.executeImmediately(this, i);
        }

        this.entireGame.broadcastToClients({
            type: "update-westeros-decks",
            westerosDecks: this.game.westerosDecks.map(wd => shuffle([...wd]).map(wc => wc.serializeToClient()))
        });

        this.currentCardI = -1;

        // Add the wildling strength of each card
        const addedWildlingStrength = this.revealedCards.map(c => c.type.wildlingStrength).reduce(_.add, 0);

        this.ingame.log({
            type: "westeros-cards-drawn",
            westerosCardTypes: this.revealedCards.map(c => c.type.id),
            addedWildlingStrength: addedWildlingStrength
        });


        if (addedWildlingStrength > 0) {
            this.game.wildlingStrength = Math.max(0, Math.min(this.game.wildlingStrength + addedWildlingStrength, MAX_WILDLING_STRENGTH));

            this.entireGame.broadcastToClients({
                type: "change-wildling-strength",
                wildlingStrength: this.game.wildlingStrength
            });

            if (this.game.wildlingStrength == MAX_WILDLING_STRENGTH) {
                // Trigger a wildlings attack
                this.ingame.log({
                    type: "wildling-strength-trigger-wildlings-attack",
                    wildlingStrength: this.game.wildlingStrength
                });

                this.triggerWildlingsAttack();
                return;
            }
        }

        this.executeNextCard();
    }


    triggerWildlingsAttack(): void {
        this.setChildGameState(new WildlingsAttackGameState(this)).firstStart(this.game.wildlingStrength, this.game.houses.values);
    }

    onWildlingsAttackGameStateEnd(): void {
        this.executeNextCard();
    }

    onReconcileArmiesGameStateEnd(): void {
        this.onWesterosCardEnd();
    }

    executeNextCard(): void {
        if (this.currentCardI < this.revealedCards.length - 1) {
            this.currentCardI++;

            this.entireGame.broadcastToClients({
                type: "proceed-westeros-card",
                currentCardI: this.currentCardI
            });

            this.executeCard(this.currentCard);
        } else {
            // Last card processed, go to next phase
            this.ingame.onWesterosGameStateFinish(this.planningRestrictions);
        }
    }

    executeCard(card: WesterosCard): void {
        this.ingame.log({
            type: "westeros-card-executed",
            westerosCardType: card.type.id,
            westerosDeckI: this.currentCardI
        });

        card.type.execute(this);
    }

    onWesterosCardEnd(): void {
        this.executeNextCard();
    }

    onMusteringGameStateEnd(): void {
        this.executeNextCard();
    }

    static deserializeFromServer(ingameGameState: IngameGameState, data: SerializedWesterosGameState): WesterosGameState {
        const westerosGameState = new WesterosGameState(ingameGameState);

        westerosGameState.currentCardI = data.currentCardI;
        westerosGameState.revealedCards = data.revealedCardIds.map((cid, i) => getById(ingameGameState.game.westerosDecks[i], cid));
        westerosGameState.childGameState = westerosGameState.deserializeChildGameState(data.childGameState);
        westerosGameState.planningRestrictions = data.planningRestrictions.map(prid => planningRestrictions.get(prid));

        return westerosGameState;
    }

    deserializeChildGameState(data: SerializedWesterosGameState["childGameState"]): WesterosGameState["childGameState"]
    {
        if (data.type == "wildlings-attack") {
            return WildlingsAttackGameState.deserializeFromServer(this, data);
        } else if (data.type == "reconcile-armies") {
            return ReconcileArmiesGameState.deserializeFromServer(this, data);
        } else if (data.type == "mustering") {
            return MusteringGameState.deserializeFromServer(this, data);
        } else if (data.type == "clash-of-kings") {
            return ClashOfKingsGameState.deserializeFromServer(this, data);
        } else if (data.type == "put-to-the-sword") {
            return PutToTheSwordGameState.deserializeFromServer(this, data);
        } else if (data.type == "a-throne-of-blades") {
            return AThroneOfBladesGameState.deserializeFromServer(this, data);
        } else if (data.type == "dark-wings-dark-words") {
            return DarkWingsDarkWordsGameState.deserializeFromServer(this, data);
        } else  {
            throw new Error();
        }
    }
}

export interface SerializedWesterosGameState {
    type: "westeros";
    revealedCardIds: number[];
    currentCardI: number;
    planningRestrictions: string[];
    childGameState: SerializedWildlingsAttackGameState
        | SerializedReconcileArmiesGameState | SerializedMusteringGameState | SerializedClashOfKingsGameState
        | SerializedPutToTheSwordGameState | SerializedAThroneOfBladesGameState | SerializedDarkWingsDarkWordsGameState;
}
