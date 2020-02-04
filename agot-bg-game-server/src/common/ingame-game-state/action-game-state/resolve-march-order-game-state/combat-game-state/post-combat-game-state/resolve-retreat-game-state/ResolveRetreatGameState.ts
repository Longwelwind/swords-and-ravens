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
        // House cards may override the chooser of the retreat location
        // and this has to be considered when getting valid retreat regions
        const overridenChooser = this.getOverridenRetreatLocationChooser(this.postCombat.loser);
        const finalChooser = overridenChooser ? overridenChooser : this.postCombat.loser;

        const possibleRetreatRegions = this.getValidRetreatRegions(
            this.combat.attackingRegion,
            this.combat.defendingRegion,
            this.combat.attacker,
            this.postCombat.loser,
            this.combat.attackingArmy,
            this.postCombat.loserCombatData.army,
            finalChooser
        );

        if (possibleRetreatRegions.length == 0) {
            // No retreat regions available
            if (this.combat.attacker == this.postCombat.loser) {
                // If attacker lost all units from attacking region will be destroyed
                this.destroyAllUnits(this.combat.attackingRegion);
            } else {
                // If defender lost all units from defender are destroyed
                this.destroyAllUnits(this.combat.defendingRegion);
            }

            this.postCombat.onResolveRetreatFinish();
            return;
        } else if (possibleRetreatRegions.length == 1) {
            // The units can retreat automatically
            this.onSelectRegionFinish(finalChooser, possibleRetreatRegions[0]);
        } else {
            this.setChildGameState(new SelectRegionGameState(this))
                    .firstStart(finalChooser, possibleRetreatRegions);
        }
    }

    private destroyAllUnits(region: Region) {
        // todo: retreat not possible and all killed units

        const unitsToKill = region.units.values.map(u => u.id);
        unitsToKill.forEach(uid => region.units.delete(uid));

        this.entireGame.broadcastToClients({
            type: "remove-units",
            regionId: region.id,
            unitIds: unitsToKill
        });
    }

    onSelectRegionFinish(_house: House, retreatRegion: Region): void {
        const loserCombatData = this.postCombat.loserCombatData;
        const army = loserCombatData.army;
        this.retreatRegion = retreatRegion;

        // Check if this retreat region require casualties
        const casualties = this.getCasualtiesOfRetreatRegion(retreatRegion);

        // todo: pass house to selectunitsgamestate to log who decided the retreat
        if (casualties > 0) {
            // The loser must sacrifice some of their units
            this.setChildGameState(new SelectUnitsGameState(this)).firstStart(this.postCombat.loser, army, casualties);
            return;
        }

        // todo: pass the house to on selectunitsend to log who decided the retreat
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

            // todo: send units that have been killed by this retreat
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

            // todo: send units that retreat and where
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

    getValidRetreatRegions(attackingRegion: Region, defendingRegion: Region, attacker: House, loser: House, attackingArmy: Unit[], loserArmy: Unit[], finalChooser: House): Region[] {
        let possibleRetreatRegions = this.world.getValidRetreatRegions(
            defendingRegion,
            loser,
            loserArmy
        );

        if(attacker == loser) {
            // Attacker lost the battle. Check if he can retreat back to the attacking region.
            // Because it might be blocked for retreat if ...
            const attackingRegionIsBlockedForRetreat =
            // ... attacking region is a capital ...
            attackingRegion.superControlPowerToken != null
            // ... but not the attackers capital and ...
            && attackingRegion.superControlPowerToken != attacker
            // ... attacker left no Power Token and ...
            && attackingRegion.controlPowerToken != attacker
            // ... all units marched to combat
            && attackingArmy.length == attackingRegion.units.size;

            if(finalChooser == attacker) {
                // Final chooser is the attacker himself
                possibleRetreatRegions = attackingRegionIsBlockedForRetreat
                    // If attacking region is blocked there is no possible retreat area.
                    ? []
                    // Otherwise there is only the attacking region
                    : [attackingRegion];

                    // We can omit the supply check as attacker will never exceed supply by retreating back to the attacking region
                return possibleRetreatRegions;
            } else {
                // Final chooser is someone else.
                // He can decide to retreat the units to a valid region adjacent to the combat
                if (attackingRegionIsBlockedForRetreat) {
                    // But if attacking region is blocked it must be filtered out
                    possibleRetreatRegions = possibleRetreatRegions.filter(r => r != attackingRegion);
                }
            }
        }
        // No need for else path here.
        // If defender lost the battle he or the final chooser
        // has to choose a retreat region from possible retreat regions

        // Now take supply into account and calculate the casualty values per possible retreat region
        const casualtiesPerRegion =
            possibleRetreatRegions.map(r => [r, this.getCasualtiesOfRetreatRegion(r)] as [Region, number]);

        // Get lowest casualty value
        const lowestCasualty = _.min(_.flatMap(casualtiesPerRegion.map(([_, c]) => c)));

        // Filter regions for lowest casualty value
        return casualtiesPerRegion.filter(([_, c]) => c == lowestCasualty).map(([r, _]) => r);
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
                new BetterMap([[this.postCombat.loserCombatData.region, retreatingArmy]])
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
