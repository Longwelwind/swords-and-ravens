import SilenceAtTheWall from "./SilenceAtTheWall";
import BetterMap from "../../../../utils/BetterMap";
import PreemptiveRaidWildlingCardType from "./PreemptiveRaidWildlingCardType";
import CrowKillers from "./CrowKillers";


const silenceAtTheWall = new SilenceAtTheWall(
    "silence-at-the-wall", "Silence at the Wall",
    "Nothing happens",
    "Nothing happens",
    "Nothing happens"
);
const preemptiveRaid = new PreemptiveRaidWildlingCardType(
    "preemptive-raid", "Preemptive Raid",
    "Chooses one of the following",
    "Nothing happens",
    ""
);
const crowKillers = new CrowKillers(
    "crow-killers", "Crow Killers",
    "",
    "",
    ""
);

const wildlingCardTypes = new BetterMap([
    [silenceAtTheWall.id, silenceAtTheWall],
    [preemptiveRaid.id, preemptiveRaid],
    [crowKillers.id, crowKillers]
]);

export default wildlingCardTypes;
