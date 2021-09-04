import WesterosGameState from "../WesterosGameState";
import GameState from "../../../GameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../simple-choice-game-state/SimpleChoiceGameState";
import Game, { MAX_LOYALTY_TOKEN_COUNT } from "../../game-data-structure/Game";
import Player from "../../Player";
import {ClientMessage} from "../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../messages/ServerMessage";
import IngameGameState from "../../IngameGameState";
import House from "../../game-data-structure/House";
import BetterMap from "../../../../utils/BetterMap";
import Region from "../../game-data-structure/Region";
import popRandom from "../../../../utils/popRandom";
import WesterosCardType from "../../game-data-structure/westeros-card/WesterosCardType";
import ChooseRegionForLoyaltyTokenGameState, { SerializedChooseRegionForLoyaltyTokenGameState } from "../choose-region-for-loyalty-token-game-state/ChooseRegionForLoyaltyTokenGameState";
import { emptyPromises, southronAmbitions, strongholdsOfResistance } from "../../game-data-structure/westeros-card/westerosCardTypes";

// Keep SimpleChoice as possible child game state for now to not migrate the running games.
// Todo: Remove this at some point
export default class WesterosDeck4GameState extends GameState<WesterosGameState, SimpleChoiceGameState | ChooseRegionForLoyaltyTokenGameState> {
    possbileRegionForLoyaltyToken?: Region;
    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    get westerosLandRegions(): Region[] {
        const westerosLandRegionIds = this.ingame.world.westerosLandRegionIds;
        return this.ingame.world.regions.values.filter(r => westerosLandRegionIds.includes(r.id));
    }

    firstStart(type: WesterosCardType): void {
        if (!this.ingame.game.targaryen) {
            this.parentGameState.onWesterosCardEnd();
            return;
        }

        switch(type.id) {
            case emptyPromises.id:
            case southronAmbitions.id:
            case strongholdsOfResistance.id:
                const regions = type.choosableLoyaltyTokenRegions.map(rid => this.parentGameState.world.regions.get(rid));
                this.setChildGameState(new ChooseRegionForLoyaltyTokenGameState(this)).firstStart(this.ingame.game.targaryen, regions);
                break;
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

        const currentTokensOnBoard = this.ingame.game.loyaltyTokensOnBoardCount;

        if (this.possbileRegionForLoyaltyToken && currentTokensOnBoard + 1 <= MAX_LOYALTY_TOKEN_COUNT) {
            result.set(`Discard 1 Power token to place a loyalty token in ${this.possbileRegionForLoyaltyToken.name}`, 1);
        }

        if (currentTokensOnBoard + 1 <= MAX_LOYALTY_TOKEN_COUNT && house.powerTokens >= 2) {
            result.set(`Discard 2 Power tokens to place a loyalty token in a random region`, 2);
        }

        if (this.game.turn % 2 == 0 && currentTokensOnBoard + 2 <= MAX_LOYALTY_TOKEN_COUNT && house.powerTokens >= 4) {
            result.set(`Discard 4 Power tokens to place two loyalty tokens in random regions`, 4);
        }

        return result;
    }

    onSimpleChoiceGameStateEnd(choice: number): void {
        const simpleChoice = this.childGameState as SimpleChoiceGameState;
        const discardedPowerTokens = this.getChoices(simpleChoice.house).values[choice];
        this.parentGameState.ingame.log({
            type: "place-loyalty-choice",
            house: simpleChoice.house.id,
            discardedPowerTokens: discardedPowerTokens
        });

        this.ingame.changePowerTokens(simpleChoice.house, -discardedPowerTokens);

        const regionsToPlaceNewLoyaltyTokens: Region[] = [];

        switch(discardedPowerTokens) {
            case 1:
                if (this.possbileRegionForLoyaltyToken) {
                    regionsToPlaceNewLoyaltyTokens.push(this.possbileRegionForLoyaltyToken);
                }
                break;
            case 2:
                regionsToPlaceNewLoyaltyTokens.push(popRandom(this.westerosLandRegions) as Region);
                break;
            case 4:
                regionsToPlaceNewLoyaltyTokens.push(popRandom(this.westerosLandRegions) as Region);
                regionsToPlaceNewLoyaltyTokens.push(popRandom(this.westerosLandRegions) as Region);
            default:
                break;
        }

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
        } else {
            throw new Error();
        }
    }
}

export interface SerializedWesterosDeck4GameState {
    type: "westeros-deck-4";
    possbileRegionForLoyaltyToken?: string;
    childGameState: SerializedSimpleChoiceGameState | SerializedChooseRegionForLoyaltyTokenGameState;
}
