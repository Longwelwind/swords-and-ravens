import WesterosGameState from "../../westeros-game-state/WesterosGameState";

export default abstract class WesterosCardType {
    id: string;
    name: string;
    description: string;
    wildlingStrength: number;

    constructor(id: string, name: string, description: string, wildlingStrength = 0) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.wildlingStrength = wildlingStrength;
    }

    abstract execute(westerosGameState: WesterosGameState): void;
}
