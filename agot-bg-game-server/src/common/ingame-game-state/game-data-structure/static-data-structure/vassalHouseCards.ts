import HouseCard from "../house-card/HouseCard";
import houseCardAbilities from "../house-card/houseCardAbilities";

export const varys = new HouseCard("varys", "Varys", 0, 0, 0, houseCardAbilities.get("varys"));
export const syrioForel = new HouseCard("syrio-forel", "Syrio Forel", 1, 0, 0, houseCardAbilities.get("syrio-forel"));
export const jaqenHGhar = new HouseCard("jaqen-h-ghar", "Jaqen H'Ghar", 1, 0, 0, houseCardAbilities.get("jaqen-h-ghar"));
export const janosSlynt = new HouseCard("janos-slynt", "Janos Slynt", 2, 2, 1, null);
export const jonConnington = new HouseCard("jon-connington", "Jon Connington", 2, 0, 0, houseCardAbilities.get("jon-connington"));
export const bericDondarrion = new HouseCard("beric-dondarrion", "Beric Dondarrion", 3, 0, 0, houseCardAbilities.get("beric-dondarrion"));
export const bronn = new HouseCard("bronn", "Bronn", 4, 0, 0, houseCardAbilities.get("bronn"));

export const vassalHouseCards = [
    varys,
    syrioForel,
    jaqenHGhar,
    janosSlynt,
    jonConnington,
    bericDondarrion,
    bronn
];