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
import DomesticDisputesWesterosCardType from "./DomesticDisputesWesterosCardType";
import EmptyPromisesWesterosCardType from "./EmptyPromisesWesterosCardType";
import FireMadeFleshWesterosCardType from "./FireMadeFleshWesterosCardType";
import PlayingWithFireWesterosCardType from "./PlayingWithFireWesterosCardType";
import ScatteringDissentWesterosCardType from "./ScatteringDissentWesterosCardType";
import SouthronAmbitionsWesterosCardType from "./SouthronAmbitionsWesterosCardType";
import StrongholdsOfResistanceWesterosCardType from "./StrongholdsOfResistanceWesterosCardType";
import TheLongPlanWesterosCardType from "./TheLongPlanWesterosCardType";
import WateringTheSeedWesterosCardType from "./WateringTheSeedWesterosCardType";
import WordSpreadsQuicklyWesterosCardType from "./WordSpreadsQuicklyWesterosCardType";
import AFeastForCrowsMusteringWesterosCardType from "./AFeastForCrowsMusteringWesterosCardType";
import RallyTheMenWesterosCardType from "./RallyTheMenWesterosCardType";
import TheBurdenOfPowerWesterosCardType from "./TheBurdenOfPowerWesterosCardType";
import FamineWesterosCardType from "./FamineWesterosCardType";
import IronbornRaidWesterosCardType from "./IronbornRaidWesterosCardType";

export const lastDaysOfSummer = new LastDaysOfSummerWesterosCardType("last-days-of-summer", "Last\xa0Days\xa0of\xa0Summer", "Nothing happens.", "Nothing\xa0happens", 2);
export const winterIsComing = new WinterIsComingWesterosCardType("winter-is-coming", "Winter\xa0is\xa0Coming", "Immediately shuffle this deck. Then draw and resolve a new card.", "Reshuffle\xa0deck");

export const supply = new SupplyWesterosCardType("supply", "Supply", "Adjust\xa0Supply\xa0track. Reconcile armies.", "");
export const gameOfThrones = new GameOfThronesWesterosCardType("game-of-thrones", "Game\xa0of\xa0Thrones", "Each house gains Power\xa0tokens for each controlled crown icons and ports.", "Gain\xa0PT");
export const mustering = new MusteringWesterosCardType("mustering", "Mustering", "Recruit new units in strongholds and castles.", "");
export const aThroneOfBlades = new AThroneOfBladesWesterosCardType("a-throne-of-blades", "A\xa0Throne\xa0of\xa0Blades", "The holder of the Iron Throne token chooses whether a) everyone updates their Supply then reconciles armies b) everyone muster units, or c) this card has no effect.", "IT\xa0decides", 2);

export const aFeastForCrowsMustering = new AFeastForCrowsMusteringWesterosCardType("mustering-affc", "Mustering", "Recruit new units in Strongholds and Castles.", "", 2);
export const rallyTheMen = new RallyTheMenWesterosCardType("rally-the-men", "Rally\xa0the\xa0Men", "In turn order, players muster new units in every one of their areas containing a Castle.", "Muster in Castles", 2);
export const burdenOfPower = new TheBurdenOfPowerWesterosCardType("the-burden-of-power", "The\xa0Burden\xa0of\xa0Power", "The holder of the Iron Throne token chooses whether a) the Wildling track is reduced to the \x220\x22 position, or b) everyone musters units in Strongholds and Castles", "IT\xa0decides");
export const famine = new FamineWesterosCardType("famine", "Famine", "Each player is reduced one position on the Supply track and then, in turn order, reconciles armies.", "Supply -1", 2);
export const ironbornRaid = new IronbornRaidWesterosCardType("ironborn-raid", "Ironborn Raid", "Each player with at least 2 scored Objective cards in his play area is reduced one position on the Victory track.", "VP -1", 2);

export const clashOfKings = new ClashOfKingsWesterosCardType("clash-of-kings", "Clash\xa0of\xa0Kings", "Bid on the three Influence tracks.", "Bid\xa0for\xa0tracks");
export const darkWingsDarkWords = new DarkWingDarkWordsWesterosCardType("dark-wings-dark-words", "Dark\xa0Wings,\xa0Dark\xa0Words", "The holder of the Messenger Raven token chooses whether a) everyone bids on the  three Influence tracks b) everyone collects one Power\xa0token for every power icon present in areas they control, or c) this card has no effect.", "Raven\xa0decides", 2);

export const feastForCrows = new FeastForCrowsWesterosCardType("feast-for-crows", "Feast\xa0for\xa0Crows", "Consolidate Power Orders cannot be played during this Planning Phase.", "No\xa0CP", 2);
export const seaOfStorms = new SeaOfStormsWesterosCardType("sea-of-storms", "Sea\xa0of\xa0Storms", "Raid Orders cannot be played during this Planning Phase.", "No\xa0raids", 2);
export const webOfLies = new WebOfLiesWesterosCardType("web-of-lies", "Web\xa0of\xa0Lies", "Support Orders cannot be played during this Planning Phase.", "No\xa0support", 2);
export const stormOfSwords = new StormOfSwordsWesterosCardType("storm-of-swords", "Storm\xa0of\xa0Swords", "Defense Orders cannot be played during this Planning Phase.", "No\xa0defense", 2);
export const rainsOfAutumn = new RainsOfAutumnWesterosCardType("rains-of-autumn", "Rains\xa0of\xa0Autumn", "March +1 Orders cannot be played this Planning Phase.", "No\xa0M+1", 2);
export const putToTheSword = new PutToTheSwordWesterosCardType("put-to-the-sword", "Put\xa0to\xa0the\xa0Sword", "The holder of the Valyrian Steel Blade chooses one of the following conditions for this Planning Phase: a) Defense Orders cannot be played b) March +1 Orders cannot be played, or c) no restrictions.", "VSB\xa0decides");
export const wildlingsAttack = new WildlingsAttackWesterosCardType("wildlings-attack", "Wildlings\xa0Attack", "The wildlings attack Westeros.", "");

export const domesticDisputes = new DomesticDisputesWesterosCardType("domestic-disputes", "Domestic\xa0Disputes", "The Targaryen player may discard 1 Power\xa0token to choose up to 4 other houses. Place 1 loyalty\xa0token on the home areas of those houses.", "Loyalty\xa0tokens in home areas", 0, ["storms-end"]);
export const emptyPromises = new EmptyPromisesWesterosCardType("empty-promises", "Empty\xa0Promises", "The Targaryen player may discard 1 Power\xa0token to place a loyalty\xa0token on either: The Mountains of the Moon or Moat Cailin.", "Place loyalty\xa0tokens", 0, ["the-stony-shore"], ["the-mountains-of-the-moon", "moat-cailin"]);
export const fireMadeFlesh = new FireMadeFleshWesterosCardType("fire-made-flesh", "Fire\xa0Made\xa0Flesh", "The Targaryen player may either: a) destroy one Dragon to move any dragon strength token from the round track to the dragon strength box or b) place a destroyed Dragon in their home area (if able) or c) do nothing.", "Increase dragon strength or regain dragon", 0, ["the-reach"]);
export const playingWithFire = new PlayingWithFireWesterosCardType("playing-with-fire", "Playing\xa0With\xa0Fire", "The Targaryen player may discard 1 Power\xa0token to choose 1 uncontrolled land area and 1 other player. Place 1 loyalty\xa0token and 1 unit from the chosen player (of their choice) in the chosen area.", "Place loyalty\xa0token in an uncontrolled area", 0, ["riverrun", "the-arbor"]);
export const scatteringDissent = new ScatteringDissentWesterosCardType("scattering-dissent", "Scattering\xa0Dissent", "In reverse turn order, each player moves a loyalty\xa0token to an adjacent area (if able). The Targaryen player may cancel each movement as it happens by discarding 1 Power\xa0token.", "Move loyalty\xa0tokens in reverse order", 0, ["karhold", "oldtown"]);
export const southronAmbitions = new SouthronAmbitionsWesterosCardType("southron-ambitions", "Southron\xa0Ambitions", "The Targaryen player may discard 1 Power\xa0token to place a loyalty\xa0token on either: Blackwater or The Boneway", "Place loyalty\xa0tokens", 0, ["searoad-marches", "dornish-marches"], ["blackwater", "the-boneway"]);
export const strongholdsOfResistance = new StrongholdsOfResistanceWesterosCardType("strongholds-of-resistance", "Strongholds\xa0of\xa0Resistance", "The Targaryen player may discard 1 Power\xa0token to place a loyalty\xa0token on either: Harrenhal or White Harbor", "Place loyalty\xa0tokens", 0, ["seagard"], ["harrenhal", "white-harbor"]);
export const theLongPlan = new TheLongPlanWesterosCardType("the-long-plan", "The\xa0Long\xa0Plan", "The Targaryen player may discard 1 Power\xa0token to choose 1 other player. The chosen player places 1 loyalty\xa0token in 2 different land areas.", "Other player places 2 loyalty\xa0tokens", 0, ["castle-black", "yronwood"]);
export const wateringTheSeed = new WateringTheSeedWesterosCardType("watering-the-seed", "Watering\xa0The\xa0Seed", "The Targaryen player may discard Power\xa0tokens equal to their current position on the victory track to place 1 loyalty\xa0token on 2 different land areas they do not control and that are adjacent to a river.", "Place loyalty\xa0tokens adjacent to a river", 0);
export const wordSpreadsQuickly = new WordSpreadsQuicklyWesterosCardType("word-spreads-quickly", "Word\xa0Spreads\xa0Quickly", "In turn order, each player moves a loyalty\xa0token to an adjacent area (if able). The Targaryen player may cancel each movement as it happens by discarding 2 Power\xa0tokens.", "Move loyalty\xa0tokens in turn order", 0, ["crackclaw-point", "three-towers"]);

export const westerosCardTypes = new BetterMap<string, WesterosCardType>([
    [lastDaysOfSummer.id, lastDaysOfSummer],
    [winterIsComing.id, winterIsComing],
    [supply.id, supply],
    [gameOfThrones.id, gameOfThrones],
    [mustering.id, mustering],
    [aThroneOfBlades.id, aThroneOfBlades],
    [aFeastForCrowsMustering.id, aFeastForCrowsMustering],
    [rallyTheMen.id, rallyTheMen],
    [burdenOfPower.id, burdenOfPower],
    [famine.id, famine],
    [ironbornRaid.id, ironbornRaid],
    [clashOfKings.id, clashOfKings],
    [darkWingsDarkWords.id, darkWingsDarkWords],
    [feastForCrows.id, feastForCrows],
    [seaOfStorms.id, seaOfStorms],
    [webOfLies.id, webOfLies],
    [stormOfSwords.id, stormOfSwords],
    [rainsOfAutumn.id, rainsOfAutumn],
    [putToTheSword.id, putToTheSword],
    [wildlingsAttack.id, wildlingsAttack],
    [domesticDisputes.id, domesticDisputes],
    [emptyPromises.id, emptyPromises],
    [fireMadeFlesh.id, fireMadeFlesh],
    [playingWithFire.id, playingWithFire],
    [scatteringDissent.id, scatteringDissent],
    [southronAmbitions.id, southronAmbitions],
    [strongholdsOfResistance.id, strongholdsOfResistance],
    [theLongPlan.id, theLongPlan],
    [wateringTheSeed.id, wateringTheSeed],
    [wordSpreadsQuickly.id, wordSpreadsQuickly]
]);
