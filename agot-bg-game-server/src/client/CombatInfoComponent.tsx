import {observer} from "mobx-react";
import React, {Component, ReactNode} from "react";
import crossedSwordsImage from "../../public/images/icons/crossed-swords.svg";
import knightBannerImage from "../../public/images/icons/knight-banner.svg";
import House from "../common/ingame-game-state/game-data-structure/House";
import Region from "../common/ingame-game-state/game-data-structure/Region";
import HouseCardComponent from "./game-state-panel/utils/HouseCardComponent";
import HouseCard from "../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import UnitType from "../common/ingame-game-state/game-data-structure/UnitType";
import houseCardsBackImages from "./houseCardsBackImages";
import { TidesOfBattleCard } from "../common/ingame-game-state/game-data-structure/static-data-structure/tidesOfBattleCards";
import TidesOfBattleCardComponent from "./game-state-panel/utils/TidesOfBattleCardComponent";

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
    tidesOfBattleCard?: TidesOfBattleCard | null;
    total: number;
    houseCardBackId?: string;
    isWinner?: boolean;
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
        const showTob = this.attacker.tidesOfBattleCard !== undefined || this.defender.tidesOfBattleCard !== undefined;
        return <div style={{maxWidth: "340px", minWidth: "340px"}}>
            <div style={{display: "grid", gridGap: "5px", gridTemplateColumns: "auto 1fr auto 1fr auto", justifyItems: "center", alignItems: "center"}} className="text-center">
                <div style={{gridRow: "1", gridColumn: "1 / span 2"}}>
                    <img src={knightBannerImage} width="24" style={{"display": this.attacker.isWinner ? "inline" : "none", marginLeft: this.attacker.isWinner ? 3 : 0}}/>
                    <b style={{"color": this.attacker.house.color}}>{this.attacker.house.name}</b><br/>
                    <small>{this.attacker.region.name}</small><br/>
                    <small>{this.attacker.armyUnits.map(ut => ut.name).join(", ")}</small>
                </div>
                <div style={{gridRow: "1", gridColumn: "3"}}>
                    <img src={crossedSwordsImage} width={this.SIZE_MIDDLE_COLUMN}/>
                </div>
                <div style={{gridRow: "1", gridColumn: "4 / span 2"}}>
                    <img src={knightBannerImage} width="24" style={{"display": this.defender.isWinner ? "inline" : "none", marginLeft: this.attacker.isWinner ? 3 : 0}}/>
                    <b style={{"color": this.defender.house.color}}>{this.defender.house.name}</b><br/>
                    <small>{this.defender.region.name}</small><br/>
                    <small>{this.defender.armyUnits.map(ut => ut.name).join(", ")}</small>
                </div>

                <div style={{gridRow: "2 / span 4", gridColumn: "1"}}>
                    {this.attacker.houseCard ? (
                        <HouseCardComponent houseCard={this.attacker.houseCard}
                                            size="small" />
                    ) : this.attacker.houseCardBackId
                    ? <div
                            className="vertical-game-card small"
                            style={{
                                backgroundImage: `url(${houseCardsBackImages.get(this.attacker.houseCardBackId)})`
                            }}
                        />
                    : <div className="vertical-game-card game-card-slot small"/>}

                </div>

                <div style={{gridRow: "2 / span 4", gridColumn: "5"}}>
                    {this.defender.houseCard ? (
                        <HouseCardComponent houseCard={this.defender.houseCard}
                                            size="small" />
                    ) : this.defender.houseCardBackId
                    ? <div
                            className="vertical-game-card small"
                            style={{
                                backgroundImage: `url(${houseCardsBackImages.get(this.defender.houseCardBackId)})`
                            }}
                        />
                    : <div className="vertical-game-card game-card-slot small"/>}
                </div>

                <div style={{gridRow: "2", gridColumn: "2"}}>
                    {this.attacker.army} (+{this.attacker.orderBonus + this.attacker.garrison})
                </div>
                <div style={{gridRow: "2", gridColumn: "3"}}>
                    <b>Army</b>
                </div>
                <div style={{gridRow: "2", gridColumn: "4"}}>
                    {this.defender.army} (+{this.defender.orderBonus + this.defender.garrison})
                </div>

                <div style={{gridRow: "3", gridColumn: "2"}}>
                    {this.attacker.support}
                </div>
                <div style={{gridRow: "3", gridColumn: "3"}}>
                    <b>Support</b>
                </div>
                <div style={{gridRow: "3", gridColumn: "4"}}>
                    {this.defender.support}
                </div>

                <div style={{gridRow: "4", gridColumn: "2"}}>
                    {this.attacker.houseCardStrength}
                </div>
                <div style={{gridRow: "4", gridColumn: "3"}}>
                    <b>House card</b>
                </div>
                <div style={{gridRow: "4", gridColumn: "4"}}>
                    {this.defender.houseCardStrength}
                </div>

                <div style={{gridRow: "5", gridColumn: "2"}} className={showTob ? "" : "display-none"}>
                    {this.attacker.tidesOfBattleCard ? this.attacker.tidesOfBattleCard.combatStrength : 0}
                </div>
                <div style={{gridRow: "5", gridColumn: "3"}} className={showTob ? "" : "display-none"}>
                    <b>Tides<br/>of Battle</b>
                </div>
                <div style={{gridRow: "5", gridColumn: "4"}} className={showTob ? "" : "display-none"}>
                    {this.defender.tidesOfBattleCard ? this.defender.tidesOfBattleCard.combatStrength : 0}
                </div>

                <div style={{gridRow: "6", gridColumn: "2"}} className={showVsb ? "" : "display-none"}>
                    {this.attacker.valyrianSteelBlade}
                </div>
                <div style={{gridRow: "6", gridColumn: "3"}} className={showVsb ? "" : "display-none"}>
                    <b>Valyrian Steel<br/>Blade</b>
                </div>
                <div style={{gridRow: "6", gridColumn: "4"}} className={showVsb ? "" : "display-none"}>
                    {this.defender.valyrianSteelBlade}
                </div>

                <div style={{gridRow: "6 / span 3", gridColumn: "1"}} className={showTob ? "" : "display-none"}>
                    {this.attacker.tidesOfBattleCard ? (
                        <TidesOfBattleCardComponent tidesOfBattleCard={this.attacker.tidesOfBattleCard}/>
                    ) : <div className="vertical-game-card game-card-slot tiny"/>}

                </div>

                <div style={{gridRow: "6 / span 3", gridColumn: "5"}} className={showTob ? "" : "display-none"}>
                    {this.defender.tidesOfBattleCard ? (
                        <TidesOfBattleCardComponent tidesOfBattleCard={this.defender.tidesOfBattleCard}/>
                    ) : <div className="vertical-game-card game-card-slot tiny"/>}
                </div>

                <div style={{gridRow: "7", gridColumn: "2"}}>
                    <b>{this.attacker.total}</b>
                </div>
                <div style={{gridRow: "7", gridColumn: "3"}}>
                    <b>Total</b>
                </div>
                <div style={{gridRow: "7", gridColumn: "4"}}>
                    <b>{this.defender.total}</b>
                </div>
            </div>
        </div>;
    }
}
