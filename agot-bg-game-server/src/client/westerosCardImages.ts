import BetterMap from "../utils/BetterMap";
import clashOfKings from "../../public/images/westeros-cards/ClashOfKings.png";
import darkWingsDarkWords from "../../public/images/westeros-cards/DarkWingsDarkWords.png";
import feastForCrows from "../../public/images/westeros-cards/FeastForCrows.png";
import gameOfThrones from "../../public/images/westeros-cards/GameOfThrones.png";
import lastDaysOfSummer from "../../public/images/westeros-cards/LastDaysOfSummer.png";
import lastDaysOfSummerII from "../../public/images/westeros-cards/LastDaysOfSummerII.png";
import mustering from "../../public/images/westeros-cards/Mustering.png";
import putToTheSword from "../../public/images/westeros-cards/PutToTheSword.png";
import rainsOfAutumn from "../../public/images/westeros-cards/RainsOfAutumn.png";
import seaOfStorms from "../../public/images/westeros-cards/SeaOfStorms.png";
import stormOfSwords from "../../public/images/westeros-cards/StormOfSwords.png";
import supply from "../../public/images/westeros-cards/Supply.png";
import throneOfBlades from "../../public/images/westeros-cards/ThroneOfBlades.png";
import webOfLies from "../../public/images/westeros-cards/WebOfLies.png";
import wildlingsAttackIII from "../../public/images/westeros-cards/WildlingsAttackIII.png";
import winterIsComing from "../../public/images/westeros-cards/WinterIsComing.png";
import winterIsComingII from "../../public/images/westeros-cards/WinterIsComingII.png";
import domesticDisputes from "../../public/images/westeros-cards/4/DomesticDisputes.png";
import emptyPromises from "../../public/images/westeros-cards/4/EmptyPromises.png";
import fireMadeFlesh from "../../public/images/westeros-cards/4/FireMadeFlesh.png";
import playingWithFire from "../../public/images/westeros-cards/4/PlayingWithFire.png";
import scatteringDissent from "../../public/images/westeros-cards/4/ScatteringDissent.png";
import southronAmbitions from "../../public/images/westeros-cards/4/SouthronAmbitions.png";
import strongholdsOfResistance from "../../public/images/westeros-cards/4/StrongholdsOfResistance.png";
import theLongPlan from "../../public/images/westeros-cards/4/TheLongPlan.png";
import wateringTheSeed from "../../public/images/westeros-cards/4/WateringTheSeed.png";
import wordSpreadsQuickly from "../../public/images/westeros-cards/4/WordSpreadsQuickly.png";
import musteringAffc from "../../public/images/westeros-cards/affc/MusteringAFFC.png";
import rallyTheMen from "../../public/images/westeros-cards/affc/RallyTheMen.png";
import burdenOfPower from "../../public/images/westeros-cards/affc/TheBurdenOfPower.png";
import famine from "../../public/images/westeros-cards/affc/Famine.png"
import ironbornRaid from "../../public/images/westeros-cards/affc/IronbornRaid.png"
import shiftingAmbitions from "../../public/images/westeros-cards/affc/ShiftingAmbitions.png"

const westerosCardImages = new BetterMap([
    [0, new BetterMap([
        ["last-days-of-summer", lastDaysOfSummer],
        ["mustering", mustering],
        ["winter-is-coming", winterIsComing],
        ["a-throne-of-blades", throneOfBlades],
        ["supply", supply],
        ["mustering-affc", musteringAffc],
        ["rally-the-men", rallyTheMen],
        ["the-burden-of-power", burdenOfPower],
        ["famine", famine],
        ["ironborn-raid", ironbornRaid],
        ["shifting-ambitions", shiftingAmbitions]
    ])],
    [1, new BetterMap([
        ["game-of-thrones", gameOfThrones],
        ["dark-wings-dark-words", darkWingsDarkWords],
        ["winter-is-coming", winterIsComingII],
        ["clash-of-kings", clashOfKings],
        ["last-days-of-summer", lastDaysOfSummerII],
    ])],
    [2, new BetterMap([
        ["feast-for-crows", feastForCrows],
        ["put-to-the-sword", putToTheSword],
        ["rains-of-autumn", rainsOfAutumn],
        ["sea-of-storms", seaOfStorms],
        ["storm-of-swords", stormOfSwords],
        ["web-of-lies", webOfLies],
        ["wildlings-attack", wildlingsAttackIII],
    ])],
    [3, new BetterMap([
        ["domestic-disputes", domesticDisputes],
        ["empty-promises", emptyPromises],
        ["fire-made-flesh", fireMadeFlesh],
        ["playing-with-fire", playingWithFire],
        ["scattering-dissent", scatteringDissent],
        ["southron-ambitions", southronAmbitions],
        ["strongholds-of-resistance", strongholdsOfResistance],
        ["the-long-plan", theLongPlan],
        ["watering-the-seed", wateringTheSeed],
        ["word-spreads-quickly", wordSpreadsQuickly]
    ])]
]);

export default westerosCardImages;
