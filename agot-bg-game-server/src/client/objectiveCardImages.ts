import { aFirmGrip, aMountainousTask, ampleHarvest, arborGold, aRiperFruit,
    arrynSpecialObjective, aStalwartPosition, backdoorPolitics,
    baratheonSpecialObjective, cavalryCharge, crossingGuard,
    extendYourReach, friendlyConfines, holdCourt, homeInvasion, landGrab,
    lannisterSpecialObjective, mercantileVentures, navalSuperiority,
    nothingButGhosts, protectTheNeck, pullTheWeeds, spreadingTheWealth,
    starkSpecialObjective, stopTheStorm, supportTheCrown, takeTheBlack,
    theBlade, theFinalHour, thePeoplesChosen, theRaven, theThrone } from "../common/ingame-game-state/game-data-structure/static-data-structure/objectiveCards";
import BetterMap from "../utils/BetterMap";
import aFirmGripImage from "../../public/images/objectives/AFirmGrip.png";
import aMountainousTaskImage from "../../public/images/objectives/AMountainousTask.png";
import ampleHarvestImange from "../../public/images/objectives/AmpleHarvest.png";
import arborGoldImage from "../../public/images/objectives/ArborGold.png";
import aRiperFruitImage from "../../public/images/objectives/ARiperFruit.png";
import aStalwartPositionImage from "../../public/images/objectives/AStalwartPosition.png";
import backdoorPoliticsImage from "../../public/images/objectives/BackdoorPolitics.png";
import cavalryChargeImage from "../../public/images/objectives/CavalryCharge.png";
import crossingGuardImage from "../../public/images/objectives/CrossingGuard.png";
import extendYourReachImage from "../../public/images/objectives/ExtendYourReach.png";
import friendlyConfinesImage from "../../public/images/objectives/FriendlyConfines.png";
import holdCourtImage from "../../public/images/objectives/HoldCourt.png";
import homeInvasionImage from "../../public/images/objectives/HomeInvasion.png";
import landGrabImage from "../../public/images/objectives/LandGrab.png";
import mercantileVenturesImage from "../../public/images/objectives/MercantileVentures.png";
import navalSuperiorityImage from "../../public/images/objectives/NavalSuperiority.png";
import nothingButGhostsImage from "../../public/images/objectives/NothingButGhosts.png";
import protectTheNeckImage from "../../public/images/objectives/ProtectTheNeck.png";
import pullTheWeedsImage from "../../public/images/objectives/PullTheWeeds.png";
import specialObjectiveArrynImage from "../../public/images/objectives/SpecialObjectiveArryn.png";
import specialObjectiveBaratheonImage from "../../public/images/objectives/SpecialObjectiveBaratheon.png";
import specialObjectiveLannisterImage from "../../public/images/objectives/SpecialObjectiveLannister.png";
import specialObjectiveStarkImage from "../../public/images/objectives/SpecialObjectiveStark.png";
import spreadingTheWealthImage from "../../public/images/objectives/SpreadingTheWealth.png";
import stopTheStormImage from "../../public/images/objectives/StopTheStorm.png";
import supportTheCrownImage from "../../public/images/objectives/SupportTheCrown.png";
import takeTheBlackImage from "../../public/images/objectives/TakeTheBlack.png";
import theBladeImage from "../../public/images/objectives/TheBlade.png";
import theFinalHourImage from "../../public/images/objectives/TheFinalHour.png";
import thePeoplesChosenImage from "../../public/images/objectives/ThePeoplesChosen.png";
import theRavenImage from "../../public/images/objectives/TheRaven.png";
import theThroneImage from "../../public/images/objectives/TheThrone.png";

const objectiveImages = new BetterMap([
    [aFirmGrip.id, aFirmGripImage],
    [aMountainousTask.id, aMountainousTaskImage],
    [ampleHarvest.id, ampleHarvestImange],
    [arborGold.id, arborGoldImage],
    [aRiperFruit.id, aRiperFruitImage],
    [aStalwartPosition.id, aStalwartPositionImage],
    [backdoorPolitics.id, backdoorPoliticsImage],
    [cavalryCharge.id, cavalryChargeImage],
    [crossingGuard.id, crossingGuardImage],
    [extendYourReach.id, extendYourReachImage],
    [friendlyConfines.id, friendlyConfinesImage],
    [holdCourt.id, holdCourtImage],
    [homeInvasion.id, homeInvasionImage],
    [landGrab.id, landGrabImage],
    [mercantileVentures.id, mercantileVenturesImage],
    [navalSuperiority.id, navalSuperiorityImage],
    [nothingButGhosts.id, nothingButGhostsImage],
    [protectTheNeck.id, protectTheNeckImage],
    [pullTheWeeds.id, pullTheWeedsImage],
    [arrynSpecialObjective.id, specialObjectiveArrynImage],
    [baratheonSpecialObjective.id, specialObjectiveBaratheonImage],
    [lannisterSpecialObjective.id, specialObjectiveLannisterImage],
    [starkSpecialObjective.id, specialObjectiveStarkImage],
    [spreadingTheWealth.id, spreadingTheWealthImage],
    [stopTheStorm.id, stopTheStormImage],
    [supportTheCrown.id, supportTheCrownImage],
    [takeTheBlack.id, takeTheBlackImage],
    [theBlade.id, theBladeImage],
    [theFinalHour.id, theFinalHourImage],
    [thePeoplesChosen.id, thePeoplesChosenImage],
    [theRaven.id, theRavenImage],
    [theThrone.id, theThroneImage]
]);

export default objectiveImages;