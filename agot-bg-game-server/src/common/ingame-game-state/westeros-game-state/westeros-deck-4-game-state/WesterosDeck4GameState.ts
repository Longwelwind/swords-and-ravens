import WesterosGameState from "../WesterosGameState";
import GameState from "../../../GameState";
import Game from "../../game-data-structure/Game";
import Player from "../../Player";
import {ClientMessage} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";
import IngameGameState from "../../IngameGameState";
import WesterosCardType from "../../game-data-structure/westeros-card/WesterosCardType";
import ChooseRegionForLoyaltyTokenGameState, { SerializedChooseRegionForLoyaltyTokenGameState } from "./choose-region-for-loyalty-token-game-state/ChooseRegionForLoyaltyTokenGameState";
import { domesticDisputes, emptyPromises, fireMadeFlesh, playingWithFire, scatteringDissent, southronAmbitions, strongholdsOfResistance, theLongPlan, wateringTheSeed, wordSpreadsQuickly } from "../../game-data-structure/westeros-card/westerosCardTypes";
import ChooseMultipleRegionsForLoyaltyTokenGameState, { SerializedChooseMultipleRegionsForLoyaltyTokenGameState } from "./choose-multiple-regions-for-loyalty-token-game-state/ChooseMultipleRegionsForLoyaltyTokenGameState";
import FireMadeFleshGameState, { SerializedFireMadeFleshGameState } from "./fire-made-flesh-game-state/FireMadeFleshGameState";
import PlayingWithFireGameState, { SerializedPlayingWithFireGameState } from "./playing-with-fire-game-state/PlayingWithFireGameState";
import TheLongPlanGameState, { SerializedTheLongPlanGameState } from "./the-long-plan-game-state/TheLongPlanGameState";
import MoveLoyaltyTokensGameState, { SerializedMoveLoyaltyTokensGameState } from "./move-loyalty-tokens-game-state/MoveLoyaltyTokensGameState";

export default class WesterosDeck4GameState extends GameState<WesterosGameState,
    ChooseRegionForLoyaltyTokenGameState | ChooseMultipleRegionsForLoyaltyTokenGameState
    | FireMadeFleshGameState | PlayingWithFireGameState | TheLongPlanGameState | MoveLoyaltyTokensGameState> {

    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    firstStart(type: WesterosCardType): void {
        const isVassal = this.game.targaryen && this.ingame.isVassalHouse(this.game.targaryen);
        if (isVassal || this.ingame.isHouseDefeated(this.game.targaryen) || !this.game.targaryen) {
            this.ingame.log({
                type: "westeros-deck-4-skipped",
                westerosCardType: type.id,
                reason: isVassal ? "vassalized" : "defeated"
            }, true);
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
                    this.game.targaryen, 1, regions, 4, "House Targaryen may place loyalty\xa0tokens in up to 4 capitals.", true);
                break;
            }
            case wateringTheSeed.id: {
                const regions = this.game.world.regionsAdjacentToARiver.filter(r => r.getController() != this.game.targaryen);
                this.setChildGameState(new ChooseMultipleRegionsForLoyaltyTokenGameState(this)).firstStart(
                    this.game.targaryen,
                    this.game.getVictoryPoints(this.game.targaryen),
                    regions,
                    2,
                    "House Targaryen may place 1 loyalty\xa0token on 2 different regions adjacent to a river.",
                    false);
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

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedWesterosDeck4GameState {
        return {
            type: "westeros-deck-4",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(westeros: WesterosGameState, data: SerializedWesterosDeck4GameState): WesterosDeck4GameState {
        const westerosDeck4 = new WesterosDeck4GameState(westeros);

        westerosDeck4.childGameState = westerosDeck4.deserializeChildGameState(data.childGameState);

        return westerosDeck4;
    }

    deserializeChildGameState(data: SerializedWesterosDeck4GameState["childGameState"]): WesterosDeck4GameState["childGameState"] {
        if (data.type == "choose-region-for-loyalty-token") {
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
    childGameState: SerializedChooseRegionForLoyaltyTokenGameState | SerializedChooseMultipleRegionsForLoyaltyTokenGameState
        | SerializedFireMadeFleshGameState | SerializedPlayingWithFireGameState | SerializedTheLongPlanGameState | SerializedMoveLoyaltyTokensGameState;
}
