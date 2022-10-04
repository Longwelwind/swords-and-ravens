import GameState from "../../../../GameState";
import SimpleChoiceGameState, {SerializedSimpleChoiceGameState} from "../../../simple-choice-game-state/SimpleChoiceGameState";
import Game from "../../../game-data-structure/Game";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import IngameGameState from "../../../IngameGameState";
import House from "../../../game-data-structure/House";
import Region from "../../../game-data-structure/Region";
import WesterosDeck4GameState from "../../westeros-deck-4-game-state/WesterosDeck4GameState";
import WesterosGameState from "../../WesterosGameState";
import SelectUnitsGameState, { SerializedSelectUnitsGameState } from "../../../select-units-game-state/SelectUnitsGameState";
import Unit from "../../../game-data-structure/Unit";
import BetterMap from "../../../../../utils/BetterMap";
import { dragon } from "../../../game-data-structure/unitTypes";
import _ from "lodash";

enum FIRE_MADE_FLESH_STEP {
    CHOOSE_EFFECT,
    CHOOSE_DRAGON_STRENGTH_TOKEN
}

enum FIRE_MADE_FLESH_EFFECT {
    IGNORE,
    KILL_DRAGON,
    REGAIN_DESTROYED_DRAGON
}

export default class FireMadeFleshGameState extends GameState<WesterosDeck4GameState,
    SelectUnitsGameState<FireMadeFleshGameState> | SimpleChoiceGameState> {
    step: FIRE_MADE_FLESH_STEP;
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
        this.step = FIRE_MADE_FLESH_STEP.CHOOSE_EFFECT;
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(house,
            `House ${house.name} may either: a)\xa0destroy\xa0one\xa0Dragon to move any dragon strength token from the round track to the dragon strength box or b)\xa0place\xa0a\xa0destroyed\xa0Dragon in their home area (if\xa0able) or c)\xa0do\xa0nothing.`, this.getChoices(house).keys);
    }

    getDragonsOnBoard(house: House): Unit[] {
        return this.ingame.world.getUnitsOfHouse(house).filter(u => u.type == dragon);
    }

    getOwnedCapital(house: House): Region | null {
        const capitals = this.ingame.world.regions.values.filter(r => r.superControlPowerToken == house && r.getController() == house);
        return capitals.length == 1 ? capitals[0] : null;
    }

    getChoices(house: House): BetterMap<string, number> {
        const result = new BetterMap<string, number>();
        if (this.step == FIRE_MADE_FLESH_STEP.CHOOSE_EFFECT) {
            result.set("Ignore", FIRE_MADE_FLESH_EFFECT.IGNORE);
            const dragons = this.getDragonsOnBoard(house);
            if (this.game.turn < (_.last(this.game.dragonStrengthTokens) as number) && dragons.length > 0) {
                result.set("Destroy one dragon", FIRE_MADE_FLESH_EFFECT.KILL_DRAGON);
            }

            const capital = this.getOwnedCapital(house);
            if (capital && this.game.getAvailableUnitsOfType(house, dragon) > 0 && !this.game.hasTooMuchArmies(house, new BetterMap([[capital, [dragon]]]))) {
                result.set(`Place a dragon in ${capital.name}`, FIRE_MADE_FLESH_EFFECT.REGAIN_DESTROYED_DRAGON);
            }

            return result;
        } else if (this.step == FIRE_MADE_FLESH_STEP.CHOOSE_DRAGON_STRENGTH_TOKEN) {
            this.game.dragonStrengthTokens.filter(onRound => onRound > this.game.turn).forEach(onRound => {
                result.set(onRound.toString(), onRound);
            });
        }

        if (result.size == 0) {
            throw new Error("There must be at least one choice!");
        }
        return result;
    }

    onSimpleChoiceGameStateEnd(choice: number, resolvedAutomatically: boolean): void {
        const house = this.childGameState.house;
        const decision = this.getChoices(house).values[choice];

        if (this.step == FIRE_MADE_FLESH_STEP.CHOOSE_EFFECT) {
            if (decision == FIRE_MADE_FLESH_EFFECT.IGNORE) {
                this.ingame.log({
                    type: "fire-made-flesh-choice",
                    house: house.id,
                    ignored: true
                }, resolvedAutomatically);
                this.westeros.onWesterosCardEnd();
                return;
            } else if (decision == FIRE_MADE_FLESH_EFFECT.KILL_DRAGON) {
                this.step = FIRE_MADE_FLESH_STEP.CHOOSE_DRAGON_STRENGTH_TOKEN;
                this.setChildGameState(new SelectUnitsGameState(this)).firstStart(house, this.getDragonsOnBoard(house), 1);
                return;
            } else if (decision == FIRE_MADE_FLESH_EFFECT.REGAIN_DESTROYED_DRAGON) {
                const capital = this.getOwnedCapital(house);
                if (capital) {
                    const newDragon = this.game.createUnit(capital, dragon, house);
                    capital.units.set(newDragon.id, newDragon);
                    this.entireGame.broadcastToClients({
                        type: "add-units",
                        units: [[capital.id, [newDragon.serializeToClient()]]],
                        animate: "green"
                    });

                    this.ingame.log({
                        type: "fire-made-flesh-choice",
                        house: house.id,
                        regainedDragonRegion: capital.id
                    });
                }

                this.westeros.onWesterosCardEnd();
            }
        } else if (this.step == FIRE_MADE_FLESH_STEP.CHOOSE_DRAGON_STRENGTH_TOKEN) {
            this.ingame.log({
                type: "fire-made-flesh-choice",
                house: house.id,
                removedDragonStrengthToken: decision
            }, resolvedAutomatically);

            _.pull(this.game.dragonStrengthTokens, decision);
            this.game.removedDragonStrengthToken = decision;

            this.entireGame.broadcastToClients({
                type: "dragon-strength-token-removed",
                fromRound: decision
            });

            this.westeros.onWesterosCardEnd();
        }
    }

    onSelectUnitsEnd(house: House, selectedUnits: [Region, Unit[]][], resolvedAutomatically: boolean): void {
        const selectedRegion = selectedUnits[0][0];
        const selectedUnit = selectedUnits[0][1][0];

        this.ingame.log({
            type: "fire-made-flesh-choice",
            house: house.id,
            dragonKilledInRegion: selectedRegion.id
        }, resolvedAutomatically);

        // Remove the dragon
        selectedRegion.units.delete(selectedUnit.id);
        this.ingame.broadcastRemoveUnits(selectedRegion, [selectedUnit]);

        this.step = FIRE_MADE_FLESH_STEP.CHOOSE_DRAGON_STRENGTH_TOKEN;
        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(house, `House ${house.name} must choose a dragon strength token from the round track and place it to the current dragon strength box.`, this.getChoices(house).keys);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedFireMadeFleshGameState {
        return {
            type: "fire-made-flesh",
            step: this.step,
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(westerosDeck4: WesterosDeck4GameState, data: SerializedFireMadeFleshGameState): FireMadeFleshGameState {
        const gameState = new FireMadeFleshGameState(westerosDeck4);

        gameState.step = data.step;
        gameState.childGameState = gameState.deserializeChildGameState(data.childGameState);

        return gameState;
    }

    deserializeChildGameState(data: SerializedFireMadeFleshGameState["childGameState"]): FireMadeFleshGameState["childGameState"] {
        if (data.type == "simple-choice") {
            return SimpleChoiceGameState.deserializeFromServer(this, data);
        } else if (data.type == "select-units") {
            return SelectUnitsGameState.deserializeFromServer(this, data);
        } else {
            throw new Error();
        }
    }
}

export interface SerializedFireMadeFleshGameState {
    type: "fire-made-flesh";
    step: FIRE_MADE_FLESH_STEP;
    childGameState: SerializedSimpleChoiceGameState | SerializedSelectUnitsGameState;
}
