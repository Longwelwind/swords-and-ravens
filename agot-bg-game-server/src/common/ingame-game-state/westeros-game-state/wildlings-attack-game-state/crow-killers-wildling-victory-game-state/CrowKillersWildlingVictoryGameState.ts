import SelectUnitsGameState, {SerializedSelectUnitsGameState} from "../../../select-units-game-state/SelectUnitsGameState";
import Player from "../../../Player";
import House from "../../../game-data-structure/House";
import WildlingCardEffectInTurnOrderGameState from "../WildlingCardEffectInTurnOrderGameState";
import Unit from "../../../game-data-structure/Unit";
import _ from "lodash";
import {footman, knight} from "../../../game-data-structure/unitTypes";
import Region from "../../../game-data-structure/Region";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import WildlingsAttackGameState from "../WildlingsAttackGameState";
import IngameGameState from "../../../IngameGameState";
import { observable } from "mobx";

export enum CrowKillersStep {
    DEGRADING_KNIGHTS,
    DESTROYING_KNIGHTS
}

export default class CrowKillersWildlingVictoryGameState extends WildlingCardEffectInTurnOrderGameState<SelectUnitsGameState<CrowKillersWildlingVictoryGameState>> {
    @observable
    step: CrowKillersStep = CrowKillersStep.DEGRADING_KNIGHTS;

    static readonly EVERYONE_ELSE_REPLACE_COUNT = 2;

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.ingame;
    }

    executeForLowestBidder(house: House): void {
        // Replace all of his knights by footmen
        const knightsToTransform = this.game.world
            .getControlledRegions(house)
            .filter(r => r.units.values.some(u => u.type == knight))
            .map(r => [r, r.units.values.filter(u => u.type == knight)] as [Region, Unit[]]);

        const flattenedKnights = _.flatMap(knightsToTransform, ([_region, units]) => units);
        const availableFootmanCount = this.game.getAvailableUnitsOfType(house, footman);

        if (flattenedKnights.length <= availableFootmanCount) {
            this.transformSelection(house, knightsToTransform);
        } else {
            this.step = CrowKillersStep.DESTROYING_KNIGHTS;
            this.setChildGameState(new SelectUnitsGameState(this)).firstStart(house, flattenedKnights, flattenedKnights.length - availableFootmanCount);
        }
    }

    executeForEveryoneElse(house: House): void {
        const selectableKnights = this.getSelectableKnights(house);

        if (selectableKnights.length > 0) {
            const count = Math.min(selectableKnights.length, CrowKillersWildlingVictoryGameState.EVERYONE_ELSE_REPLACE_COUNT);

            const availableFootmanCount = this.game.getAvailableUnitsOfType(house, footman);

            if (count <= availableFootmanCount) {
                this.setChildGameState(new SelectUnitsGameState(this)).firstStart(house, selectableKnights, count);
            } else {
                this.step = CrowKillersStep.DESTROYING_KNIGHTS;
                this.setChildGameState(new SelectUnitsGameState(this)).firstStart(house, selectableKnights, count - availableFootmanCount);
            }
        } else {
            this.ingame.log({
                type: "crow-killers-knights-replaced",
                house: house.id,
                units: []
            });

            this.proceedNextHouse(house);
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        if (message.type == "crow-killers-step-changed") {
            this.step = message.newStep;
        }
    }

    onSelectUnitsEnd(house: House, selectedUnits: [Region, Unit[]][]): void {
        if (this.step == CrowKillersStep.DESTROYING_KNIGHTS) {
            const killedUnitCount = this.destroySelection(house, selectedUnits);

            this.step = CrowKillersStep.DEGRADING_KNIGHTS;

            if (house == this.parentGameState.lowestBidder) {
                // We can now safely call executeForLowestBidder and transform all remaining knights
                // as lowestBidder removed enough knights
                this.executeForLowestBidder(house);
            } else {
                const selectableKnights = this.getSelectableKnights(house);
                if (selectableKnights.length > 0 && CrowKillersWildlingVictoryGameState.EVERYONE_ELSE_REPLACE_COUNT - killedUnitCount > 0) {
                    const count = Math.min(selectableKnights.length, CrowKillersWildlingVictoryGameState.EVERYONE_ELSE_REPLACE_COUNT - killedUnitCount);
                    this.ingame.entireGame.broadcastToClients({
                        type: "crow-killers-step-changed",
                        newStep: this.step
                    });
                    this.setChildGameState(new SelectUnitsGameState(this)).firstStart(house, selectableKnights, count);
                } else {
                    this.ingame.log({
                        type: "crow-killers-knights-replaced",
                        house: house.id,
                        units: []
                    });

                    this.proceedNextHouse(house);
                }
            }
        } else if (this.step == CrowKillersStep.DEGRADING_KNIGHTS) {
            this.transformSelection(house, selectedUnits);
        } else {
            throw new Error("Invalid CrowKillersStep received.");
        }
    }

    getSelectableKnights(house: House): Unit[] {
        return _.flatMap(this.game.world.getControlledRegions(house).map(r => r.units.values))
            .filter(u => u.type == knight);
    }

    destroySelection(house: House, selectedUnits: [Region, Unit[]][]): number {
        // Wildlings attacks only happen during Westeros phase and therefore we don't need to remove possible orphaned orders here.
        // Orphaned ship handling is already done globally for all wildling effects in base.proceedNextHouse().

        if (selectedUnits.length == 0) {
            return 0;
        }

        let count = 0;
        selectedUnits.forEach(([region, units]) => {
            count += units.length;
            const unitIdsToDestroy = units.map(u => u.id);
            unitIdsToDestroy.forEach(uid => region.units.delete(uid));

            this.entireGame.broadcastToClients({
                type: "remove-units",
                regionId: region.id,
                unitIds: unitIdsToDestroy
            });
        });

        this.ingame.log({
            type: "crow-killers-knights-killed",
            house: house.id,
            units: selectedUnits.map(([region, knights]) => [region.id, knights.map(k => k.type.id)])
        });

        return count;
    }

    transformSelection(house: House, selectedUnits: [Region, Unit[]][]): void {
        const unitCount = _.flatMap(selectedUnits, ([_region, units]) => units).length;

        if (unitCount > this.game.getAvailableUnitsOfType(house, footman)) {
            throw new Error("Not enough footman for transformation!");
        }

        selectedUnits.forEach(([region, knights]) => this.ingame.transformUnits(region, knights, footman));

        this.ingame.log({
            type: "crow-killers-knights-replaced",
            house: house.id,
            units: selectedUnits.map(([region, knights]) => [region.id, knights.map(k => k.type.id)])
        });

        this.proceedNextHouse(house);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedCrowKillersWildlingVictoryGameState {
        return {
            type: "crow-killers-wildling-victory",
            childGameState: this.childGameState.serializeToClient(admin, player),
            step: this.step
        }
    }

    static deserializeFromServer(wildlingsAttack: WildlingsAttackGameState, data: SerializedCrowKillersWildlingVictoryGameState): CrowKillersWildlingVictoryGameState {
        const crowKillers = new CrowKillersWildlingVictoryGameState(wildlingsAttack);

        crowKillers.childGameState = crowKillers.deserializeChildGameState(data.childGameState);
        crowKillers.step = data.step;

        return crowKillers;
    }

    deserializeChildGameState(data: SerializedCrowKillersWildlingVictoryGameState["childGameState"]): CrowKillersWildlingVictoryGameState["childGameState"] {
        return SelectUnitsGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedCrowKillersWildlingVictoryGameState {
    type: "crow-killers-wildling-victory";
    childGameState: SerializedSelectUnitsGameState;
    step: CrowKillersStep;
}
