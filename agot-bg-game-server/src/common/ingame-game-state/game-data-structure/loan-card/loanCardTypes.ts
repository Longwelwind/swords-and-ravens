import BetterMap from "../../../../utils/BetterMap";
import CustomsOfficerLoanCardType from "./CustomsOfficerLoanCardType";
import ExpertArtificerLoanCardType from "./ExpertArtificerLoanCardType";
import FullHostLoanCardType from "./FullHostLoanCardType";
import LoanCardType from "./LoanCardType";
import LoyalMaesterLoanCardType from "./LoyalMaesterLoanCardType";
import MasterAtArmsLoanCardType from "./MasterAtArmsLoanCardType";
import PyromancerLoanCardType from "./PyromancerLoanCardType";
import SavvyStewardLoanCardType from "./SavvyStewardLoanCardType";
import SeaRaidersLoanCardType from "./SeaRaidersLoanCardType";
import SiegeEngineersLoanCardType from "./SiegeEngineersLoanCardType";
import SpymasterLoanCardType from "./SpymasterLoanCardType";
import TheFacelessMenLoanCardType from "./TheFacelessMenLoanCardType";
import VanguardCavalryLoanCardType from "./VanguardCavalryLoanCardType";

export const customsOfficer = new CustomsOfficerLoanCardType(
    "customs-officer", "Customs Officer", "Gain 10 Power tokens."
);

export const expertArtificer = new ExpertArtificerLoanCardType(
    "expert-artificer", "Expert Artificer",
    "Choose any land area and place a power improvement there.\n" +
        "Then, gain 8 Power tokens."
);

export const fullHost = new FullHostLoanCardType(
    "full-host", "Full Host",
    "Place a Footman, a Knight, a Siege Engine and a Ship in areas you control\n" +
        "or already have units."
);

export const loyalMaester = new LoyalMaesterLoanCardType(
    "loyal-maester", "Loyal Maester",
    "Choose any two land areas and place one supply improvement on each."
);

export const masterAtArms = new MasterAtArmsLoanCardType(
    "master-at-arms", "Master-at-Arms",
    "Choose any two areas that contain a castle.\n" +
        "Improve those castles to strongholds."
);

export const pyromancer = new PyromancerLoanCardType(
    "pyromancer", "Pyromancer",
    "Choose any area that contains a castle and degrade it.\n" +
        "Then place either a power improvement or a supply improvement in that area."
);

export const savvySteward = new SavvyStewardLoanCardType(
    "savvy-steward", "Savvy Steward",
    "Choose any land area and place a supply improvement there.\n" +
        "Then, move up one position on the supply track."
);

export const seaRaiders = new SeaRaidersLoanCardType(
    "sea-raiders", "Sea Raiders",
        "Place a Footman and 3 Ships in areas you control or already have units."
);

export const siegeEngineers = new SiegeEngineersLoanCardType(
    "siege-engineers", "Siege Engineers",
    "Place a Footman and 2 Siege Engines in areas you control or already have units."
);

export const spymaster = new SpymasterLoanCardType(
    "spymaster", "Spymaster",
    "Draw the top two cards of any one Westeros deck. After secretly reading them,\n" +
        "put any number of them on the bottom of the deck in any order\n" +
        "and the rest on top of the deck in any order."
);

export const theFacelessMen = new TheFacelessMenLoanCardType(
    "the-faceless-men", "The Faceless Men",
    "Destroy one Knight in any one area  and one Footman in any one other area.\n" +
        "The units may belong to any player or vassal.",
    true
);

export const vanguardCavalry = new VanguardCavalryLoanCardType(
    "vanguard-cavalry", "Vanguard Cavalry",
    "Place 3 Knights in areas you control or already have units."
);

const loanCardTypes = new BetterMap<string, LoanCardType>([
    [customsOfficer.id, customsOfficer],
    [expertArtificer.id, expertArtificer],
    [fullHost.id, fullHost],
    [loyalMaester.id, loyalMaester],
    [masterAtArms.id, masterAtArms],
    [pyromancer.id, pyromancer],
    [savvySteward.id, savvySteward],
    [seaRaiders.id, seaRaiders],
    [siegeEngineers.id, siegeEngineers],
    [spymaster.id, spymaster],
    [theFacelessMen.id, theFacelessMen],
    [vanguardCavalry.id, vanguardCavalry]
]);

export default loanCardTypes;