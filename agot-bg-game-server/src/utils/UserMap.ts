import BetterMap from "./BetterMap";
import EntireGame from "../common/EntireGame";

export default class UserMap<K, V> extends BetterMap<K, V> {
  entireGame: EntireGame;

  constructor(entireGame: EntireGame, entries: [K, V][] = []) {
    super(entries);
    this.entireGame = entireGame;
  }

  get(key: K): V {
    if (!this.entireGame.gameSettings.faceless) {
      return super.get(key);
    }

    if (this.entireGame.fakeIdToUserIdMap.has(key as unknown as string)) {
      const realUserId = this.entireGame.fakeIdToUserIdMap.get(
        key as unknown as string,
      ) as unknown as K;
      return super.get(realUserId);
    }

    return super.get(key);
  }
}
