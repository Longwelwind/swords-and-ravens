import {Component, ReactNode} from "react";
import React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import {GameLogData} from "../common/ingame-game-state/game-data-structure/GameLog";
import Game from "../common/ingame-game-state/game-data-structure/Game";
import House from "../common/ingame-game-state/game-data-structure/House";
import unitTypes from "../common/ingame-game-state/game-data-structure/unitTypes";
import World from "../common/ingame-game-state/game-data-structure/World";
import UnitType from "../common/ingame-game-state/game-data-structure/UnitType";
import Region from "../common/ingame-game-state/game-data-structure/Region";
import {westerosCardTypes} from "../common/ingame-game-state/game-data-structure/westeros-card/westerosCardTypes";
import {observer} from "mobx-react";
import WildlingCardComponent from "./game-state-panel/utils/WildlingCardComponent";
import WildlingCard from "../common/ingame-game-state/game-data-structure/wildling-card/WildlingCard";
import WesterosCardComponent from "./game-state-panel/utils/WesterosCardComponent";
import _ from "lodash";
import joinReactNodes from "./utils/joinReactNodes";
import orders from "../common/ingame-game-state/game-data-structure/orders";
import CombatInfoComponent from "./CombatInfoComponent";
import { OverlayTrigger, Tooltip } from "react-bootstrap";

interface GameLogListComponentProps {
    ingameGameState: IngameGameState;
}

@observer
export default class GameLogListComponent extends Component<GameLogListComponentProps> {
    get game(): Game {
        return this.props.ingameGameState.game;
    }

    get world(): World {
        return this.game.world;
    }

    render(): ReactNode {
        return this.props.ingameGameState.gameLogManager.logs.map((l, i) => (
            <Row key={i}>
                <Col xs="auto" className="text-muted">
                    <OverlayTrigger
                        placement="auto"
                        overlay={<Tooltip id={"log-date-" + l.time.getUTCMilliseconds()}>{l.time.toLocaleString()}</Tooltip>}
                        popperConfig={{ modifiers: { preventOverflow: { boundariesElement: "viewport" } } }}
                    >
                        <small>
                            {l.time.getHours().toString().padStart(2, "0")}
                            :{l.time.getMinutes().toString().padStart(2, "0")}
                        </small>
                    </OverlayTrigger>
                </Col>
                <Col>
                    <div className="game-log-content">
                        {this.renderGameLogData(l.data)}
                    </div>
                </Col>
            </Row>
        ));
    }

    renderGameLogData(data: GameLogData): ReactNode {
        switch (data.type) {
            case "turn-begin":
                return <Row className="justify-content-center">
                    <Col xs={true}><hr/></Col>
                    <Col xs="auto">
                        <h4>Turn <b>{data.turn}</b></h4>
                    </Col>
                    <Col xs={true}><hr/></Col>
                </Row>;

            case "support-declared":
                const supporter = this.game.houses.get(data.supporter);
                const supported = data.supported ? this.game.houses.get(data.supported) : null;
                if (supported) {
                    return <><b>{supporter.name}</b> supported <b>{supported.name}</b>.</>;
                } else {
                    return <><b>{supporter.name}</b> supported no-one.</>;
                }

            case "support-refused": {
                const house = this.game.houses.get(data.house);
                return <>House <b>{house.name}</b> chose to refuse all the support they received.</>;
            }

            case "attack":
                const attacker = this.game.houses.get(data.attacker);
                // A "null" for "attacked" means it was an attack against a neutral force
                const attacked = data.attacked ? this.game.houses.get(data.attacked) : null;
                const attackingRegion = this.game.world.regions.get(data.attackingRegion);
                const attackedRegion = this.game.world.regions.get(data.attackedRegion);
                const army = data.units.map(utid => unitTypes.get(utid));

                return (
                    <>
                        <b>{attacker.name}</b> attacked <b>{attacked ? attacked.name : "a neutral force"}</b> from <b>{attackingRegion.name}</b> to <b>
                        {attackedRegion.name}</b> with <>{joinReactNodes(army.map((ut, i) => <strong key={i}>{ut.name}</strong>), ', ')}</>.
                    </>
                );

            case "march-resolved":
                let house = this.game.houses.get(data.house);
                const startingRegion = this.world.regions.get(data.startingRegion);
                const moves: [Region, UnitType[]][] = data.moves.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))]);

                return (
                    <>
                        <b>{house.name}</b> marched from <b>{startingRegion.name}</b>{
                            data.leftPowerToken != null && <> and left {data.leftPowerToken ? "a" : "no"} Power Token</>}{moves.length > 0 ? ":" : "."}
                        {moves.length > 0 &&
                        <ul>
                            {moves.map(([region, unitTypes]) => (
                                <li key={region.id}>
                                    {joinReactNodes(unitTypes.map((ut, i) => <b key={i}>{ut.name}</b>), ", ")} to <b>{region.name}</b>
                                </li>
                            ))}
                        </ul>}
                    </>
                );

            case "westeros-card-executed":
                const westerosCardType = westerosCardTypes.get(data.westerosCardType);

                return (
                    <>
                        <Row className="justify-content-center">
                            <Col xs="auto">
                                <WesterosCardComponent cardType={westerosCardType} size="small" tooltip={true} westerosDeckI={data.westerosDeckI}/>
                            </Col>
                        </Row>
                    </>
                );

            case "westeros-cards-drawn":
                const drawnWesterosCardTypes = data.westerosCardTypes.map(wctid => westerosCardTypes.get(wctid));

                return (
                    <>
                        <p>
                            Westeros cards were drawn:
                        </p>
                        <Row className="justify-content-around">
                            {drawnWesterosCardTypes.map((wct, i) => (
                                <Col xs="auto" key={i}>
                                    <WesterosCardComponent cardType={wct} size="small" tooltip={true} westerosDeckI={i} />
                                </Col>
                            ))}
                        </Row>
                        {data.addedWildlingStrength > 0 && (
                            <p>Wildling Threat increased by {data.addedWildlingStrength}</p>
                        )}
                    </>
                );

            case "combat-result":
                const houseCombatDatas = data.stats.map(stat => {
                    const house = this.game.houses.get(stat.house);
                    return {
                        ...stat,
                        house,
                        region: this.world.regions.get(stat.region),
                        houseCard: stat.houseCard != null ? house.houseCards.get(stat.houseCard) : null,
                        armyUnits: stat.armyUnits.map(ut => unitTypes.get(ut))
                    };
                });
                const winner = this.game.houses.get(data.winner);

                return (
                    <>
                        <p>Combat result</p>
                        <CombatInfoComponent housesCombatData={houseCombatDatas}/>
                        <p><strong>{winner.name}</strong> won the fight!</p>
                    </>
                );
            case "wildling-card-revealed":
                const wildlingCard = this.game.wildlingDeck.find(wc => wc.id == data.wildlingCard) as WildlingCard;

                return (
                    <>
                        Wildling card revealed:
                        <Row className="justify-content-center">
                            <Col xs="auto">
                                <WildlingCardComponent cardType={wildlingCard.type} size="small" tooltip={true} placement="auto"/>
                            </Col>
                        </Row>
                    </>
                );
            case "wildling-bidding":
                const results: [number, House[]][] = data.results.map(([bid, hids]) => [bid, hids.map(hid => this.game.houses.get(hid))]);

                return (
                    <>
                        Wildling bidding results for Wildling Threat <strong>{data.wildlingStrength}</strong>:
                        <table cellPadding="5">
                            {results.map(([bid, houses]) => houses.map(h => (
                                <tr key={h.id}>
                                    <td>{h.name}</td>
                                    <td>{bid}</td>
                                </tr>
                            )))}
                        </table>
                        {data.nightsWatchVictory ? (
                            <>The <strong>Night&apos;s Watch</strong> won!</>
                        ) : (
                            <>The <strong>Wildlings</strong> won!</>
                        )}
                    </>
                );

            case "lowest-bidder-chosen":
                let lowestBidder = this.game.houses.get(data.lowestBidder);

                return (
                    <>
                        <strong>{lowestBidder.name}</strong> was chosen as the lowest bidder.
                    </>
                );

            case "highest-bidder-chosen":
                const highestBidder = this.game.houses.get(data.highestBidder);

                return (
                    <>
                        <strong>{highestBidder.name}</strong> was chosen as the highest bidder.
                    </>
                );

            case "player-mustered":
                house = this.game.houses.get(data.house);
                const musterings = _.flatMap(data.musterings.map(([_, musterements]: [string, {region: string; from: string | null; to: string}[]]) =>
                    musterements.map(({region, from, to}) => ({
                        region: this.game.world.regions.get(region),
                        from: from ? unitTypes.get(from) : null,
                        to: unitTypes.get(to)
                    }))
                ));

                return (
                    <>
                        <p>
                            <strong>{house.name}</strong> mustered{musterings.length > 0 ? ":" : " nothing."}
                        </p>
                        {musterings.length > 0 && (
                        <ul>
                            {musterings.map(({region, from, to}, i) => (
                                <li key={i}>
                                    {from ? (
                                        <>
                                            A <strong>{to.name}</strong> from a <strong>{from.name}</strong> in <strong>{region.name}</strong>
                                        </>
                                    ) : (
                                        <>A <strong>{to.name}</strong> in <strong>{region.name}</strong></>
                                    )}
                                </li>
                            ))}
                        </ul>
                        )}
                    </>
                );

            case "winner-declared":
                return (
                    <>Game ended.</>
                );

            case "raven-holder-wildling-card-put-bottom":
                house = this.game.houses.get(data.ravenHolder);

                return (
                    <p>
                        <strong>{house.name}</strong>, holder of the Messenger Raven token, chose to look at the top
                        card of the Wildling deck and to move it at the bottom of the deck.
                    </p>
                );

            case "raven-holder-wildling-card-put-top":
                house = this.game.houses.get(data.ravenHolder);

                return (
                    <p>
                        <strong>{house.name}</strong>, holder of the Messenger Raven token, chose to look at the top
                        card of the Wildling deck and to leave it at the top of the deck.
                    </p>
                );

            case "raven-holder-replace-order":
                house = this.game.houses.get(data.ravenHolder);
                const orderRegion = this.world.regions.get(data.region);
                const originalOrder = orders.get(data.originalOrder);
                const newOrder = orders.get(data.newOrder);

                return (
                    <p>
                        <strong>{house.name}</strong>, holder of the Messenger Raven token, chose to replace
                        a <strong>{originalOrder.type.name} Order</strong> with a <strong>{newOrder.type.name} Order
                        </strong> in <strong>{orderRegion.name}</strong>.
                    </p>
                );

            case "raven-not-used":{
                const house = this.game.houses.get(data.ravenHolder);

                return <p><strong>{house.name}</strong> did not use the Messenger Raven token.</p>;
            }

            case "raid-done":
                const raider = this.game.houses.get(data.raider);
                const raiderRegion = this.world.regions.get(data.raiderRegion);
                const raidee = data.raidee ? this.game.houses.get(data.raidee) : null;
                const raidedRegion = data.raidedRegion ? this.world.regions.get(data.raidedRegion) : null;
                const orderRaided = data.orderRaided ? orders.get(data.orderRaided) : null;

                // Those 3 variables will always be all null or all non-null
                if (raidee && raidedRegion && orderRaided) {
                    return (
                        <>
                            <p>
                                <strong>{raider.name}</strong> raided <strong>{raidee.name}</strong>&apos;s <strong>{orderRaided.type.name} Order
                                </strong> in <strong>{raidedRegion.name}</strong> from <strong>{raiderRegion.name}</strong>.
                            </p>
                            {data.raiderGainedPowerToken &&
                                <p><strong>{raider.name}</strong> gained {data.raiderGainedPowerToken ? "a" : "no"} Power Token
                                    from this raid.</p>}
                            {data.raidedHouseLostPowerToken != null
                                && <p><strong>{raidee.name}</strong> lost {data.raidedHouseLostPowerToken ? "a" : "no"} Power Token
                                    from this raid.</p>}
                        </>
                    );
                } else {
                    return (
                        <p>
                            <strong>{raider.name}</strong> raided nothing from <strong>{raiderRegion.name}</strong>.
                        </p>
                    );
                }

            case "a-throne-of-blades-choice":
                house = this.game.houses.get(data.house);

                return (
                    <p>
                        <strong>{house.name}</strong>, holder of the Iron Throne token, chose to
                        {data.choice == 0 ? (
                            <> trigger a Mustering.</>
                        ) : data.choice == 1 ? (
                            <> trigger a Supply.</>
                        ) : (
                            <> trigger nothing.</>
                        )}
                    </p>
                );

            case "dark-wings-dark-words-choice":
                house = this.game.houses.get(data.house);

                return (
                    <p>
                        <strong>{house.name}</strong>, holder of the Messenger Raven token, chose to
                        {data.choice == 0 ? (
                            <> trigger a Clash of Kings.</>
                        ) : data.choice == 1 ? (
                            <> trigger a Game of Thrones.</>
                        ) : (
                            <> trigger nothing.</>
                        )}
                    </p>
                );

            case "put-to-the-sword-choice":
                house = this.game.houses.get(data.house);

                return (
                    <p>
                        <strong>{house.name}</strong>, holder of the Valyrian Steel Blade token, chose to
                        {data.choice == 0 ? (
                            <> forbid <strong>March +1</strong> Orders from being played during this Planning Phase.</>
                        ) : data.choice == 1 ? (
                            <> forbid <strong>Defense</strong> Orders from being played during this Planning Phase.</>
                        ) : (
                            <> forbid nothing.</>
                        )}
                    </p>
                );

            case "winter-is-coming":
                const drawnCardType = westerosCardTypes.get(data.drawnCardType);

                return <>
                    <strong>Winter is Coming</strong>: The Westeros deck {data.deckIndex + 1} was shuffled and the new Westeros card drawn
                    is <strong>{drawnCardType.name}</strong>.
                </>;

            case "westeros-phase-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h5><strong>Westeros Phase</strong></h5>
                    </Col>
                </Row>;

            case "planning-phase-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h5><strong>Planning Phase</strong></h5>
                    </Col>
                </Row>;

            case "action-phase-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h5><strong>Action Phase</strong></h5>
                    </Col>
                </Row>;

            case "action-phase-resolve-raid-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h6><strong>Resolve Raid Orders</strong></h6>
                    </Col>
                </Row>;

            case "action-phase-resolve-march-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h6><strong>Resolve March Orders</strong></h6>
                    </Col>
                </Row>;

            case "action-phase-resolve-consolidate-power-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h6><strong>Resolve Consolidate Power Orders</strong></h6>
                    </Col>
                </Row>;

            case "combat-valyrian-sword-used":
                house = this.game.houses.get(data.house);

                return <><strong>{house.name}</strong> used the <strong>Valyrian Steel Blade</strong>.</>;

            case "combat-house-card-chosen":
                const houseCards = data.houseCards.map(([hid, hcid]) => {
                    const house = this.game.houses.get(hid);
                    return [house, house.houseCards.get(hcid)];
                });

                return <>
                    <p>House cards were chosen:</p>
                    <ul>
                        {houseCards.map(([h, hc]) => (
                            <li key={h.id}><strong>{h.name}</strong> chose <strong>{hc.name}</strong></li>
                        ))}
                    </ul>
                </>;

            case "clash-of-kings-final-ordering":
                const finalOrder = data.finalOrder.map(hid => this.game.houses.get(hid));

                return <>
                    <p>
                        Final order for {this.game.getNameInfluenceTrack(data.trackerI)}: {
                        joinReactNodes(finalOrder.map(h => <strong key={h.id}>{h.name}</strong>), ", ")}
                    </p>
                </>;

            case "clash-of-kings-bidding-done":
                const bids = _.flatMap(data.results.map(([bid, hids]) => hids.map(hid => [bid, this.game.houses.get(hid)] as [number, House])));

                return <>
                    <p>
                        Houses bid for the {this.game.getNameInfluenceTrack(data.trackerI)}:
                    </p>
                    <ul>
                        {bids.map(([bid, house]) => (
                            <li key={house.id}><strong>{house.name}</strong> bid <strong>{bid}</strong></li>
                        ))}
                    </ul>
                </>;

            case "wildling-strength-trigger-wildlings-attack":
                return <>
                    <strong>Wildling Threat</strong> reached <strong>{data.wildlingStrength}</strong>, triggering a <strong>Wildling Attack</strong>
                </>;

            case "march-order-removed":
                house = this.game.houses.get(data.house);
                let region = this.game.world.regions.get(data.region);

                return <>
                    <p>
                        <strong>{house.name}</strong> removed their March Order in <strong>{region.name}</strong>.
                    </p>
                </>;

            case "consolidate-power-order-resolved":
                house = this.game.houses.get(data.house);
                region = this.world.regions.get(data.region);
                const countPowerToken = data.powerTokenCount;

                return <>
                    <strong>{house.name}</strong> resolved a {data.starred && "Special "}Consolidate Power Order
                    in <strong>{region.name}</strong> to gain <strong>{countPowerToken}</strong> Power token{countPowerToken > 1 && "s"}.
                </>;

            case "armies-reconciled":
                house = this.game.houses.get(data.house);
                const armies = data.armies.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))] as [Region, UnitType[]]);

                return <>
                    <p>
                        <strong>{house.name}</strong> reconciled their armies by removing:
                    </p>
                    <ul>
                        {armies.map(([region, unitTypes]) => (
                            <li key={region.id}>{region.name}: {unitTypes.map(ut => ut.name).join(", ")}</li>
                        ))}
                    </ul>
                </>;

            case "house-card-ability-not-used":
                house = this.game.houses.get(data.house);
                let houseCard = this.game.getHouseCardById(data.houseCard);

                return <>
                    <strong>{house.name}</strong> did not use <strong>{houseCard.name}&apos;s</strong> ability.
                </>;

            case "patchface-used":
                house = this.game.houses.get(data.house);
                let affectedHouse = this.game.houses.get(data.affectedHouse);
                houseCard = this.game.getHouseCardById(data.houseCard);
                return <>
                    <strong>Patchface</strong>: <strong>{house.name}</strong> decided to discard <strong>
                        {houseCard.name}</strong> from house <strong>{affectedHouse.name}</strong>.
                </>;

            case "doran-used":
                house = this.game.houses.get(data.house);
                affectedHouse = this.game.houses.get(data.affectedHouse);
                const influenceTrack = this.game.getNameInfluenceTrack(data.influenceTrack);

                return <>
                    <strong>Doran Martell</strong>: <strong>{house.name}</strong> decided to move <strong>
                        {affectedHouse.name}</strong> to the bottom of the <strong>{influenceTrack}</strong> track.
                </>;

            case "tyrion-lannister-choice-made":
                house = this.game.houses.get(data.house);
                affectedHouse = this.game.houses.get(data.affectedHouse);
                const chooseToReplace = data.chooseToReplace;

                return <>
                    <strong>Tyrion Lannister</strong>: <strong>{house.name}</strong> {!chooseToReplace && "didn't "}force{chooseToReplace && "d"} <strong>
                        {affectedHouse.name}</strong> to choose a new House card.
                </>;

            case "tyrion-lannister-house-card-replaced":
                affectedHouse = this.game.houses.get(data.affectedHouse);
                const newHouseCard = data.newHouseCard ? affectedHouse.houseCards.get(data.newHouseCard) : null;

                return newHouseCard ? (
                    <><strong>{affectedHouse.name}</strong> chose <strong>{newHouseCard.name}.</strong></>
                ) : (
                    <><strong>{affectedHouse.name}</strong> had no other available House card</>
                );

            case "arianne-martell-prevent-movement":
                const enemyHouse = this.game.houses.get(data.enemyHouse);

                return <>
                    <strong>Arianne Martell</strong>: <strong>{enemyHouse.name}</strong> cannot move their attacking
                    army to the embattled area.
                </>;

            case "roose-bolton-house-cards-returned":
                house = this.game.houses.get(data.house);
                const returnedHouseCards = data.houseCards.map(hcid => house.houseCards.get(hcid));

                return <>
                    <strong>Roose Bolton</strong>: <strong>{house.name}</strong> took back all discarded House
                    cards ({joinReactNodes(returnedHouseCards.map(hc => <strong key={hc.id}>{hc.name}</strong>), ", ")}).
                </>;

            case "loras-tyrell-attack-order-moved":
                const order = orders.get(data.order);
                const embattledRegion = this.world.regions.get(data.region);

                return <>
                    <strong>Loras Tyrell</strong>: The <strong>{order.type.name}</strong> Order was moved
                    to <strong>{embattledRegion.name}</strong>.
                </>;

            case "queen-of-thorns-no-order-available":
                house = this.game.houses.get(data.house);
                affectedHouse = this.game.houses.get(data.affectedHouse);

                return <>
                    <strong>Queen of Thorns</strong>: <strong>{affectedHouse.name}</strong> had no adjacent Order tokens.
                </>;

            case "queen-of-thorns-order-removed":
                house = this.game.houses.get(data.house);
                affectedHouse = this.game.houses.get(data.affectedHouse);
                region = this.world.regions.get(data.region);
                let removedOrder = orders.get(data.orderRemoved);

                return <>
                    <strong>Queen of Thorns</strong>: <strong>{house.name}</strong> removed
                    a <strong>{removedOrder.type.name}</strong> Order of <strong>{affectedHouse.name}</strong> in <strong>{region.name}</strong>.
                </>;

            case "tywin-lannister-power-tokens-gained":
                house = this.game.houses.get(data.house);
                const powerTokensGained = data.powerTokensGained;

                return <>
                    <strong>Tywin Lannister</strong>: <strong>{house.name}</strong> gained {powerTokensGained} Power
                    tokens.
                </>;

            case "renly-baratheon-no-knight-available":
                house = this.game.houses.get(data.house);

                return <>
                    <strong>Renly Baratheon</strong>: <strong>{house.name}</strong> had no available Knight to upgrade to.
                </>;

            case "renly-baratheon-no-footman-available":
                house = this.game.houses.get(data.house);

                return <>
                    <strong>Renly Baratheon</strong>: <strong>{house.name}</strong> had no available Footman to upgrade.
                </>;

            case "renly-baratheon-footman-upgraded-to-knight":
                house = this.game.houses.get(data.house);
                region = this.world.regions.get(data.region);

                return <>
                    <strong>Renly Baratheon</strong>: <strong>{house.name}</strong> upgraded a Footman to a Knight
                    in <strong>{region.name}</strong>.
                </>;

            case "mace-tyrell-casualties-prevented":
                house = this.game.houses.get(data.house);

                return <>
                    <strong>Mace Tyrell</strong>: Casualties were prevented by <strong>The Blackfish</strong>.
                </>;

            case "mace-tyrell-no-footman-available":
                house = this.game.houses.get(data.house);

                return <>
                    <strong>Mace Tyrell</strong>: No enemy Footman was available to be killed.
                </>;

            case "mace-tyrell-footman-killed":
                house = this.game.houses.get(data.house);
                region = this.world.regions.get(data.region);

                return <>
                    <strong>Mace Tyrell</strong>: <strong>{house.name}</strong> killed an enemy Footman
                    in <strong>{region.name}</strong>.
                </>;

            case "cersei-lannister-no-order-available":
                return <>
                    <strong>Cersei Lannister</strong>: There were no Order tokens to be removed.
                </>;

            case "cersei-lannister-order-removed":
                house = this.game.houses.get(data.house);
                affectedHouse = this.game.houses.get(data.affectedHouse);
                region = this.world.regions.get(data.region);
                removedOrder = orders.get(data.order);

                return <>
                    <strong>Cersei Lannister</strong>: <strong>{house.name}</strong> removed
                    a <strong>{removedOrder.type.name}</strong> Order
                    of <strong>{affectedHouse.name}</strong> in <strong>{region.name}</strong>.
                </>;

            case "robb-stark-retreat-location-overriden":
                house = this.game.houses.get(data.house);
                affectedHouse = this.game.houses.get(data.affectedHouse);

                return <>
                    <strong>Robb Stark</strong>: <strong>{house.name}</strong> chose the retreat location of the
                    retreating army of <strong>{affectedHouse.name}</strong>.
                </>;

            case "retreat-region-chosen": {
                const house = this.game.houses.get(data.house);
                const regionFrom = this.game.world.regions.get(data.regionFrom);
                const regionTo = this.game.world.regions.get(data.regionTo);
                return <>
                        <strong>{house.name}</strong> retreats from <strong>
                        {regionFrom.name}</strong> to <strong>{regionTo.name}</strong>.
                </>;
            }
            case "retreat-failed": {
                const house = this.game.houses.get(data.house);
                const region = this.world.regions.get(data.region);

                return <>{
                    data.isAttacker ?
                        <><strong>{house.name}</strong> was not able to retreat to <strong>{region.name}</strong>.</>   :
                        <><strong>{house.name}</strong> was not able to retreat from <strong>{region.name}</strong>.</>
                }</>;
            }
            case "retreat-casualties-suffered": {
                const house = this.game.houses.get(data.house);
                const units = data.units.map(ut => unitTypes.get(ut).name);
                return <>
                    <p><strong>{house.name}</strong> suffered casualties from the retreat: <>{joinReactNodes(units.map((unitType, i) => <strong key={i}>{unitType}</strong>), ', ')}</>.</p>
                </>;
            }
            case "enemy-port-taken": {
                const newController = this.game.houses.get(data.newController);
                const oldController = this.game.houses.get(data.oldController);
                const port = this.world.regions.get(data.port);
                return <>
                    {data.shipCount > 0
                        ? <><strong>{newController.name}</strong> converted {data.shipCount} ship{data.shipCount == 1 ? "" : "s"} from <strong>{oldController.name}</strong> in <strong>{port.name}</strong>.</>
                        : <><strong>{newController.name}</strong> destroyed all <strong>{oldController.name}</strong> ships in <strong>{port.name}</strong>.</>}
                </>;
            }
            case "ships-destroyed-by-empty-castle": {
                const house = this.game.houses.get(data.house);
                const port = this.game.world.regions.get(data.port);
                const castle = this.game.world.regions.get(data.castle);
                return <>
                    <><strong>{house.name}</strong> lost {data.shipCount} Ship{data.shipCount>1?"s":""} in <strong>{port.name}</strong> because <strong>{castle.name}</strong> is empty now.</>
                </>;
            }
            case "silence-at-the-wall-executed":
                return <><strong>Silence at the Wall</strong>: Nothing happened.</>;

            case "preemptive-raid-choice-done":
                house = this.game.houses.get(data.house);

                if (data.choice == 0) {
                    return <>
                        <strong>Preemptive Raid</strong>: <strong>{house.name}</strong> chose to kill 2 of their
                        units.
                    </>;
                } else {
                    return <>
                        <strong>Preemptive Raid</strong>: <strong>{house.name}</strong> chose to reduce 2 positions
                        on their highest Influence track.
                    </>;
                }

            case "preemptive-raid-track-reduced":
                const chooser = data.chooser ? this.game.houses.get(data.chooser) : null;
                house = this.game.houses.get(data.house);
                let trackName = this.game.getNameInfluenceTrack(data.trackI);

                if (chooser == null) {
                    return <>
                        <strong>{house.name}</strong> was reduced 2 positions on the <strong>{trackName}</strong> track.
                    </>;
                } else {
                    return <>
                        <strong>{chooser.name}</strong> chose to reduce <strong>{house.name}</strong> 2 positions
                        on the <strong>{trackName}</strong> track.
                    </>;
                }

            case "preemptive-raid-units-killed":
                house = this.game.houses.get(data.house);
                let units = data.units.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))] as [Region, UnitType[]]);

                return <>
                    <strong>{house.name}</strong>{units.length > 0 ? (<> chose to
                    destroy {joinReactNodes(units.map(([region, unitTypes]) => <>{joinReactNodes(unitTypes.map((ut, i) => <strong key={i}>{ut.name}</strong>), ", ")} in <strong>{region.name}</strong></>), " and ")}.</>)
                    : <> had no units to destroy.</>}
                </>;

            case "preemptive-raid-wildlings-attack":
                house = this.game.houses.get(data.house);

                return <>
                    <strong>Preemptive Raid</strong>: A new Wildlings Attack with
                    strength <strong>{data.wildlingStrength}</strong> was triggered
                    where <strong>{house.name}</strong> will not be participating.
                </>;

            case "massing-on-the-milkwater-house-cards-back":
                house = this.game.houses.get(data.house);
                const houseCardsReturned = data.houseCardsReturned.map(hcid => house.houseCards.get(hcid));

                return <>
                    <strong>Massing on the Milkwater</strong>: <strong>{house.name}</strong> took
                    back {joinReactNodes(houseCardsReturned.map(hc => <strong key={hc.id}>{hc.name}</strong>), ", ")}
                </>;

            case "massing-on-the-milkwater-wildling-victory":
                lowestBidder = this.game.houses.get(data.lowestBidder);

                return <>
                    <strong>Massing on the Milkwater</strong>: <strong>{lowestBidder.name}</strong> discards all House
                    cards with the highest combat strength, all other houses must discard one House card.
                </>;

            case "massing-on-the-milkwater-house-cards-removed":
                house = this.game.houses.get(data.house);
                const houseCardsUsed = data.houseCardsUsed.map(hcid => house.houseCards.get(hcid));

                return <>
                    {houseCardsUsed.length > 0
                        ? <><strong>{house.name}</strong> discarded {joinReactNodes(houseCardsUsed.map(hc => <strong key={hc.id}>{hc.name}</strong>), ", ")}.</>
                        : <><strong>{house.name}</strong> did not discard a House card.</>}
                </>;

            case "a-king-beyond-the-wall-highest-top-track":
                house = this.game.houses.get(data.house);
                trackName = this.game.getNameInfluenceTrack(data.trackI);

                return <>
                    <strong>A King Beyond the Wall</strong>: <strong>{house.name}</strong> chose to move at the top
                    of the <strong>{trackName}</strong> track.
                </>;

            case "a-king-beyond-the-wall-lowest-reduce-tracks":
                lowestBidder = this.game.houses.get(data.lowestBidder);

                return <>
                    <strong>A King Beyond the Wall</strong>: <strong>{lowestBidder.name}</strong> was moved to the
                    bottom of all influence tracks.
                </>;

            case "a-king-beyond-the-wall-house-reduce-track":
                house = this.game.houses.get(data.house);
                trackName = this.game.getNameInfluenceTrack(data.trackI);

                return <>
                    <strong>A King Beyond the Wall</strong>: <strong>{house.name}</strong> chose to move at the bottom
                    of the <strong>{trackName}</strong> influence track.
                </>;

            case "mammoth-riders-destroy-units":
                house = this.game.houses.get(data.house);
                units = data.units.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))]);

                return <>
                    <strong>Mammoth Riders</strong>: <strong>{house.name}</strong>{units.length > 0 ? (<> chose to
                    destroy {joinReactNodes(units.map(([region, unitTypes]) => <>{joinReactNodes(unitTypes.map((ut, i) => <strong key={i}>{ut.name}</strong>), ", ")} in <strong>{region.name}</strong></>), ", ")}.</>)
                    : <> had no units to destroy.</>}
                </>;

            case "mammoth-riders-return-card":
                house = this.game.houses.get(data.house);
                houseCard = house.houseCards.get(data.houseCard);

                return <>
                    <strong>Mammoth Riders</strong>: <strong>{house.name}</strong> chose to
                    regain <strong>{houseCard.name}</strong>.
                </>;

            case "the-horde-descends-highest-muster":
                house = this.game.houses.get(data.house);

                return <>
                    <strong>The Horde Descends</strong>: <strong>{house.name}</strong> may muster forces in any one
                    Castle or Stronghold they control.
                </>;

            case "the-horde-descends-units-killed":
                house = this.game.houses.get(data.house);
                units = data.units.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))]);

                return <>
                    <strong>The Horde Descends</strong>: <strong>{house.name}</strong>{units.length > 0 ? (<> chose to
                    destroy {joinReactNodes(units.map(([region, unitTypes]) => <>{joinReactNodes(unitTypes.map((ut, i) => <strong key={i}>{ut.name}</strong>), ", ")} in <strong>{region.name}</strong></>), ", ")}.</>)
                    : <> had no units to destroy.</>}
                </>;

            case "crow-killers-knights-replaced":
                house = this.game.houses.get(data.house);
                units = data.units.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))]);

                return <>
                    {units.length > 0
                    ? (<><strong>Crow Killers</strong>: <strong>{house.name}</strong> replaced {joinReactNodes(units.map(([region, unitTypes]) => <><strong>{unitTypes.length}</strong> Knight{unitTypes.length > 1 && "s"} in <strong>{region.name}</strong></>), ", ")} with Footmen.</>)
                    : (<><strong>Crow Killers</strong>: <strong>{house.name}</strong> had no Knights to replace with Footmen.</>)}
                </>;

            case "crow-killers-knights-killed": {
                const house = this.game.houses.get(data.house);
                const units: [Region, UnitType[]][] = data.units.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))]);

                return <><b>Crow Killers</b>: <b>{house.name}</b> had to destroy {joinReactNodes(units.map(([region, unitTypes]) => <><b>{unitTypes.length}</b> Knight{unitTypes.length > 1 && "s"} in <b>{region.name}</b></>), ", ")}.</>;
            }

            case "crow-killers-footman-upgraded":
                house = this.game.houses.get(data.house);
                units = data.units.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))]);

                return <>
                    {units.length > 0
                    ? (<><strong>Crow Killers</strong>: <strong>{house.name}</strong> replaced {joinReactNodes(units.map(([region, unitTypes]) => <><strong>{unitTypes.length}</strong> Footm{unitTypes.length == 1 ? "a" : "e"}n in <strong>{region.name}</strong></>), ", ")} with Knights.</>)
                    : (<><strong>Crow Killers</strong>: <strong>{house.name}</strong> was not able to replace any Footman with Knights.</>)}
                </>;

            case "skinchanger-scout-nights-watch-victory":
                house = this.game.houses.get(data.house);

                return <>
                    <strong>Skinchanger Scout</strong>: <strong>{house.name}</strong> gets
                    back <strong>{data.powerToken}</strong> Power tokens.
                </>;

            case "skinchanger-scout-wildling-victory":
                house = this.game.houses.get(data.house);
                const powerTokensLost = data.powerTokensLost.map(([hid, amount]) => [this.game.houses.get(hid), amount] as [House, number]);

                return <>
                    <p>
                        <strong>Skinchanger Scout</strong>: <strong>{house.name}</strong> lost all of their Power
                        tokens, all other houses lost 2 Power tokens.
                    </p>
                    <ul>
                        {powerTokensLost.map(([house, amount]) => (
                            <li key={house.id}><strong>{house.name}</strong> lost <strong>{amount}</strong> Power tokens.</li>
                        ))}
                    </ul>
                </>;

            case "rattleshirts-raiders-nights-watch-victory":
                house = this.game.houses.get(data.house);

                return <>
                    <strong>Rattleshirt&apos;s Raiders</strong>: <strong>{house.name}</strong> gained one level of supply,
                    and is now at <strong>{data.newSupply}</strong>.
                </>;

            case "rattleshirts-raiders-wildling-victory":
                lowestBidder = this.game.houses.get(data.lowestBidder);
                const newSupply = data.newSupply.map(([hid, supply]) => [this.game.houses.get(hid), supply] as [House, number]);

                return <>
                    <strong>Rattleshirt&apos;s Raiders</strong>: <strong>{lowestBidder.name}</strong> lost 2 levels of supply,
                    all other houses lost 1 levels of supply.
                    <ul>
                        {newSupply.map(([house, supply]) => (
                            <li key={house.id}><strong>{house.name}</strong> is now at <strong>{supply}</strong>.</li>
                        ))}
                    </ul>
                </>;

            case "game-of-thrones-power-tokens-gained":
                const gains = data.gains.map(([hid, gain]) => [this.game.houses.get(hid), gain] as [House, number]);

                return <>
                    <ul>
                        {gains.map(([house, gain]) => (
                            <li key={house.id}><strong>{house.name}</strong> gained <strong>{gain}</strong> Power tokens.</li>
                        ))}
                    </ul>
                </>;
            case "immediatly-killed-after-combat": {
                const house = this.game.houses.get(data.house);
                const killedBecauseWounded = data.killedBecauseWounded.map(utid => unitTypes.get(utid).name);
                const killedBecauseCantRetreat = data.killedBecauseCantRetreat.map(utid => unitTypes.get(utid).name);
                return <>
                    {killedBecauseWounded.length > 0 && (<><strong>{house.name}</strong> suffered battle casualties because these units were wounded: <>{joinReactNodes(killedBecauseWounded.map((unitType, i) => <strong key={i}>{unitType}</strong>), ', ')}</>.</>)}
                    {killedBecauseCantRetreat.length > 0 && (<><strong>{house.name}</strong> suffered battle casualties because these units can&apos;t retreat: <>{joinReactNodes(killedBecauseCantRetreat.map((unitType, i) => <strong key={i}>{unitType}</strong>), ', ')}</>.</>)}
                </>;
            }
            case "killed-after-combat": {
                const house = this.game.houses.get(data.house);
                const killed = data.killed.map(utid => unitTypes.get(utid).name);
                return <>
                    <strong>{house.name}</strong> suffered battle casualties and chose these units to be killed: <>{joinReactNodes(killed.map((unitType, i) => <strong key={i}>{unitType}</strong>), ', ')}</>.
                </>;
            }
            case "supply-adjusted":
                const supplies: [House, number][] = data.supplies.map(([hid, supply]) => [this.game.houses.get(hid), supply]);

                return (
                <>
                    Supply levels have been adjusted:
                    <table cellPadding="5">
                        {supplies.map(([house, supply]) => (
                            <tr key={house.id}>
                                <td>{house.name}</td>
                                <td>{supply}</td>
                            </tr>))}
                    </table>
                </>);
            case "player-replaced":
                const oldUser = this.props.ingameGameState.entireGame.users.get(data.oldUser);
                const newUser = this.props.ingameGameState.entireGame.users.get(data.newUser);
                house = this.game.houses.get(data.house);

                return (
                    <>
                        <b>{oldUser.name}</b> (<b>{house.name}</b>) was replaced by <b>{newUser.name}</b>.
                    </>
                );
        }
    }
}
