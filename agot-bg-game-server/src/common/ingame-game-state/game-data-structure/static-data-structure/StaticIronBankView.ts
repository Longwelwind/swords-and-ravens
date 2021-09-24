import IronBankSlot from "../../../../utils/IronBankSlot";

export default class StaticIronBankView {
    // Display attributes
    deckSlot: IronBankSlot;
    loanSlots = new Array<IronBankSlot>(3);
    infoComponentSlot: IronBankSlot;
}