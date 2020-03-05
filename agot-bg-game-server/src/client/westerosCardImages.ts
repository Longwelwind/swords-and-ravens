import BetterMap from "../utils/BetterMap";
import clashOfKings from "../../public/images/westeros-cards/ClashOfKings.png";
import darkWingsDarkWords from "../../public/images/westeros-cards/DarkWingsDarkWords.png";
import feastForCrows from "../../public/images/westeros-cards/FeastForCrows.png";
import gameOfThrones from "../../public/images/westeros-cards/GameOfThrones.png";
import lastDaysOfSummer from "../../public/images/westeros-cards/LastDaysSummer.png";
import lastDaysOfSummerII from "../../public/images/westeros-cards/LastDaysSummerII.png";
import mustering from "../../public/images/westeros-cards/Mustering.png";
import putToTheSword from "../../public/images/westeros-cards/PutToTheSword.png";
import rainsOfAutmun from "../../public/images/westeros-cards/RainsOfAutumn.png";
import seaOfStorms from "../../public/images/westeros-cards/SeaOfStorms.png";
import stormOfSwords from "../../public/images/westeros-cards/StormOfSwords.png";
import supply from "../../public/images/westeros-cards/Supply.png";
import throneOfBlades from "../../public/images/westeros-cards/ThoneOfBlades.png";
import webOfLies from "../../public/images/westeros-cards/WebOfLies.png";
import wildlingsAttackIII from "../../public/images/westeros-cards/WildlingsAttackIII.png";
import winterIsComing from "../../public/images/westeros-cards/WinterIsComing.png";
import winterIsComingII from "../../public/images/westeros-cards/WinterComingII.png";

const westerosCardImages = new BetterMap([
    [0, new BetterMap([
        ["last-days-of-summer", lastDaysOfSummer],
        ["mustering", mustering],
        ["winter-is-coming", winterIsComing],
        ["a-throne-of-blades", throneOfBlades],
        ["supply", supply],
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
        ["rains-of-autumn", rainsOfAutmun],
        ["sea-of-storms", seaOfStorms],
        ["storm-of-swords", stormOfSwords],
        ["web-of-lies", webOfLies],
        ["wildlings-attack", wildlingsAttackIII],
    ])]
]);

export default westerosCardImages;
