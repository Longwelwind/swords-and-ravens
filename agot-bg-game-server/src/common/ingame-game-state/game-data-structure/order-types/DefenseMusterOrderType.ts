import DefenseOrderType from "./DefenseOrderType";

export default class DefenseMusterOrderType extends DefenseOrderType {
    constructor() {
        super("defense-plus-one-muster", "Defense +1/Muster", false, 1);
    }
}
