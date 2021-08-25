import shuffleInPlace from "../../../../utils/shuffle";
import BetterMap from "../../../../utils/BetterMap";

export class TidesOfBattleCard {
    id: string;
    combatStrength: number;
    swordIcons: number;
    towerIcons: number;
    skullIcons: number;

    constructor(id: string, combatStrength = 0, swordIcons = 0, towerIcons = 0, skullIcons = 0) {
        this.id = id;
        this.combatStrength = combatStrength;
        this.swordIcons = swordIcons;
        this.towerIcons = towerIcons;
        this.skullIcons = skullIcons;
    }
}

export const zero = new TidesOfBattleCard("zero");
export const sword = new TidesOfBattleCard("sword", 1, 1);
export const fortification = new TidesOfBattleCard("fortification", 1, 0, 1);
export const two = new TidesOfBattleCard("two", 2);
export const three = new TidesOfBattleCard("three", 3);
export const skull = new TidesOfBattleCard("skull", 0, 0, 0, 1);

export const tidesOfBattleCards = new BetterMap([
    [zero.id, zero],
    [sword.id, sword],
    [fortification.id, fortification],
    [two.id, two],
    [three.id, three],
    [skull.id, skull]
]);

const tidesOfBattleAllocations = new BetterMap([
    [zero, 8],
    [sword, 4],
    [fortification, 4],
    [two, 4],
    [three, 2],
    [skull, 2]
]);

export default function getShuffledTidesOfBattleDeck(): TidesOfBattleCard[] {
    const result: TidesOfBattleCard[] = [];

    tidesOfBattleAllocations.entries.forEach(([card, count]) => {
       for(let i=0; i<count; i++) {
           result.push(card);
       }
    });

    return shuffleInPlace(result);
}