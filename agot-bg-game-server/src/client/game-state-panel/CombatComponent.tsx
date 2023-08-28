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
import { OrderOnMapProperties, RegionOnMapProperties, UnitOnMapProperties } from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";
import _ from "lodash";
import Unit from "../../common/ingame-game-state/game-data-structure/Unit";
import BeforeCombatHouseCardAbilitiesGameState from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/before-combat-house-card-abilities-game-state/BeforeCombatHouseCardAbilitiesGameState";
import BeforeCombatHouseCardAbilitiesComponent from "./house-card-abilities/BeforeCombatHouseCardsAbilitiesComponent";
import HouseCard from "../../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import { tidesOfBattleCards } from "../../common/ingame-game-state/game-data-structure/static-data-structure/tidesOfBattleCards";
import unitTypes from "../../common/ingame-game-state/game-data-structure/unitTypes";
import SelectUnitsGameState from "../../common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import AfterCombatHouseCardAbilitiesGameState from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";
import combatSound from "../../../public/sounds/combat.ogg";

@observer
export default class CombatComponent extends Component<GameStateComponentProps<CombatGameState>> {
    modifyRegionsOnMapCallback: any;
    modifyUnitsOnMapCallback: any;
    modifyOrdersOnMapCallback: any;

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
        return this.combat.stats;
    }

    get fogOfWar(): boolean {
        return this.props.gameClient.entireGame?.gameSettings.fogOfWar || false
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
                woundedUnits: stat.woundedUnits.map(ut => unitTypes.get(ut)),
                tidesOfBattleCard: tidesOfBattleCard,
                houseCardBackId: this.getHouseCardBackId(house)};
            })
            : [
                {
                    house: this.attacker,
                    houseCard: this.combat.attackerHouseCard,
                    region: this.combat.attackingRegion,
                    army: this.combat.getBaseCombatStrength(this.attacker),
                    armyUnits: this.combat.attackingArmy.map(u => u.type),
                    woundedUnits: [], // Attacking units can never be wounded, so we don't need to filter here
                    orderBonus: this.combat.getOrderBonus(this.attacker),
                    garrison: this.combat.getGarrisonCombatStrength(this.attacker),
                    support: this.combat.getSupportStrengthForSide(this.attacker),
                    houseCardStrength: this.combat.getHouseCardCombatStrength(this.attacker),
                    valyrianSteelBlade: this.combat.getValyrianBladeBonus(this.attacker),
                    total: this.combat.getTotalCombatStrength(this.attacker),
                    houseCardBackId: this.getHouseCardBackId(this.attacker),
                    tidesOfBattleCard: this.combat.attackerTidesOfBattleCard
                },
                {
                    house: this.defender,
                    houseCard: this.combat.defenderHouseCard,
                    region: this.combat.defendingRegion,
                    army: this.combat.getBaseCombatStrength(this.defender),
                    armyUnits: this.combat.defendingArmy.filter(u => !u.wounded).map(u => u.type),
                    woundedUnits: this.combat.defendingArmy.filter(u => u.wounded).map(u => u.type),
                    orderBonus: this.combat.getOrderBonus(this.defender),
                    garrison: this.combat.getGarrisonCombatStrength(this.defender),
                    support: this.combat.getSupportStrengthForSide(this.defender),
                    houseCardStrength: this.combat.getHouseCardCombatStrength(this.defender),
                    valyrianSteelBlade: this.combat.getValyrianBladeBonus(this.defender),
                    total: this.combat.getTotalCombatStrength(this.defender),
                    houseCardBackId: this.getHouseCardBackId(this.defender),
                    tidesOfBattleCard: this.combat.defenderTidesOfBattleCard
                }
            ];
        return (
            <>
                <Col xs={12}>
                    {this.combat.rerender >= 0 && (
                        <>
                            {
                                this.fogOfWar ? 
                                (
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <h5>
                                            Battle {this.combatStats.length > 0 && "results "}
                                        </h5>
                                    </div>
                                )
                                :
                                (
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <h5>
                                            Battle {this.combatStats.length > 0 && "results "} for <b>{this.combat.defendingRegion.name}</b>
                                        </h5>
                                    </div>
                                )
                            }
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <CombatInfoComponent
                                    housesCombatData={houseCombatDatas}
                                    fogOfWar={this.fogOfWar}
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
                {!this.props.gameClient.musicMuted && <audio id="combat-sound" src={combatSound} autoPlay />}
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
            return this.combat.ingameGameState.isVassalHouse(house) ? "vassal" : house.id;
        }

        return undefined;
    }

    modifyRegionsOnMap(): [Region, PartialRecursive<RegionOnMapProperties>][] {
        // Highlight the embattled area in yellow
        return [[
            this.combat.defendingRegion,
            {highlight: {active: true, color: "yellow"}}
        ]];
    }

    modifyUnitsOnMap(): [Unit, PartialRecursive<UnitOnMapProperties>][] {
        // Highlight the attacking army in red when game state tree does not contain SelectUnitsGameState
        // or the user does not control the house to select units but never show march markers when attacker lost the combat
        // (but post combat may be still active for abilties)
        const postCombat = this.combat.childGameState instanceof PostCombatGameState ? this.combat.childGameState : null;
        const drawMarchMarkers = !postCombat || (!postCombat.hasChildGameState(AfterCombatHouseCardAbilitiesGameState) && postCombat.winner == this.combat.attacker);
        const selectUnits = this.combat.hasChildGameState(SelectUnitsGameState) ? this.combat.getChildGameState(SelectUnitsGameState) as SelectUnitsGameState<any>: null;

        if (!selectUnits || !this.props.gameClient.doesControlHouse(selectUnits.house)) {
            return this.combat.attackingArmy.map(u => ([u, {highlight: {active: true, color: "red"}, targetRegion: drawMarchMarkers ? this.combat.defendingRegion : undefined}]));
        } else if (this.props.gameClient.doesControlHouse(selectUnits.house)) {
            return [];
        } else {
            return this.combat.attackingArmy.map(u => ([u, {targetRegion: drawMarchMarkers ? this.combat.defendingRegion : undefined}]));
        }
    }

    modifyOrdersOnMap(): [Region, PartialRecursive<OrderOnMapProperties>][] {
        return [this.props.gameState.attackingRegion].map(r => [
            r,
            {highlight: {active: true, color: "red"}}
        ]);
    }

    componentDidMount(): void {
        this.props.mapControls.modifyRegionsOnMap.push(this.modifyRegionsOnMapCallback = () => this.modifyRegionsOnMap());
        this.props.mapControls.modifyUnitsOnMap.push(this.modifyUnitsOnMapCallback = () => this.modifyUnitsOnMap());
        this.props.mapControls.modifyOrdersOnMap.push(this.modifyOrdersOnMapCallback = () => this.modifyOrdersOnMap());
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.modifyRegionsOnMap, this.modifyRegionsOnMapCallback);
        _.pull(this.props.mapControls.modifyUnitsOnMap, this.modifyUnitsOnMapCallback);
        _.pull(this.props.mapControls.modifyOrdersOnMap, this.modifyOrdersOnMapCallback);
    }
}
