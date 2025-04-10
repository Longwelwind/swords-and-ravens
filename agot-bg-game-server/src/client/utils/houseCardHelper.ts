import BetterMap from "../../utils/BetterMap";
import {
  baseHouseCardsData,
  adwdHouseCardsData,
  ffcHouseCardsData,
  modBHouseCardsData,
  HouseCardData,
  asosHouseCardsData,
  createHouseCard,
} from "../../common/ingame-game-state/game-data-structure/createGame";
import HouseCard from "../../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import houseCardAbilities from "../../common/ingame-game-state/game-data-structure/house-card/houseCardAbilities";
import { vassalHouseCards } from "../../common/ingame-game-state/game-data-structure/static-data-structure/vassalHouseCards";
import _ from "lodash";

function createHouseCards(
  data: [string, HouseCardData][]
): [string, HouseCard][] {
  return data.map(([houseCardId, houseCardData]) => {
    const houseCard = new HouseCard(
      houseCardId,
      houseCardData.name,
      houseCardData.combatStrength ? houseCardData.combatStrength : 0,
      houseCardData.swordIcons ? houseCardData.swordIcons : 0,
      houseCardData.towerIcons ? houseCardData.towerIcons : 0,
      houseCardData.ability
        ? houseCardAbilities.get(houseCardData.ability)
        : null
    );

    return [houseCardId, houseCard];
  });
}

function createNerfedHouseCards(): [string, HouseCard][] {
  const balonNerfed = createHouseCard(
    "balon-greyjoy-nerfed",
    { name: "Balon Greyjoy", combatStrength: 2, ability: "jaqen-h-ghar" },
    "greyjoy"
  );
  const aeronDwdNerfed = createHouseCard(
    "aeron-damphair-dwd-nerfed",
    { name: "Aeron Damphair", ability: "quentyn-martell" },
    "greyjoy"
  );

  return [
    [balonNerfed.id, balonNerfed],
    [aeronDwdNerfed.id, aeronDwdNerfed],
  ];
}

function getAllHouseCards(): [string, HouseCard][] {
  return _.concat(
    createHouseCards(baseHouseCardsData),
    createHouseCards(adwdHouseCardsData),
    createHouseCards(ffcHouseCardsData),
    createHouseCards(modBHouseCardsData),
    createHouseCards(asosHouseCardsData),
    vassalHouseCards.map((hc) => [hc.id, hc] as [string, HouseCard]),
    createNerfedHouseCards()
  );
}

const allKnownHouseCards = new BetterMap(getAllHouseCards());
export default allKnownHouseCards;
