import House from "../House";
import LoanCardType from "./LoanCardType";

export default class FullHostLoanCardType extends LoanCardType {
    execute(_resolveIronBankOrder: any, _house: House): void {
    }
}