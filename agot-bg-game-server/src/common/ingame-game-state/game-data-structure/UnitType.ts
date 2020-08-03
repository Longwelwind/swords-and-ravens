import RegionKind from "./RegionKind";

export default class UnitType {
    id: string;
    name: string;
    description: string;
    combatStrength: number | null;
    combatStrengthOnAttackStructure: number | null;
    walksOn: RegionKind;
    canTransport: RegionKind | null;
    canRetreat: boolean;

    constructor(
        id: string,
        name: string,
        description: string,
        walksOn: RegionKind,
        combatStrength: number | null,
        combatStrengthOnAttackStructure: number | null = null,
        canTransport: RegionKind | null = null,
        canRetreat = true
    ) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.walksOn = walksOn;
        this.canTransport = canTransport;
        this.combatStrength = combatStrength;
        this.combatStrengthOnAttackStructure = combatStrengthOnAttackStructure;
        this.canRetreat = canRetreat;
    }
}
