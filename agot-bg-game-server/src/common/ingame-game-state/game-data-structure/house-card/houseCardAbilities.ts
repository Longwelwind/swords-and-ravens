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
import ArianneMartellHouseCardAbility from "./ArianneMartellHouseCardAbility";
import MaceTyrellHouseCardAbility from "./MaceTyrellHouseCardAbility";
import CerseiLannisterHouseCardAbility from "./CerseiLannisterHouseCardAbility";
import TheBlackfishHouseCardAbility from "./TheBlackfishHouseCardAbility";
import RobbStarkHouseCardAbility from "./RobbStarkHouseCardAbility";

// A Dance with Dragons House cards
// Baratheon
import ManceRayderHouseCardAbility from "./ManceRayderHouseCardAbility";
import MelisandreAdwdHouseCardAbility from "./MelisandreAdwdHouseCardAbility";
import JonSnowAdwdHouseCardAbility from "./JonSnowAdwdHouseCardAbility";
import StannisBaratheonAdwdHouseCardAbility from "./StannisBaratheonAdwdHouseCardAbility";
// Martell
import QuentynMartellHouseCardAbility from "./QuentynMartellHouseCardAbility";
import DoranMartellAdwdHouseCardAbility from "./DoranMartellAdwdHouseCardAbility";
import GerrisDrinkwaterHouseCardAbility from "./GerrisDrinkwaterHouseCardAbility";
// Stark
import ReekAdwdHouseCardAbility from "./ReekAdwdHouseCardAbility";
import WalderFreyAdwdHouseCardAbility from "./WalderFreyAdwdHouseCardAbility";
import RamsayBoltonAdwdHouseCardAbility from "./RamsayBoltonAdwdHouseCardAbility";
// Greyjoy
import EuronCrowsEyeAdwdHouseCardAbility from "./EuronCrowsEyeAdwdHouseCardAbility";
import RodrikTheReaderAdwdHouseCardAbility from "./RodrikTheReaderAdwdHouseCardAbility";
import QuarlTheMaidAdwdHouseCardAbility from "./QuarlTheMaidAdwdHouseCardAbility";
import AeronDamphairAdwdHouseCardAbility from "./AeronDamphairAdwdHouseCardAbility";
// Lannister
import SerIlynPayneAdwdHouseCardAbility from "./SerIlynPayneAdwdHouseCardAbility";
import SerAddamMarbrandAdwdHouseCardAbility from "./SerAddamMarbrandAdwdHouseCardAbility";
import QyburnAdwdHouseCardAbility from "./QyburnAdwdHouseCardAbility";
// Tyrell
import PaxterRedwyneAdwdHouseCardAbility from "./PaxterRedwyneAdwdHouseCardAbility";
import MargaeryTyrellAdwdHouseCardAbility from "./MargaeryTyrellAdwdHouseCardAbility";
import QueenOfThornsAdwdHouseCardAbility from "./QueenOfThornsAdwdHouseCardAbility";

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
export const arianneMartell = new ArianneMartellHouseCardAbility(
    "arianne-martell",
    "If you are defending and lose this combat, your opponent may not move his units into the embattled area."
    + " They return to the area from which they marched. Your own units must still retreat."
);
export const maceTyrell = new MaceTyrellHouseCardAbility(
    "mace-tyrell",
    "Immediately destroy one of your opponent's attacking or defending Footmen units."
);
export const cerseiLannister = new CerseiLannisterHouseCardAbility(
    "cersei-lannister",
    "If you win this combat, you may remove of the losing opponent's"
    + " Order tokens from anywhere on the board."
);
export const theBlackfish = new TheBlackfishHouseCardAbility(
    "the-blackfish",
    "You do not take casualties in this combat from"
    + " House card abilities, Combat icons, or Tides of Battles cards."
);
export const robbStark = new RobbStarkHouseCardAbility(
    "robb-stark",
    "If you win this combat, you may choose the area to which your opponent's retreats."
    + " You must choose a legal area where your opponent loses the fewest units."
);

// A Dance with Dragons House Cards
// Baratheon
export const manceRayder = new ManceRayderHouseCardAbility(
    "mance-rayder",
    "Your final combat strength is equal to the current position of the Wilding"
    + " Threat token."
);
export const jonSnowAdwd = new JonSnowAdwdHouseCardAbility(
    "jon-snow-adwd",
    "Needs fixing"
);
export const melisandreAdwd = new MelisandreAdwdHouseCardAbility(
    "melisandre-adwd",
    "Needs fixing"
);
export const stannisBaratheonAdwd = new StannisBaratheonAdwdHouseCardAbility(
    "stannis-baratheon-adwd",
    "Needs fixing"
);
// Martell
export const quentynMartell = new QuentynMartellHouseCardAbility(
    "quentyn-martell",
    "For each House card in your discard pile, this card gains +1 combat strength."
);
export const gerrisDrinkwater = new GerrisDrinkwaterHouseCardAbility(
    "ser-gerris-drinkwater",
    "Needs fixing"
);
export const doranMartellAdwd = new DoranMartellAdwdHouseCardAbility(
    "doran-martell-adwd",
    "Needs fixing"
);
// Stark
export const reekAdwd = new ReekAdwdHouseCardAbility(
    "reek-adwd",
    "Needs fixing"
);
export const walderFreyAdwd = new WalderFreyAdwdHouseCardAbility(
    "walder-frey-adwd",
    "Needs fixing"
);
export const ramsayBoltonAdwd = new RamsayBoltonAdwdHouseCardAbility(
    "ramsay-bolton-adwd",
    "Needs fixing"
);
//Greyjoy
export const euronCrowsEyeAdwd = new EuronCrowsEyeAdwdHouseCardAbility(
    "euron-crows-eye-adwd",
    "Needs fixing"
);
export const rodrikTheReaderAdwd = new RodrikTheReaderAdwdHouseCardAbility(
    "rodrik-the-reader-adwd",
    "Needs fixing"
);
export const quarlTheMaidAdwd = new QuarlTheMaidAdwdHouseCardAbility(
    "quarl-the-maid-adwd",
    "Needs fixing"
);
export const aeronDamphairAdwd = new AeronDamphairAdwdHouseCardAbility(
    "aeron-damphair-adwd",
    "Needs fixing"
);
// Lannister
export const serIlynPayneAdwd = new SerIlynPayneAdwdHouseCardAbility(
    "ser-ilyn-payne-adwd",
    "Needs fixing"
);
export const serAddamAdwd = new SerAddamMarbrandAdwdHouseCardAbility(
    "ser-addam-marbrand-adwd",
    "Needs fixing"
);
export const qyburnAdwd = new QyburnAdwdHouseCardAbility(
    "qyburn-adwd",
    "Needs fixing"
);
// Tyrell
export const paxterRedwyneAdwd = new PaxterRedwyneAdwdHouseCardAbility(
    "paxter-redwyne-adwd",
    "Needs fixing"
);
export const queenOfThornsAdwd = new QueenOfThornsAdwdHouseCardAbility(
    "queen-of-thorns-adwd",
    "Needs fixing"
);
export const margaeryTyrellAdwd = new MargaeryTyrellAdwdHouseCardAbility(
    "margaery-tyrell-adwd",
    "Needs fixing"
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
    [arianneMartell.id, arianneMartell],
    [maceTyrell.id, maceTyrell],
    [cerseiLannister.id, cerseiLannister],
    [theBlackfish.id, theBlackfish],
    [robbStark.id, robbStark],
    // A Dance with Dragons House Cards
    [manceRayder.id, manceRayder],
    [quentynMartell.id, quentynMartell],
    [doranMartellAdwd.id, doranMartellAdwd],
    [gerrisDrinkwater.id, gerrisDrinkwater],
    [stannisBaratheonAdwd.id, stannisBaratheonAdwd],
    [melisandreAdwd.id, melisandreAdwd],
    [jonSnowAdwd.id, jonSnowAdwd],
    [reekAdwd.id, reekAdwd],
    [walderFreyAdwd.id, walderFreyAdwd],
    [ramsayBoltonAdwd.id, ramsayBoltonAdwd],
    [euronCrowsEyeAdwd.id, euronCrowsEyeAdwd],
    [rodrikTheReaderAdwd.id, rodrikTheReaderAdwd],
    [quarlTheMaidAdwd.id, quarlTheMaidAdwd],
    [aeronDamphairAdwd.id, aeronDamphairAdwd],
    [serIlynPayneAdwd.id,serIlynPayneAdwd],
    [serAddamAdwd.id,serAddamAdwd],
    [qyburnAdwd.id, qyburnAdwd],
    [paxterRedwyneAdwd.id, paxterRedwyneAdwd],
    [queenOfThornsAdwd.id, queenOfThornsAdwd],
    [margaeryTyrellAdwd.id, margaeryTyrellAdwd]


]);

export default houseCardAbilities;
