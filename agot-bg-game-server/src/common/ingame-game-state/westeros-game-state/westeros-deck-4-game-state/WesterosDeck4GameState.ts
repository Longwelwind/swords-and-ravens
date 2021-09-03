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

export default class WesterosDeck4GameState extends GameState<WesterosGameState, SimpleChoiceGameState> {
    possbileRegionForLoyaltyToken: Region;

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

    firstStart(house: House): void {
        // Every 2nd round place a loyalty token:
        const regions = this.westerosLandRegions;
        if (this.ingame.game.turn % 2 == 1 && this.ingame.game.loyaltyTokensOnBoardCount + 1 <= MAX_LOYALTY_TOKEN_COUNT) {
            this.placeLoyaltyToken(popRandom(regions) as Region);
        }

        if (house.powerTokens == 0 || this.ingame.game.loyaltyTokensOnBoardCount + 1 > MAX_LOYALTY_TOKEN_COUNT) {
            this.parentGameState.ingame.log({
                type: "place-loyalty-choice",
                house: house.id,
                discardedPowerTokens: 0
            });

            this.parentGameState.onWesterosGameStateFinish();
            return;
        }

        this.possbileRegionForLoyaltyToken = popRandom(regions) as Region;

        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(house,
            `House ${house.name} may choose to discard Power tokens to place loyalty tokens.`,
            this.getChoices(house).keys
        );
    }

    getChoices(house: House): BetterMap<string, number> {
        const result = new BetterMap<string, number>();
        result.set("Ignore", 0);
        if (house.powerTokens <= 0) {
            return result;
        }

        const currentTokensOnBoard = this.ingame.game.loyaltyTokensOnBoardCount;

        if (currentTokensOnBoard + 1 <= MAX_LOYALTY_TOKEN_COUNT) {
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
        const discardedPowerTokens = this.getChoices(this.childGameState.house).values[choice];
        this.parentGameState.ingame.log({
            type: "place-loyalty-choice",
            house: this.childGameState.house.id,
            discardedPowerTokens: discardedPowerTokens
        });

        this.ingame.changePowerTokens(this.childGameState.house, -discardedPowerTokens);

        const regionsToPlaceNewLoyaltyTokens: Region[] = [];

        switch(discardedPowerTokens) {
            case 1:
                regionsToPlaceNewLoyaltyTokens.push(this.possbileRegionForLoyaltyToken);
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

        regionsToPlaceNewLoyaltyTokens.forEach(r => this.placeLoyaltyToken(r));

        this.parentGameState.onWesterosGameStateFinish();
    }

    placeLoyaltyToken(region: Region): void {
        region.loyaltyTokens += 1;
        this.entireGame.broadcastToClients({
            type: "loyalty-token-placed",
            region: region.id,
            newLoyaltyTokenCount: region.loyaltyTokens
        });

        this.parentGameState.ingame.log({
            type: "loyalty-token-placed",
            region: region.id
        });
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
            possbileRegionForLoyaltyToken: this.possbileRegionForLoyaltyToken.id,
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(westeros: WesterosGameState, data: SerializedWesterosDeck4GameState): WesterosDeck4GameState {
        const westerosDeck4 = new WesterosDeck4GameState(westeros);

        westerosDeck4.possbileRegionForLoyaltyToken = westeros.world.regions.get(data.possbileRegionForLoyaltyToken);
        westerosDeck4.childGameState = westerosDeck4.deserializeChildGameState(data.childGameState);

        return westerosDeck4;
    }

    deserializeChildGameState(data: SerializedWesterosDeck4GameState["childGameState"]): SimpleChoiceGameState {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedWesterosDeck4GameState {
    type: "westeros-deck-4";
    possbileRegionForLoyaltyToken: string;
    childGameState: SerializedSimpleChoiceGameState;
}
