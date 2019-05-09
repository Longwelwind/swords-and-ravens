import WesterosCardType from "./WesterosCardType";
import {westerosCardTypes} from "./westerosCardTypes";

export default class WesterosCard {
    id: number;
    type: WesterosCardType;

    constructor(id: number, type: WesterosCardType) {
        this.id = id;
        this.type = type;
    }

    serializeToClient(): SerializedWesterosCard {
        return {
            id: this.id,
            typeId: this.type.id
        };
    }

    static deserializeFromServer(data: SerializedWesterosCard): WesterosCard {
        return new WesterosCard(data.id, westerosCardTypes.get(data.typeId));
    }
}

export interface SerializedWesterosCard {
    id: number;
    typeId: string;
}
