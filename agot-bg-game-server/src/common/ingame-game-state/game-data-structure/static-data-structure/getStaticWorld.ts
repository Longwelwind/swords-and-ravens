import { GameSettings } from "../../../../common/GameSettings";
import staticWorld from "./globalStaticWorld";
import staticWorld7p from "./globalStaticWorld7p";
import staticWorld8p from "./globalStaticWorld8p";
import staticWorldFfcEyrieWithPort from "./globalStaticWorldFfcEyrieWithPort";
import StaticWorld from "./StaticWorld";

export default function getStaticWorld(settings: GameSettings): StaticWorld {
  if (settings.addPortToTheEyrie) {
    return staticWorldFfcEyrieWithPort;
  }

  switch (settings.playerCount) {
    case 8:
      return staticWorld8p;
    case 7:
      return staticWorld7p;
    default:
      return staticWorld;
  }
}
