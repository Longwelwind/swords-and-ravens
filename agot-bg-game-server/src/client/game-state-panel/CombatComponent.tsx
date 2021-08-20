import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import CombatGameState
, { CombatStats }    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
import DeclareSupportGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/declare-support-game-state/DeclareSupportGameState";
import DeclareSupportComponent from "./DeclareSupportComponent";
import * as React from "react";
import ChooseHouseCardGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/choose-house-card-game-state/ChooseHouseCardGameState";
import ChooseHouseCardComponent from "./ChooseHouseCardComponent";
import UseValyrianSteelBladeGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/use-valyrian-steel-blade-game-state/UseValyrianSteelBladeGameState";
import UseValyrianSteelBladeComponent from "./UseValyrianSteelBladeComponent";
import House from "../../common/ingame-game-state/game-data-structure/House";
import GameStateComponentProps from "./GameStateComponentProps";
import renderChildGameState from "../utils/renderChildGameState";
import PostCombatGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/PostCombatGameState";
import PostCombatComponent from "./PostCombatComponent";
import ImmediatelyHouseCardAbilitiesResolutionGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/immediately-house-card-abilities-resolution-game-state/ImmediatelyHouseCardAbilitiesResolutionGameState";
import ImmediatelyHouseCardAbilitiesResolutionComponent
    from "./house-card-abilities/ImmediatelyHouseCardAbilitiesResolutionComponent";
import CancelHouseCardAbilitiesGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/cancel-house-card-abilities-game-state/CancelHouseCardAbilitiesGameState";
import CancelHouseCardAbilitiesComponent from "./house-card-abilities/CancelHouseCardAbilitiesComponent";
import Col from "react-bootstrap/Col";
import CombatInfoComponent from "../CombatInfoComponent";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import { RegionOnMapProperties, UnitOnMapProperties } from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";
import _ from "lodash";
import Unit from "../../common/ingame-game-state/game-data-structure/Unit";
import BeforeCombatHouseCardAbilitiesGameState from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/BeforeCombatHouseCardAbilitiesGameState";
import BeforeCombatHouseCardAbilitiesComponent from "./house-card-abilities/BeforeCombatHouseCardsAbilitiesComponent";
import HouseCard from "../../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import { tidesOfBattleCards } from "../../common/ingame-game-state/game-data-structure/static-data-structure/tidesOfBattleCards";
import unitTypes from "../../common/ingame-game-state/game-data-structure/unitTypes";

@observer
export default class CombatComponent extends Component<GameStateComponentProps<CombatGameState>> {
    modifyRegionsOnMapCallback: any;
    modifyUnitsOnMapCallback: any;

    get combat(): CombatGameState {
        return this.props.gameState;
    }

    get attacker(): House {
        return this.combat.attacker;
    }

    get defender(): House {
        return this.combat.defender;
    }

    get combatStats(): CombatStats[] {
        return this.props.gameState.stats;
    }

    render(): ReactNode {
        // If combatStats have been set by PostCombatState show the fixed dialog, otherwise the dynamic one!
        const winners = this.combatStats.filter(cs => cs.isWinner);
        const winner: House | null = winners.length > 0
            ? this.combat.game.houses.get(winners[0].house)
            : null;
        const houseCombatDatas = this.combatStats.length > 0 ? this.combatStats.map(stat => {
            const house = this.combat.game.houses.get(stat.house);
            const houseCard = stat.houseCard ? this.getHouseCard(stat.houseCard) : null;
            const tidesOfBattleCard = stat.tidesOfBattleCard === undefined ? undefined : stat.tidesOfBattleCard != null ? tidesOfBattleCards.get(stat.tidesOfBattleCard) : null;

            return {
                ...stat,
                house,
                region: this.combat.world.regions.get(stat.region),
                houseCard: houseCard,
                armyUnits: stat.armyUnits.map(ut => unitTypes.get(ut)),
                tidesOfBattleCard: tidesOfBattleCard};
            })
            : [
                {
                    house: this.attacker,
                    houseCard: this.props.gameState.attackerHouseCard,
                    region: this.props.gameState.attackingRegion,
                    army: this.combat.getBaseCombatStrength(this.attacker),
                    armyUnits: this.combat.attackingArmy.map(u => u.type),
                    orderBonus: this.combat.getOrderBonus(this.attacker),
                    garrison: this.combat.getGarrisonCombatStrength(this.attacker),
                    support: this.combat.getSupportStrengthForSide(this.attacker),
                    houseCardStrength: this.combat.getHouseCardCombatStrength(this.attacker),
                    valyrianSteelBlade: this.combat.getValyrianBladeBonus(this.attacker),
                    total: this.combat.getTotalCombatStrength(this.attacker),
                    houseCardBackId: this.getHouseCardBackId(this.attacker),
                    tidesOfBattleCard: this.props.gameState.attackerTidesOfBattleCard
                },
                {
                    house: this.defender,
                    houseCard: this.props.gameState.defenderHouseCard,
                    region: this.props.gameState.defendingRegion,
                    army: this.combat.getBaseCombatStrength(this.defender),
                    armyUnits: this.combat.defendingArmy.map(u => u.type),
                    orderBonus: this.combat.getOrderBonus(this.defender),
                    garrison: this.combat.getGarrisonCombatStrength(this.defender),
                    support: this.combat.getSupportStrengthForSide(this.defender),
                    houseCardStrength: this.combat.getHouseCardCombatStrength(this.defender),
                    valyrianSteelBlade: this.combat.getValyrianBladeBonus(this.defender),
                    total: this.combat.getTotalCombatStrength(this.defender),
                    houseCardBackId: this.getHouseCardBackId(this.defender),
                    tidesOfBattleCard: this.props.gameState.defenderTidesOfBattleCard
                }
            ];
        return (
            <>
                <Col xs={12}>
                    {this.props.gameState.rerender >= 0 && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <h5>Battle {this.combatStats.length > 0 && "results "} for <b>{this.combat.defendingRegion.name}</b></h5>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <CombatInfoComponent
                                    housesCombatData={houseCombatDatas}
                                />
                            </div>
                        </>
                    )}
                </Col>
                {winner && <Col xs={12} className="text-center">
                    Winner: <b style={{"color": winner.color}}>{winner.name}</b>
                </Col>}
                {renderChildGameState(this.props, [
                    [DeclareSupportGameState, DeclareSupportComponent],
                    [ChooseHouseCardGameState, ChooseHouseCardComponent],
                    [UseValyrianSteelBladeGameState, UseValyrianSteelBladeComponent],
                    [PostCombatGameState, PostCombatComponent],
                    [ImmediatelyHouseCardAbilitiesResolutionGameState, ImmediatelyHouseCardAbilitiesResolutionComponent],
                    [CancelHouseCardAbilitiesGameState, CancelHouseCardAbilitiesComponent],
                    [BeforeCombatHouseCardAbilitiesGameState, BeforeCombatHouseCardAbilitiesComponent]
                ])}
            </>
        );
    }

    getHouseCard(id: string): HouseCard | null {
        const filtered = this.combat.houseCombatDatas.values.filter(hcd => hcd.houseCard && hcd.houseCard.id == id);
        if (filtered.length == 1) {
            return filtered[0].houseCard;
        }

        return null;
    }

    private getHouseCardBackId(house: House): string | undefined {
        const combatData = this.combat.houseCombatDatas.get(house);
        if (combatData.houseCardChosen) {
            return this.props.gameState.ingameGameState.isVassalHouse(house) ? "vassal" : house.id;
        }

        return undefined;
    }

    modifyRegionsOnMap(): [Region, PartialRecursive<RegionOnMapProperties>][] {
        // Highlight the embattled area in yellow
        return [[
            this.props.gameState.defendingRegion,
            {highlight: {active: true, color: "yellow"}}
        ]];
    }

    modifyUnitsOnMap(): [Unit, PartialRecursive<UnitOnMapProperties>][] {
        const authenticatedPlayer = this.props.gameClient.authenticatedPlayer;

        // Highlight the attacking army in red
        // We just hightlight the attacking army until PostCombatGameState for combatants
        // as during PostCombat some effects will highlight units for selection
        // for winner and loser (e.g. Retreat, Renly Baratheon, Ilyn Payn, ToB skull, etc.)
        if (this.props.gameState.childGameState instanceof DeclareSupportGameState
            || this.props.gameState.childGameState instanceof ChooseHouseCardGameState
            || this.props.gameState.childGameState instanceof UseValyrianSteelBladeGameState
            // But we can highlight the attacking army for non combatants during the whole combat phase
            || (authenticatedPlayer == null || !this.props.gameState.houseCombatDatas.keys.some(h => this.props.gameClient.doesControlHouse(h)))) {
            return this.props.gameState.attackingArmy.map(u => ([u, {highlight: {active: false, color: "red"}}]));
        }
        return [];
    }

    componentDidMount(): void {
        this.props.mapControls.modifyRegionsOnMap.push(this.modifyRegionsOnMapCallback = () => this.modifyRegionsOnMap());
        this.props.mapControls.modifyUnitsOnMap.push(this.modifyUnitsOnMapCallback = () => this.modifyUnitsOnMap());
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.modifyRegionsOnMap, this.modifyRegionsOnMapCallback);
        _.pull(this.props.mapControls.modifyUnitsOnMap, this.modifyUnitsOnMapCallback);
    }
}
