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
import WesterosDeck4GameState, { SerializedWesterosDeck4GameState } from "./westeros-deck-4-game-state/WesterosDeck4GameState";
import Region from "../game-data-structure/Region";
import TheBurdenOfPowerGameState, { SerializedTheBurdenOfPowerGameState } from "./the-burden-of-power-game-state/TheBurdenOfPowerGameState";
import ShiftingAmbitionsGameState, { SerializedShiftingAmbitionsGameState } from "./shifting-ambitions-game-state/ShiftingAmbitionsGameState";
import NewInformationGameState, { SerializedNewInformationGameState } from "./new-information-game-state/NewInformationGameState";

export default class WesterosGameState extends GameState<IngameGameState,
    WildlingsAttackGameState | ReconcileArmiesGameState<WesterosGameState> | MusteringGameState | ClashOfKingsGameState
    | PutToTheSwordGameState | AThroneOfBladesGameState | DarkWingsDarkWordsGameState | WesterosDeck4GameState
    | TheBurdenOfPowerGameState | ShiftingAmbitionsGameState | NewInformationGameState
> {
    revealAndResolveTop2WesterosDeck4Cards = false;
    revealedCards: WesterosCard[];
    @observable currentCardI = -1;
    /**
     * List of restrictions that will be applied to the planning phase.
     * Elements are added by WesterosCardType.
     */
    planningRestrictions: PlanningRestriction[] = [];

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

    firstStart(revealAndResolveTop2WesterosDeck4Cards = false): void {
        this.ingame.log({
            type: "westeros-phase-began"
        });

        this.revealAndResolveTop2WesterosDeck4Cards = revealAndResolveTop2WesterosDeck4Cards;
        this.revealedCards = [];

        if (!revealAndResolveTop2WesterosDeck4Cards) {
            // Reveal the top cards of each deck
            // Note: For the endless mode it doesn't make sense to execute Westeros deck 4 cards again!
            // Therefore we apply a hack here: If the drawn card is already discarded, we don't add it to the revealed cards array anymore,
            // which results then in only 3 revealed cards. This is absolutely non generic and only works because Westeros deck 4 is the last deck.
            // But this requires no additional code changes and as we don't expect a third edition of the game it is ok for now.
            // The better solution would be to have: "revealedCards: (WesterosCard | null)[]" but to fully support this we should
            // then change game.westerosDecks as well to allow nulls and this is too much for now.

            for (let i=0; i < this.game.westerosDecks.length; i++) {
                const deck = this.game.westerosDecks[i];
                const card = deck.shift() as WesterosCard;

                if (i != 3 || !card.discarded) {
                    card.discarded = true;
                    this.revealedCards.push(card);
                }

                // Burry the card at the bottom of the deck
                deck.push(card);
            }
        } else {
            // For A Dance with Mother of Dragons variant reveal top 2 WD 4 cards to add some loyalty tokens to the board
            for (let i=0; i < 2; i++) {
                const card = this.game.westerosDecks[3].shift() as WesterosCard;
                card.discarded = true;
                this.revealedCards.push(card);

                // Burry the card at the bottom of the deck
                this.game.westerosDecks[3].push(card);
            }
        }

        // Execute all immediately effects
        for(let i=0; i<this.revealedCards.length; i++) {
            this.revealedCards[i].type.executeImmediately(this, i);
        }

        this.ingame.broadcastWesterosDecks();

        this.currentCardI = -1;

        // Add the wildling strength of each card (Westeros deck 4 cards have no wildling icons, so we need no extra handling for revealAndResolveTop3WesterosDeck4Cards)
        const addedWildlingStrength = this.revealedCards.map(c => c.type.wildlingStrength).reduce(_.add, 0);

        this.ingame.log({
            type: "westeros-cards-drawn",
            westerosCardTypes: this.revealedCards.map(c => c.type.id),
            addedWildlingStrength: addedWildlingStrength,
            revealAndResolveTop3WesterosDeck4Cards: revealAndResolveTop2WesterosDeck4Cards
        });

        if (addedWildlingStrength > 0) {
            this.game.updateWildlingStrength(addedWildlingStrength);

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
        // Wildlings may force a player to remove a unit in an enemy home town.
        // If the enemy regains this castle, he might win the game.
        if (this.ingame.checkVictoryConditions()) {
            return;
        }

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

            this.executeCard(this.revealedCards[this.currentCardI]);
        } else {
            this.onWesterosGameStateFinish();
        }
    }

    onWesterosGameStateFinish(): void {
        // Some loyalty tokens may have appeared on areas with Targaryen units in it => Gain them now!
        this.ingame.gainLoyaltyTokens();
        if (this.ingame.checkVictoryConditions()) {
            return;
        }

        // We just forward the revealed cards if it was a normal Westeros phase
        // to show the Westeros cards during Planning phase as well.
        // This is helpful when all Westeros cards were resolved automatically,
        // e.g. Supply, GoT and Sea of Storms, and players dont need to check
        // the game log for this in live games all the time.
        // But that's why we pass an empty array for revealAndResolveTop2WesterosDeck4Cards.
        this.ingame.onWesterosGameStateFinish(this.planningRestrictions, !this.revealAndResolveTop2WesterosDeck4Cards ? this.revealedCards : []);
    }

    executeCard(card: WesterosCard): void {
        this.ingame.log({
            type: "westeros-card-executed",
            westerosCardType: card.type.id,
            westerosDeckI: !this.revealAndResolveTop2WesterosDeck4Cards ? this.currentCardI : 3
        });

        card.type.execute(this);
    }

    onWesterosCardEnd(): void {
        this.executeNextCard();
    }

    onMusteringGameStateEnd(): void {
        this.executeNextCard();
    }

    placeLoyaltyToken(region: Region): void {
        if (this.game.isLoyaltyTokenAvailable) {
            region.loyaltyTokens += 1;
            this.entireGame.broadcastToClients({
                type: "loyalty-token-placed",
                region: region.id,
                newLoyaltyTokenCount: region.loyaltyTokens
            });

            this.ingame.log({
                type: "loyalty-token-placed",
                region: region.id
            });
        } else {
            this.ingame.log({
                type: "no-loyalty-token-available",
                region: region.id
            });
        }
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedWesterosGameState {
        return {
            type: "westeros",
            revealAndResolveTop2WesterosDeck4Cards: this.revealAndResolveTop2WesterosDeck4Cards,
            revealedCardIds: this.revealedCards.map(c => c.id),
            currentCardI: this.currentCardI,
            planningRestrictions: this.planningRestrictions.map(pr => pr.id),
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(ingameGameState: IngameGameState, data: SerializedWesterosGameState): WesterosGameState {
        const westerosGameState = new WesterosGameState(ingameGameState);

        westerosGameState.currentCardI = data.currentCardI;
        westerosGameState.revealAndResolveTop2WesterosDeck4Cards = data.revealAndResolveTop2WesterosDeck4Cards;
        westerosGameState.revealedCards = !data.revealAndResolveTop2WesterosDeck4Cards
            ? data.revealedCardIds.map((cid, i) => getById(ingameGameState.game.westerosDecks[i], cid))
            : data.revealedCardIds.map((cid) => getById(ingameGameState.game.westerosDecks[3], cid));
        westerosGameState.childGameState = westerosGameState.deserializeChildGameState(data.childGameState);
        westerosGameState.planningRestrictions = data.planningRestrictions.map(prid => planningRestrictions.get(prid));

        return westerosGameState;
    }

    deserializeChildGameState(data: SerializedWesterosGameState["childGameState"]): WesterosGameState["childGameState"]
    {
        switch (data.type) {
            case "wildlings-attack":
                return WildlingsAttackGameState.deserializeFromServer(this, data);
            case "reconcile-armies":
                return ReconcileArmiesGameState.deserializeFromServer(this, data);
            case "mustering":
                    return MusteringGameState.deserializeFromServer(this, data);
            case "clash-of-kings":
                return ClashOfKingsGameState.deserializeFromServer(this, data);
            case "put-to-the-sword":
                return PutToTheSwordGameState.deserializeFromServer(this, data);
            case "a-throne-of-blades":
                return AThroneOfBladesGameState.deserializeFromServer(this, data);
            case "dark-wings-dark-words":
                return DarkWingsDarkWordsGameState.deserializeFromServer(this, data);
            case "westeros-deck-4":
                return WesterosDeck4GameState.deserializeFromServer(this, data);
            case "the-burden-of-power":
                return TheBurdenOfPowerGameState.deserializeFromServer(this, data);
            case "shifting-ambitions":
                return ShiftingAmbitionsGameState.deserializeFromServer(this, data);
            case "new-information":
                return NewInformationGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedWesterosGameState {
    type: "westeros";
    revealedCardIds: number[];
    currentCardI: number;
    planningRestrictions: string[];
    revealAndResolveTop2WesterosDeck4Cards: boolean;
    childGameState: SerializedWildlingsAttackGameState
        | SerializedReconcileArmiesGameState | SerializedMusteringGameState | SerializedClashOfKingsGameState
        | SerializedPutToTheSwordGameState | SerializedAThroneOfBladesGameState | SerializedDarkWingsDarkWordsGameState
        | SerializedWesterosDeck4GameState | SerializedTheBurdenOfPowerGameState | SerializedShiftingAmbitionsGameState
        | SerializedNewInformationGameState;
}
