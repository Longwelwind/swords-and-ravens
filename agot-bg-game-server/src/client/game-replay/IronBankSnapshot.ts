import IIronBankSnapshot from "./IIronBankSnapshot";

export default class IronBankSnapshot implements IIronBankSnapshot {
  loanSlots: (string | null)[];
  interestCosts?: [string, number][];
  braavosController?: string;

  constructor(data: IIronBankSnapshot) {
    this.loanSlots = [...data.loanSlots];
    this.interestCosts = data.interestCosts
      ? [...data.interestCosts]
      : undefined;
    this.braavosController = data.braavosController;
  }

  getCopy(): IronBankSnapshot {
    return new IronBankSnapshot(this);
  }
}
