import RegionKind from "./RegionKind";

export default class RegionType {
    id: string;
    kind: RegionKind;
    canAdditionalyRaid: RegionKind | null;

    constructor(id: string, kind: RegionKind, canAdditionalyRaid: RegionKind | null = null) {
        this.id = id;
        this.kind = kind;
        this.canAdditionalyRaid = canAdditionalyRaid;
    }
}
