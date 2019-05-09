import Region from "../common/ingame-game-state/game-data-structure/Region";
import Unit from "../common/ingame-game-state/game-data-structure/Unit";
import Order from "../common/ingame-game-state/game-data-structure/Order";
import {observable} from "mobx";

export default class MapControls {
    onRegionClick: ((r: Region) => void)[] = [];
    onOrderClick: ((r: Region, o: Order) => void)[] = [];
    onUnitClick: ((region: Region, u: Unit) => void)[] = [];

    @observable shouldHighlightRegion: ((region: Region) => boolean)[] = [];
    @observable shouldHighlightUnit: ((region: Region, unit: Unit) => boolean)[] = [];
    @observable shouldHighlightOrder: ((region: Region, order: Order) => boolean)[] = [];
}
