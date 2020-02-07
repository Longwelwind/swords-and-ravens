import WildlingAttackGameState from "../WildlingAttackGameState";
import Player from "../../../Player";
import {ClientMessage} from "../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../messages/ServerMessage";
import Game from "../../../game-data-structure/Game";
import SelectUnitsGameState, {SerializedSelectUnitsGameState} from "../../../select-units-game-state/SelectUnitsGameState";
import WildlingCardEffectInTurnOrderGameState from "../WildlingCardEffectInTurnOrderGameState";
import Region from "../../../game-data-structure/Region";
import Unit from "../../../game-data-structure/Unit";
import House from "../../../game-data-structure/House";
import _ from "lodash";
import IngameGameState from "../../../IngameGameState";

export default class TheHordeDescendsWildlingVictoryGameState extends WildlingCardEffectInTurnOrderGameState<
    SelectUnitsGameState<TheHordeDescendsWildlingVictoryGameState>
> {
    get game(): Game {
        return this.parentGameState.game;
    }

    get wildlingAttack(): WildlingAttackGameState {
        return this.parentGameState;
    }

    get ingame(): IngameGameState {
        return this.parentGameState.parentGameState.ingame;
    }

    executeForLowestBidder(house: House): void {
        const strongholdUnits = _.flatMap(
            this.game.getUnitsOfHouse(house).filter(([region, _]) => region.hasStructure).map(([_, units]) => units)
        );

        if (strongholdUnits.length >= 2) {
            this.setChildGameState(new SelectUnitsGameState(this)).firstStart(house, strongholdUnits, 2);
        } else {
            const units = this.game.world.getUnitsOfHouse(house);

            const count = Math.min(2, units.length);

            if (count == 0) {
                this.proceedNextHouse(house);
                return;
            }

            this.setChildGameState(new SelectUnitsGameState(this)).firstStart(house, units, count);
        }
    }

    executeForEveryoneElse(house: House): void {
        const units = this.game.world.getUnitsOfHouse(house);

        if (units.length == 0) {
            this.proceedNextHouse(house);
            return;
        }

        this.setChildGameState(new SelectUnitsGameState(this)).firstStart(house, units, 1);
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    onSelectUnitsEnd(house: House, selectedUnits: [Region, Unit[]][]): void {
        selectedUnits.forEach(([region, units]) => {
            units.forEach(u => region.units.delete(u.id));

            this.entireGame.broadcastToClients({
                type: "remove-units",
                unitIds: units.map(u => u.id),
                regionId: region.id
            });
        });

        this.ingame.log({
            type: "the-horde-descends-units-killed",
            house: house.id,
            units: selectedUnits.map(([region, units]) => [region.id, units.map(u => u.type.id)])
        });

        this.proceedNextHouse(house);
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedTheHordeDescendsWildlingVictoryGameState {
        return {
            type: "the-horde-descends-wildling-victory",
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(wildlingAttack: WildlingAttackGameState, data: SerializedTheHordeDescendsWildlingVictoryGameState): TheHordeDescendsWildlingVictoryGameState {
        const theHordeDescends = new TheHordeDescendsWildlingVictoryGameState(wildlingAttack);

        theHordeDescends.childGameState = theHordeDescends.deserializeChildGameState(data.childGameState);

        return theHordeDescends;
    }

    deserializeChildGameState(data: SerializedTheHordeDescendsWildlingVictoryGameState["childGameState"]): TheHordeDescendsWildlingVictoryGameState["childGameState"] {
        return SelectUnitsGameState.deserializeFromServer(this, data);
    }
}

export interface SerializedTheHordeDescendsWildlingVictoryGameState {
    type: "the-horde-descends-wildling-victory";
    childGameState: SerializedSelectUnitsGameState;
}
