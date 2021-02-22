import PlayerMusteringGameState, {
    Mustering,
    PlayerMusteringType
} from "../../common/ingame-game-state/westeros-game-state/mustering-game-state/player-mustering-game-state/PlayerMusteringGameState";
import {observer} from "mobx-react";
import React, {Component, ReactNode} from "react";
import Region from "../../common/ingame-game-state/game-data-structure/Region";
import BetterMap from "../../utils/BetterMap";
import {observable} from "mobx";
import House from "../../common/ingame-game-state/game-data-structure/House";
import * as _ from "lodash";
import {Button} from "react-bootstrap";
import GameStateComponentProps from "./GameStateComponentProps";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import classNames from "classnames";
import {OrderOnMapProperties, RegionOnMapProperties, UnitOnMapProperties} from "../MapControls";
import PartialRecursive from "../../utils/PartialRecursive";
import Unit from "../../common/ingame-game-state/game-data-structure/Unit";

@observer
export default class PlayerMusteringComponent extends Component<GameStateComponentProps<PlayerMusteringGameState>> {
    @observable selectedRegion: Region | null;
    @observable musterings = new BetterMap<Region, Mustering[]>();

    modifyRegionsOnMapCallback: any;
    modifyOrdersOnMapCallback: any;
    modifyUnitsOnMapCallback: any;

    get house(): House {
        return this.props.gameState.house;
    }

    render(): ReactNode {
        return (
            <>
                <Col xs={12}>
                    {this.props.gameState.type == PlayerMusteringType.STARRED_CONSOLIDATE_POWER ? (
                        <>House <b>{this.house.name}</b> must resolve one of its Consolidate Power Orders.</>
                    ) : this.props.gameState.type == PlayerMusteringType.MUSTERING_WESTEROS_CARD ? (
                        <>Players can muster units in their controlled castles and fortresses.</>
                    ) : this.props.gameState.type == PlayerMusteringType.THE_HORDE_DESCENDS_WILDLING_CARD && (
                        <>House <b>{this.house.name}</b> can muster units in one of their controlled castles or fortresses.</>
                    )}
                </Col>
                {this.props.gameClient.doesControlHouse(this.house) ? (
                    <>
                        {this.musterings.size > 0 && (
                            <Col xs={12}>
                                {this.musterings.entries.map(([region, musterings]) => (
                                    <div key={region.id}>
                                        From <b>{region.name}</b>:
                                        <ul>
                                            {musterings.map(({region, from, to}, i) => (
                                                <li onClick={() => this.removeMustering(musterings, i)} key={i}>
                                                    {from ? "Upgrading to " : "Recruiting "} a {to.name} in {region.name}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </Col>
                        )}
                        {!(this.props.gameState.type == PlayerMusteringType.STARRED_CONSOLIDATE_POWER && this.musterings.size > 0) && (
                            <Col xs={12}>
                                {this.props.gameState.type == PlayerMusteringType.STARRED_CONSOLIDATE_POWER ?
                                    <>Click on a Consolidate Power Order token to resolve it.</>
                                  : <>Click on a region to initiate a recruitment from there.</>}
                            </Col>
                        )}
                        {this.selectedRegion && (
                            <>
                                {this.selectedRegion.hasStructure && this.checkStarredConsolidatePower(this.selectedRegion) && this.props.gameState.getValidMusteringRulesForRegion(this.selectedRegion, this.musterings).length > 0 && (
                                    <>
                                        <Col xs={12}>
                                            From <b>{this.selectedRegion.name}</b>, you can ({this.props.gameState.getPointsLeft(this.selectedRegion, this.musterings)} mustering points left):
                                        </Col>
                                        <Col xs={12}>
                                            <Row>
                                                {this.props.gameState.getValidMusteringRules(this.selectedRegion, this.musterings).map(({region, rules}) => (
                                                    rules.map((r, i) => (
                                                        <Col xs="auto" key={region.id + "-" + i}>
                                                            <Button onClick={() => this.addMustering(r)}>
                                                                [{r.cost}] {r.from ? "Upgrade to " : "Recruit "} a {r.to.name} in {region.name}
                                                            </Button>
                                                        </Col>
                                                    ))
                                                ))}
                                            </Row>
                                        </Col>
                                    </>
                                )}
                            </>
                        )}
                        <Col xs={12}>
                            <Row className="justify-content-center">
                                {(!this.selectedRegion || this.checkStarredConsolidatePower(this.selectedRegion)) && (
                                 <Col xs="auto">
                                    <Button disabled={!this.canSubmit()} onClick={() => this.submit()}>Submit</Button>
                                </Col>)}
                                {this.props.gameState.type == PlayerMusteringType.STARRED_CONSOLIDATE_POWER && this.selectedRegion &&
                                    this.props.gameState.hasConsolidatePowerOrder(this.selectedRegion) &&
                                    (<Col xs="auto" className={classNames({"invisible": this.selectedRegion == null})}>
                                        <Button
                                                onClick={() => this.submitForPT()}
                                                disabled={this.selectedRegion == null || (this.musterings.size > 0 && this.musterings.entries[0][1].length > 0)}
                                            >
                                                {this.getPowerTokenButtonText()}
                                        </Button>
                                    </Col>)
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
                    </>
                ) : (
                    <Col xs={12} className="text-center">
                        Waiting for {this.house.name}...
                    </Col>
                )}
            </>
        );
    }

    private removeMustering(musterings: Mustering[], i: number): void {
        const removedMustering = musterings.splice(i, 1)[0];
        const region = removedMustering.region;

        if (removedMustering.affectedUnit) {
            if (removedMustering.from) {
                removedMustering.affectedUnit.upgradedType = undefined;
            } else {
                region.newUnits = region.newUnits.filter(u => u != removedMustering.affectedUnit);
            }
        }

        this.musterings.keys.forEach(r => {
           const mustering = this.musterings.get(r);
           if (mustering.length == 0) {
               this.musterings.delete(r);
           }
        });
    }

    canSubmit(): boolean {
        switch (this.props.gameState.type) {
            case PlayerMusteringType.MUSTERING_WESTEROS_CARD:
                return true;
            case PlayerMusteringType.STARRED_CONSOLIDATE_POWER:
                // Submit button should only be active when user used the starred CP for mustering.
                // If he can't use it for muster, he has to use it for gaining PTs
                return this.musterings.size > 0 && this.musterings.entries[0][1].length > 0;
            case PlayerMusteringType.THE_HORDE_DESCENDS_WILDLING_CARD:
                return true;
        }
    }

    addMustering(rule: Mustering): void {
        if (this.selectedRegion == null) {
            return;
        }

        const musterings: Mustering[] = this.musterings.tryGet(this.selectedRegion, []);

        if (rule.from) {
            rule.affectedUnit = this.props.gameState.getUnitsLeftToUpgrade(this.musterings, rule.region)[0];
            rule.affectedUnit.upgradedType = rule.to;
        } else {
            rule.affectedUnit = this.props.gameState.game.createUnit(rule.region, rule.to, this.props.gameState.house);
            rule.region.newUnits.push(rule.affectedUnit);
        }

        musterings.push(rule);
        this.musterings.set(this.selectedRegion, musterings);

        if (this.props.gameState.getPointsLeft(this.selectedRegion, this.musterings) == 0) {
            this.selectedRegion = null;
        }
    }

    submit(): void {
        if(this.props.gameState.anyUsablePointsLeft(this.musterings)) {
            if(!confirm('You have not used all of your mustering points. Continue anyway?')){
                return;
            }
        }

        this.props.gameState.muster(this.musterings);
        this.reset();
    }

    private checkStarredConsolidatePower(region: Region): boolean {
        if(this.props.gameState.type != PlayerMusteringType.STARRED_CONSOLIDATE_POWER) {
            return true;
        }

        return this.props.gameState.hasStarredConsolidatePowerOrder(region);
    }

    private getPowerTokenButtonText(): string {
        const powerTokenCount = this.selectedRegion ? this.props.gameState.resolveConsolidatePowerGameState.getPotentialGainedPowerTokens(this.selectedRegion, this.house) : 0;
        return `Get ${powerTokenCount} Power token${powerTokenCount > 1 ? "s" : ""}`;
    }

    modifyRegionsOnMap(): [Region, PartialRecursive<RegionOnMapProperties>][] {
        if (this.props.gameClient.doesControlHouse(this.props.gameState.house)) {
            if (this.props.gameState.type == PlayerMusteringType.MUSTERING_WESTEROS_CARD || this.props.gameState.type == PlayerMusteringType.THE_HORDE_DESCENDS_WILDLING_CARD) {
                return this.props.gameState.game.world.regions.values
                    .filter(r => r.getController() == this.props.gameState.house && this.props.gameState.getValidMusteringRulesForRegion(r, this.musterings).length > 0)
                    .map(r => [
                            r,
                            {
                                highlight: {active: true},
                                onClick: () => this.onRegionClick(r)
                            }]
                        );
            }
        }

        return [];
    }

    modifyOrdersOnMap(): [Region, PartialRecursive<OrderOnMapProperties>][] {
        if (this.props.gameClient.doesControlHouse(this.props.gameState.house)) {
            if (this.props.gameState.type == PlayerMusteringType.STARRED_CONSOLIDATE_POWER) {
                if (this.selectedRegion == null) {
                    return this.props.gameState.game.world.getControlledRegions(this.props.gameState.house).filter(r => this.props.gameState.hasConsolidatePowerOrder(r))
                    .map(r => [
                        r,
                        {
                            highlight: {active: true},
                            onClick: () => this.onOrderClick(r)
                        }
                    ]);
                }
            }
        }

        return [];
    }

    modifyUnitsOnMap(): [Unit, PartialRecursive<UnitOnMapProperties>][] {
        if (this.props.gameClient.doesControlHouse(this.house)) {
            const allMusteredToRegions = _.uniq(_.flatMap(this.musterings.values).map(m => m.region));
            const allMusteredUnitsOfHouse = _.flatMap(allMusteredToRegions.map(r => _.concat(r.newUnits, r.units.values.filter(u => u.upgradedType != undefined))));

            return allMusteredUnitsOfHouse.map(u => [
                u,
                {
                    highlight: { active: true, color: "yellow" },
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
    }


    private onRegionClick(region: Region): void {
        if (region.getController() != this.props.gameState.house) {
            return;
        }

        if (this.props.gameState.type == PlayerMusteringType.STARRED_CONSOLIDATE_POWER) {
            this.selectedRegion = this.props.gameState.hasConsolidatePowerOrder(region) ? region : null;
            if(this.selectedRegion) {
                this.musterings.set(this.selectedRegion, []);
            }
        } else if(region.castleLevel > 0) {
            this.selectedRegion = region;
        }
    }

    private onOrderClick(r: Region): void {
        if (this.props.gameState.type == PlayerMusteringType.STARRED_CONSOLIDATE_POWER) {
            if (this.selectedRegion == null) {
                if (this.props.gameClient.doesControlHouse(r.getController())) {
                    this.onRegionClick(r);
                }
            }
        }
    }

    onUnitClick(unit: Unit): void {
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

        this.selectedRegion = null;
        this.musterings = new BetterMap<Region, Mustering[]>();
    }

    submitForPT(): void {
        if (this.selectedRegion == null) {
            return;
        }

        // Send a mustering with only one region, with no recruitements.
        // This acts as a consolidate power
        this.props.gameState.muster(new BetterMap([
            [this.selectedRegion, []]
        ]));

        this.reset();
    }
}
