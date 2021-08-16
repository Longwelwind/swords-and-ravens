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

export const lastDaysOfSummer = new LastDaysOfSummerWesterosCardType("last-days-of-summer", "Last\xa0Days\xa0of\xa0Summer", "Nothing happens.", "Nothing\xa0happens", 2);
export const winterIsComing = new WinterIsComingWesterosCardType("winter-is-coming", "Winter\xa0is\xa0Coming", "Immediately shuffle this deck. Then draw and resolve a new card.", "Reshuffle\xa0deck");

export const supply = new SupplyWesterosCardType("supply", "Supply", "Adjust\xa0Supply\xa0track. Reconcile armies.", "");
export const gameOfThrones = new GameOfThronesWesterosCardType("game-of-thrones", "Game\xa0of\xa0Thrones", "Each house gains power tokens for each controlled crown icons and ports.", "Gain\xa0PT");
export const mustering = new MusteringWesterosCardType("mustering", "Mustering", "Recruit new units in strongholds and castles.", "");
export const aThroneOfBlades = new AThroneOfBladesWesterosCardType("a-throne-of-blades", "A\xa0Throne\xa0of\xa0Blades", "The holder of the Iron Throne token chooses whether a) everyone updates their Supply then reconciles armies b) everyone muster units, or c) this card has no effect.", "IT\xa0decides", 2);

export const clashOfKings = new ClashOfKingsWesterosCardType("clash-of-kings", "Clash\xa0of\xa0Kings", "Bid on the three Influence tracks.", "Bid\xa0for\xa0tracks");
export const darkWingsDarkWords = new DarkWingDarkWordsWesterosCardType("dark-wings-dark-words", "Dark\xa0Wings,\xa0Dark\xa0Words", "The holder of the Messenger Raven token chooses whether a) everyone bids on the  three Influence tracks b) everyone collects one Power token for every power icon present in areas they control, or c) this card has no effect.", "Raven\xa0decides", 2);

export const feastForCrows = new FeastForCrowsWesterosCardType("feast-for-crows", "Feast\xa0for\xa0Crows", "Consolidate Power Orders cannot be played during this Planning Phase.", "No\xa0CP", 2);
export const seaOfStorms = new SeaOfStormsWesterosCardType("sea-of-storms", "Sea\xa0of\xa0Storms", "Raid Orders cannot be played during this Planning Phase.", "No\xa0raids", 2);
export const webOfLies = new WebOfLiesWesterosCardType("web-of-lies", "Web\xa0of\xa0Lies", "Support Orders cannot be played during this Planning Phase.", "No\xa0support", 2);
export const stormOfSwords = new StormOfSwordsWesterosCardType("storm-of-swords", "Storm\xa0of\xa0Swords", "Defense Orders cannot be played during this Planning Phase.", "No\xa0defense", 2);
export const rainsOfAutumn = new RainsOfAutumnWesterosCardType("rains-of-autumn", "Rains\xa0of\xa0Autumn", "March +1 Orders cannot be played this Planning Phase.", "No\xa0M+1", 2);
export const putToTheSword = new PutToTheSwordWesterosCardType("put-to-the-sword", "Put\xa0to\xa0the\xa0Sword", "The holder of the Valyrian Steel Blade chooses one of the following conditions for this Planning Phase: a) Defense Orders cannot be played b) March +1 Orders cannot be played, or c) no restrictions.", "VSB\xa0decides");
export const wildlingsAttack = new WildlingsAttackWesterosCardType("wildlings-attack", "Wildlings\xa0Attack", "The wildlings attack Westeros.", "");

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
