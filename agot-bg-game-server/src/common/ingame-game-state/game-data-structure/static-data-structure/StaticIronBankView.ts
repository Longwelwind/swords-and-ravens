import Slot from "../../../../utils/Slot";

export default class StaticIronBankView {
    // Display attributes
    deckSlot: Slot;
    loanSlots = new Array<Slot>(3);
    infoComponentSlot: Slot;
}