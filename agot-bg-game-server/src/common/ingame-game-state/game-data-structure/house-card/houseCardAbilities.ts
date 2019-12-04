import HouseCardAbility from "./HouseCardAbility";
import BetterMap from "../../../../utils/BetterMap";
import TheonGreyjoyHouseCardAbility from "./TheonGreyjoyHouseCardAbility";
import SerDavosSeaworthHouseCardAbility from "./SerDavosSeaworthHouseCardAbility";
import RenlyBaratheonHouseCardAbility from "./RenlyBaratheonHouseCardAbility";
import TywinLannisterHouseCardAbility from "./TywinLannisterHouseCardAbility";
import SalladhorSaanHouseCardAbility from "./SalladhorSaanHouseCardAbility";
import AshaGreyjoyHouseCardAbilities from "./AshaGreyjoyHouseCardAbilities";
import QueenOfThornsHouseCardAbility from "./QueenOfThornsHouseCardAbility";
import VictarionGreyjoyHouseCardAbility from "./VictarionGreyjoyHouseCardAbility";
import BalonGreyjoyHouseCardAbility from "./BalonGreyjoyHouseCardAbility";
import DoranMartellHouseCardAbility from "./DoranMartellHouseCardAbility";
import PatchfaceHouseCardAbility from "./PatchfaceHouseCardAbility";
import SerLorasTyrellHouseCardAbility from "./SerLorasTyrellHouseCardAbility";
import StannisBaratheonHouseCardAbility from "./StannisBaratheonHouseCardAbility";
import NymeriaSandHouseCardAbility from "./NymeriaSandHouseCardAbility";
import RooseBoltonHouseCardAbility from "./RooseBoltonHouseCardAbility";
import TyrionLannisterHouseCardAbility from "./TyrionLannisterHouseCardAbility";
import SerKevanLannisterHouseCardAbility from "./SerKevanLannisterHouseCardAbility";
import CatelynStarkHouseCardAbility from "./CatelynStarkHouseCardAbility";
import AeronDamphairHouseCardAbility from "./AeronDamphairHouseCardAbility";

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
export const salladhorSaan = new SalladhorSaanHouseCardAbility(
    "salladhor-saan",
    "If you are being supported in this combat, the combat strength of all"
    + "non-Baratheon ships is reduced to zero."
);
export const ashaGreyjoy = new AshaGreyjoyHouseCardAbilities(
    "asha-greyjoy",
    "If you are not being supported in this combat, this card gains"
    + " two sword icons and one fortification icon."
);
export const queenOfThorns = new QueenOfThornsHouseCardAbility(
    "queen-of-thorns",
    "Immediately remove one of your opponent's Order tokens in any one area"
    + " adjacent to the embattled area. You may not remove the March Order token"
    + " used to start this combat."
);
export const victarionGreyjoy = new VictarionGreyjoyHouseCardAbility(
    "victarion-greyjoy",
    "If you are attacking, all of you participating Ships (including"
     + " supporting Greyjoy Ships) add +2 to combat strength instead of +1."
);
export const balonGreyjoy = new BalonGreyjoyHouseCardAbility(
    "balon-greyjoy",
    "The printed combat strength of your opponent's House card is reduced to 0."
);
export const doranMartell = new DoranMartellHouseCardAbility(
    "doran-martell",
    "Immediately move your opponent to the bottom of one Influence track of your choice."
);
export const patchface = new PatchfaceHouseCardAbility(
    "patchface",
    "After combat, you may look at your opponent's hand and discard one card of your choice."
);
export const serLorasTyrell = new SerLorasTyrellHouseCardAbility(
    "ser-loras-tyrell",
    "If you are attacking and win this combat, move the March Order token into the conquered area"
    + " (instead of discarding it). The March Order token may be resolved again later this round."
);
export const stannisBaratheon = new StannisBaratheonHouseCardAbility(
    "stannis-baratheon",
    "If your opponent has a higher position on the Iron Throne Influence track than you,"
    + " this card gains +1 combat strength."
);
export const nymeriaSand = new NymeriaSandHouseCardAbility(
    "nymeria-sand",
    "If you are defending, this card gains a fortification icon."
    + " If you are attacking, this card gains a sword icon."
);
export const rooseBolton = new RooseBoltonHouseCardAbility(
    "roose-bolton",
    "If you lose this combat, return your entire House card discard pile into your hand"
    + " (including this card)."
);
export const tyrionLannister = new TyrionLannisterHouseCardAbility(
    "tyrion-lannister",
    "You may immediately cancel your opponent's chosen House card and return it to his hand. He"
    + " must then choose a different House card to reveal, if he has no other House cards in hand, he"
    + " cannot use a House card this combat."
);
export const serKevanLannister = new SerKevanLannisterHouseCardAbility(
    "ser-kevan-lannister",
    "If you are attacking, all of your participating Footmen (including supporting"
    + " Lannister footmen) add +2 combat strength instead of +1."
);
export const catelynStark = new CatelynStarkHouseCardAbility(
    "catelyn-stark",
    "If you have a Defense Order token in the embattled area, its value is doubled."
);
export const aeronDamphair = new AeronDamphairHouseCardAbility(
    "aeron-damphair",
    "You may immediately discard two of your available Power tokens to discard Aeron"
    + " Damphair and choose a different House card from your hand (if able)"
);

const houseCardAbilities = new BetterMap<string, HouseCardAbility>([
    [theonGreyjoy.id, theonGreyjoy],
    [serDavosSeaworth.id, serDavosSeaworth],
    [renlyBaratheon.id, renlyBaratheon],
    [tywinLannister.id, tywinLannister],
    [salladhorSaan.id, salladhorSaan],
    [ashaGreyjoy.id, ashaGreyjoy],
    [queenOfThorns.id, queenOfThorns],
    [victarionGreyjoy.id, victarionGreyjoy],
    [balonGreyjoy.id, balonGreyjoy],
    [doranMartell.id, doranMartell],
    [patchface.id, patchface],
    [serLorasTyrell.id, serLorasTyrell],
    [stannisBaratheon.id, stannisBaratheon],
    [nymeriaSand.id, nymeriaSand],
    [rooseBolton.id, rooseBolton],
    [tyrionLannister.id, tyrionLannister],
    [serKevanLannister.id, serKevanLannister],
    [catelynStark.id, catelynStark],
    [aeronDamphair.id, aeronDamphair],
]);

export default houseCardAbilities;
