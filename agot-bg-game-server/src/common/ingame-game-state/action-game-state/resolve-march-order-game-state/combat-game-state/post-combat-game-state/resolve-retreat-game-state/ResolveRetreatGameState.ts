import GameState from "../../../../../../GameState";
import Region from "../../../../../game-data-structure/Region";
import {ServerMessage} from "../../../../../../../messages/ServerMessage";
import {ClientMessage} from "../../../../../../../messages/ClientMessage";
import Player from "../../../../../Player";
import World from "../../../../../game-data-structure/World";
import EntireGame from "../../../../../../EntireGame";
import PostCombatGameState from "../PostCombatGameState";
import SelectUnitsGameState, {SerializedSelectUnitsGameState} from "../../../../../select-units-game-state/SelectUnitsGameState";
import CombatGameState from "../../CombatGameState";
import House from "../../../../../game-data-structure/House";
import SelectRegionGameState, {SerializedSelectRegionGameState} from "../../../../../select-region-game-state/SelectRegionGameState";
import Unit from "../../../../../game-data-structure/Unit";
import Game from "../../../../../game-data-structure/Game";
import IngameGameState from "../../../../../IngameGameState";
import BetterMap from "../../../../../../../utils/BetterMap";
import _ from "lodash";

export default class ResolveRetreatGameState extends GameState<
    PostCombatGameState,
    SelectRegionGameState<ResolveRetreatGameState> | SelectUnitsGameState<ResolveRetreatGameState>
> {
    retreatRegion: Region;

    get combat(): CombatGameState {
        return this.postCombat.combat;
    }

    get game(): Game {
        return this.postCombat.game;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.ingameGameState;
    }

    get postCombat(): PostCombatGameState {
        return this.parentGameState;
    }

    get world(): World {
        return this.game.world;
    }

    get entireGame(): EntireGame {
        return this.postCombat.entireGame;
    }

    firstStart(): void {
        const possibleRetreatRegions = this.getValidRetreatRegions();

        if (possibleRetreatRegions.length == 0) {
            // No retreat regions available
            // All units are killed on the spot
            this.combat.defendingRegion.units.values.forEach(u => this.combat.defendingRegion.units.delete(u.id));

            this.entireGame.broadcastToClients({
                type: "remove-units",
                regionId: this.combat.defendingRegion.id,
                unitIds: this.combat.defendingRegion.units.values.map(u => u.id)
            });

            this.postCombat.onResolveRetreatFinish();
            return;
        }

        // House cards may override the chooser of the retreat location
        const overridenChooser = this.getOverridenRetreatLocationChooser(this.postCombat.loser);
        const finalChooser = overridenChooser ? overridenChooser : this.postCombat.loser;

        // There are 4 possible situations:
        if (this.postCombat.loser == this.combat.attacker) {
            // The loser is the attacker...
            if (overridenChooser == null) {
                // ...and the chooser was not overriden:
                // The units retreat automatically to the region they came from.
                this.onSelectRegionFinish(finalChooser, this.combat.attackingRegion);
            } else {
                // ...and the chooser was overriden:
                // The chooser can choose the retreat location, which the constraints
                // where the least units are lost.
                // TODO: Add constraints
                this.setChildGameState(new SelectRegionGameState(this))
                    .firstStart(finalChooser, this.getValidRetreatRegions());
            }
        } else {
            // The loser is the defender...
            if (overridenChooser == null) {
                // ...and the chooser was not overriden:
                // The loser chooses the location of the retreat
                this.setChildGameState(new SelectRegionGameState(this))
                    .firstStart(finalChooser, this.getValidRetreatRegions());
            } else {
                // ...and the chooser was overriden:
                // The chooser can choose the retreat location, with the constraint
                // where the least units are lost.
                // Todo: Add constraints
                this.setChildGameState(new SelectRegionGameState(this))
                    .firstStart(finalChooser, this.getValidRetreatRegions());
            }
        }
    }

    onSelectRegionFinish(_house: House, retreatRegion: Region): void {
        const loserCombatData = this.postCombat.loserCombatData;
        const army = loserCombatData.army;
        this.retreatRegion = retreatRegion;

        // Check if this retreat region require casualties
        const casualties = this.getCasualtiesOfRetreatRegion(retreatRegion);
        if (casualties > 0) {
            // The loser must sacrifice some of their units
            this.setChildGameState(new SelectUnitsGameState(this)).firstStart(this.postCombat.loser, army, casualties);
            return;
        }

        // Otherwise, proceed with no casualties
        this.onSelectUnitsEnd(this.postCombat.loser, []);
    }

    onSelectUnitsEnd(loser: House, selectedUnits: [Region, Unit[]][]): void {
        // Kill the casualties of the retreat selected by the loser
        selectedUnits.forEach(([region, units]) => {
            units.forEach(u => region.units.delete(u.id));
            this.postCombat.loserCombatData.army = _.difference(this.postCombat.loserCombatData.army, units);

            this.entireGame.broadcastToClients({
                type: "combat-change-army",
                house: this.postCombat.loser.id,
                region: this.postCombat.loserCombatData.region.id,
                army: this.postCombat.loserCombatData.army.map(u => u.id)
            });

            this.entireGame.broadcastToClients({
                type: "remove-units",
                regionId: this.postCombat.loserCombatData.region.id,
                unitIds: units.map(u => u.id)
            });
        });

        const armyLeft = this.postCombat.loserCombatData.army;

        if (armyLeft.length > 0) {
            // Mark those as wounded
            armyLeft.forEach(u => u.wounded = true);

            this.entireGame.broadcastToClients({
                type: "units-wounded",
                regionId: this.postCombat.loserCombatData.region.id,
                unitIds: armyLeft.map(u => u.id)
            });

            // Retreat those unit to this location
            armyLeft.forEach(u => this.postCombat.loserCombatData.region.units.delete(u.id));
            armyLeft.forEach(u => this.retreatRegion.units.set(u.id, u));

            this.entireGame.broadcastToClients({
                type: "move-units",
                from: this.postCombat.loserCombatData.region.id,
                to: this.retreatRegion.id,
                units: armyLeft.map(u => u.id)
            });
        }

        this.postCombat.onResolveRetreatFinish();
    }

    getOverridenRetreatLocationChooser(retreater: House): House | null {
        return this.combat.getOrderResolutionHouseCard().reduce((s, h) => {
            const houseCard = this.combat.houseCombatDatas.get(h).houseCard;

            if (houseCard == null) {
                return s;
            }

            return houseCard.ability && !s ? houseCard.ability.overrideRetreatLocationChooser(this.postCombat, h, houseCard, retreater) : s;
        }, null);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    getValidRetreatRegions(): Region[] {
        return this.world.getValidRetreatRegions(
            this.combat.defendingRegion,
            this.postCombat.loser,
            this.postCombat.loserCombatData.army
        );
    }

    getCasualtiesOfRetreatRegion(retreatRegion: Region): number {
        // To find the number of casualties that a specific retreat region will inflict,
        // simulate a movement of an increasing number of units and find at which number of units
        // the user has too much armies for their supplies.
        // This number represents the number of units the player will be able to keep.
        // Assumption: all units have the same weight when it comes to supply.
        const retreatingArmy = this.postCombat.loserCombatData.army;

        const indexTooMuch = retreatingArmy.findIndex((_, i) => {
            const retreatingUnits = retreatingArmy.slice(0, i + 1);
            
            return this.game.hasTooMuchArmies(
                this.postCombat.loser,
                new BetterMap([[retreatRegion, retreatingUnits.map(u => u.type)]]),
                new BetterMap([[this.postCombat.loserCombatData.region, retreatingUnits]])
            );
        });

        if (indexTooMuch > -1) {
            return retreatingArmy.length - indexTooMuch;
        } else {
            return 0;
        }
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedResolveRetreatGameState {
        return {
            type: "resolve-retreat",
            retreatRegion: this.retreatRegion ? this.retreatRegion.id : null,
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(postCombat: PostCombatGameState, data: SerializedResolveRetreatGameState): ResolveRetreatGameState {
        const resolveRetreat = new ResolveRetreatGameState(postCombat);

        if (data.retreatRegion) {
            resolveRetreat.retreatRegion = postCombat.game.world.regions.get(data.retreatRegion);
        }
        resolveRetreat.childGameState = resolveRetreat.deserializeChildGameState(data.childGameState);

        return resolveRetreat;
    }

    deserializeChildGameState(data: SerializedResolveRetreatGameState["childGameState"]): ResolveRetreatGameState["childGameState"] {
        switch (data.type) {
            case "select-region":
                return SelectRegionGameState.deserializeFromServer(this, data);
            case "select-units":
                return SelectUnitsGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedResolveRetreatGameState {
    type: "resolve-retreat";
    retreatRegion: string | null;
    childGameState: SerializedSelectRegionGameState | SerializedSelectUnitsGameState;
}
