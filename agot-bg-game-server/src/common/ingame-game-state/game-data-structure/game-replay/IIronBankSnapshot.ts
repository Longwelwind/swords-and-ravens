export default interface IIronBankSnapshot {
  loanSlots: (string | null)[];
  interestCosts?: [string, number][];
  braavosController?: string;
}
