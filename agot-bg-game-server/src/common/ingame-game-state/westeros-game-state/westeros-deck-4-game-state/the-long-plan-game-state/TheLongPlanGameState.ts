import GameState from "../../../../GameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../simple-choice-game-state/SimpleChoiceGameState";
import Game from "../../../game-data-structure/Game";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import IngameGameState from "../../../IngameGameState";
import House from "../../../game-data-structure/House";
import Region from "../../../game-data-structure/Region";
import SelectRegionGameState, { SerializedSelectRegionGameState } from "../../../select-region-game-state/SelectRegionGameState";
import WesterosDeck4GameState from "../WesterosDeck4GameState";
import WesterosGameState from "../../WesterosGameState";
import BetterMap from "../../../../../utils/BetterMap";
import _ from "lodash";

export default class TheLongPlanGameState extends GameState<WesterosDeck4GameState,
    SelectRegionGameState<TheLongPlanGameState> | SimpleChoiceGameState> {
    regions: Region[];

    get game(): Game {
        return this.parentGameState.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.ingame;
    }

    get westeros(): WesterosGameState {
        return this.parentGameState.parentGameState;
    }

    firstStart(house: House): void {
        this.regions = [];
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(house, `House ${house.name} may discard 1 Power token to choose one other player who places 2 loyalty tokens in 2 different land areas in Westeros.`, this.getChoices(house).keys);
    }

    getChoices(house: House): BetterMap<string, string> {
        const result = new BetterMap<string, string>();
        result.set("Ignore", "Ignore");
        if (house.powerTokens < 1 || !this.game.isLoyaltyTokenAvailable) {
            return result;
        }

        const enemies = _.without(this.game.houses.values, house).filter(h => !this.ingame.isVassalHouse(h));
        enemies.forEach(h => {
            result.set(h.name, h.id);
        });
        return result;
    }

    onSimpleChoiceGameStateEnd(choice: number, resolvedAutomatically: boolean): void {
        const house = this.childGameState.house;

        if (choice == 0) {
            this.ingame.log({
                type: "place-loyalty-choice",
                house: house.id,
                discardedPowerTokens: 0,
                loyaltyTokenCount: 0
            }, resolvedAutomatically);
            this.westeros.onWesterosCardEnd();
        } else {
            this.ingame.log({
                type: "place-loyalty-choice",
                house: house.id,
                discardedPowerTokens: 1,
                loyaltyTokenCount: 2
            });

            // Remove the power token
            this.ingame.changePowerTokens(this.childGameState.house, -1);
            const chosenHouse = this.game.houses.get(this.getChoices(house).values[choice]);
            this.ingame.log({
                type: "the-long-plan-choice",
                house: house.id,
                affectedHouse: chosenHouse.id
            });

            this.setChildGameState(new SelectRegionGameState(this)).firstStart(chosenHouse, this.game.world.westerosLandRegions);
        }
    }

    onSelectRegionFinish(house: House, region: Region): void {
        this.regions.push(region);
        this.westeros.placeLoyaltyToken(region);

        if (this.regions.length < 2 && this.game.isLoyaltyTokenAvailable) {
            this.setChildGameState(new SelectRegionGameState(this)).firstStart(house, _.without(this.game.world.westerosLandRegions, ...this.regions));
        } else {
            this.westeros.onWesterosCardEnd();
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedTheLongPlanGameState {
        return {
            type: "the-long-plan",
            regions: this.regions.map(r => r.id),
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(westerosDeck4: WesterosDeck4GameState, data: SerializedTheLongPlanGameState): TheLongPlanGameState {
        const gameState = new TheLongPlanGameState(westerosDeck4);

        gameState.regions = data.regions.map(r => westerosDeck4.parentGameState.world.regions.get(r));
        gameState.childGameState = gameState.deserializeChildGameState(data.childGameState);

        return gameState;
    }

    deserializeChildGameState(data: SerializedTheLongPlanGameState["childGameState"]): TheLongPlanGameState["childGameState"] {
        if (data.type == "simple-choice") {
            return SimpleChoiceGameState.deserializeFromServer(this, data);
        } else if (data.type == "select-region") {
            return SelectRegionGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedTheLongPlanGameState {
    type: "the-long-plan";
    regions: string[];
    childGameState: SerializedSimpleChoiceGameState | SerializedSelectRegionGameState;
}
