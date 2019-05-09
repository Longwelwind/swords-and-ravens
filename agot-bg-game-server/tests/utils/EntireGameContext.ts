import GameState from "../../src/common/GameState";
import EntireGame from "../../src/common/EntireGame";
import Game from "../../src/common/ingame-game-state/game-data-structure/Game";
import IngameGameState from "../../src/common/ingame-game-state/IngameGameState";
import World from "../../src/common/ingame-game-state/game-data-structure/World";
import Region from "../../src/common/ingame-game-state/game-data-structure/Region";
import House from "../../src/common/ingame-game-state/game-data-structure/House";
import HouseCard from "../../src/common/ingame-game-state/game-data-structure/house-card/HouseCard";
import * as _ from "lodash";

export type AsFunction<GS extends GameState<any, any>> = (context: EntireGameContext<GS>, gameState: GS) => void;

export default class EntireGameContext<GS extends GameState<any, any>> {
    constructor(public entireGame: EntireGame) { }

    get gameState(): GS {
        return this.entireGame.leafState as GS;
    }

    get game(): Game {
        return this.entireGame.getChildGameState<IngameGameState>(IngameGameState).game;
    }

    get world(): World {
        return this.game.world;
    }

    get theReach(): Region {
        return this.world.regions.get("the-reach");
    }

    get blackwater(): Region {
        return this.world.regions.get("blackwater");
    }

    get blackwaterBay(): Region {
        return this.world.regions.get("blackwater-bay");
    }

    get shipbreakerBay(): Region {
        return this.world.regions.get("shipbreaker-bay");
    }

    get kingsLanding(): Region {
        return this.world.regions.get("kings-landing");
    }

    get dragonstone(): Region {
        return this.world.regions.get("dragonstone");
    }

    get lannister(): House {
        return this.game.houses.get("lannister");
    }

    get stark(): House {
        return this.game.houses.get("stark");
    }

    get baratheon(): House {
        return this.game.houses.get("baratheon");
    }

    get greyjoy(): House {
        return this.game.houses.get("greyjoy");
    }

    houseCard(id: string): HouseCard {
        const hc = _.flatMap(this.game.houses.values, h => h.houseCards.values).find(hc => hc.id == id);

        if (hc == null) {
            throw new Error(`Couldn't find house card ${id}`);
        }

        return hc;
    }

    as(f: AsFunction<GS>): void {
        f(this, this.gameState);
    }

    expectGameState<GE extends GameState<any, any>>(gameState: any): EntireGameContext<GE> {
        expect(this.entireGame.leafState).toBeInstanceOf(gameState);

        // @ts-ignore
        return this as EntireGameContext<GE>;
    }
}
