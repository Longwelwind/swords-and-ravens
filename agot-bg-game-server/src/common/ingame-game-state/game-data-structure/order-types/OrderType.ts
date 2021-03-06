export default abstract class OrderType {
    id: string;
    name: string;
    starred: boolean;

    constructor(id: string, name: string, starred: boolean) {
        this.id = id;
        this.name = name;
        this.starred = starred;
    }
}
