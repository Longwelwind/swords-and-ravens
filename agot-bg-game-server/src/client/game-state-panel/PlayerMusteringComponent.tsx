import PlayerMusteringGameState, {
    Mustering,
    PlayerMusteringType
} from "../../common/ingame-game-state/westeros-game-state/mustering-game-state/player-mustering-game-state/PlayerMusteringGameState";
import {observer} from "mobx-react";
import React, {Component, ReactElement, ReactNode} from "react";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import BetterMap from "../../utils/BetterMap";
import {observable} from "mobx";
import House from "../../common/ingame-game-state/game-data-structure/House";
import * as _ from "lodash";
import {Button, OverlayTrigger, Popover} from "react-bootstrap";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import {OrderOnMapProperties, RegionOnMapProperties, UnitOnMapProperties} from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";
import Unit from "../../common/ingame-game-state/game-data-structure/Unit";

@observer
export default class PlayerMusteringComponent extends Component<GameStateComponentProps<PlayerMusteringGameState>> {
    @observable musterings = new BetterMap<Region, Mustering[]>();

    modifyRegionsOnMapCallback: any;
    modifyUnitsOnMapCallback: any;
    modifyOrdersOnMapCallback: any;

    get house(): House {
        return this.props.gameState.house;
    }

    get isStarredConsolidatePowerMusteringType(): boolean {
        return this.props.gameState.isStarredConsolidatePowerMusteringType;
    }

    get consolidatePowerOrderResolvedForGainingPowerToken(): boolean {
        return this.isStarredConsolidatePowerMusteringType && this.musterings.size == 1 && this.musterings.values[0].length == 0;
    }

    get doesControlCurrentHouse(): boolean {
        return this.props.gameClient.doesControlHouse(this.house);
    }

    get defenseMusterOrderRegion(): Region | null {
        if (this.props.gameState.type != PlayerMusteringType.DEFENSE_MUSTER_ORDER) {
            return null;
        }

        const regions = this.props.gameState.resolveConsolidatePowerGameState.actionGameState.getRegionsWithDefenseMusterOrderOfHouse(this.house);
        if (regions.length > 0) {
            return regions[0];
        }

        return null;
    }

    render(): ReactNode {
        return (
            <>
                <Col xs={12}>
                    {this.isStarredConsolidatePowerMusteringType ? (
                        <>House <b>{this.house.name}</b> must resolve one of its Consolidate Power Orders.</>
                    ) : this.props.gameState.type == PlayerMusteringType.MUSTERING_WESTEROS_CARD ? (
                        <>Players can muster units in their controlled castles and fortresses.</>
                    ) : this.props.gameState.type == PlayerMusteringType.THE_HORDE_DESCENDS_WILDLING_CARD ? (
                        <>House <b>{this.house.name}</b> can muster units in one of their controlled castles or fortresses.</>
                    ) : this.props.gameState.type == PlayerMusteringType.DEFENSE_MUSTER_ORDER && (
                        <>Vassal house <b>{this.house.name}</b> can resolve their Muster Order{this.defenseMusterOrderRegion && <> in <b>{this.defenseMusterOrderRegion.name}</b></>}.</>
                    )}
                </Col>
                {this.doesControlCurrentHouse &&
                    <>
                        {this.musterings.size > 0 &&
                            <Col xs={12}>
                                <>
                                    {this.consolidatePowerOrderResolvedForGainingPowerToken
                                        && this.hasStarredConsolidatePowerOrder(this.musterings.keys[0])
                                        && this.props.gameState.anyUsablePointsLeft(this.musterings) &&
                                            <p>Click into <b>{this.musterings.keys[0].name}</b> to initiate a recruitment.</p>}
                                    {this.musterings.values[0].length > 0 && <p>Your recruitments:</p>}
                                    {this.musterings.entries.map(([r, musterings]) => (
                                        <div key={`recruitments-${r.id}`}>
                                            From <b>{r.name}</b>
                                            <ul>
                                                {musterings.map(({region, from, to}, i) => (
                                                    <li onClick={() => this.removeMustering(musterings, i)} key={i}>
                                                        {from ? "Upgrading to " : "Recruiting "} a {to.name}{r != region && (" in " + region.name)}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </>
                            </Col>
                        }
                        {(this.musterings.size == 0 || (this.props.gameState.type == PlayerMusteringType.MUSTERING_WESTEROS_CARD && this.props.gameState.anyUsablePointsLeft(this.musterings))) && (
                            <Col xs={12}>
                                {this.isStarredConsolidatePowerMusteringType ?
                                    <>Click on a Consolidate Power Order token to resolve it for gaining Power tokens or click on a region with a
                                    Special Consolidate Power Order token to initiate a recruitment from there.</>
                                  : <>Click on a region to initiate a recruitment from there.</>}
                            </Col>
                        )}
                        <Col xs={12}>
                            <Row className="justify-content-center">
                                {this.showSubmit() ?
                                    <Col xs="auto">
                                        <Button disabled={!this.canSubmit()} onClick={() => this.submit()}>Submit</Button>
                                    </Col> :
                                    <Col xs="auto">
                                        <Button onClick={() => this.submitForPT()}>
                                            {this.getPowerTokenButtonText(this.props.gameState.resolveConsolidatePowerGameState.getPotentialGainedPowerTokens(this.musterings.keys[0], this.house))}
                                        </Button>
                                    </Col>
                                }
                                <Col xs="auto">
                                    <Button
                                        variant="danger"
                                        disabled={this.musterings.size == 0}
                                        onClick={() => this.reset()}
                                    >
                                        Reset
                                    </Button>
                                </Col>
                            </Row>
                        </Col>
                    </>}
                {(!this.doesControlCurrentHouse || this.props.gameState.ingame.isVassalHouse(this.house)) &&
                <Col xs={12} className="text-center">
                    Waiting for {this.house.name}...
                </Col>}
            </>
        );
    }

    private hasConsolidatePowerOrder(region: Region | null): boolean {
        if (!region) {
            return false;
        }

        if (this.props.gameState.getConsolidatePowerOrder(region)) {
            return true;
        }

        return false;
    }

    hasStarredConsolidatePowerOrder(region: Region | null): boolean {
        if (!region) {
            return false;
        }

        const order = this.props.gameState.getConsolidatePowerOrder(region);

        if (order) {
            return order.type.starred;
        }

        return false;
    }

    private removeMustering(musterings: Mustering[], i: number): void {
        const removedMustering = musterings.splice(i, 1)[0];

        if (removedMustering.affectedUnit) {
            if (removedMustering.from) {
                removedMustering.affectedUnit.upgradedType = undefined;
            } else {
                removedMustering.region.newUnits = removedMustering.region.newUnits.filter(u => u != removedMustering.affectedUnit);
            }
        }

        this.removeEmptyMusterings();
    }

    private removeEmptyMusterings(): void {
        this.musterings.keys.forEach(r => {
            const mustering = this.musterings.get(r);
            if (mustering.length == 0) {
                this.musterings.delete(r);
            }
        });
    }

    private showSubmit(): boolean {
        return !this.consolidatePowerOrderResolvedForGainingPowerToken;
    }

    private canSubmit(): boolean {
        switch (this.props.gameState.type) {
            case PlayerMusteringType.MUSTERING_WESTEROS_CARD:
                return true;
            case PlayerMusteringType.STARRED_CONSOLIDATE_POWER:
                // Submit button should only be active when user used the starred CP for mustering.
                // If he can't use it for muster, he has to use it for gaining PTs
                return this.musterings.size == 1 && this.musterings.values.length > 0;
            case PlayerMusteringType.THE_HORDE_DESCENDS_WILDLING_CARD:
            case PlayerMusteringType.DEFENSE_MUSTER_ORDER:
                return this.musterings.size <= 1;
        }
    }

    private addMustering(initiatingRegion: Region, rule: Mustering): void {
        const musterings: Mustering[] = this.musterings.tryGet(initiatingRegion, []);

        if (rule.from) {
            const potentialUnit = this.props.gameState.getPotentialUnitForUpgrading(this.musterings, rule.region, rule.from.type);
            if (!potentialUnit) {
                throw new Error("An upgrade was added but there is no unit to upgrade");
            }
            rule.affectedUnit = potentialUnit;
            rule.affectedUnit.upgradedType = rule.to;
        } else {
            rule.affectedUnit = this.props.gameState.game.createUnit(rule.region, rule.to, this.house);
            rule.region.newUnits.push(rule.affectedUnit);
        }

        musterings.push(rule);
        this.musterings.set(initiatingRegion, musterings);

        this.removeEmptyMusterings();

        if (this.props.gameState.getPointsLeft(initiatingRegion, this.musterings) == 0) {
            document.body.click();
        }
    }

    submit(): void {
        if (this.props.gameState.anyUsablePointsLeft(this.musterings)) {
            if (!confirm('You have not used all of your mustering points. Continue anyway?')){
                return;
            }
        }

        this.props.gameState.muster(this.musterings);
        this.reset();
    }

    private getPowerTokenButtonText(powerTokenCount: number): string {
        return `Get ${powerTokenCount} Power token${powerTokenCount > 1 ? "s" : ""}`;
    }

    private modifyRegionsOnMap(): [Region, PartialRecursive<RegionOnMapProperties>][] {
        if (this.doesControlCurrentHouse) {
            let regionsToModify = (this.isStarredConsolidatePowerMusteringType
                ? this.props.gameState.resolveConsolidatePowerGameState.actionGameState.getRegionsWithStarredConsolidatePowerOrderOfHouse(this.house)
                : this.props.gameState.type == PlayerMusteringType.DEFENSE_MUSTER_ORDER
                    ? this.props.gameState.resolveConsolidatePowerGameState.actionGameState.getRegionsWithDefenseMusterOrderOfHouse(this.house)
                    : this.props.gameState.game.world.regions.values.filter(r => r.getController() == this.house)).filter(r => this.props.gameState.getValidMusteringRulesForRegion(r, this.musterings).length > 0);

            if (this.props.gameState.type == PlayerMusteringType.THE_HORDE_DESCENDS_WILDLING_CARD) {
                if (this.musterings.size == 1) {
                    regionsToModify = regionsToModify.filter(r => r == this.musterings.keys[0]);
                }
            }

            if (this.props.gameState.type == PlayerMusteringType.MUSTERING_WESTEROS_CARD && this.props.gameState.ingame.isVassalHouse(this.house)) {
                regionsToModify = regionsToModify.filter(r => r.superControlPowerToken == this.house);
            }

            return regionsToModify
                .map(modifiedRegion => [
                        modifiedRegion,
                        {
                            highlight: {active: true},
                            wrap: (!this.isStarredConsolidatePowerMusteringType || this.hasStarredConsolidatePowerOrder(modifiedRegion)) ? (child: ReactElement) => (
                                <OverlayTrigger
                                    placement="auto"
                                    trigger="click"
                                    rootClose
                                    overlay={
                                        <Popover id={"region-popover-" + modifiedRegion.id} className="p-2">
                                            <h5 style={{textAlign: "center"}}>{modifiedRegion.name} <small>({this.props.gameState.getUsedPointsForRegion(modifiedRegion, this.musterings)} / {modifiedRegion.castleLevel})</small></h5>
                                            <>
                                                {this.props.gameState.getValidMusteringRulesForRegion(modifiedRegion, this.musterings).length > 0 && (
                                                    <>
                                                        {this.props.gameState.getValidMusteringRules(modifiedRegion, this.musterings).map(({region, rules}) => (
                                                            rules.map((rule, i) => (
                                                                <Col key={modifiedRegion.id + "_muster-rule_" + i}>
                                                                    <Button onClick={() => this.addMustering(modifiedRegion, rule)}>
                                                                        {rule.from ? "Upgrade to " : "Recruit "} a {rule.to.name}{region != modifiedRegion && (" in " + region.name)} [{rule.cost}]
                                                                    </Button>
                                                                </Col>
                                                            ))
                                                        ))}
                                                    </>
                                                )}
                                            </>
                                        </Popover>
                                    }
                                >
                                    {child}
                                </OverlayTrigger>
                            ) : null
                        }]
                    );
            }

        return [];
    }

    private modifyOrdersOnMap(): [Region, PartialRecursive<OrderOnMapProperties>][] {
        if (this.doesControlCurrentHouse) {
            if (this.isStarredConsolidatePowerMusteringType) {
                return this.props.gameState.game.world.getControlledRegions(this.house).filter(r => this.hasConsolidatePowerOrder(r))
                .map(r => [
                    r,
                    {
                        highlight: {active: true},
                        onClick: () => this.onOrderClick(r)
                    }
                ]);
            }
        }

        return [];
    }

    private modifyUnitsOnMap(): [Unit, PartialRecursive<UnitOnMapProperties>][] {
        if (this.doesControlCurrentHouse) {
            const allMusteredToRegions = _.uniq(_.flatMap(this.musterings.values).map(m => m.region));
            const allMusteredUnitsOfHouse = _.flatMap(allMusteredToRegions.map(r => _.concat(r.newUnits, r.units.values.filter(u => u.upgradedType != undefined))));

            return allMusteredUnitsOfHouse.map(u => [
                u,
                {
                    highlight: { active: true, color: u.upgradedType ? "yellow" : "green"},
                    onClick: () => {
                        this.onUnitClick(u);
                    }
                }
            ]);
        }

        return [];
    }

    componentDidMount(): void {
        this.props.mapControls.modifyRegionsOnMap.push(this.modifyRegionsOnMapCallback = () => this.modifyRegionsOnMap());
        this.props.mapControls.modifyOrdersOnMap.push(this.modifyOrdersOnMapCallback = () => this.modifyOrdersOnMap());
        this.props.mapControls.modifyUnitsOnMap.push(this.modifyUnitsOnMapCallback = () => this.modifyUnitsOnMap());
    }

    componentWillUnmount(): void {
        _.pull(this.props.mapControls.modifyOrdersOnMap, this.modifyOrdersOnMapCallback);
        _.pull(this.props.mapControls.modifyRegionsOnMap, this.modifyRegionsOnMapCallback);
        _.pull(this.props.mapControls.modifyUnitsOnMap, this.modifyUnitsOnMapCallback);
    }

    private onOrderClick(region: Region): void {
        if (region.getController() != this.house || !this.isStarredConsolidatePowerMusteringType) {
            return;
        }

        this.reset();

        this.musterings = new BetterMap();
        this.musterings.set(region, []);
    }

    private onUnitClick(unit: Unit): void {
        for (const musteredRegion of this.musterings.keys) {
            const musterings = this.musterings.get(musteredRegion);

            for (let i=0; i < musterings.length; i++) {
                const mustering = musterings[i];
                if (mustering.affectedUnit == unit) {
                    this.removeMustering(musterings, i);
                    return;
                }
            }
        }
    }

    reset(): void {
        _.flatMap(this.musterings.values).forEach(r => {
            r.region.newUnits = [];
            r.region.units.values.forEach(u => u.upgradedType = undefined);
        });

        this.musterings = new BetterMap();
    }

    submitForPT(): void {
        // Send a mustering with only one region, with no recruitements.
        // This acts as a consolidate power
        if (!this.consolidatePowerOrderResolvedForGainingPowerToken) {
            throw new Error("submitForPT was clicked but !this.consolidatePowerOrderResolvedForGainingPowerToken");
        }

        this.props.gameState.muster(this.musterings);

        this.reset();
    }
}
