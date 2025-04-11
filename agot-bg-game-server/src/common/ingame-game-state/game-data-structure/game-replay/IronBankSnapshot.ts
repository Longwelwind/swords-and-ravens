import IIronBankSnapshot from "./IIronBankSnapshot";

export default class IronBankSnapshot implements IIronBankSnapshot {
  loanSlots: (string | null)[];
  interestCosts?: [string, number][];
  braavosController?: string;

  constructor(data: IIronBankSnapshot) {
    this.loanSlots = data.loanSlots;
    this.interestCosts = data.interestCosts;
    this.braavosController = data.braavosController;
  }
}
