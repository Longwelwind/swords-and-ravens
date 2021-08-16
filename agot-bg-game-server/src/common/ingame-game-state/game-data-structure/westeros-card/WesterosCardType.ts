import WesterosGameState from "../../westeros-game-state/WesterosGameState";

export default abstract class WesterosCardType {
    id: string;
    name: string;
    description: string;
    wildlingStrength: number;
    shortDescription: string;

    constructor(id: string, name: string, description: string, shortDescription: string, wildlingStrength = 0) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.shortDescription = shortDescription;
        this.wildlingStrength = wildlingStrength;
    }

    abstract execute(westerosGameState: WesterosGameState): void;

    executeImmediately(_westerosGameState: WesterosGameState, _currentDeckI: number): void {
        return;
    }
}
