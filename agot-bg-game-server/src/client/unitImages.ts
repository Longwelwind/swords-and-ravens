import BetterMap from "../utils/BetterMap";
import {dragon, footman, knight, ship, siegeEngine} from "../common/ingame-game-state/game-data-structure/unitTypes";
import baraFoot from "../../public/images/units/BarathFoot.png";
import baraKnight from "../../public/images/units/BarathKnight.png";
import baraSiege from "../../public/images/units/BarathSeige.png";
import baraShip from "../../public/images/units/BarathShip.png";
import boltFoot from "../../public/images/units/BoltonFoot.png";
import boltKnight from "../../public/images/units/BoltonKnight.png";
import boltSiege from "../../public/images/units/BoltonSiege.png";
import boltShip from "../../public/images/units/BoltonShip.png";
import lannFoot from "../../public/images/units/LanFoot.png";
import lannKnight from "../../public/images/units/LanKnight.png";
import lannSiege from "../../public/images/units/LanSeige.png";
import lannShip from "../../public/images/units/LanShip.png";
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
import arrFoot from "../../public/images/units/ArrynFoot.png"
import arrKnight from "../../public/images/units/ArrynKnight.png";
import arrSiege from "../../public/images/units/ArrynSiege.png";
import arrShip from "../../public/images/units/ArrynShip.png";
import targShip from "../../public/images/units/TargShip.png";
import targFoot from "../../public/images/units/TargFoot.png";
import targKnight from "../../public/images/units/TargKnight.png";
import targDragon from "../../public/images/units/TargDragon.png";
import baraDragon from "../../public/images/units/BaraDragon.png";
import lannDragon from "../../public/images/units/LannDragon.png";
import starDragon from "../../public/images/units/StarDragon.png";
import boltDragon from "../../public/images/units/BoltDragon.png";
import greyDragon from "../../public/images/units/GreyDragon.png";
import martDragon from "../../public/images/units/MartDragon.png";
import tyrDragon from "../../public/images/units/TyrDragon.png";
import arrDragon from "../../public/images/units/ArrDragon.png";


const unitImages = new BetterMap([
    ["baratheon", new BetterMap([
        [footman.id, baraFoot],
        [knight.id, baraKnight],
        [siegeEngine.id, baraSiege],
        [ship.id, baraShip],
        [dragon.id, baraDragon]
    ])],
    ["lannister", new BetterMap([
        [footman.id, lannFoot],
        [knight.id, lannKnight],
        [siegeEngine.id, lannSiege],
        [ship.id, lannShip],
        [dragon.id, lannDragon]
    ])],
    ["stark", new BetterMap([
        [footman.id, starFoot],
        [knight.id, starKnight],
        [siegeEngine.id, starSiege],
        [ship.id, starShip],
        [dragon.id, starDragon]
    ])],
    ["greyjoy", new BetterMap([
        [footman.id, greyFoot],
        [knight.id, greyKnight],
        [siegeEngine.id, greySiege],
        [ship.id, greyShip],
        [dragon.id, greyDragon]
    ])],
    ["martell", new BetterMap([
        [footman.id, martFoot],
        [knight.id, martKnight],
        [siegeEngine.id, martSiege],
        [ship.id, martShip],
        [dragon.id, martDragon]
    ])],
    ["tyrell", new BetterMap([
        [footman.id, tyrFoot],
        [knight.id, tyrKnight],
        [siegeEngine.id, tyrSiege],
        [ship.id, tyrShip],
        [dragon.id, tyrDragon]
    ])],
    ["arryn", new BetterMap([
        [footman.id, arrFoot],
        [knight.id, arrKnight],
        [siegeEngine.id, arrSiege],
        [ship.id, arrShip],
        [dragon.id, arrDragon]
    ])],
    ["bolton", new BetterMap([
        [footman.id, boltFoot],
        [knight.id, boltKnight],
        [siegeEngine.id, boltSiege],
        [ship.id, boltShip],
        [dragon.id, boltDragon]
    ])],
    ["targaryen", new BetterMap([
        [footman.id, targFoot],
        [knight.id, targKnight],
        [dragon.id, targDragon],
        [ship.id, targShip]
    ])]
]);

export default unitImages;
