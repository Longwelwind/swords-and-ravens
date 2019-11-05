import HouseCardAbility from "./HouseCardAbility";
import BetterMap from "../../../../utils/BetterMap";
import TheonGreyjoyHouseCardAbility from "./TheonGreyjoyHouseCardAbility";
import SerDavosSeaworthHouseCardAbility from "./SerDavosSeaworthHouseCardAbility";
import RenlyBaratheonHouseCardAbility from "./RenlyBaratheonHouseCardAbility";
import TywinLannisterHouseCardAbility from "./TywinLannisterHouseCardAbility";

export const theonGreyjoy = new TheonGreyjoyHouseCardAbility(
    "theon-greyjoy",
    "If you are defending an area that contains either a Stronghold or a Castle,"
    + " this card gains +1 combat strength and a sword icon."
);
export const serDavosSeaworth = new SerDavosSeaworthHouseCardAbility(
    "ser-davos-seaworth",
    "If your \"Stannis Baratheon\", House card is in your discard pile, this card"
    + " gains +1 combat strength and a sword icon."
);
export const renlyBaratheon = new RenlyBaratheonHouseCardAbility(
    "renly-baratheon",
    "If you win this combat, you may upgrade one of your participating Footmen" +
    + " (or one supporting Baratheon Footmen) to a Knight."
);
export const tywinLannister = new TywinLannisterHouseCardAbility(
    "tywin-lannister",
    "If you win this combat, gain two Power tokens."
);

const houseCardAbilities = new BetterMap<string, HouseCardAbility>([
    [theonGreyjoy.id, theonGreyjoy],
    [serDavosSeaworth.id, serDavosSeaworth],
    [renlyBaratheon.id, renlyBaratheon],
    [tywinLannister.id, tywinLannister]
]);

export default houseCardAbilities;
