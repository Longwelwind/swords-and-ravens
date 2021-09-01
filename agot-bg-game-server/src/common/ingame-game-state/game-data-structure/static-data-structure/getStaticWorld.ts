import staticWorld from "./globalStaticWorld";
import staticWorld7p from "./globalStaticWorld7p"
import staticWorld8p from "./globalStaticWorld8p"
import StaticWorld from "./StaticWorld"

export default function getStaticWorld(playerCount: number): StaticWorld {
    switch(playerCount) {
        case 8:
            return staticWorld8p;
        case 7:
            return staticWorld7p;
        default:
            return staticWorld;
    }
}