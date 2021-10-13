import WesterosGameState from "../WesterosGameState";
import GameState from "../../../GameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../simple-choice-game-state/SimpleChoiceGameState";
import Game from "../../game-data-structure/Game";
import Player from "../../Player";
import {ClientMessage} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";
import IngameGameState from "../../IngameGameState";
import House from "../../game-data-structure/House";
import BetterMap from "../../../../utils/BetterMap";
import Region from "../../game-data-structure/Region";
import popRandom from "../../../../utils/popRandom";
import WesterosCardType from "../../game-data-structure/westeros-card/WesterosCardType";
import ChooseRegionForLoyaltyTokenGameState, { SerializedChooseRegionForLoyaltyTokenGameState } from "./choose-region-for-loyalty-token-game-state/ChooseRegionForLoyaltyTokenGameState";
import { domesticDisputes, emptyPromises, fireMadeFlesh, playingWithFire, scatteringDissent, southronAmbitions, strongholdsOfResistance, theLongPlan, wateringTheSeed, wordSpreadsQuickly } from "../../game-data-structure/westeros-card/westerosCardTypes";
import ChooseMultipleRegionsForLoyaltyTokenGameState, { SerializedChooseMultipleRegionsForLoyaltyTokenGameState } from "./choose-multiple-regions-for-loyalty-token-game-state/ChooseMultipleRegionsForLoyaltyTokenGameState";
import FireMadeFleshGameState, { SerializedFireMadeFleshGameState } from "./fire-made-flesh-game-state/FireMadeFleshGameState";
import PlayingWithFireGameState, { SerializedPlayingWithFireGameState } from "./playing-with-fire-game-state/PlayingWithFireGameState";
import TheLongPlanGameState, { SerializedTheLongPlanGameState } from "./the-long-plan-game-state/TheLongPlanGameState";
import MoveLoyaltyTokensGameState, { SerializedMoveLoyaltyTokensGameState } from "./move-loyalty-tokens-game-state/MoveLoyaltyTokensGameState";

// Keep SimpleChoice as possible child game state for now to not migrate the running games.
// Todo: Remove this at some point
export default class WesterosDeck4GameState extends GameState<WesterosGameState,
    SimpleChoiceGameState | ChooseRegionForLoyaltyTokenGameState | ChooseMultipleRegionsForLoyaltyTokenGameState
    | FireMadeFleshGameState | PlayingWithFireGameState | TheLongPlanGameState | MoveLoyaltyTokensGameState> {
    possbileRegionForLoyaltyToken?: Region;
    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    firstStart(type: WesterosCardType): void {
        if (this.ingame.isHouseDefeated(this.game.targaryen) || !this.game.targaryen || this.ingame.isVassalHouse(this.game.targaryen)) {
            this.parentGameState.onWesterosCardEnd();
            return;
        }

        switch(type.id) {
            case emptyPromises.id:
            case southronAmbitions.id:
            case strongholdsOfResistance.id: {
                const regions = type.choosableLoyaltyTokenRegions.map(rid => this.parentGameState.world.regions.get(rid));
                this.setChildGameState(new ChooseRegionForLoyaltyTokenGameState(this)).firstStart(this.game.targaryen, regions);
                break;
            }
            case domesticDisputes.id: {
                const regions = this.game.world.westerosLandRegions.filter(r => r.superControlPowerToken != null);
                this.setChildGameState(new ChooseMultipleRegionsForLoyaltyTokenGameState(this)).firstStart(
                    this.game.targaryen, 1, regions, 4, "House Targaryen may place loyalty\xa0tokens in up to 4 capitals.");
                break;
            }
            case wateringTheSeed.id: {
                const regions = this.game.world.regionsAdjacentToARiver.filter(r => r.getController() != this.game.targaryen);
                this.setChildGameState(new ChooseMultipleRegionsForLoyaltyTokenGameState(this)).firstStart(
                    this.game.targaryen,
                    this.game.getVictoryPoints(this.game.targaryen),
                    regions,
                    2,
                    "House Targaryen may place up to 2 loyalty\xa0tokens in regions adjacent to a river.");
                break;
            }
            case fireMadeFlesh.id: {
                this.setChildGameState(new FireMadeFleshGameState(this)).firstStart(this.game.targaryen);
                break;
            }
            case playingWithFire.id: {
                this.setChildGameState(new PlayingWithFireGameState(this)).firstStart(this.game.targaryen);
                break;
            }
            case theLongPlan.id: {
                this.setChildGameState(new TheLongPlanGameState(this)).firstStart(this.game.targaryen);
                break;
            }
            case wordSpreadsQuickly.id: {
                const resolveOrder = this.game.getTurnOrder().filter(h => !this.ingame.isVassalHouse(h));
                this.setChildGameState(new MoveLoyaltyTokensGameState(this)).firstStart(resolveOrder, 2, null);
                break;
            }
            case scatteringDissent.id: {
                const resolveOrder = this.game.getTurnOrder().filter(h => !this.ingame.isVassalHouse(h)).reverse();
                this.setChildGameState(new MoveLoyaltyTokensGameState(this)).firstStart(resolveOrder, 1, null);
                break;
            }
            default:
                this.parentGameState.onWesterosCardEnd();
        }
    }

    getChoices(house: House): BetterMap<string, number> {
        const result = new BetterMap<string, number>();
        result.set("Ignore", 0);
        if (house.powerTokens <= 0) {
            return result;
        }

        const available = this.ingame.game.isLoyaltyTokenAvailable;

        if (this.possbileRegionForLoyaltyToken && available) {
            result.set(`Discard 1 Power token to place a loyalty\xa0token in ${this.possbileRegionForLoyaltyToken.name}`, 1);
        }

        if (house.powerTokens >= 2 && available) {
            result.set(`Discard 2 Power tokens to place a loyalty\xa0token in a random region`, 2);
        }

        if (this.game.turn % 2 == 0 && house.powerTokens >= 4 && available) {
            result.set(`Discard 4 Power tokens to place two loyalty\xa0tokens in random regions`, 4);
        }

        return result;
    }

    onSimpleChoiceGameStateEnd(choice: number, resolvedAutomatically: boolean): void {
        const simpleChoice = this.childGameState as SimpleChoiceGameState;
        const discardedPowerTokens = this.getChoices(simpleChoice.house).values[choice];

        this.ingame.changePowerTokens(simpleChoice.house, -discardedPowerTokens);

        const regionsToPlaceNewLoyaltyTokens: Region[] = [];
        let loyaltyTokenCount = 0;
        switch(discardedPowerTokens) {
            case 1:
                if (this.possbileRegionForLoyaltyToken) {
                    regionsToPlaceNewLoyaltyTokens.push(this.possbileRegionForLoyaltyToken);
                    loyaltyTokenCount = 1;
                }
                break;
            case 2:
                regionsToPlaceNewLoyaltyTokens.push(popRandom(this.game.world.westerosLandRegions) as Region);
                loyaltyTokenCount = 1;
                break;
            case 4:
                regionsToPlaceNewLoyaltyTokens.push(popRandom(this.game.world.westerosLandRegions) as Region);
                regionsToPlaceNewLoyaltyTokens.push(popRandom(this.game.world.westerosLandRegions) as Region);
                loyaltyTokenCount = 2;
            default:
                break;
        }

        this.parentGameState.ingame.log({
            type: "place-loyalty-choice",
            house: simpleChoice.house.id,
            discardedPowerTokens: discardedPowerTokens,
            loyaltyTokenCount: loyaltyTokenCount
        }, resolvedAutomatically);

        regionsToPlaceNewLoyaltyTokens.forEach(r => this.parentGameState.placeLoyaltyToken(r));

        this.parentGameState.onWesterosGameStateFinish();
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedWesterosDeck4GameState {
        return {
            type: "westeros-deck-4",
            possbileRegionForLoyaltyToken: this.possbileRegionForLoyaltyToken?.id,
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(westeros: WesterosGameState, data: SerializedWesterosDeck4GameState): WesterosDeck4GameState {
        const westerosDeck4 = new WesterosDeck4GameState(westeros);

        westerosDeck4.possbileRegionForLoyaltyToken = data.possbileRegionForLoyaltyToken ? westeros.world.regions.get(data.possbileRegionForLoyaltyToken) : undefined;
        westerosDeck4.childGameState = westerosDeck4.deserializeChildGameState(data.childGameState);

        return westerosDeck4;
    }

    deserializeChildGameState(data: SerializedWesterosDeck4GameState["childGameState"]): WesterosDeck4GameState["childGameState"] {
        if (data.type == "simple-choice") {
            return SimpleChoiceGameState.deserializeFromServer(this, data);
        } else if (data.type == "choose-region-for-loyalty-token") {
            return ChooseRegionForLoyaltyTokenGameState.deserializeFromServer(this, data);
        } else if (data.type == "choose-multiple-regions-for-loyalty-token") {
            return ChooseMultipleRegionsForLoyaltyTokenGameState.deserializeFromServer(this, data);
        } else if (data.type == "fire-made-flesh") {
            return FireMadeFleshGameState.deserializeFromServer(this, data);
        } else if (data.type == "playing-with-fire") {
            return PlayingWithFireGameState.deserializeFromServer(this, data);
        } else if (data.type == "the-long-plan") {
            return TheLongPlanGameState.deserializeFromServer(this, data);
        } else if (data.type == "move-loyalty-tokens") {
            return MoveLoyaltyTokensGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedWesterosDeck4GameState {
    type: "westeros-deck-4";
    possbileRegionForLoyaltyToken?: string;
    childGameState: SerializedSimpleChoiceGameState | SerializedChooseRegionForLoyaltyTokenGameState | SerializedChooseMultipleRegionsForLoyaltyTokenGameState
        | SerializedFireMadeFleshGameState | SerializedPlayingWithFireGameState | SerializedTheLongPlanGameState | SerializedMoveLoyaltyTokensGameState;
}
