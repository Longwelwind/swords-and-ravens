import shuffleInPlace from "../../../../utils/shuffleInPlace";
import BetterMap from "../../../../utils/BetterMap";
import { HouseCardState } from "../house-card/HouseCard";
import { port, sea } from "../regionTypes";
import { knight, ship } from "../unitTypes";
import { ObjectiveCard, SpecialObjectiveCard } from "./ObjectiveCard";

export const stopTheStorm = new ObjectiveCard(
    "stop-the-storm",
    "Stop the Storm",
    "Control Storm's End.",
    [["arryn", 1], ["baratheon", 0], ["lannister", 1], ["stark", 3]],
    (house, ingame) => {
        return ingame.world.regions.tryGet("storms-end", null)?.getController() == house;
    }
);

export const cavalryCharge = new ObjectiveCard(
    "cavalry-charge",
    "Cavalry Charge",
    "Have all 5 of your Knight units on the board.",
    [["arryn", 1], ["baratheon", 1], ["lannister", 1], ["stark", 1]],
    (house, ingame) => {
        return ingame.world.getUnitsOfHouse(house).filter(u => u.type == knight).length == ingame.game.getUnitLimitOfType(house, knight);
    }
);

export const backdoorPolitics = new ObjectiveCard(
    "backdoor-politics",
    "Backdoor Politics",
    "Each other House has a higher position on the Victory track than you.",
    [["arryn", 2], ["baratheon", 2], ["lannister", 2], ["stark", 2]],
    (house, ingame) => {
        const victoryPointsPerHouse = new BetterMap(
            ingame.game.houses.values.map(h => [h, ingame.game.getVictoryPoints(h)]));

        let ownVpValue = 0;
        if (victoryPointsPerHouse.has(house)) {
            ownVpValue = victoryPointsPerHouse.get(house);
            victoryPointsPerHouse.delete(house);
        }

        return victoryPointsPerHouse.values.every(vp => vp > ownVpValue);
    }
);

export const homeInvasion = new ObjectiveCard(
    "home-invasion",
    "Home Invasion",
    "Control the home area of another House.",
    [["arryn", 1], ["baratheon", 1], ["lannister", 1], ["stark", 1]],
    (house, ingame) => {
        return ingame.world.regions.values.filter(r => r.superControlPowerToken != null && r.superControlPowerToken != house && r.getController() == house).length > 0;
    }
);

export const landGrab = new ObjectiveCard(
    "land-grab",
    "Land Grab",
    "Control more land areas than any other House.",
    [["arryn", 1], ["baratheon", 2], ["lannister", 1], ["stark", 1]],
    (house, ingame) => {
        const landAreasPerHouse = new BetterMap(
            ingame.game.houses.values.map(h => [h, ingame.game.getTotalControlledLandRegions(h)]));

        let ownLandAreasCount = 0;
        if (landAreasPerHouse.has(house)) {
            ownLandAreasCount = landAreasPerHouse.get(house);
            landAreasPerHouse.delete(house);
        }

        return landAreasPerHouse.values.some(tla => ownLandAreasCount > tla);
    }
);

export const arborGold = new ObjectiveCard(
    "arbor-gold",
    "Arbor Gold",
    "Control The Arbor.",
    [["arryn", 4], ["baratheon", 2], ["lannister", 1], ["stark", 2]],
    (house, ingame) => {
        return ingame.world.regions.tryGet("the-arbor", null)?.getController() == house;
    }
);

export const extendYourReach = new ObjectiveCard(
    "extend-your-reach",
    "Extend Your Reach",
    "Control more sea areas than each other House.",
    [["arryn", 2], ["baratheon", 1], ["lannister", 1], ["stark", 1]],
    (house, ingame) => {
        const seaAreasPerHouse = new BetterMap(
            ingame.game.houses.values.map(h => [h, ingame.world.regions.values.filter(r => r.type == sea && r.getController() == h).length]));

        let ownSeaAreasCount = 0;
        if (seaAreasPerHouse.has(house)) {
            ownSeaAreasCount = seaAreasPerHouse.get(house);
            seaAreasPerHouse.delete(house);
        }

        return seaAreasPerHouse.values.every(sa => ownSeaAreasCount > sa);
    }
);

export const takeTheBlack = new ObjectiveCard(
    "take-the-black",
    "Take the Black",
    "Control Castle Black.",
    [["arryn", 1], ["baratheon", 1], ["lannister", 2], ["stark", 1]],
    (house, ingame) => {
        return ingame.world.regions.tryGet("castle-black", null)?.getController() == house;
    }
);

export const theRaven = new ObjectiveCard(
    "the-raven",
    "The Raven",
    "Hold the Messenger Raven token.",
    [["arryn", 0], ["baratheon", 1], ["lannister", 1], ["stark", 1]],
    (house, ingame) => {
        return ingame.game.ravenHolder == house;
    }
);

export const supportTheCrown = new ObjectiveCard(
    "support-the-crown",
    "Support the Crown",
    "Have 3 units in Crackclaw Point and no units in King's Landing.",
    [["arryn", 1], ["baratheon", 1], ["lannister", 1], ["stark", 2]],
    (house, ingame) => {
        const ccp = ingame.world.regions.tryGet("crackclaw-point", null);
        const kl = ingame.world.regions.tryGet("kings-landing", null);

        return ccp?.getController() == house && ccp.units.size == 3 && (kl != null && kl.units.values.every(u => u.allegiance != house));
    }
);

export const theThrone = new ObjectiveCard(
    "the-throne",
    "The Throne",
    "Hold the Iron Throne token.",
    [["arryn", 1], ["baratheon", 0], ["lannister", 1], ["stark", 1]],
    (house, ingame) => {
        return ingame.game.ironThroneHolder == house;
    }
);

export const theBlade = new ObjectiveCard(
    "the-blade",
    "The Blade",
    "Hold the Valyrian Steel Blade token.",
    [["arryn", 1], ["baratheon", 1], ["lannister", 1], ["stark", 0]],
    (house, ingame) => {
        return ingame.game.valyrianSteelBladeHolder == house;
    }
);

export const holdCourt = new ObjectiveCard(
    "hold-court",
    "Hold Court",
    "Control King's Landing.",
    [["arryn", 2], ["baratheon", 1], ["lannister", 1], ["stark", 4]],
    (house, ingame) => {
        return ingame.world.regions.tryGet("kings-landing", null)?.getController() == house;
    }
);

export const crossingGuard = new ObjectiveCard(
    "crossing-guard",
    "Crossing Guard",
    "Control two areas that are joined by the same bridge.",
    [["arryn", 1], ["baratheon", 1], ["lannister", 1], ["stark", 1]],
    (house, ingame) => {
        const mootm = ingame.world.regions.tryGet("the-mountains-of-the-moon", null);
        const ccp = ingame.world.regions.tryGet("crackclaw-point", null);

        const twins = ingame.world.regions.tryGet("the-twins", null);
        const seagard = ingame.world.regions.tryGet("seagard", null);

        return (mootm != null && ccp != null && mootm.getController() == house && ccp.getController() == house) ||
            (twins != null && seagard != null && twins.getController() == house && seagard.getController() == house);
    }
);

export const navalSuperiority = new ObjectiveCard(
    "naval-superiority",
    "Naval Superiority",
    "Have more Ship units on the board than each other House.",
    [["arryn", 1], ["baratheon", 1], ["lannister", 1], ["stark", 1]],
    (house, ingame) => {
        const shipCountPerHouse = new BetterMap(
            ingame.game.houses.values.map(h => [h, ingame.world.getUnitsOfHouse(h).filter(u => u.type == ship).length]));

        let ownShipCount = 0;
        if (shipCountPerHouse.has(house)) {
            ownShipCount = shipCountPerHouse.get(house);
            shipCountPerHouse.delete(house);
        }

        return shipCountPerHouse.values.every(sc => ownShipCount > sc);
    }
);

export const pullTheWeeds = new ObjectiveCard(
    "pull-the-weeds",
    "Pull the Weeds",
    "Control Searoad Marches, Blackwater, and The Reach.",
    [["arryn", 2], ["baratheon", 1], ["lannister", 1], ["stark", 2]],
    (house, ingame) => {
        const searoad = ingame.world.regions.tryGet("searoad-marches", null);
        const blackwater = ingame.world.regions.tryGet("blackwater", null);
        const theReach = ingame.world.regions.tryGet("the-reach", null);

        return searoad != null && blackwater != null && theReach != null &&
            searoad.getController() == house && blackwater.getController() == house && theReach.getController() == house;
    }
);

export const ampleHarvest = new ObjectiveCard(
    "ample-harvest",
    "Ample Harvest",
    "Obtain position 5 or 6 on the Supply track.",
    [["arryn", 2], ["baratheon", 1], ["lannister", 1], ["stark", 1]],
    (house, _ingame) => {
        return house.supplyLevel >= 5;
    }
);

export const mercantileVentures = new ObjectiveCard(
    "mercantile-ventures",
    "Mercantile Ventures",
    "Control more Ports than each other House.",
    [["arryn", 2], ["baratheon", 1], ["lannister", 1], ["stark", 1]],
    (house, ingame) => {
        const controlledPortsPerHouse = new BetterMap(
            ingame.game.houses.values.map(h => [h, ingame.world.regions.values.filter(r => r.type == port && r.getController() == h).length]));

        let ownPortCount = 0;
        if (controlledPortsPerHouse.has(house)) {
            ownPortCount = controlledPortsPerHouse.get(house);
            controlledPortsPerHouse.delete(house);
        }

        return controlledPortsPerHouse.values.every(pc => ownPortCount > pc);
    }
);

export const aFirmGrip = new ObjectiveCard(
    "a-firm-grip",
    "A Firm Grip",
    "Control Crackclaw Point and Kingswood.",
    [["arryn", 2], ["baratheon", 1], ["lannister", 1], ["stark", 3]],
    (house, ingame) => {
        const ccp = ingame.world.regions.tryGet("crackclaw-point", null);
        const kingswood = ingame.world.regions.tryGet("kingswood", null);

        return ccp != null && kingswood != null &&
            ccp.getController() == house && kingswood.getController() == house;
    }
);

export const aStalwartPosition = new ObjectiveCard(
    "a-stalwart-position",
    "A Stalwart Position",
    "Control more Strongholds than each other House.",
    [["arryn", 3], ["baratheon", 2], ["lannister", 1], ["stark", 1]],
    (house, ingame) => {
        const controlledStrongholds = new BetterMap(
            ingame.game.houses.values.map(h => [h, ingame.world.regions.values.filter(r => r.castleLevel == 2 && r.getController() == h).length]));

        let ownStrongholdCount = 0;
        if (controlledStrongholds.has(house)) {
            ownStrongholdCount = controlledStrongholds.get(house);
            controlledStrongholds.delete(house);
        }

        return controlledStrongholds.values.every(shc => ownStrongholdCount > shc);
    }
);

export const spreadingTheWealth = new ObjectiveCard(
    "spreading-the-wealth",
    "Spreading the Wealth",
    "Have more Power tokens on the board than each other House.",
    [["arryn", 1], ["baratheon", 1], ["lannister", 1], ["stark", 1]],
    (house, ingame) => {
        const powerTokensOnBoard = new BetterMap(
            ingame.game.houses.values.map(h => [h, ingame.world.regions.values.filter(r => r.controlPowerToken == h).length]));

        let ownPtCount = 0;
        if (powerTokensOnBoard.has(house)) {
            ownPtCount = powerTokensOnBoard.get(house);
            powerTokensOnBoard.delete(house);
        }

        return powerTokensOnBoard.values.every(ptc => ownPtCount > ptc);
    }
);

export const protectTheNeck = new ObjectiveCard(
    "protect-the-neck",
    "Protect the Neck",
    "Control Seagard, Greywater Watch, and Flint's Finger.",
    [["arryn", 1], ["baratheon", 4], ["lannister", 1], ["stark", 1]],
    (house, ingame) => {
        const seagard = ingame.world.regions.tryGet("seagard", null);
        const greywater = ingame.world.regions.tryGet("greywater-watch", null);
        const flints = ingame.world.regions.tryGet("flints-finger", null);

        return seagard != null && greywater != null && flints != null &&
            seagard.getController() == house && greywater.getController() == house && flints.getController() == house;
    }
);

export const nothingButGhosts = new ObjectiveCard(
    "nothing-but-ghosts",
    "Nothing but Ghosts",
    "Have 1 unit in Harrenhal and no units in any areas adjacent to Harrenhal.",
    [["arryn", 1], ["baratheon", 1], ["lannister", 1], ["stark", 1]],
    (house, ingame) => {
        const harrenhal = ingame.world.regions.tryGet("harrenhal", null);

        if (!harrenhal) {
            return false;
        }

        const adjacent = ingame.world.getNeighbouringRegions(harrenhal);

        return harrenhal.units.size == 1 && harrenhal.units.values[0].allegiance == house && adjacent.every(r => r.units.values.every(u => u.allegiance != house));
    }
);

export const theFinalHour = new ObjectiveCard(
    "the-final-hour",
    "The Final Hour",
    "Have only 1 House card in your hand.",
    [["arryn", 1], ["baratheon", 1], ["lannister", 1], ["stark", 1]],
    (house, _ingame) => {
        return house.houseCards.values.filter(hc => hc.state == HouseCardState.AVAILABLE).length == 1;
    }
);

export const thePeoplesChosen = new ObjectiveCard(
    "the-peoples-chosen",
    "The People's Chosen",
    "Control 4 or more areas with Power icons.",
    [["arryn", 1], ["baratheon", 1], ["lannister", 1], ["stark", 1]],
    (house, ingame) => {
        return ingame.world.regions.values.filter(r => r.crownIcons > 0 && r.getController() == house).length >= 4;
    }
);

export const aMountainousTask = new ObjectiveCard(
    "a-mountainous-task",
    "A Mountainous Task",
    "Control The Eyrie.",
    [["arryn", 0], ["baratheon", 3], ["lannister", 4], ["stark", 3]],
    (house, ingame) => {
        return ingame.world.regions.tryGet("the-eyrie", null)?.getController() == house;
    }
);

export const aRiperFruit = new ObjectiveCard(
    "a-riper-fruit",
    "A Riper Fruit",
    "Control Winterfell.",
    [["arryn", 1], ["baratheon", 2], ["lannister", 2], ["stark", 0]],
    (house, ingame) => {
        return ingame.world.regions.tryGet("winterfell", null)?.getController() == house;
    }
);

export const friendlyConfines = new ObjectiveCard(
    "friendly-confines",
    "Friendly Confines",
    "Control more Castles than each other House.",
    [["arryn", 1], ["baratheon", 1], ["lannister", 1], ["stark", 1]],
    (house, ingame) => {
        const controlledCastles = new BetterMap(
            ingame.game.houses.values.map(h => [h, ingame.world.regions.values.filter(r => r.castleLevel == 1 && r.getController() == h).length]));

        let ownCastleCount = 0;
        if (controlledCastles.has(house)) {
            ownCastleCount = controlledCastles.get(house);
            controlledCastles.delete(house);
        }

        return controlledCastles.values.every(cc => ownCastleCount > cc);
    }
);

export const objectiveCards = new BetterMap<string, ObjectiveCard>([
    [stopTheStorm.id, stopTheStorm],
    [cavalryCharge.id, cavalryCharge],
    [backdoorPolitics.id, backdoorPolitics],
    [homeInvasion.id, homeInvasion],
    [landGrab.id, landGrab],
    [arborGold.id, arborGold],
    [extendYourReach.id, extendYourReach],
    [takeTheBlack.id, takeTheBlack],
    [theRaven.id, theRaven],
    [supportTheCrown.id, supportTheCrown],
    [theThrone.id, theThrone],
    [theBlade.id, theBlade],
    [holdCourt.id, holdCourt],
    [crossingGuard.id, crossingGuard],
    [navalSuperiority.id, navalSuperiority],
    [pullTheWeeds.id, pullTheWeeds],
    [ampleHarvest.id, ampleHarvest],
    [mercantileVentures.id, mercantileVentures],
    [aFirmGrip.id, aFirmGrip],
    [aStalwartPosition.id, aStalwartPosition],
    [spreadingTheWealth.id, spreadingTheWealth],
    [protectTheNeck.id, protectTheNeck],
    [nothingButGhosts.id, nothingButGhosts],
    [theFinalHour.id, theFinalHour],
    [thePeoplesChosen.id, thePeoplesChosen],
    [aMountainousTask.id, aMountainousTask],
    [aRiperFruit.id, aRiperFruit],
    [friendlyConfines.id, friendlyConfines]
]);

export default function getShuffledObjectivesDeck(): ObjectiveCard[] {
    return shuffleInPlace(objectiveCards.values);
}

export const arrynSpecialObjective = new SpecialObjectiveCard(
    "arryn-special-objective",
    "arryn",
    (house, ingame) => {
        const powerTokensPerHouse = new BetterMap(
            ingame.game.houses.values.map(h => [h, h.powerTokens]));

        let ownPtCount = 0;
        if (powerTokensPerHouse.has(house)) {
            ownPtCount = powerTokensPerHouse.get(house);
            powerTokensPerHouse.delete(house);
        }

        return powerTokensPerHouse.values.every(ptc => ownPtCount > ptc) && ingame.world.regions.tryGet("the-eyrie", null)?.getController() == house;
    }
);

export const baratheonSpecialObjective = new SpecialObjectiveCard(
    "baratheon-special-objective",
    "baratheon",
    (house, ingame) => {
        const dragonstone = ingame.world.regions.tryGet("dragonstone", null);
        const kingsLanding = ingame.world.regions.tryGet("kings-landing", null);

        return dragonstone != null && kingsLanding != null &&
            dragonstone.getController() == house && kingsLanding.getController() == house;
    }
);

export const lannisterSpecialObjective = new SpecialObjectiveCard(
    "lannister-special-objective",
    "lannister",
    (house, ingame) => {
        const lannisport = ingame.world.regions.tryGet("lannisport", null);
        const kingsLanding = ingame.world.regions.tryGet("kings-landing", null);

        return lannisport != null && kingsLanding != null &&
            lannisport.getController() == house && kingsLanding.getController() == house;
    }
);

export const starkSpecialObjective = new SpecialObjectiveCard(
    "stark-special-objective",
    "stark",
    (house, ingame) => {
        const winterfell = ingame.world.regions.tryGet("winterfell", null);
        const castleCount = ingame.world.regions.values.filter(r => r.castleLevel > 0 && r.getController() == house).length;

        return winterfell != null && winterfell.getController() == house && castleCount >= 5;
    }
);

export const specialObjectiveCards = new BetterMap<string, SpecialObjectiveCard>([
    [arrynSpecialObjective.id, arrynSpecialObjective],
    [baratheonSpecialObjective.id, baratheonSpecialObjective],
    [lannisterSpecialObjective.id, lannisterSpecialObjective],
    [starkSpecialObjective.id, starkSpecialObjective]
]);