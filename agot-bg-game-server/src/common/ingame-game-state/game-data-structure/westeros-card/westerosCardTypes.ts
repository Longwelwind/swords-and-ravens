import WesterosCardType from "./WesterosCardType";
import LastDaysOfSummerWesterosCardType from "./LastDaysOfSummerWesterosCardType";
import GameOfThronesWesterosCardType from "./GameOfThronesWesterosCardType";
import SupplyWesterosCardType from "./SupplyWesterosCardType";
import MusteringWesterosCardType from "./MusteringWesterosCardType";
import PutToTheSwordWesterosCardType from "./PutToTheSwordWesterosCardType";
import DarkWingDarkWordsWesterosCardType from "./DarkWingDarkWordsWesterosCardType";
import AThroneOfBladesWesterosCardType from "./AThroneOfBladesWesterosCardType";
import WinterIsComingWesterosCardType from "./WinterIsComingWesterosCardType";
import ClashOfKingsWesterosCardType from "./ClashOfKingsWesterosCardType";
import FeastForCrowsWesterosCardType from "./FeastForCrowsWesterosCardType";
import SeaOfStormsWesterosCardType from "./SeaOfStormsWesterosCardType";
import WebOfLiesWesterosCardType from "./WebOfLiesWesterosCardType";
import StormOfSwordsWesterosCardType from "./StormOfSwordsWesterosCardType";
import RainsOfAutumnWesterosCardType from "./RainsOfAutumnWesterosCardType";
import BetterMap from "../../../../utils/BetterMap";
import WildlingsAttackWesterosCardType from "./WildlingsAttackWesterosCardType";

export const lastDaysOfSummer = new LastDaysOfSummerWesterosCardType("last-days-of-summer", "Last Days of Summer", "Nothing happens", 2);
export const winterIsComing = new WinterIsComingWesterosCardType("winter-is-coming", "Winter is Coming", "Immediately shuffle this deck. Then Draw and resolve a new card.");

export const supply = new SupplyWesterosCardType("supply", "Supply", "Adjust Supply track. Reconcile armies.");
export const gameOfThrones = new GameOfThronesWesterosCardType("game-of-thrones", "Game of Thrones", "Each house gains power tokens for each controlled crown icons and ports");
export const mustering = new MusteringWesterosCardType("mustering", "Mustering", "Recruit new units in strongholds and castles");
export const aThroneOfBlades = new AThroneOfBladesWesterosCardType("a-throne-of-blades", "A Throne of Blades", "The holder of the Iron Throne token chooses whether a) everyone updates their Supply then reconciles armies b) everyone muster units, or c) this card has no effect.", 2);

export const clashOfKings = new ClashOfKingsWesterosCardType("clash-of-kings", "Clash of Kings", "Bid on the three Influence tracks.");
export const darkWingsDarkWords = new DarkWingDarkWordsWesterosCardType("dark-wings-dark-words", "Dark Wings, Dark Words", "The holder of the Messenger Raven token chooses whether &) everyone bids on the  three Influence tracks b) everyone collects one Power token for every power icon present in areas they control, or c) this card has no effect", 2);

export const feastForCrows = new FeastForCrowsWesterosCardType("feast-for-crows", "Feast for Crows", "Consolidate Power Orders cannot be played during this Planning Phase", 2);
export const seaOfStorms = new SeaOfStormsWesterosCardType("sea-of-storms", "Sea of Storms", "Raid Orders cannot be played during this Planning Phase", 2);
export const webOfLies = new WebOfLiesWesterosCardType("web-of-lies", "Web of Lies", "Support Orders cannot be played during this Planning Phase.", 2);
export const stormOfSwords = new StormOfSwordsWesterosCardType("storm-of-swords", "Storm of Swords", "Defense Orders cannot be played during this Planning Phase.", 2);
export const rainsOfAutumn = new RainsOfAutumnWesterosCardType("rains-of-autumn", "Rains of Autumn", "March +1 Orders cannot be played this Planning Phase", 2);
export const putToTheSword = new PutToTheSwordWesterosCardType("put-to-the-sword", "Put to the Sword", "The holder of the Valyrian Steel Blade chooses one of the following conditions for this Planning Phase: a) Defense Orders cannot be played b) March +1 Orders cannot be played, or c) no restrictions.");
export const wildlingsAttack = new WildlingsAttackWesterosCardType("wildlings-attack", "Wildlings Attack", "The wildlings attack Westeros.LongAh, ça c'étaot");

export const westerosCardTypes = new BetterMap<string, WesterosCardType>([
    [lastDaysOfSummer.id, lastDaysOfSummer],
    [winterIsComing.id, winterIsComing],
    [supply.id, supply],
    [gameOfThrones.id, gameOfThrones],
    [mustering.id, mustering],
    [aThroneOfBlades.id, aThroneOfBlades],
    [clashOfKings.id, clashOfKings],
    [darkWingsDarkWords.id, darkWingsDarkWords],
    [feastForCrows.id, feastForCrows],
    [seaOfStorms.id, seaOfStorms],
    [webOfLies.id, webOfLies],
    [stormOfSwords.id, stormOfSwords],
    [rainsOfAutumn.id, rainsOfAutumn],
    [putToTheSword.id, putToTheSword],
    [wildlingsAttack.id, wildlingsAttack]
]);
