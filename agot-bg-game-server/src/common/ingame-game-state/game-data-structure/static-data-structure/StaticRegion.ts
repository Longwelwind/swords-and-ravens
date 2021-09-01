import RegionType from "../RegionType";
import Point from "../../../../utils/Point";
import UnitSlot from "../../../../utils/unitSlot";

export default class StaticRegion {
    id: string;
    name: string;
    type: RegionType;
    crownIcons: number;
    supplyIcons: number;
    castleLevel: number;
    startingGarrison: number;
    superControlPowerToken: string | null;
    superLoyaltyToken: boolean;
    canRegainGarrison: boolean;

    // Display attributes
    nameSlot: Point;
    unitSlot: UnitSlot;
    orderSlot: Point;
    powerTokenSlot: Point;

    constructor(
        id: string, name: string, nameSlot: Point, type: RegionType,
        unitSlot: UnitSlot, orderSlot: Point, powerTokenSlot: Point,
        crownIcons: number, supplyIcons: number, castleLevel: number,
        startingGarrison: number, superControlPowerToken: string | null, superLoyaltyToken = false, canRegainGarrison = false
    ) {
        this.id = id;
        this.nameSlot = nameSlot;
        this.name = name;
        this.type = type;
        this.unitSlot = unitSlot;
        this.orderSlot = orderSlot;
        this.powerTokenSlot = powerTokenSlot;
        this.castleLevel = castleLevel;
        this.crownIcons = crownIcons;
        this.supplyIcons = supplyIcons;
        this.startingGarrison = startingGarrison;
        this.superControlPowerToken = superControlPowerToken;
        this.superLoyaltyToken = superLoyaltyToken;
        this.canRegainGarrison = canRegainGarrison;
    }

    get hasStructure(): boolean {
        return this.castleLevel > 0;
    }
}