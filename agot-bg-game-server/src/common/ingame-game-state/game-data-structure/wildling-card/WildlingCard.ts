import WildlingCardType from "./WildlingCardType";
import wildlingCardTypes from "./wildlingCardTypes";

export default class WildlingCard {
    id: number;
    type: WildlingCardType;

    constructor(id: number, type: WildlingCardType) {
        this.id = id;
        this.type = type;
    }

    serializeToClient(): SerializedWildlingCard {
        return {
            id: this.id,
            type: this.type.id
        }
    }

    static deserializeFromServer(data: SerializedWildlingCard): WildlingCard {
        return new WildlingCard(data.id, wildlingCardTypes.get(data.type));
    }
}

export interface SerializedWildlingCard {
    id: number;
    type: string;
}
