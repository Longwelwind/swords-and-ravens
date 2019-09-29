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
import WildlingAttackGameState from "../WildlingAttackGameState";

export default class CrowKillersWildlingVictoryGameState extends WildlingCardEffectInTurnOrderGameState<SelectUnitsGameState<CrowKillersWildlingVictoryGameState>> {

    executeForLowestBidder(house: House): void {
        // Replace all of his knights by footmen
        this.game.world
            .getControlledRegions(house)
            .forEach(r => {
                const knightsToRemove = r.units.values.filter(u => u.type == knight);

                this.transformIntoFootman(house, r, knightsToRemove);
            });

        this.proceedNextHouse(house);
    }

    executeForEveryoneElse(house: House): void {
        const selectableKnights = this.getSelectableKnights(house);

        if (selectableKnights.length > 0) {
            this.setChildGameState(new SelectUnitsGameState(this)).firstStart(house, selectableKnights, 2);
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
        const footmenToAdd = knightsToRemove.map(_ => this.game.createUnit(footman, house));

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

    static deserializeFromServer(wildlingAttack: WildlingAttackGameState, data: SerializedCrowKillersWildlingVictoryGameState): CrowKillersWildlingVictoryGameState {
        const crowKillers = new CrowKillersWildlingVictoryGameState(wildlingAttack);

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
