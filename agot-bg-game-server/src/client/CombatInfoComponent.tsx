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
import UnitIconComponent from "./UnitIconComponent";
import classNames from "classnames";
import { houseColorFilters } from "./houseColorFilters";

interface HouseCombatData {
    house: House;
    region: Region;
    army: number;
    armyUnits: UnitType[];
    woundedUnits: UnitType[];
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
    fogOfWar?: boolean
}

@observer
export default class CombatInfoComponent extends Component<CombatInfoComponentProps> {
    SIZE_MIDDLE_COLUMN = 48;

    get attacker(): HouseCombatData {
        return this.props.housesCombatData[0];
    }

    get defender(): HouseCombatData {
        return this.props.housesCombatData[1];
    }

    render(): ReactNode {
        const showVsb = this.attacker.valyrianSteelBlade > 0 || this.defender.valyrianSteelBlade > 0;
        const showTob = this.attacker.tidesOfBattleCard !== undefined || this.defender.tidesOfBattleCard !== undefined;
        const attackerArmyBonus = this.attacker.orderBonus + this.attacker.garrison;
        const defenderArmyBonus = this.defender.orderBonus + this.defender.garrison;
        return <div style={{maxWidth: "336px", minWidth: "336px"}}>
            <div style={{display: "grid", gridGap: "5px", gridTemplateColumns: "50% 50%"}}>
                <div style={{gridRow: "1", gridColumn: "1"}}>
                    {this.attacker.isWinner && <img src={knightBannerImage} width="28" style={{marginRight: 2, marginBottom: 5, filter: houseColorFilters.get(this.attacker.house.id) }} />}
                    <b style={{"color": this.attacker.house.color, fontSize: "1.25rem"}}>{this.attacker.house.name}</b>
                    {this.attacker.isWinner && <img src={knightBannerImage} width="28" style={{marginLeft: 2, marginBottom: 5, filter: houseColorFilters.get(this.attacker.house.id) }} />}
                </div>

                <div style={{gridRow: "1", gridColumn: "2"}} className="text-right">
                    {this.defender.isWinner && <img src={knightBannerImage} width="28" style={{marginRight: 2, marginBottom: 5, filter: houseColorFilters.get(this.defender.house.id) }} />}
                    <b style={{"color": this.defender.house.color, fontSize: "1.25rem"}}>{this.defender.house.name}</b>
                    {this.defender.isWinner && <img src={knightBannerImage} width="28" style={{marginLeft: 2, marginBottom: 5, filter: houseColorFilters.get(this.defender.house.id) }} />}
                </div>
            </div>
            <div style={{display: "grid", gridGap: "5px", gridTemplateColumns: "auto 1fr auto 1fr auto", justifyItems: "center", alignItems: "center"}} className="text-center">
                {
                    !this.props.fogOfWar && (
                        <div style={{gridRow: "1", gridColumn: "1 / span 2"}}>
                            <small>{this.attacker.region.name}</small>
                        </div>
                    )
                }

                <div style={{gridRow: "1 / span 2", gridColumn: "3"}}>
                    <img src={crossedSwordsImage} width={this.SIZE_MIDDLE_COLUMN}/>
                </div>

                {
                    !this.props.fogOfWar && (
                        <div style={{gridRow: "1", gridColumn: "4 / span 2"}}>
                            <small>{this.defender.region.name}</small>
                        </div>
                    )
                }

                <div style={{gridRow: "2", gridColumn: "1 / span 2"}}>
                    {this.attacker.armyUnits.map((ut, i) =>
                        <UnitIconComponent key={`combat-info-units-${this.attacker.house.id}_${i}`}
                            house={this.attacker.house}
                            unitType={ut}
                            size="smedium"
                            makeGreyjoyUnitsBlack={true}
                        />
                    )}
                </div>

                <div style={{gridRow: "2", gridColumn: "4 / span 2"}}>
                    {this.defender.armyUnits.map((ut, i) =>
                        <UnitIconComponent key={`combat-info-units-${this.defender.house.id}_${i}`}
                            house={this.defender.house}
                            unitType={ut}
                            size="smedium"
                            makeGreyjoyUnitsBlack={true}
                        />
                    )}
                    {this.defender.woundedUnits.map((ut, i) =>
                        <UnitIconComponent key={`combat-info-wounded-units-${this.defender.house.id}_${i}`}
                            house={this.defender.house}
                            unitType={ut}
                            size="smedium"
                            makeGreyjoyUnitsBlack={true}
                            wounded={true}
                        />
                    )}
                </div>

                <div style={{gridRow: "3 / span 4", gridColumn: "1"}}>
                    {this.attacker.houseCard
                        ? <HouseCardComponent houseCard={this.attacker.houseCard} size="small" />
                        : this.attacker.houseCardBackId
                            ? <div className={classNames(
                                "vertical-game-card small",
                                {
                                    "flip-vertical-right": this.props.housesCombatData.every(hcd => hcd.houseCardBackId)
                                })}
                                style={{
                                    backgroundImage: `url(${houseCardsBackImages.get(this.attacker.houseCardBackId)})`
                                }}/>
                    : <div className="vertical-game-card game-card-slot small"/>}

                </div>

                <div style={{gridRow: "3 / span 4", gridColumn: "5"}}>
                    {this.defender.houseCard
                        ? <HouseCardComponent houseCard={this.defender.houseCard} size="small" />
                        : this.defender.houseCardBackId
                            ? <div className={classNames(
                                "vertical-game-card small",
                                {
                                    "flip-vertical-right": this.props.housesCombatData.every(hcd => hcd.houseCardBackId)
                                })}
                                style={{
                                    backgroundImage: `url(${houseCardsBackImages.get(this.defender.houseCardBackId)})`
                                }}/>
                    : <div className="vertical-game-card game-card-slot small"/>}
                </div>

                <div style={{gridRow: "3", gridColumn: "2"}}>
                    {this.attacker.army}{attackerArmyBonus != 0 && <> ({attackerArmyBonus > 0 ? "+" : ""}{attackerArmyBonus})</>}
                </div>
                <div style={{gridRow: "3", gridColumn: "3"}}>
                    <b>Army</b>
                </div>
                <div style={{gridRow: "3", gridColumn: "4"}}>
                    {this.defender.army}{defenderArmyBonus != 0 && <> ({defenderArmyBonus > 0 ? "+" : ""}{defenderArmyBonus})</>}
                </div>

                <div style={{gridRow: "4", gridColumn: "2"}}>
                    {this.attacker.support}
                </div>
                <div style={{gridRow: "4", gridColumn: "3"}}>
                    <b>Support</b>
                </div>
                <div style={{gridRow: "4", gridColumn: "4"}}>
                    {this.defender.support}
                </div>

                <div style={{gridRow: "5", gridColumn: "2"}}>
                    {this.attacker.houseCardStrength}
                </div>
                <div style={{gridRow: "5", gridColumn: "3"}}>
                    <b>House card</b>
                </div>
                <div style={{gridRow: "5", gridColumn: "4"}}>
                    {this.defender.houseCardStrength}
                </div>

                <div style={{gridRow: "6", gridColumn: "2"}} className={showTob ? "" : "display-none"}>
                    {this.attacker.tidesOfBattleCard ? this.attacker.tidesOfBattleCard.combatStrength : 0}
                </div>
                <div style={{gridRow: "6", gridColumn: "3"}} className={showTob ? "" : "display-none"}>
                    <b>Tides<br/>of Battle</b>
                </div>
                <div style={{gridRow: "6", gridColumn: "4"}} className={showTob ? "" : "display-none"}>
                    {this.defender.tidesOfBattleCard ? this.defender.tidesOfBattleCard.combatStrength : 0}
                </div>

                <div style={{gridRow: "7", gridColumn: "2"}} className={showVsb ? "" : "display-none"}>
                    {this.attacker.valyrianSteelBlade}
                </div>
                <div style={{gridRow: "7", gridColumn: "3"}} className={showVsb ? "" : "display-none"}>
                    <b>Valyrian Steel<br/>Blade</b>
                </div>
                <div style={{gridRow: "7", gridColumn: "4"}} className={showVsb ? "" : "display-none"}>
                    {this.defender.valyrianSteelBlade}
                </div>

                <div style={{gridRow: "7 / span 3", gridColumn: "1"}} className={showTob ? "" : "display-none"}>
                    {this.attacker.tidesOfBattleCard ? (
                        <TidesOfBattleCardComponent tidesOfBattleCard={this.attacker.tidesOfBattleCard}/>
                    ) : <div className="vertical-game-card game-card-slot tiny"/>}

                </div>

                <div style={{gridRow: "7 / span 3", gridColumn: "5"}} className={showTob ? "" : "display-none"}>
                    {this.defender.tidesOfBattleCard ? (
                        <TidesOfBattleCardComponent tidesOfBattleCard={this.defender.tidesOfBattleCard}/>
                    ) : <div className="vertical-game-card game-card-slot tiny"/>}
                </div>

                <div style={{gridRow: "8", gridColumn: "2"}}>
                    <b>{this.attacker.total}</b>
                </div>
                <div style={{gridRow: "8", gridColumn: "3"}}>
                    <b>Total</b>
                </div>
                <div style={{gridRow: "8", gridColumn: "4"}}>
                    <b>{this.defender.total}</b>
                </div>
            </div>
        </div>;
    }
}
