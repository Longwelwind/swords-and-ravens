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
import unitTypes from "../../../../../common/ingame-game-state/game-data-structure/unitTypes";
import BetterMap from "../../../../../utils/BetterMap";
import { land } from "../../../../../common/ingame-game-state/game-data-structure/regionTypes";
import _ from "lodash";

enum PLAYING_WITH_FIRE_STEP {
    CHOOSE_ACTIVATE,
    CHOOSE_HOUSE,
    CHOOSE_UNIT
}

export default class PlayingWithFireGameState extends GameState<WesterosDeck4GameState,
    SelectRegionGameState<PlayingWithFireGameState> | SimpleChoiceGameState> {
    step: PLAYING_WITH_FIRE_STEP;
    region: Region | null = null;
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
        this.step = PLAYING_WITH_FIRE_STEP.CHOOSE_ACTIVATE;
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(house, `House ${house.name} may discard 1 Power token to place a loyalty\xa0token and an enemy unit in an uncontrolled land area.`, this.getChoices(house).keys);
    }

    getEnemiesWithAtLeastOneAvailableUnit(house: House): House[] {
        const enemies = _.without(this.game.houses.values, house).filter(h => !this.ingame.isVassalHouse(h));
        const units = unitTypes.values;
        return enemies.filter(h => units.some(ut => ut.walksOn == land.kind && this.game.getAvailableUnitsOfType(h, ut) > 0));
    }

    getUncontrolledLandAreas(): Region[] {
        return this.game.world.westerosLandRegions.filter(r => r.getController() == null);
    }

    getChoices(house: House): BetterMap<string, string> {
        const result = new BetterMap<string, string>();
        if (this.step == PLAYING_WITH_FIRE_STEP.CHOOSE_ACTIVATE) {
            result.set("Ignore", "Ignore");
            if (house.powerTokens < 1 || !this.game.isLoyaltyTokenAvailable || this.getEnemiesWithAtLeastOneAvailableUnit(house).length == 0 || this.getUncontrolledLandAreas().length == 0) {
                return result;
            }

            result.set("Activate", "Activate");
        } else if (this.step == PLAYING_WITH_FIRE_STEP.CHOOSE_HOUSE) {
            this.getEnemiesWithAtLeastOneAvailableUnit(house).forEach(h => {
                result.set(h.name, h.id);
            });
        } else if (this.step == PLAYING_WITH_FIRE_STEP.CHOOSE_UNIT) {
            const availableUnits = unitTypes.values.filter(ut => ut.walksOn == land.kind && this.game.getAvailableUnitsOfType(house, ut) > 0);
            availableUnits.forEach(ut => {
                result.set(ut.name, ut.id);
            });
        }

        return result;
    }

    onSimpleChoiceGameStateEnd(choice: number, resolvedAutomatically: boolean): void {
        const house = this.childGameState.house;

        if (this.step == PLAYING_WITH_FIRE_STEP.CHOOSE_ACTIVATE) {
            if (choice == 0) {
                this.ingame.log({
                    type: "place-loyalty-choice",
                    house: this.childGameState.house.id,
                    discardedPowerTokens: 0,
                    loyaltyTokenCount: 0
                }, resolvedAutomatically);
                this.westeros.onWesterosCardEnd();
            } else if (choice == 1) {
                this.ingame.log({
                    type: "place-loyalty-choice",
                    house: this.childGameState.house.id,
                    discardedPowerTokens: 1,
                    loyaltyTokenCount: 1
                });

                // Remove the power token
                this.ingame.changePowerTokens(this.childGameState.house, -1);
                this.step = PLAYING_WITH_FIRE_STEP.CHOOSE_HOUSE;
                this.setChildGameState(new SelectRegionGameState(this)).firstStart(house, this.getUncontrolledLandAreas());
            }
        } else if (this.step == PLAYING_WITH_FIRE_STEP.CHOOSE_HOUSE) {
            if (!this.region) {
                throw new Error("Region must be set at this point!");
            }

            const chosenHouse = this.game.houses.get(this.getChoices(house).values[choice]);
            this.step = PLAYING_WITH_FIRE_STEP.CHOOSE_UNIT;
            this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(chosenHouse, `House ${chosenHouse.name} must choose a unit to place in ${this.region.name}.`, this.getChoices(chosenHouse).keys);
        } else if (this.step == PLAYING_WITH_FIRE_STEP.CHOOSE_UNIT) {
            if (!this.region) {
                throw new Error("Region must be set at this point!");
            }
            const chosenUnitType = unitTypes.get(this.getChoices(house).values[choice]);
            const newUnit = this.game.createUnit(this.region, chosenUnitType, house);
            this.region.units.set(newUnit.id, newUnit);
            this.entireGame.broadcastToClients({
                type: "add-units",
                units: [[this.region.id, [newUnit.serializeToClient()]]]
            });

            this.ingame.log({
                type: "playing-with-fire-choice",
                house: house.id,
                unitType: chosenUnitType.id,
                region: this.region.id
            });

            this.westeros.onWesterosCardEnd();
        }
    }

    onSelectRegionFinish(house: House, region: Region): void {
        this.westeros.placeLoyaltyToken(region);
        this.region = region;
        this.step = PLAYING_WITH_FIRE_STEP.CHOOSE_HOUSE;
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(house, `House ${house.name} must choose an enemy which places a unit in ${region.name}.`, this.getChoices(house).keys);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedPlayingWithFireGameState {
        return {
            type: "playing-with-fire",
            step: this.step,
            region: this.region?.id ?? null,
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(westerosDeck4: WesterosDeck4GameState, data: SerializedPlayingWithFireGameState): PlayingWithFireGameState {
        const gameState = new PlayingWithFireGameState(westerosDeck4);

        gameState.step = data.step;
        gameState.region = data.region ? westerosDeck4.ingame.world.regions.get(data.region) : null;
        gameState.childGameState = gameState.deserializeChildGameState(data.childGameState);

        return gameState;
    }

    deserializeChildGameState(data: SerializedPlayingWithFireGameState["childGameState"]): PlayingWithFireGameState["childGameState"] {
        if (data.type == "simple-choice") {
            return SimpleChoiceGameState.deserializeFromServer(this, data);
        } else if (data.type == "select-region") {
            return SelectRegionGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedPlayingWithFireGameState {
    type: "playing-with-fire";
    step: PLAYING_WITH_FIRE_STEP;
    region: string | null;
    childGameState: SerializedSimpleChoiceGameState | SerializedSelectRegionGameState;
}
