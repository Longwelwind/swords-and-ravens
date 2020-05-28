import OrderType from "./OrderType";

export default class ConsolidatePowerOrderType extends OrderType {
    toString(): string {
        return "CP";
    }

    tooltipText(): string {
        let tooltip = "Consolidate Power Orders collect one Power token when resolved on land areas. Additional tokens are awarded for each Power icon printed on the assigned area.";
        if (this.starred) {
          tooltip += " The Special Consolidate Power Order may instead be used to initiate mustering in the assigned area, if the area contains a Castle or Stronghold.";
        }
        return tooltip;
    }
}
