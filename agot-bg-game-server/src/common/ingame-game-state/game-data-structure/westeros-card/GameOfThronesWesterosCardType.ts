import WesterosCardType from "./WesterosCardType";
import WesterosGameState from "../../westeros-game-state/WesterosGameState";
import House from "../House";
import * as _ from "lodash";
import {port} from "../regionTypes";

export default class GameOfThronesWesterosCardType extends WesterosCardType {
    execute(westeros: WesterosGameState): void {
        const world = westeros.world;

        // Make each player wins a power tokens for each region with crown icons,
        // plus one for each controlled port adjacent to a controlled or a free sea.
        const gains = westeros.game.houses.values.map<[House, number]>(house => ([
                house,
                // Counter number of controlled crows
                _.sum(world.getControlledRegions(house).map(r => r.crownIcons))
                // Counter number of controlled ports where the adjacent sea area is un-constested
                + world.getControlledRegions(house)
                    .filter(r => r.type == port)
                    .filter(r =>
                        world.getAdjacentSeaOfPort(r).getController() == null
                        || world.getAdjacentSeaOfPort(r).getController() == house
                    ).length
            ])
        ).filter(([_house, gain]) => gain > 0);

        gains.forEach(([house, gain]) => {
            westeros.ingame.changePowerTokens(house, gain);
        });

        westeros.ingame.log({
            type: "game-of-thrones-power-tokens-gained",
            gains: gains.map(([house, gain]) => [house.id, gain])
        });

        westeros.onWesterosCardEnd();
    }
}
