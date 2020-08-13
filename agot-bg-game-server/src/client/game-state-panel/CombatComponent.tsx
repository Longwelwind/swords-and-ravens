import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import CombatGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/CombatGameState";
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

@observer
export default class CombatComponent extends Component<GameStateComponentProps<CombatGameState>> {
    modifyRegionsOnMapCallback: any;
    modifyUnitsOnMapCallback: any;

    get combatGameState(): CombatGameState {
        return this.props.gameState;
    }

    get attacker(): House {
        return this.combatGameState.attacker;
    }

    get defender(): House {
        return this.combatGameState.defender;
    }

    render(): ReactNode {
        return (
            <>
                <Col xs={12}>
                    {!(this.props.gameState.childGameState instanceof PostCombatGameState) && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <h5>Battle for <strong>{this.combatGameState.defendingRegion.name}</strong></h5>
                            </div>
                            <CombatInfoComponent
                                housesCombatData={[
                                    {
                                        house: this.attacker,
                                        houseCard: this.props.gameState.attackerHouseCard,
                                        region: this.props.gameState.attackingRegion,
                                        army: this.combatGameState.getBaseCombatStrength(this.attacker),
                                        armyUnits: this.combatGameState.attackingArmy.map(u => u.type),
                                        orderBonus: this.combatGameState.getOrderBonus(this.attacker),
                                        garrison: this.combatGameState.getGarrisonCombatStrength(this.attacker),
                                        support: this.combatGameState.getSupportStrengthForSide(this.attacker),
                                        houseCardStrength: this.combatGameState.getHouseCardCombatStrength(this.attacker),
                                        valyrianSteelBlade: this.combatGameState.getValyrianBladeBonus(this.attacker),
                                        total: this.combatGameState.getTotalCombatStrength(this.attacker),
                                    },
                                    {
                                        house: this.defender,
                                        houseCard: this.props.gameState.defenderHouseCard,
                                        region: this.props.gameState.defendingRegion,
                                        army: this.combatGameState.getBaseCombatStrength(this.defender),
                                        armyUnits: this.combatGameState.defendingArmy.map(u => u.type),
                                        orderBonus: this.combatGameState.getOrderBonus(this.defender),
                                        garrison: this.combatGameState.getGarrisonCombatStrength(this.defender),
                                        support: this.combatGameState.getSupportStrengthForSide(this.defender),
                                        houseCardStrength: this.combatGameState.getHouseCardCombatStrength(this.defender),
                                        valyrianSteelBlade: this.combatGameState.getValyrianBladeBonus(this.defender),
                                        total: this.combatGameState.getTotalCombatStrength(this.defender),
                                    }
                                ]}
                            />
                        </>
                    )}
                </Col>
                {renderChildGameState(this.props, [
                    [DeclareSupportGameState, DeclareSupportComponent],
                    [ChooseHouseCardGameState, ChooseHouseCardComponent],
                    [UseValyrianSteelBladeGameState, UseValyrianSteelBladeComponent],
                    [PostCombatGameState, PostCombatComponent],
                    [ImmediatelyHouseCardAbilitiesResolutionGameState, ImmediatelyHouseCardAbilitiesResolutionComponent],
                    [CancelHouseCardAbilitiesGameState, CancelHouseCardAbilitiesComponent]
                ])}
            </>
        );
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
            || (authenticatedPlayer == null || !this.props.gameState.houseCombatDatas.keys.includes(authenticatedPlayer.house))) {
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
