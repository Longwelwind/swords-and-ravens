import GameState from "../../../../../GameState";
import CombatGameState, {HouseCombatData} from "../CombatGameState";
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
import AfterCombatHouseCardAbilitiesGameState
    , {SerializedAfterCombatHouseCardAbilitiesGameState} from "./after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";
import ResolveRetreatGameState, {SerializedResolveRetreatGameState} from "./resolve-retreat-game-state/ResolveRetreatGameState";
import BetterMap from "../../../../../../utils/BetterMap";
import { TidesOfBattleCard } from "../../../../game-data-structure/static-data-structure/tidesOfBattleCards";
import { NotificationType } from "../../../../../EntireGame";

export default class PostCombatGameState extends GameState<
    CombatGameState,
    ResolveRetreatGameState | ChooseCasualtiesGameState | AfterWinnerDeterminationGameState
    | AfterCombatHouseCardAbilitiesGameState
> {
    winner: House;
    loser: House;
    originalLoser: House | null = null;
    resolvedSkullIcons: House[] = [];

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

    get loserCombatData(): HouseCombatData {
        return this.combat.houseCombatDatas.get(this.loser);
    }

    get winnerCombatData(): HouseCombatData {
        return this.combat.houseCombatDatas.get(this.winner);
    }

    firstStart(): void {
        // Final combat strength can't be negative but only attacker is able to generate a negative final combat strength
        const attackerTotalStrength = Math.max(this.combat.getTotalCombatStrength(this.attacker), 0);
        const defenderTotalStrength = this.combat.getTotalCombatStrength(this.defender);

        this.winner = attackerTotalStrength > defenderTotalStrength
            ? this.attacker
            : defenderTotalStrength > attackerTotalStrength
                ? this.defender
                : this.game.whoIsAheadInTrack(this.game.fiefdomsTrack, this.attacker, this.defender);
        this.loser = this.winner == this.attacker ? this.defender : this.attacker;

        this.combat.stats = [this.attacker, this.defender].map(h => {
            const houseCard = this.combat.houseCombatDatas.get(h).houseCard;
            const tidesOfBattleCard = this.combat.houseCombatDatas.get(h).tidesOfBattleCard;

            return {
                house: h.id,
                region: this.combat.houseCombatDatas.get(h).region.id,
                army: this.combat.getBaseCombatStrength(h),
                armyUnits: this.combat.houseCombatDatas.get(h).army.filter(u => !u.wounded).map(u => u.type.id),
                woundedUnits: this.combat.houseCombatDatas.get(h).army.filter(u => u.wounded).map(u => u.type.id),
                orderBonus: this.combat.getOrderBonus(h),
                support: this.combat.getSupportStrengthForSide(h),
                garrison: this.combat.getGarrisonCombatStrength(h),
                houseCard: houseCard ? houseCard.id : null,
                houseCardStrength: this.combat.getHouseCardCombatStrength(h),
                valyrianSteelBlade: this.combat.getValyrianBladeBonus(h),
                tidesOfBattleCard: tidesOfBattleCard === undefined ? undefined : tidesOfBattleCard ? tidesOfBattleCard.id : null,
                total: Math.max(this.combat.getTotalCombatStrength(h), 0),
                isWinner: this.winner == h
            }
        });

        this.entireGame.broadcastToClients({
            type: "update-combat-stats",
            stats: this.combat.stats
        });

        this.combat.ingameGameState.log({
            type: "combat-result",
            winner: this.winner.id,
            stats: this.combat.stats
        });

        this.combat.houseCombatDatas.forEach(({houseCard}, house) => {
            this.markHouseCardAsUsed(house, houseCard);
        });

        this.proceedAfterWinnerDetermination();
    }

    onChooseCasualtiesGameStateEnd(house: House, region: Region, selectedCasualties: Unit[], resolvedAutomatically: boolean): void {
        // If there is just a garrison, the selectedCasualties might be an empty array here
        if (selectedCasualties.length > 0) {
            this.combat.ingameGameState.log(
                {
                    type: "killed-after-combat",
                    house: house.id,
                    killed: selectedCasualties.map(u => u.type.id)
                }, resolvedAutomatically);

            // Remove the selected casualties
            selectedCasualties.forEach(u => region.units.delete(u.id));
            // Remove them from the house combat datas
            const hcd = this.combat.houseCombatDatas.get(house);
            hcd.army = _.without(hcd.army, ...selectedCasualties);

            this.entireGame.broadcastToClients({
                type: "combat-change-army",
                region: region.id,
                house: house.id,
                army: hcd.army.map(u => u.id)
            });

            this.combat.ingameGameState.broadcastRemoveUnits(region, selectedCasualties);
        }

        this.proceedSkullIconHandling();
    }

    proceedCasualties(): void {
        // If there was a defeated garrison, remove it
        if (this.loser == this.combat.defender && this.combat.defendingRegion.garrison > 0) {
            const oldGarrisonStrength = this.combat.defendingRegion.garrison;
            this.combat.defendingRegion.garrison = 0;

            this.combat.ingameGameState.sendMessageToUsersWhoCanSeeRegion({
                type: "change-garrison",
                region: this.combat.defendingRegion.id,
                newGarrison: 0
            }, this.combat.defendingRegion);

            this.parentGameState.ingameGameState.log({
                type: "garrison-removed",
                region: this.combat.defendingRegion.id,
                strength: oldGarrisonStrength
            });
        }

        const locationLoserArmy = this.loserCombatData.region;

        const winnerSwordIcons = this.attacker == this.winner
            ? this.combat.getHouseCardSwordIcons(this.attacker)
                + (this.combat.attackerTidesOfBattleCard ? this.combat.attackerTidesOfBattleCard.swordIcons : 0)
            : this.combat.getHouseCardSwordIcons(this.defender)
                + (this.combat.defenderTidesOfBattleCard ? this.combat.defenderTidesOfBattleCard.swordIcons : 0);

        const loserTowerIcons = this.attacker == this.loser
            ? this.combat.getHouseCardTowerIcons(this.attacker)
                + (this.combat.attackerTidesOfBattleCard ? this.combat.attackerTidesOfBattleCard.towerIcons : 0)
            : this.combat.getHouseCardTowerIcons(this.defender)
                + (this.combat.defenderTidesOfBattleCard ? this.combat.defenderTidesOfBattleCard.towerIcons : 0);

        // All units of the loser army that can't retreat or are wounded are immediately killed
        this.destroyUnitsWhichCannotRetreatOrAreWounded();

        const loserArmyLeft = this.loserCombatData.army;
        const maxLoserCasualtiesCount = Math.max(0, winnerSwordIcons - loserTowerIcons);
        const loserCasualtiesCount = Math.min(maxLoserCasualtiesCount, loserArmyLeft.length);

        if (loserCasualtiesCount > 0) {
            // Check if casualties are prevented this combat
            if (!this.combat.areCasualtiesPrevented(this.loser)) {
                if (loserCasualtiesCount < loserArmyLeft.length) {
                    this.setChildGameState(new ChooseCasualtiesGameState(this)).firstStart(this.loser, loserArmyLeft, loserCasualtiesCount);
                } else {
                    // If the count of casualties is bigger or equal than the remaining army, a ChooseCasualtiesGameState
                    // is not needed. The army left can be exterminated.
                    this.onChooseCasualtiesGameStateEnd(this.loser, locationLoserArmy, loserArmyLeft, true);
                }
                return;
            } else {
                this.combat.ingameGameState.log({
                    type: "casualties-prevented",
                    house: this.loser.id,
                    houseCard: (this.combat.houseCombatDatas.get(this.loser).houseCard as HouseCard).id
                });
            }
        }

        this.proceedSkullIconHandling();
    }

    destroyUnitsWhichCannotRetreatOrAreWounded(): void {
        const loserArmy = this.loserCombatData.army;
        const locationLoserArmy = this.loserCombatData.region;
        const immediatelyKilledLoserUnits = loserArmy.filter(u => u.wounded || !u.type.canRetreat);

        if (immediatelyKilledLoserUnits.length > 0) {
            this.combat.ingameGameState.log(
                {
                    type: "immediatly-killed-after-combat",
                    house: this.loser.id,
                    killedBecauseWounded: immediatelyKilledLoserUnits.filter(u => u.wounded).map(u => u.type.id),
                    killedBecauseCantRetreat: immediatelyKilledLoserUnits.filter(u => !u.type.canRetreat).map(u => u.type.id)
                }
            );

            this.loserCombatData.army = _.difference(this.loserCombatData.army, immediatelyKilledLoserUnits);
            this.entireGame.broadcastToClients({
                type: "combat-change-army",
                house: this.loser.id,
                region: locationLoserArmy.id,
                army: this.loserCombatData.army.map(u => u.id)
            });

            immediatelyKilledLoserUnits.forEach(u => locationLoserArmy.units.delete(u.id));
            this.combat.ingameGameState.broadcastRemoveUnits(locationLoserArmy, immediatelyKilledLoserUnits);
        }
    }

    proceedSkullIconHandling(): void {
        const nextHousesToResolve = this.combat.houseCombatDatas.entries.filter(([h, hcd]) =>
            !this.resolvedSkullIcons.includes(h) && hcd.tidesOfBattleCard && hcd.tidesOfBattleCard.skullIcons > 0)
            .map(([h, _hcd]) => h);

        if (nextHousesToResolve.length > 0) {
            const house = nextHousesToResolve[0];
            this.resolvedSkullIcons.push(house);
            // We can savely cast to TidesOfBattleCard as we filtered for not null previously via nextHousesToResolve
            const skullCount = (this.combat.houseCombatDatas.get(house).tidesOfBattleCard as TidesOfBattleCard).skullIcons;
            const enemy = this.combat.getEnemy(house);
            const enemyCombatData = this.combat.houseCombatDatas.get(enemy);
            if (!this.combat.areCasualtiesPrevented(enemy, true)) {
                if (skullCount < enemyCombatData.army.length) {
                    this.setChildGameState(new ChooseCasualtiesGameState(this)).firstStart(enemy, enemyCombatData.army, skullCount);
                } else {
                    // If the count of casualties is bigger or equal than the remaining army, a ChooseCasualtiesGameState
                    // is not needed. The army left can be exterminated.
                    this.onChooseCasualtiesGameStateEnd(enemy, enemyCombatData.region, enemyCombatData.army, true);
                }
                return;
            } else {
                if (enemyCombatData.army.length > 0) {
                    this.combat.ingameGameState.log({
                        type: "casualties-prevented",
                        house: enemy.id,
                        houseCard: (enemyCombatData.houseCard as HouseCard).id
                    });
                }
                this.proceedSkullIconHandling();
                return;
            }
        }

        this.proceedRetreat();
    }

    proceedHouseCardHandling(): void {
        // Put the house cards as used
        // Unassign the house cards from vassals again
        this.combat.houseCombatDatas.forEach(({houseCard}, house) => {
            if (this.combat.ingameGameState.isVassalHouse(house)) {
                if (houseCard && house.hasBeenReplacedByVassal && !this.game.vassalHouseCards.has(houseCard.id)) {
                    this.checkAndPerformHouseCardHandlingPerHouse(house, houseCard);

                    this.game.oldPlayerHouseCards.set(house, house.houseCards);
                    this.entireGame.broadcastToClients({
                        type: "update-old-player-house-cards",
                        houseCards: this.game.oldPlayerHouseCards.entries.map(([h, hcs]) => [h.id, hcs.values.map(hc => hc.id)])
                    });
                }
            } else {
                this.checkAndPerformHouseCardHandlingPerHouse(house, houseCard);
            }
        });

        this.setChildGameState(new AfterCombatHouseCardAbilitiesGameState(this)).firstStart();
    }

    proceedAfterWinnerDetermination(): void {
        const ingame = this.combat.ingameGameState;
        // A commander earns a Power Token if his vassal wins a battle
        if (ingame.isVassalHouse(this.winner)) {
            const commander = ingame.getControllerOfHouse(this.winner).house;
            const changed = ingame.changePowerTokens(commander, 1);
            if (changed > 0) {
                ingame.log({
                    type: "commander-power-token-gained",
                    house: commander.id
                });
            }
        }

        // Do abilities
        this.setChildGameState(new AfterWinnerDeterminationGameState(this)).firstStart();
    }

    onAfterWinnerDeterminationFinish(): void {
        this.proceedCasualties();
    }

    proceedRetreat(): void {
        this.setChildGameState(new ResolveRetreatGameState(this)).firstStart();
    }

    onResolveRetreatFinish(): void {
        if (this.doesVictoriousDefenderNeedToRetreat() && !this.originalLoser) {
            // For the sake of simplicity, declare the winner the loser for the upcoming retreat phase.
            // This way we do not have to complicate the code and handle the possible retreat of the winner in ResolveRetreatGameState.
            this.combat.ingameGameState.log({
                type: "arianne-martell-force-retreat",
                house: this.loser.id,
                enemyHouse: this.winner.id
            });

            this.originalLoser = this.loser;
            this.loser = this.winner;
            this.proceedRetreat();
        } else {
            if (this.originalLoser) {
                this.loser = this.originalLoser;
            }

            this.proceedEndOfCombat();
        }
    }

    onPlayerMessage(player: Player, message: ClientMessage): void {
        this.childGameState.onPlayerMessage(player, message);
    }

    onServerMessage(message: ServerMessage): void {
        this.childGameState.onServerMessage(message);
    }

    proceedEndOfCombat(): void {
        if (this.winner == this.attacker) {
            // Check if the attacker still has an army. All attacking units might have
            // been killed during the combat.
            if (this.combat.attackingArmy.length > 0) {
                // It might be that this movement can be prevented by house cards (e.g. Arianne Martell)
                if (!this.isAttackingArmyMovementPrevented()) {
                    this.combat.resolveMarchOrderGameState.moveUnits(this.combat.attackingRegion, this.combat.attackingArmy, this.combat.defendingRegion);
                } else {
                    this.combat.ingameGameState.log({
                        type: "arianne-martell-prevent-movement",
                        house: this.combat.defender.id,
                        enemyHouse: this.combat.attacker.id
                    });
                }
            }
            this.removeOrderFromRegion(this.combat.defendingRegion);
        }

        // Remove the order from attacking region
        this.removeOrderFromRegion(this.combat.attackingRegion);

        this.proceedHouseCardHandling();
    }

    removeOrderFromRegion(region: Region): void {
        // Always check if there is an order to be removed as e.g. Arianne or Loras might lead to an orphaned order
        this.combat.actionGameState.removeOrderFromRegion(region);
    }

    isAttackingArmyMovementPrevented(): boolean {
        return this.combat.getOrderResolutionHouseCard().reduce((s, h) => {
            const houseCard = this.combat.houseCombatDatas.get(h).houseCard;

            if (houseCard == null) {
                return s;
            }

            return houseCard.ability ? s || houseCard.ability.doesPreventAttackingArmyFromMoving(this, h, houseCard) : s;
        }, false);
    }

    doesVictoriousDefenderNeedToRetreat(): boolean {
        return this.combat.getOrderResolutionHouseCard().reduce((s, h) => {
            const houseCard = this.combat.houseCombatDatas.get(h).houseCard;

            if (houseCard == null) {
                return s;
            }

            return houseCard.ability ? s || houseCard.ability.forcesRetreatOfVictoriousDefender(this, h, houseCard) : s;
        }, false);
    }

    onAfterCombatHouseCardAbilitiesFinish(): void {
        // Notify combatans about end of combat
        this.combat.entireGame.notifyUsers(this.combat.houseCombatDatas.keys.map(h =>
            this.combat.ingameGameState.getControllerOfHouse(h).user), NotificationType.BATTLE_RESULTS);

        this.combat.houseCombatDatas.keys.forEach(house => {
            // Remove house cards of vassals now
            if (this.combat.ingameGameState.isVassalHouse(house)) {
                const houseCard = this.combat.houseCombatDatas.get(house).houseCard;
                if (houseCard && house.hasBeenReplacedByVassal && !this.game.vassalHouseCards.has(houseCard.id)) {
                    // Player house cards may have changed again due to abilities like Robert Arryn, so we save the old hand again

                    this.game.oldPlayerHouseCards.set(house, house.houseCards);
                    this.entireGame.broadcastToClients({
                        type: "update-old-player-house-cards",
                        houseCards: this.game.oldPlayerHouseCards.entries.map(([h, hcs]) => [h.id, hcs.values.map(hc => hc.id)])
                    });
                }

                house.houseCards = new BetterMap();
                this.entireGame.broadcastToClients({
                    type: "update-house-cards",
                    house: house.id,
                    houseCards: []
                });
            }
        });
        this.combat.resolveMarchOrderGameState.onResolveSingleMarchOrderGameStateFinish(this.attacker);
    }

    markHouseCardAsUsed(house: House, houseCard: HouseCard | null): void {
        if (houseCard && !this.combat.ingameGameState.game.vassalHouseCards.has(houseCard.id)) {
            houseCard.state = HouseCardState.USED;

            this.entireGame.broadcastToClients({
                type: "change-state-house-card",
                houseId: house.id,
                cardIds: [houseCard.id],
                state: HouseCardState.USED
            });
        }
    }

    markHouseCardAsAvailable(house: House, houseCard: HouseCard | null): void {
        if (houseCard) {
            houseCard.state = HouseCardState.AVAILABLE;

            this.entireGame.broadcastToClients({
                type: "change-state-house-card",
                houseId: house.id,
                cardIds: [houseCard.id],
                state: HouseCardState.AVAILABLE
            });
        }
    }

    checkAndPerformHouseCardHandlingPerHouse(house: House, houseCard: HouseCard | null): void {
        // If all cards are used or discarded, put all used as available,
        // except the one that has been used.
        if (house.houseCards.values.every(hc => hc.state == HouseCardState.USED)) {
            if (this.entireGame.gameSettings.houseCardsEvolution
                && house.laterHouseCards != null
                && this.combat.ingameGameState.game.turn >= this.entireGame.gameSettings.houseCardsEvolutionRound) {

                // We need to swap to the new deck now
                this.game.previousPlayerHouseCards.set(house, new BetterMap());
                house.houseCards.keys.forEach(hcid => {
                    this.game.previousPlayerHouseCards.get(house).set(hcid, house.houseCards.get(hcid));
                    house.houseCards.delete(hcid);
                });

                house.laterHouseCards.entries.forEach(([hcid, hc]) => house.houseCards.set(hcid, hc));
                house.laterHouseCards = null;

                this.entireGame.broadcastToClients({
                    type: "later-house-cards-applied",
                    house: house.id
                });

                this.combat.ingameGameState.log({
                    type: "house-cards-returned",
                    house: house.id,
                    houseCards: house.houseCards.keys,
                    houseCardDiscarded: undefined
                });
            } else {
                const houseCardsToMakeAvailable = house.houseCards.values.filter(hc => hc != houseCard);

                houseCardsToMakeAvailable.forEach(hc => hc.state = HouseCardState.AVAILABLE);

                this.combat.ingameGameState.log({
                    type: "house-cards-returned",
                    house: house.id,
                    houseCards: houseCardsToMakeAvailable.map(hc => hc.id),
                    houseCardDiscarded: houseCard ? houseCard.id : undefined
                });

                this.entireGame.broadcastToClients({
                    type: "change-state-house-card",
                    houseId: house.id,
                    cardIds: houseCardsToMakeAvailable.map(hc => hc.id),
                    state: HouseCardState.AVAILABLE
                });
            }
        }
    }

    serializeToClient(admin: boolean, player: Player | null): SerializedPostCombatGameState {
        return {
            type: "post-combat",
            winner: this.winner.id,
            loser: this.loser.id,
            originalLoser: this.originalLoser ? this.originalLoser.id : null,
            resolvedSkullIcons: this.resolvedSkullIcons.map(h => h.id),
            childGameState: this.childGameState.serializeToClient(admin, player)
        };
    }

    static deserializeFromServer(combat: CombatGameState, data: SerializedPostCombatGameState): PostCombatGameState {
        const postCombat = new PostCombatGameState(combat);

        postCombat.winner = combat.game.houses.get(data.winner);
        postCombat.loser = combat.game.houses.get(data.loser);
        postCombat.originalLoser = data.originalLoser ? combat.game.houses.get(data.originalLoser) : null;
        postCombat.resolvedSkullIcons = data.resolvedSkullIcons.map(hid => combat.game.houses.get(hid));
        postCombat.childGameState = postCombat.deserializeChildGameState(data.childGameState);

        return postCombat;
    }

    deserializeChildGameState(data: SerializedPostCombatGameState["childGameState"]): PostCombatGameState["childGameState"] {
        switch (data.type) {
            case "resolve-retreat":
                return ResolveRetreatGameState.deserializeFromServer(this, data);
            case "choose-casualties":
                return ChooseCasualtiesGameState.deserializeFromServer(this, data);
            case "after-winner-determination":
                return AfterWinnerDeterminationGameState.deserializeFromServer(this, data);
            case "after-combat-house-card-abilities":
                return AfterCombatHouseCardAbilitiesGameState.deserializeFromServer(this, data);
        }
    }
}

export interface SerializedPostCombatGameState {
    type: "post-combat";
    winner: string;
    loser: string;
    originalLoser: string | null;
    resolvedSkullIcons: string[];
    childGameState: SerializedResolveRetreatGameState
        | SerializedChooseCasualtiesGameState
        | SerializedAfterWinnerDeterminationGameState
        | SerializedAfterCombatHouseCardAbilitiesGameState;
}
