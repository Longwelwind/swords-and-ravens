import SilenceAtTheWall from "./SilenceAtTheWall";
import BetterMap from "../../../../utils/BetterMap";
import PreemptiveRaidWildlingCardType from "./PreemptiveRaidWildlingCardType";
import CrowKillers from "./CrowKillers";
import RattleshirtsRaiders from "./RattleshirtsRaiders";
import MassingOnTheMilkwater from "./MassingOnTheMilkwater";
import AKingBeyondTheWall from "./AKingBeyondTheWall";
import MammothRiders from "./MammothRiders";


export const silenceAtTheWall = new SilenceAtTheWall(
    "silence-at-the-wall", "Silence at the Wall",
    "Nothing happens",
    "Nothing happens",
    "Nothing happens"
);
export const preemptiveRaid = new PreemptiveRaidWildlingCardType(
    "preemptive-raid", "Preemptive Raid",
    "Chooses one of the following",
    "Nothing happens",
    ""
);
export const crowKillers = new CrowKillers(
    "crow-killers", "Crow Killers",
    "Replaces all of his Knights with available Footmen. Any knight unable to be replaced is destroyed.",
    "Replaces 2 of their Knights with available Footmen. Any knight unable to be replaced is destroyed.",
    "May immediately replace up to 2 of his Footmen, anywhere, with available Knights."
);
export const rattleshirtsRaiders = new RattleshirtsRaiders(
    "rattleshirts-raiders", "Rattleshirt's Raiders",
    "Is reduced 2 positions on the Supply track (to no lower than 0).",
    "Is reduced 1 position on the Supply track (to no lower than 0).",
    "is increased 1 position on the Supply track (to no higher than 6)."
);
export const massingOnTheMilkwater = new MassingOnTheMilkwater(
    "massing-on-the-milkwater", "Massing on the Milkwater",
    "If they have more than one House card in his hand, he discards all cards with"
    + " the highest combat strength",
    "If they have have more than one House card in their hand, they must choose and "
    + " discard one of those cards.",
    "Returns his entire House card discard into his hand."
);
export const aKingBeyondTheWall = new AKingBeyondTheWall(
    "a-king-beyond-the-wall", "A King Beyond the Wall",
    "Moves their tokens to the lowest position of every Influence track",
    "In turn order, each player chooses either the Fiefdoms or King's Court Influence"
    + " track and moves their token to the lowest position of that track.",
    "Moves their token to the top of one Influence track of his choice then takes the appropriate"
    + " Dominance token."
);
export const mammothRiders = new MammothRiders(
    "mammoth-riders", "Mammoth Riders",
    "Destroys 3 of their units anywhere.",
    "Destroys 2 of their units anywhere.",
    "May retrieve 1 House card of their choice from their House card discard pile."
);

const wildlingCardTypes = new BetterMap([
    [silenceAtTheWall.id, silenceAtTheWall],
    [preemptiveRaid.id, preemptiveRaid],
    [crowKillers.id, crowKillers],
    [rattleshirtsRaiders.id, rattleshirtsRaiders],
    [massingOnTheMilkwater.id, massingOnTheMilkwater],
    [aKingBeyondTheWall.id, aKingBeyondTheWall],
    [mammothRiders.id, mammothRiders]
]);

export default wildlingCardTypes;
