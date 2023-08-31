import GameState from "../../../../../../../GameState";
import AfterCombatHouseCardAbilitiesGameState from "../AfterCombatHouseCardAbilitiesGameState";
import Player from "../../../../../../Player";
import {ClientMessage} from "../../../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../../../messages/ServerMessage";
import House from "../../../../../../game-data-structure/House";
import CombatGameState from "../../../CombatGameState";
import Game from "../../../../../../game-data-structure/Game";
import IngameGameState from "../../../../../../IngameGameState";
import SimpleChoiceGameState, { SerializedSimpleChoiceGameState } from "../../../../../../simple-choice-game-state/SimpleChoiceGameState";
import { jonConnington } from "../../../../../../game-data-structure/house-card/houseCardAbilities";
import Region from "../../../../../../../../common/ingame-game-state/game-data-structure/Region";
import { knight } from "../../../../../../../../common/ingame-game-state/game-data-structure/unitTypes";
import BetterMap from "../../../../../../../../utils/BetterMap";
import PostCombatGameState from "../../PostCombatGameState";
import RegionKind from "../../../../../../../../common/ingame-game-state/game-data-structure/RegionKind";

export default class JonConningtonAbilityGameState extends GameState<
    AfterCombatHouseCardAbilitiesGameState["childGameState"],
    SimpleChoiceGameState
> {
    house: House;

    get game(): Game {
        return this.combat.game;
    }

    get ingame(): IngameGameState {
        return this.combat.ingameGameState;
    }

    get combat(): CombatGameState {
        return this.parentGameState.combatGameState;
    }

    get postCombat(): PostCombatGameState {
        return this.parentGameState.parentGameState.parentGameState;
    }

    firstStart(house: House): void {
        this.house = house;
        const choices = this.getChoices(house);

        if (choices.size == 1) {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: jonConnington.id
            }, true);
            this.parentGameState.onHouseCardResolutionFinish(house);
            return;
        }

        this.setChildGameState(new SimpleChoiceGameState(this)).firstStart(
            house,
            "",
            choices.keys
        );
    }

    getChoices(house: House): BetterMap<string, Region | null> {
        const result = new BetterMap<string, Region | null>();
        result.set("Ignore", null);
        if (this.game.getAvailableUnitsOfType(house, knight) == 0) {
            return result;
        }

        const possibleRegions: Region[] = [];
        // It might be possible that house attacked from a region and retreated back to its originating region but has no units but still controls the region
        if (this.combat.attacker == house && this.postCombat.loser == house && this.combat.attackingRegion.getController() == house) {
            possibleRegions.push(this.combat.attackingRegion);
        } else {
            // Add retreat location
            const army = this.combat.houseCombatDatas.get(house).army;
            if (army.length > 0) {
                possibleRegions.push(army[0].region);
            }
        }

        // Add home town if house still controls it
        const homeTowns = this.combat.world.regions.values.filter(r => r.superControlPowerToken == house && r.getController() == house);
        homeTowns.forEach(r => possibleRegions.push(r));

        // Check if the new knight respects supply limits
        possibleRegions.forEach(r => {
            if (r.type.kind == RegionKind.LAND && !this.game.hasTooMuchArmies(house, new BetterMap([[r, [knight]]]))) {
                result.set(r.name, r);
            }
        });

        return result;
    }

    onSimpleChoiceGameStateEnd(choice: number, resolvedAutomatically: boolean): void {
        const house = this.childGameState.house;
        if (choice == 0) {
            this.ingame.log({
                type: "house-card-ability-not-used",
                house: house.id,
                houseCard: jonConnington.id
            }, resolvedAutomatically);
            this.parentGameState.onHouseCardResolutionFinish(house);
            return;
        } else {
            const region = this.getChoices(house).values[choice];

            if (region) {
                this.ingame.log({
                    type: "jon-connington-used",
                    house: this.ingame.getControllerOfHouse(house).house.id,
                    region: region.id
                });
                const unit = this.game.createUnit(region, knight, house);
                region.units.set(unit.id, unit);

                this.ingame.broadcastAddUnits(region, [unit]);
            }

            this.parentGameState.onHouseCardResolutionFinish(house);
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedJonConningtonAbilityGameState {
        return {
            type: "jon-connington-ability",
            childGameState: this.childGameState.serializeToClient(admin, player),
            house: this.house.id
        };
    }

    static deserializeFromServer(afterCombat: AfterCombatHouseCardAbilitiesGameState["childGameState"], data: SerializedJonConningtonAbilityGameState): JonConningtonAbilityGameState {
        const jonConningtonGameState = new JonConningtonAbilityGameState(afterCombat);

        jonConningtonGameState.childGameState = jonConningtonGameState.deserializeChildGameState(data.childGameState);
        jonConningtonGameState.house = afterCombat.game.houses.get(data.house);

        return jonConningtonGameState;
    }

    deserializeChildGameState(data: SerializedJonConningtonAbilityGameState["childGameState"]): SimpleChoiceGameState {
        return SimpleChoiceGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedJonConningtonAbilityGameState {
    type: "jon-connington-ability";
    childGameState: SerializedSimpleChoiceGameState;
    house: string;
}
