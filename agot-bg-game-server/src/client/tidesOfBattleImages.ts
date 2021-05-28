import zeroImage from "../../public/images/tides-of-battle-cards/zero.png";
import swordImage from "../../public/images/tides-of-battle-cards/sword.png";
import fortificationImage from "../../public/images/tides-of-battle-cards/fortification.png";
import twoImage from "../../public/images/tides-of-battle-cards/two.png";
import threeImage from "../../public/images/tides-of-battle-cards/three.png";
import skullImage from "../../public/images/tides-of-battle-cards/skull.png";

import { fortification, skull, sword, three, two, zero } from "../common/ingame-game-state/game-data-structure/static-data-structure/tidesOfBattleCards";
import BetterMap from "../utils/BetterMap";

const tidesOfBattleImages = new BetterMap([
    [zero.id, zeroImage],
    [sword.id, swordImage],
    [fortification.id, fortificationImage],
    [two.id, twoImage],
    [three.id, threeImage],
    [skull.id, skullImage]
]);

export default tidesOfBattleImages;
