import House from "../House";

export default abstract class LoanCardType {
    id: string;
    name: string;
    description: string;

    constructor(id: string, name: string, description: string) {
        this.id = id;
        this.name = name;
        this.description = description;
    }

    abstract execute(resolveIronBankOrder: any, house: House): void; // Todo: Create ResolveIronBankOrderGameState
}
