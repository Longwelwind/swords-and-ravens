import BetterMap from "../utils/BetterMap";
import {footman, knight, ship, siegeEngine} from "../common/ingame-game-state/game-data-structure/unitTypes";
import barathFoot from "../../public/images/units/BarathFoot.png";
import barathKnight from "../../public/images/units/BarathKnight.png";
import barathSiege from "../../public/images/units/BarathSeige.png";
import barathShip from "../../public/images/units/BarathShip.png";
import lanFoot from "../../public/images/units/LanFoot.png";
import lanKnight from "../../public/images/units/LanKnight.png";
import lanSiege from "../../public/images/units/LanSeige.png";
import lanShip from "../../public/images/units/LanShip.png";
import starFoot from "../../public/images/units/StarFoot.png";
import starKnight from "../../public/images/units/StarKnight.png";
import starSiege from "../../public/images/units/StarSeige.png";
import starShip from "../../public/images/units/StarShip.png";
import greyFoot from "../../public/images/units/GreyFoot.png";
import greyKnight from "../../public/images/units/GreyKnight.png";
import greySiege from "../../public/images/units/GreySeige.png";
import greyShip from "../../public/images/units/GreyShip.png";
import martFoot from "../../public/images/units/MartFoot.png";
import martKnight from "../../public/images/units/MartKnight.png";
import martSiege from "../../public/images/units/MartSeige.png";
import martShip from "../../public/images/units/MartShip.png";
import tyrFoot from "../../public/images/units/TyrFoot.png";
import tyrKnight from "../../public/images/units/TyrKnight.png";
import tyrSiege from "../../public/images/units/TyrSeige.png";
import tyrShip from "../../public/images/units/TyrShip.png";
import arrynFoot from "../../public/images/units/ArrynFoot.png"
import arrynKnight from "../../public/images/units/ArrynKnight.png";
import arrynSiege from "../../public/images/units/ArrynSiege.png";
import arrynShip from "../../public/images/units/ArrynShip.png";


const unitImages = new BetterMap([
    ["baratheon", new BetterMap([
        [footman.id, barathFoot],
        [knight.id, barathKnight],
        [siegeEngine.id, barathSiege],
        [ship.id, barathShip]
    ])],
    ["lannister", new BetterMap([
        [footman.id, lanFoot],
        [knight.id, lanKnight],
        [siegeEngine.id, lanSiege],
        [ship.id, lanShip]
    ])],
    ["stark", new BetterMap([
        [footman.id, starFoot],
        [knight.id, starKnight],
        [siegeEngine.id, starSiege],
        [ship.id, starShip]
    ])],
    ["greyjoy", new BetterMap([
        [footman.id, greyFoot],
        [knight.id, greyKnight],
        [siegeEngine.id, greySiege],
        [ship.id, greyShip]
    ])],
    ["martell", new BetterMap([
        [footman.id, martFoot],
        [knight.id, martKnight],
        [siegeEngine.id, martSiege],
        [ship.id, martShip]
    ])],
    ["tyrell", new BetterMap([
        [footman.id, tyrFoot],
        [knight.id, tyrKnight],
        [siegeEngine.id, tyrSiege],
        [ship.id, tyrShip]
    ])],
    ["arryn", new BetterMap([
        [footman.id, arrynFoot],
        [knight.id, arrynKnight],
        [siegeEngine.id, arrynSiege],
        [ship.id, arrynShip]
    ])]
]);

export default unitImages;
