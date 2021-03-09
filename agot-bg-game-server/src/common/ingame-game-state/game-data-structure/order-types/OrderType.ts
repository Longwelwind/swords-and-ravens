import RegionKind from "../RegionKind";

export default abstract class OrderType {
    id: string;
    name: string;
    starred: boolean;
    restrictedTo: RegionKind | null;

    constructor(id: string, name: string, starred: boolean) {
        this.id = id;
        this.name = name;
        this.starred = starred;
        this.restrictedTo = null;
    }
}
