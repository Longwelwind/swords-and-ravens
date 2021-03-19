import {observer} from "mobx-react";
import React, {Component, ReactNode} from "react";
import crossedSwordsImage from "../../public/images/icons/crossed-swords.svg";
import House from "../common/ingame-game-state/game-data-structure/House";
import Region from "../common/ingame-game-state/game-data-structure/Region";
import HouseCardComponent from "./game-state-panel/utils/HouseCardComponent";
import HouseCard from "../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import UnitType from "../common/ingame-game-state/game-data-structure/UnitType";
import houseCardsBackImages from "./houseCardsBackImages";

interface HouseCombatData {
    house: House;
    region: Region;
    army: number;
    armyUnits: UnitType[];
    orderBonus: number;
    garrison: number;
    support: number;
    houseCard: HouseCard | null;
    houseCardStrength: number;
    valyrianSteelBlade: number;
    total: number;
    attackerHouseCardChosen?: string;
    defenderHouseCardChosen?: string;
}

interface CombatInfoComponentProps {
    housesCombatData: HouseCombatData[];
}

@observer
export default class CombatInfoComponent extends Component<CombatInfoComponentProps> {
    SIZE_MIDDLE_COLUMN = 32;

    get attacker(): HouseCombatData {
        return this.props.housesCombatData[0];
    }

    get defender(): HouseCombatData {
        return this.props.housesCombatData[1];
    }

    render(): ReactNode {
        const showVsb = this.attacker.valyrianSteelBlade > 0 || this.defender.valyrianSteelBlade > 0;
        return (
            <>
                <div style={{display: "grid", gridGap: "5px", gridTemplateColumns: "auto 1fr auto 1fr auto", justifyItems: "center", alignItems: "center"}} className="text-center">
                    <div style={{gridRow: "1", gridColumn: "1 / span 2"}}>
                        <strong>{this.attacker.house.name}</strong><br/>
                        <small>{this.attacker.region.name}</small><br/>
                        <small>{this.attacker.armyUnits.map(ut => ut.name).join(", ")}</small>
                    </div>
                    <div style={{gridRow: "1", gridColumn: "3"}}>
                        <img src={crossedSwordsImage} width={this.SIZE_MIDDLE_COLUMN}/>
                    </div>
                    <div style={{gridRow: "1", gridColumn: "4 / span 2"}}>
                        <strong>{this.defender.house.name}</strong><br/>
                        <small>{this.defender.region.name}</small><br/>
                        <small>{this.defender.armyUnits.map(ut => ut.name).join(", ")}</small>
                    </div>

                    <div style={{gridRow: "2 / span 4", gridColumn: "1"}}>
                        {this.attacker.houseCard ? (
                            <HouseCardComponent houseCard={this.attacker.houseCard}
                                                size="small" />
                        ) : this.attacker.attackerHouseCardChosen 
                        ? <div
                                className="vertical-game-card small"
                                style={{
                                    backgroundImage: `url(${houseCardsBackImages.get(this.attacker.attackerHouseCardChosen)})`
                                }}
                            />
                        : <div className="vertical-game-card game-card-slot small"/>}

                    </div>

                    <div style={{gridRow: "2 / span 4", gridColumn: "5"}}>
                        {this.defender.houseCard ? (
                            <HouseCardComponent houseCard={this.defender.houseCard}
                                                size="small" />
                        ) : this.defender.defenderHouseCardChosen 
                        ? <div
                                className="vertical-game-card small"
                                style={{
                                    backgroundImage: `url(${houseCardsBackImages.get(this.defender.defenderHouseCardChosen)})`
                                }}
                            />
                        : <div className="vertical-game-card game-card-slot small"/>}
                    </div>

                    <div style={{gridRow: "2", gridColumn: "2"}}>
                        {this.attacker.army} (+{this.attacker.orderBonus + this.attacker.garrison})
                    </div>
                    <div style={{gridRow: "2", gridColumn: "3"}}>
                        <strong>Army</strong>
                    </div>
                    <div style={{gridRow: "2", gridColumn: "4"}}>
                        {this.defender.army} (+{this.defender.orderBonus + this.defender.garrison})
                    </div>

                    <div style={{gridRow: "3", gridColumn: "2"}}>
                        {this.attacker.support}
                    </div>
                    <div style={{gridRow: "3", gridColumn: "3"}}>
                        <strong>Support</strong>
                    </div>
                    <div style={{gridRow: "3", gridColumn: "4"}}>
                        {this.defender.support}
                    </div>

                    <div style={{gridRow: "4", gridColumn: "2"}}>
                        {this.attacker.houseCardStrength}
                    </div>
                    <div style={{gridRow: "4", gridColumn: "3"}}>
                        <strong>House card</strong>
                    </div>
                    <div style={{gridRow: "4", gridColumn: "4"}}>
                        {this.defender.houseCardStrength}
                    </div>

                    <div style={{gridRow: "5", gridColumn: "2", display: showVsb ? "inline" : "none"}}>
                        {this.attacker.valyrianSteelBlade}
                    </div>
                    <div style={{gridRow: "5", gridColumn: "3", display: showVsb ? "inline" : "none"}}>
                        <strong>Valyrian Steel<br/>Blade</strong>
                    </div>
                    <div style={{gridRow: "5", gridColumn: "4", display: showVsb ? "inline" : "none"}}>
                        {this.defender.valyrianSteelBlade}
                    </div>

                    <div style={{gridRow: "6", gridColumn: "2"}}>
                        <strong>{this.attacker.total}</strong>
                    </div>
                    <div style={{gridRow: "6", gridColumn: "3"}}>
                        <strong>Total</strong>
                    </div>
                    <div style={{gridRow: "6", gridColumn: "4"}}>
                        <strong>{this.defender.total}</strong>
                    </div>
                </div>
            </>
        );
    }
}
