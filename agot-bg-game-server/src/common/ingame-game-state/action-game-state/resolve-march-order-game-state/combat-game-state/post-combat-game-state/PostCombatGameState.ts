import GameState from "../../../../../GameState";
import CombatGameState from "../CombatGameState";
import ChooseRetreatRegionGameState, {SerializedChooseRetreatRegionGameState} from "./choose-retreat-region-game-state/ChooseRetreatRegionGameState";
import Player from "../../../../Player";
import House from "../../../../game-data-structure/House";
import * as _ from "lodash";
import ChooseCasualtiesGameState, {SerializedChooseCasualtiesGameState} from "./choose-casualties-game-state/ChooseCasualtiesGameState";
import Game from "../../../../game-data-structure/Game";
import World from "../../../../game-data-structure/World";
import HouseCard, {HouseCardState} from "../../../../game-data-structure/house-card/HouseCard";
import Region from "../../../../game-data-structure/Region";
import Unit from "../../../../game-data-structure/Unit";
import {ClientMessage} from "../../../../../../messages/ClientMessage";
import {ServerMessage} from "../../../../../../messages/ServerMessage";
import AfterWinnerDeterminationGameState
    , {SerializedAfterWinnerDeterminationGameState} from "./after-winner-determination-game-state/AfterWinnerDeterminationGameState";

export default class PostCombatGameState extends GameState<
    CombatGameState, ChooseRetreatRegionGameState | ChooseCasualtiesGameState | AfterWinnerDeterminationGameState
> {
    winner: House;
    loser: House;

    get combat(): CombatGameState {
        return this.parentGameState;
    }

    get game(): Game {
        return this.combat.game;
    }

    get world(): World {
        return this.game.world;
    }

    get attacker(): House {
        return this.combat.attacker;
    }

    get defender(): House {
        return this.combat.defender;
    }

    firstStart(): void {
        const attackerTotalStrength = this.combat.getTotalCombatStrength(this.attacker);
        const defenderTotalStrength = this.combat.getTotalCombatStrength(this.defender);

        this.winner = attackerTotalStrength > defenderTotalStrength
            ? this.attacker
            : defenderTotalStrength > attackerTotalStrength
                ? this.defender
                : this.game.whoIsAheadInTrack(this.game.fiefdomsTrack, this.attacker, this.defender);
        this.loser = this.winner == this.attacker ? this.defender : this.attacker;

        this.combat.ingameGameState.log({
            type: "combat-result",
            winner: this.winner.id,
            stats: [this.attacker, this.defender].map(h => {
                const houseCard = this.combat.houseCombatDatas.get(h).houseCard;

                return {
                    house: h.id,
                    region: this.combat.houseCombatDatas.get(h).region.id,
                    army: this.combat.getBaseCombatStrength(h),
                    orderBonus: this.combat.getOrderBonus(h),
                    support: this.combat.getSupportStrengthForSide(h),
                    houseCard: houseCard ? houseCard.id : null,
                    houseCardStrength: this.combat.getHouseCardCombatStrength(h),
                    valyrianSteelBlade: this.combat.getValyrianBladeBonus(h),
                    total: this.combat.getTotalCombatStrength(h)
                }
            })
        });

        this.setChildGameState(new AfterWinnerDeterminationGameState(this)).firstStart();
    }

    onChooseCasualtiesGameStateEnd(region: Region, selectedCasualties: Unit[]): void {
        // Remove the selected casualties
        selectedCasualties.forEach(u => region.units.delete(u.id));

        this.entireGame.broadcastToClients({
            type: "remove-units",
            regionId: region.id,
            unitIds: selectedCasualties.map(u => u.id)
        });

        if (this.loser == this.defender) {
            this.proceedRetreat();
            return;
        }

        this.proceedEndOfCombat();
    }

    onAfterWinnerDeterminationFinish(): void {

        const locationLoserArmy = this.attacker == this.loser ? this.combat.attackingRegion : this.combat.defendingRegion;
        const loserArmy = this.attacker == this.loser ? this.combat.attackingArmy : this.combat.defendingArmy;

        const winnerSwordIcons = this.attacker == this.winner
            ? this.combat.getHouseCardSwordIcons(this.attacker)
            : this.combat.getHouseCardSwordIcons(this.defender);
        const loserTowerIcons = this.attacker == this.loser
            ? this.combat.getHouseCardTowerIcons(this.attacker)
            : this.combat.getHouseCardTowerIcons(this.defender);

        const loserCasualtiesCount = Math.max(0, winnerSwordIcons - loserTowerIcons);

        // All units of the loser army that can't retreat or are wounded are immediately killed
        const immediatelyKilledLoserUnits = loserArmy.filter(u => u.wounded || !u.type.canRetreat);

        if (immediatelyKilledLoserUnits.length > 0) {
            immediatelyKilledLoserUnits.forEach(u => locationLoserArmy.units.delete(u.id));

            this.entireGame.broadcastToClients({
                type: "combat-immediately-killed-units",
                regionId: locationLoserArmy.id,
                unitIds: immediatelyKilledLoserUnits.map(u => u.id)
            });
        }

        const loserArmyLeft = _.difference(loserArmy, immediatelyKilledLoserUnits);

        if (loserCasualtiesCount > 0) {
            if (loserCasualtiesCount < loserArmyLeft.length) {
                this.setChildGameState(new ChooseCasualtiesGameState(this)).firstStart(this.loser, loserArmyLeft, loserCasualtiesCount);
            } else {
                // If the count of casualties is bigger or equal than the remaining army, a ChooseCasualtiesGameSTate
                // is not needed. The army left can be exterminated.
                this.onChooseCasualtiesGameStateEnd(locationLoserArmy, loserArmyLeft);
            }
        } else {
            this.proceedRetreat();
        }
    }

    proceedRetreat(): void {
        if (!this.loser) {
            throw new Error();
        }

        if (this.loser == this.defender) {
            // A retreat doesn't need to be done if there are no units left
            if (this.combat.defendingRegion.units.size > 0) {
                if (this.world.getValidRetreatRegions(this.combat.defendingRegion, this.loser, this.combat.defendingRegion.units.values).length > 0) {
                    // The defender must choose a retreat location
                    this.setChildGameState(new ChooseRetreatRegionGameState(this))
                        .firstStart(
                            this.loser,
                            this.combat.defendingRegion,
                            this.combat.defendingRegion.units.values
                        );

                    return;
                } else {
                    // If there are no available retreat regions, kill all the remaining units
                    this.combat.defendingRegion.units.values.forEach(u => this.combat.defendingRegion.units.delete(u.id));

                    this.entireGame.broadcastToClients({
                        type: "remove-units",
                        regionId: this.combat.defendingRegion.id,
                        unitIds: this.combat.defendingRegion.units.values.map(u => u.id)
                    });
                }
            }
        }

        this.proceedEndOfCombat();
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    onChooseRetreatLocationGameStateEnd(house: House, startingRegion: Region, army: Unit[], retreatRegion: Region): void {
        // Mark those as wounded
        army.forEach(u => u.wounded = true);

        this.entireGame.broadcastToClients({
            type: "units-wounded",
            regionId: startingRegion.id,
            unitIds: army.map(u => u.id)
        });

        // Retreat those unit to this location
        army.forEach(u => startingRegion.units.delete(u.id));
        army.forEach(u => retreatRegion.units.set(u.id, u));

        this.entireGame.broadcastToClients({
            type: "move-units",
            from: startingRegion.id,
            to: retreatRegion.id,
            units: army.map(u => u.id)
        });

        this.proceedEndOfCombat();
    }

    proceedEndOfCombat(): void {
        // If the attacker won, move his units to the attacked region
        if (this.winner == this.attacker) {
            this.combat.resolveMarchOrderGameState.moveUnits(this.combat.attackingRegion, this.combat.attackingArmy, this.combat.defendingRegion);
        } else {
            // If he lost, wound his units
            this.combat.attackingArmy.forEach(u => u.wounded = true);

            this.entireGame.broadcastToClients({
                type: "units-wounded",
                regionId: this.combat.attackingRegion.id,
                unitIds: this.combat.attackingArmy.map(u => u.id)
            });
        }

        // Remove the order
        // The order may not be present in the attacking region, e.g. with Loras Tyrell
        if (this.combat.actionGameState.ordersOnBoard.has(this.combat.attackingRegion)) {
            this.combat.actionGameState.ordersOnBoard.delete(this.combat.attackingRegion);
            this.entireGame.broadcastToClients({
                type: "action-phase-change-order",
                region: this.combat.attackingRegion.id,
                order: null
            });
        }

        // Put the house cards as used, and if it's the last, retrieve all house cards.
        this.combat.houseCombatDatas.forEach(({houseCard}, house) => this.markHouseAsUsed(house, houseCard));

        this.combat.resolveMarchOrderGameState.onCombatGameStateEnd(this.attacker);
    }

    markHouseAsUsed(house: House, houseCard: HouseCard | null): void {
        if (houseCard) {
            houseCard.state = HouseCardState.USED;

            this.entireGame.broadcastToClients({
                type: "change-state-house-card",
                houseId: house.id,
                cardIds: [houseCard.id],
                state: HouseCardState.USED
            });
        }

        // If all cards are used or discarded, put all used as available,
        // except the one that has been used.
        if (house.houseCards.values.every(hc => hc.state == HouseCardState.USED || hc.state == HouseCardState.DISCARDED)) {
            const houseCardsToMakeAvailable = house.houseCards.values
                .filter(hc => hc != houseCard)
                .filter(hc => hc.state == HouseCardState.USED);

            houseCardsToMakeAvailable.forEach(hc => hc.state = HouseCardState.AVAILABLE);

            this.entireGame.broadcastToClients({
                type: "change-state-house-card",
                houseId: house.id,
                cardIds: houseCardsToMakeAvailable.map(hc => hc.id),
                state: HouseCardState.AVAILABLE
            });
        }
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedPostCombatGameState {
        return {
            type: "post-combat",
            winner: this.winner.id,
            loser: this.loser.id,
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(combat: CombatGameState, data: SerializedPostCombatGameState): PostCombatGameState {
        const postCombat = new PostCombatGameState(combat);

        postCombat.winner = combat.game.houses.get(data.winner);
        postCombat.loser = combat.game.houses.get(data.loser);
        postCombat.childGameState = postCombat.deserializeChildGameState(data.childGameState);

        return postCombat;
    }

    deserializeChildGameState(data: SerializedPostCombatGameState["childGameState"]): PostCombatGameState["childGameState"] {
        switch (data.type) {
            case "choose-retreat-region":
                return ChooseRetreatRegionGameState.deserializeFromServer(this, data);
            case "choose-casualties":
                return ChooseCasualtiesGameState.deserializeFromServer(this, data);
            case "after-winner-determination":
                return AfterWinnerDeterminationGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedPostCombatGameState {
    type: "post-combat";
    winner: string;
    loser: string;
    childGameState: SerializedChooseRetreatRegionGameState
        | SerializedChooseCasualtiesGameState
        | SerializedAfterWinnerDeterminationGameState;
}
