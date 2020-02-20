import WesterosCardType from "./WesterosCardType";
import {westerosCardTypes} from "./westerosCardTypes";

export default class WesterosCard {
    id: number;
    type: WesterosCardType;
    discarded: boolean;

    constructor(id: number, type: WesterosCardType, discarded = false) {
        this.id = id;
        this.type = type;
        this.discarded = discarded;
    }

    serializeToClient(): SerializedWesterosCard {
        return {
            id: this.id,
            typeId: this.type.id,
            discarded: this.discarded
        };
    }

    static deserializeFromServer(data: SerializedWesterosCard): WesterosCard {
        return new WesterosCard(data.id, westerosCardTypes.get(data.typeId), data.discarded);
    }
}

export interface SerializedWesterosCard {
    id: number;
    typeId: string;
    discarded: boolean;
}
