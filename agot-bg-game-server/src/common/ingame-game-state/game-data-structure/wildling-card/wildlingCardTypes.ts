import SilenceAtTheWall from "./SilenceAtTheWall";
import BetterMap from "../../../../utils/BetterMap";
import PreemptiveRaidWildlingCardType from "./PreemptiveRaidWildlingCardType";
import CrowKillers from "./CrowKillers";
import RattleshirtsRaiders from "./RattleshirtsRaiders";
import MassingOnTheMilkwater from "./MassingOnTheMilkwater";
import AKingBeyondTheWall from "./AKingBeyondTheWall";
import MammothRiders from "./MammothRiders";
import TheHordeDescends from "./TheHordeDescends";
import SkinchangerScout from "./SkinchangerScout";


export const silenceAtTheWall = new SilenceAtTheWall(
    "silence-at-the-wall", "Silence at the Wall",
    "Nothing happens.",
    "Nothing happens.",
    "Nothing happens."
);
export const preemptiveRaid = new PreemptiveRaidWildlingCardType(
    "preemptive-raid", "Preemptive Raid",
    "Chooses one of the following: A) Destroys 2 of their units anywhere."
        + " B) Is reduced 2 positions on their highest Influence track.",
    "Nothing happens.",
    "The wildlings immediately attack again with a strength of 6. You do not participate in the bidding"
        + " against this attack (nor do you receive any rewards or penalties)."
);
export const crowKillers = new CrowKillers(
    "crow-killers", "Crow Killers",
    "Replaces all of their Knights with available Footmen. Any Knight unable to be replaced is destroyed.",
    "Replaces 2 of their Knights with available Footmen. Any Knight unable to be replaced is destroyed.",
    "May immediately replace up to 2 of their Footmen, anywhere, with available Knights."
);
export const rattleshirtsRaiders = new RattleshirtsRaiders(
    "rattleshirts-raiders", "Rattleshirt's Raiders",
    "Is reduced 2 positions on the Supply track (to no lower than 0).",
    "Is reduced 1 position on the Supply track (to no lower than 0).",
    "Is increased 1 position on the Supply track (to no higher than 6)."
);
export const massingOnTheMilkwater = new MassingOnTheMilkwater(
    "massing-on-the-milkwater", "Massing on the Milkwater",
    "If they have more than one House card in their hand, they discard all cards with"
    + " the highest combat strength.",
    "If they have more than one House card in their hand, they must choose and"
    + " discard one of those cards.",
    "Returns their entire House card discard pile into their hand."
);
export const aKingBeyondTheWall = new AKingBeyondTheWall(
    "a-king-beyond-the-wall", "A King Beyond the Wall",
    "Moves their tokens to the lowest position of every Influence track.",
    "In turn order, each player chooses either the Fiefdoms or King's Court Influence"
    + " track and moves their token to the lowest position of that track.",
    "Moves their token to the top of one Influence track of their choice, then take the appropriate"
    + " Dominance token."
);
export const mammothRiders = new MammothRiders(
    "mammoth-riders", "Mammoth Riders",
    "Destroys 3 of their units anywhere.",
    "Destroys 2 of their units anywhere.",
    "May retrieve 1 House card of their choice from his House card discard pile."
);
export const theHordeDescends = new TheHordeDescends(
    "the-horde-descends", "The Horde Descends",
    "Destroys 2 of their units at one of his Castles or Strongholds. If unable,"
    + " they destroys 2 of their units anywhere.",
    "Destroys 1 of their units anywhere.",
    "May muster forces (following normal mustering rules) in any one Castle or Stronghold area"
    + " they controls."
);
export const skinchangerScout = new SkinchangerScout(
    "skinchanger-scout", "Skinchanger Scout",
    "Discards all available Power tokens.",
    "Discards 2 available Power tokens, or as many as they are able.",
    "All Power tokens they bid on this attack are immediately returned to their available Power."
);

const wildlingCardTypes = new BetterMap([
    [silenceAtTheWall.id, silenceAtTheWall],
    [preemptiveRaid.id, preemptiveRaid],
    [crowKillers.id, crowKillers],
    [rattleshirtsRaiders.id, rattleshirtsRaiders],
    [massingOnTheMilkwater.id, massingOnTheMilkwater],
    [aKingBeyondTheWall.id, aKingBeyondTheWall],
    [mammothRiders.id, mammothRiders],
    [theHordeDescends.id, theHordeDescends],
    [skinchangerScout.id, skinchangerScout],
]);

export default wildlingCardTypes;
