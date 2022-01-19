import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import House from "../House";
import * as _ from "lodash";
import {port} from "../regionTypes";
import BetterMap from "../../../../utils/BetterMap";

export default class GameOfThronesWesterosCardType extends WesterosCardType {
    execute(westeros: WesterosGameState): void {
        const world = westeros.world;

        // Make each player wins a power tokens for each region with crown icons,
        // plus one for each controlled port adjacent to a controlled or a free sea.
        const gains = new BetterMap(westeros.game.houses.values.filter(h => !westeros.ingame.isVassalHouse(h)).map<[House, number]>(house => ([
                house,
                // Counter number of controlled crows
                _.sum(world.regions.values.filter(r => r.crownIcons > 0 && r.getController() == house).map(r => r.crownIcons))
                // Counter number of controlled ports where the adjacent sea area is un-constested
                + world.regions.values
                    .filter(r => r.type == port && r.units.size > 0 && r.getController() == house)
                    .filter(r =>
                        world.getAdjacentSeaOfPort(r).getController() == null
                        || world.getAdjacentSeaOfPort(r).getController() == house
                    ).length
            ])
        ).filter(([_house, gain]) => gain > 0));

        gains.entries.forEach(([house, gain]) => {
            const delta = westeros.ingame.changePowerTokens(house, gain);
            gains.set(house, delta);
        });

        westeros.ingame.log({
            type: "game-of-thrones-power-tokens-gained",
            gains: gains.entries.map(([house, gain]) => [house.id, gain])
        });

        westeros.onWesterosCardEnd();
    }
}
