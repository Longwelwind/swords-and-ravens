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

export default class ResolveRetreatGameState extends GameState<
    PostCombatGameState,
    SelectRegionGameState<ResolveRetreatGameState> | SelectUnitsGameState<ResolveRetreatGameState>
> {

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
        // Todo: Take supply into account when retreating
        const loserCombatData = this.postCombat.loserCombatData;
        const army = loserCombatData.army;
        // Mark those as wounded
        army.forEach(u => u.wounded = true);

        this.entireGame.broadcastToClients({
            type: "units-wounded",
            regionId: loserCombatData.region.id,
            unitIds: army.map(u => u.id)
        });

        // Retreat those unit to this location
        army.forEach(u => loserCombatData.region.units.delete(u.id));
        army.forEach(u => retreatRegion.units.set(u.id, u));

        this.entireGame.broadcastToClients({
            type: "move-units",
            from: loserCombatData.region.id,
            to: retreatRegion.id,
            units: army.map(u => u.id)
        });

        this.postCombat.onResolveRetreatFinish();
    }

    onSelectUnitsEnd(_house: House, _selectedUnit: [Region, Unit[]][]): void {
        // Todo
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

    serializeToClient(admin: boolean, player: Player | null): SerializedResolveRetreatGameState {
        return {
            type: "resolve-retreat",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(postCombat: PostCombatGameState, data: SerializedResolveRetreatGameState): ResolveRetreatGameState {
        const resolveRetreat = new ResolveRetreatGameState(postCombat);

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
    childGameState: SerializedSelectRegionGameState | SerializedSelectUnitsGameState;
}
