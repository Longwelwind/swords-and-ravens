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

export default class CrowKillersWildlingVictoryGameState extends WildlingCardEffectInTurnOrderGameState<SelectUnitsGameState<CrowKillersWildlingVictoryGameState>> {
    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.ingame;
    }

    executeForLowestBidder(house: House): void {
        // Replace all of his knights by footmen
        const knightsToTransform = this.game.world
            .getControlledRegions(house)
            .filter(r => r.units.values.some(u => u.type == knight))
            .map(r => [r, r.units.values.filter(u => u.type == knight)] as [Region, Unit[]]);

        knightsToTransform.forEach(([region, knights]) => this.transformIntoFootman(house, region, knights));

        this.ingame.log({
            type: "crow-killers-knights-replaced",
            house: house.id,
            units: knightsToTransform.map(([region, knights]) => [region.id, knights.map(k => k.type.id)])
        });

        this.proceedNextHouse(house);
    }

    executeForEveryoneElse(house: House): void {
        const selectableKnights = this.getSelectableKnights(house);

        if (selectableKnights.length > 0) {
            const count = Math.min(selectableKnights.length, 2);

            this.setChildGameState(new SelectUnitsGameState(this)).firstStart(house, selectableKnights, count);
        } else {
            this.proceedNextHouse(house);
        }
    }

    transformIntoFootman(house: House, region: Region, knightsToRemove: Unit[]): void {
        knightsToRemove.forEach(u => region.units.delete(u.id));

        this.entireGame.broadcastToClients({
            type: "remove-units",
            regionId: region.id,
            unitIds: knightsToRemove.map(k => k.id)
        });

        // Replace them by footman
        const footmenToAdd = knightsToRemove.map(_ => this.game.createUnit(region, footman, house));

        footmenToAdd.forEach(u => region.units.set(u.id, u));

        this.entireGame.broadcastToClients({
            type: "add-units",
            units: [[region.id, footmenToAdd.map(u => u.serializeToClient())]]
        });
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(_message: ServerMessage): void { }

    onSelectUnitsEnd(house: House, selectedUnits: [Region, Unit[]][]): void {
        selectedUnits.forEach(([region, knights]) => {
            this.transformIntoFootman(house, region, knights);
        });

        this.ingame.log({
            type: "crow-killers-knights-replaced",
            house: house.id,
            units: selectedUnits.map(([region, knights]) => [region.id, knights.map(k => k.type.id)])
        });

        this.proceedNextHouse(house);
    }

    getSelectableKnights(house: House): Unit[] {
        return _.flatMap(this.game.world.getControlledRegions(house).map(r => r.units.values))
            .filter(u => u.type == knight);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedCrowKillersWildlingVictoryGameState {
        return {
            type: "crow-killers-wildling-victory",
            childGameState: this.childGameState.serializeToClient(admin, player)
        }
    }

    static deserializeFromServer(wildlingsAttack: WildlingsAttackGameState, data: SerializedCrowKillersWildlingVictoryGameState): CrowKillersWildlingVictoryGameState {
        const crowKillers = new CrowKillersWildlingVictoryGameState(wildlingsAttack);

        crowKillers.childGameState = crowKillers.deserializeChildGameState(data.childGameState);

        return crowKillers;
    }

    deserializeChildGameState(data: SerializedCrowKillersWildlingVictoryGameState["childGameState"]): CrowKillersWildlingVictoryGameState["childGameState"] {
        return SelectUnitsGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedCrowKillersWildlingVictoryGameState {
    type: "crow-killers-wildling-victory";
    childGameState: SerializedSelectUnitsGameState;
}
