import staticWorld from "./globalStaticWorld";
import staticWorld7p from "./globalStaticWorld7p"
import StaticWorld from "./StaticWorld"

export default function getStaticWorld(gameSetupId: string): StaticWorld {
    if (gameSetupId == "mother-of-dragons") {
        return staticWorld7p;
    }

    return staticWorld;
}