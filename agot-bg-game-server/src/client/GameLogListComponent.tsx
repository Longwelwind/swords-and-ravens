import {Component, ReactNode} from "react";
import React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import {GameLogData, PlayerActionType} from "../common/ingame-game-state/game-data-structure/GameLog";
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
import User from "../server/User";
import { baseHouseCardsData, adwdHouseCardsData, ffcHouseCardsData, modAHouseCardsData, modBHouseCardsData , HouseCardData } from "../common/ingame-game-state/game-data-structure/createGame";
import HouseCard from "../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import houseCardAbilities from "../common/ingame-game-state/game-data-structure/house-card/houseCardAbilities";
import BetterMap from "../utils/BetterMap";
import { tidesOfBattleCards } from "../common/ingame-game-state/game-data-structure/static-data-structure/tidesOfBattleCards";
import HouseNumberResultsComponent from "./HouseNumberResultsComponent";
import SimpleInfluenceIconComponent from "./game-state-panel/utils/SimpleInfluenceIconComponent";

interface GameLogListComponentProps {
    ingameGameState: IngameGameState;
}

@observer
export default class GameLogListComponent extends Component<GameLogListComponentProps> {
    allHouseCards = new BetterMap(this.getAllHouseCards());

    get game(): Game {
        return this.props.ingameGameState.game;
    }

    get world(): World {
        return this.game.world;
    }

    createHouseCards(data: [string, HouseCardData][]): [string, HouseCard][] {
        return data.map(([houseCardId, houseCardData]) => {
            const houseCard = new HouseCard(
                houseCardId,
                houseCardData.name,
                houseCardData.combatStrength ? houseCardData.combatStrength : 0,
                houseCardData.swordIcons ? houseCardData.swordIcons : 0,
                houseCardData.towerIcons ? houseCardData.towerIcons : 0,
                houseCardData.ability ? houseCardAbilities.get(houseCardData.ability) : null
            );

            return [houseCardId, houseCard];
        });
    }

    getAllHouseCards(): [string, HouseCard][] {
        return _.concat(
            this.createHouseCards(baseHouseCardsData),
            this.createHouseCards(adwdHouseCardsData),
            this.createHouseCards(ffcHouseCardsData),
            this.createHouseCards(modAHouseCardsData),
            this.createHouseCards(modBHouseCardsData),
            this.game.vassalHouseCards.entries);
    }

    render(): ReactNode {
        return this.props.ingameGameState.gameLogManager.logs.map((l, i) => (
            <Row key={`log_${i}`}>
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
            case "player-action": {
                const house = this.game.houses.get(data.house);
                let text: string;

                switch(data.action) {
                    case PlayerActionType.ORDERS_PLACED:
                        text = "placed their orders.";
                        break;
                    case PlayerActionType.BID_MADE:
                        text = "made their bid.";
                        break;
                    case PlayerActionType.HOUSE_CARD_CHOSEN:
                        text = "has chosen their house card.";
                        break;
                    default:
                        text = "Invalid PlayerActionType received."
                        break;
                }
                return <p>
                    House <b>{house.name}</b> {text}
                </p>;
            }
            case "user-house-assignments":
                const assignments = data.assignments.map(([houseId, userId]) =>
                    [this.game.houses.get(houseId), this.props.ingameGameState.entireGame.users.get(userId)]) as [House, User][];
                return <>
                    <div className="text-center"><h5>The fight for the Iron Throne has begun!</h5></div>
                    {assignments.map(([house, user]) =>
                        <p  key={`${house.id}_${user.id}`}>House <b>{house.name}</b> is controlled by <b>{user.name}</b>.</p>
                    )}
                </>;
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
                    return <p><b>{supporter.name}</b> supported <b>{supported.name}</b>.</p>;
                } else {
                    return <p><b>{supporter.name}</b> supported no-one.</p>;
                }

            case "support-refused": {
                const house = this.game.houses.get(data.house);
                return <p>House <b>{house.name}</b> chose to refuse all the support they received.</p>;
            }

            case "attack":
                const attacker = this.game.houses.get(data.attacker);
                // A "null" for "attacked" means it was an attack against a neutral force
                const attacked = data.attacked ? this.game.houses.get(data.attacked) : null;
                const attackingRegion = this.game.world.regions.get(data.attackingRegion);
                const attackedRegion = this.game.world.regions.get(data.attackedRegion);
                const army = data.units.map(utid => unitTypes.get(utid));

                return (
                    <p>
                        <b>{attacker.name}</b> attacked <b>{attacked ? attacked.name : "a neutral force"}</b> from <b>{attackingRegion.name}</b> to <b>
                        {attackedRegion.name}</b> with <>{joinReactNodes(army.map((ut, i) => <b key={`attack_${ut.id}_${i}`}>{ut.name}</b>), ', ')}</>.
                    </p>
                );

            case "march-resolved": {
                const house = this.game.houses.get(data.house);
                const startingRegion = this.world.regions.get(data.startingRegion);
                const moves: [Region, UnitType[]][] = data.moves.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))]);

                return (
                    <>
                        <p>
                            <b>{house.name}</b> marched from <b>{startingRegion.name}</b>{
                                data.leftPowerToken != null && <> and left {data.leftPowerToken ? "a" : "no"} Power Token</>}{moves.length > 0 ? ":" : "."}
                        </p>
                        {moves.length > 0 &&
                        <ul>
                            {moves.map(([region, unitTypes]) => (
                                <li key={region.id}>
                                    {joinReactNodes(unitTypes.map((ut, i) => <b key={`march_${ut.id}_${i}`}>{ut.name}</b>), ", ")} to <b>{region.name}</b>
                                </li>
                            ))}
                        </ul>}
                    </>
                );
            }
            case "westeros-card-executed":
                const westerosCardType = westerosCardTypes.get(data.westerosCardType);

                return (
                    <>
                        <Row className="justify-content-center">
                            <Col xs="auto">
                                <WesterosCardComponent cardType={westerosCardType} size="medium" tooltip={true} westerosDeckI={data.westerosDeckI} showTitle={true}/>
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
                                <Col xs="auto" key={`${wct.id}_${i}`}>
                                    <WesterosCardComponent cardType={wct} size="small" tooltip={true} westerosDeckI={i} showTitle={true}/>
                                </Col>
                            ))}
                        </Row>
                        {data.addedWildlingStrength > 0 && (
                            <p style={{marginTop: "1.0em"}}>Wildling Threat increased by {data.addedWildlingStrength}</p>
                        )}
                    </>
                );

            case "combat-result":
                const winner = this.game.houses.get(data.winner);
                const houseCombatDatas = data.stats.map(stat => {
                    const house = this.game.houses.get(stat.house);
                    const houseCard = stat.houseCard != null ? this.allHouseCards.get(stat.houseCard) : null;
                    const tidesOfBattleCard = stat.tidesOfBattleCard === undefined ? undefined : stat.tidesOfBattleCard != null ? tidesOfBattleCards.get(stat.tidesOfBattleCard) : null;

                    return {
                        ...stat,
                        house,
                        region: this.world.regions.get(stat.region),
                        houseCard: houseCard,
                        armyUnits: stat.armyUnits.map(ut => unitTypes.get(ut)),
                        tidesOfBattleCard: tidesOfBattleCard,
                        isWinner: house == winner
                    };
                });

                return (
                    <>
                        <p>Combat result</p>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <CombatInfoComponent housesCombatData={houseCombatDatas} />
                        </div>
                        <p className="text-center mt-4"><b style={{color: winner.color}}>{winner.name}</b> won the battle!</p>
                    </>
                );
            case "wildling-card-revealed":
                const wildlingCard = this.game.wildlingDeck.find(wc => wc.id == data.wildlingCard) as WildlingCard;

                return (
                    <>
                        <p>Wildling card revealed: <b>{wildlingCard.type.name}</b></p>
                        <Row className="justify-content-center">
                            <Col xs="auto">
                                <WildlingCardComponent cardType={wildlingCard.type} size="medium" tooltip={true} placement="auto"/>
                            </Col>
                        </Row>
                    </>
                );
            case "wildling-bidding": {
                const bids = _.flatMap(data.results.map(([bid, hids]) => hids.map(hid => [this.game.houses.get(hid), bid] as [House, number])));

                return (
                    <>
                        <p>Wildling bidding results for Wildling Threat <b>{data.wildlingStrength}</b>:</p>
                        <div className="mt-1"><HouseNumberResultsComponent results={bids} key="wildlings"></HouseNumberResultsComponent></div>
                        {data.nightsWatchVictory ? (
                            <p>The <b>Night&apos;s Watch</b> won!</p>
                        ) : (
                            <p>The <b>Wildlings</b> won!</p>
                        )}
                    </>
                );
            }
            case "lowest-bidder-chosen": {
                const lowestBidder = this.game.houses.get(data.lowestBidder);

                return (
                    <p>
                        <b>{lowestBidder.name}</b> was chosen as the lowest bidder.
                    </p>
                );
            }
            case "highest-bidder-chosen":
                const highestBidder = this.game.houses.get(data.highestBidder);

                return (
                    <p>
                        <b>{highestBidder.name}</b> was chosen as the highest bidder.
                    </p>
                );

            case "player-mustered": {
                const house = this.game.houses.get(data.house);
                const musterings = data.musterings.map(([originatingRegion, recruitments]) =>
                    [this.game.world.regions.get(originatingRegion), recruitments.map(({region, from, to}) => ({
                        region: this.game.world.regions.get(region),
                        from: from ? unitTypes.get(from) : null,
                        to: unitTypes.get(to)
                    }))] as [Region, {region: Region; from: UnitType | null; to: UnitType}[]]
                );

                return (
                    <>
                        {musterings.length == 0 && (
                            <p>
                                <b>{house.name}</b> mustered nothing.
                            </p>
                        )}
                        {musterings.length > 0 && (
                            <>
                                {musterings.map(([originatingRegion, recruitments]) => (
                                    <div key={`$mustering_${originatingRegion.id}`}>
                                        <p>
                                            <b>{house.name}</b> mustered in <b>{originatingRegion.name}</b>
                                        </p>
                                        <ul>
                                            {recruitments.map(({ region, from, to }, i) => (
                                                <li key={"recruitment-" + region.id + "-" + i}>
                                                    {from ? (
                                                        <>
                                                            A <b>{to.name}</b> from a <b>{from.name}</b>{originatingRegion != region && (<> to <b>{region.name}</b></>)}
                                                        </>
                                                    ) : (
                                                            <>A <b>{to.name}</b>{originatingRegion != region && (<> to <b>{region.name}</b></>)}</>
                                                        )}
                                                </li>
                                            ))}
                                         </ul>
                                    </div>)
                                )}
                            </>
                        )}
                    </>
                );
            }
            case "winner-declared":
                return (
                    <p>Game ended.</p>
                );

            case "raven-holder-wildling-card-put-bottom": {
                const house = this.game.houses.get(data.ravenHolder);

                return (
                    <p>
                        <b>{house.name}</b>, holder of the Messenger Raven token, chose to look at the top
                        card of the Wildling deck and to move it at the bottom of the deck.
                    </p>
                );
            }
            case "raven-holder-wildling-card-put-top": {
                const house = this.game.houses.get(data.ravenHolder);

                return (
                    <p>
                        <b>{house.name}</b>, holder of the Messenger Raven token, chose to look at the top
                        card of the Wildling deck and to leave it at the top of the deck.
                    </p>
                );
            }
            case "raven-holder-replace-order": {
                const house = this.game.houses.get(data.ravenHolder);
                const orderRegion = this.world.regions.get(data.region);
                const originalOrder = orders.get(data.originalOrder);
                const newOrder = orders.get(data.newOrder);

                return (
                    <p>
                        <b>{house.name}</b>, holder of the Messenger Raven token, chose to replace
                        a <b>{originalOrder.type.name} Order</b> with a <b>{newOrder.type.name} Order
                        </b> in <b>{orderRegion.name}</b>.
                    </p>
                );
            }
            case "raven-not-used":{
                const house = this.game.houses.get(data.ravenHolder);

                return <p><b>{house.name}</b> did not use the Messenger Raven token.</p>;
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
                                <b>{raider.name}</b> raided <b>{raidee.name}</b>&apos;s <b>{orderRaided.type.name} Order
                                </b> in <b>{raidedRegion.name}</b> from <b>{raiderRegion.name}</b>.
                            </p>
                            {data.raiderGainedPowerToken &&
                                <p><b>{raider.name}</b> gained {data.raiderGainedPowerToken ? "a" : "no"} Power Token
                                    from this raid.</p>}
                            {data.raidedHouseLostPowerToken != null
                                && <p><b>{raidee.name}</b> lost {data.raidedHouseLostPowerToken ? "a" : "no"} Power Token
                                    from this raid.</p>}
                        </>
                    );
                } else {
                    return (
                        <p>
                            <b>{raider.name}</b> raided nothing from <b>{raiderRegion.name}</b>.
                        </p>
                    );
                }

            case "a-throne-of-blades-choice": {
                const house = this.game.houses.get(data.house);

                return (
                    <p>
                        <b>{house.name}</b>, holder of the Iron Throne token, chose to
                        {data.choice == 0 ? (
                            <> trigger a Mustering.</>
                        ) : data.choice == 1 ? (
                            <> trigger a Supply.</>
                        ) : (
                            <> trigger nothing.</>
                        )}
                    </p>
                );
            }
            case "dark-wings-dark-words-choice": {
                const house = this.game.houses.get(data.house);

                return (
                    <p>
                        <b>{house.name}</b>, holder of the Messenger Raven token, chose to
                        {data.choice == 0 ? (
                            <> trigger a Clash of Kings.</>
                        ) : data.choice == 1 ? (
                            <> trigger a Game of Thrones.</>
                        ) : (
                            <> trigger nothing.</>
                        )}
                    </p>
                );
            }
            case "put-to-the-sword-choice": {
                const house = this.game.houses.get(data.house);

                return (
                    <p>
                        <b>{house.name}</b>, holder of the Valyrian Steel Blade token, chose to
                        {data.choice == 0 ? (
                            <> forbid <b>March +1</b> Orders from being played during this Planning Phase.</>
                        ) : data.choice == 1 ? (
                            <> forbid <b>Defense</b> Orders from being played during this Planning Phase.</>
                        ) : (
                            <> forbid nothing.</>
                        )}
                    </p>
                );
            }
            case "winter-is-coming":
                const drawnCardType = westerosCardTypes.get(data.drawnCardType);

                return <p>
                    <b>Winter is Coming</b>: The Westeros deck {data.deckIndex + 1} was shuffled and the new Westeros card drawn
                    is <b>{drawnCardType.name}</b>.
                </p>;

            case "westeros-phase-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h5><b>Westeros Phase</b></h5>
                    </Col>
                </Row>;

            case "claim-vassals-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h5><b>Claim Vassals</b></h5>
                    </Col>
                </Row>;

            case "planning-phase-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h5><b>{data.forVassals && "Vassal "}Planning Phase</b></h5>
                    </Col>
                </Row>;

            case "draft-house-cards-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h5><b>Draft house cards</b></h5>
                    </Col>
                </Row>;

            case "house-card-picked": {
                const house = this.game.houses.get(data.house);
                const houseCard = this.allHouseCards.get(data.houseCard);
                return <>
                    <p><b>{house.name}</b> picked <b>{houseCard.name}</b></p>
                </>;
            }

            case "action-phase-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h5><b>Action Phase</b></h5>
                    </Col>
                </Row>;

            case "action-phase-resolve-raid-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h6><b>Resolve Raid Orders</b></h6>
                    </Col>
                </Row>;

            case "action-phase-resolve-march-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h6><b>Resolve March Orders</b></h6>
                    </Col>
                </Row>;

            case "action-phase-resolve-consolidate-power-began":
                return <Row className="justify-content-center">
                    <Col xs="auto">
                        <h6><b>Resolve Consolidate Power Orders</b></h6>
                    </Col>
                </Row>;

            case "combat-valyrian-sword-used": {
                const house = this.game.houses.get(data.house);

                return <p><b>{house.name}</b> used the <b>Valyrian Steel Blade</b> to {data.forNewTidesOfBattleCard
                    ? "draw a new Tides of Battle card" : "increase their combat strength by 1"}.</p>;
            }
            case "combat-house-card-chosen":
                const houseCards = data.houseCards.map(([hid, hcid]) => {
                    const house = this.game.houses.get(hid);
                    const houseCard = this.allHouseCards.get(hcid);
                    return [house, houseCard];
                });

                return <>
                    <p>House cards were chosen:</p>
                    <ul>
                        {houseCards.map(([h, hc]) => (
                            <li key={`housecard_${h.id}_${hc.id}`}><b>{h.name}</b> chose <b>{hc.name}</b></li>
                        ))}
                    </ul>
                </>;

            case "clash-of-kings-final-ordering":
                const finalOrder = data.finalOrder.map(hid => this.game.houses.get(hid));

                return <>
                    <p>
                        Final order of <b>{this.game.getNameInfluenceTrack(data.trackerI)}</b> track:
                    </p>
                    <Row className="mb-2 mt-1">
                        {finalOrder.map(h => <Col xs="auto" key={`cok_final_${h.id}`}><SimpleInfluenceIconComponent house={h}/></Col>)}
                    </Row>
                </>;

            case "clash-of-kings-bidding-done": {
                const bids = _.flatMap(data.results.map(([bid, hids]) => hids.map(hid => [this.game.houses.get(hid), bid] as [House, number])));

                return <>
                    <p>
                        Houses bid for <b>{this.game.getNameInfluenceTrack(data.trackerI)}</b> track:
                    </p>
                    <Row className="mb-1 mt-2">
                        <HouseNumberResultsComponent results={bids} key={`cok_${data.trackerI}`}/>
                    </Row>
                </>;
            }
            case "wildling-strength-trigger-wildlings-attack":
                return <p>
                    <b>Wildling Threat</b> reached <b>{data.wildlingStrength}</b>, triggering a <b>Wildling Attack</b>
                </p>;

            case "march-order-removed": {
                const house = this.game.houses.get(data.house);
                const region = this.game.world.regions.get(data.region);

                return <p>
                    <b>{house.name}</b> removed their March Order in <b>{region.name}</b>.
                </p>;
            }
            case "consolidate-power-order-resolved": {
                const house = this.game.houses.get(data.house);
                const region = this.world.regions.get(data.region);
                const countPowerToken = data.powerTokenCount;

                return <p>
                    <b>{house.name}</b> resolved a {data.starred && "Special "}Consolidate Power Order
                    in <b>{region.name}</b> to gain <b>{countPowerToken}</b> Power token{countPowerToken > 1 && "s"}.
                </p>;
            }
            case "armies-reconciled": {
                const house = this.game.houses.get(data.house);
                const armies = data.armies.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))] as [Region, UnitType[]]);

                return <>
                    <p>
                        <b>{house.name}</b> reconciled their armies by removing:
                    </p>
                    <ul>
                        {armies.map(([region, unitTypes]) => (
                            <li key={`reconciling_${region.id}`}>{region.name}: {joinReactNodes(unitTypes.map((ut, i) => <b key={`${region.id}_${ut.id}_${i}`}>{ut.name}</b>), ", ")}</li>
                        ))}
                    </ul>
                </>;
            }
            case "house-card-ability-not-used": {
                const house = this.game.houses.get(data.house);
                const houseCard = this.allHouseCards.get(data.houseCard);

                return <p>
                    <b>{house.name}</b> did not use <b>{houseCard.name}&apos;s</b> ability.
                </p>;
            }
            case "patchface-used": {
                const house = this.game.houses.get(data.house);
                const affectedHouse = this.game.houses.get(data.affectedHouse);
                const houseCard = this.allHouseCards.get(data.houseCard);
                return <p>
                    <b>Patchface</b>: <b>{house.name}</b> decided to discard <b>
                        {houseCard.name}</b> from house <b>{affectedHouse.name}</b>.
                </p>;
            }
            case "melisandre-dwd-used": {
                const house = this.game.houses.get(data.house);
                const houseCard = this.allHouseCards.get(data.houseCard);
                return <p>
                   <b>Melisandre</b>: <b>{house.name}</b> decided to return <b>
                        {houseCard.name}</b> card to hand.
                </p>;
            }
            case "jon-snow-used": {
                const house = this.game.houses.get(data.house);
                let wilddlingStatus = "increase";
                if (data.wildlingsStrength < 0) {
                    wilddlingStatus = "decrease";
                }
                return <p>
                    <b>Jon Snow</b>: <b>{house.name}</b> decided to  <b>
                        {wilddlingStatus} </b> the Wildling track by one space.
                </p>;
            }
            case "doran-used": {
                const house = this.game.houses.get(data.house);
                const affectedHouse = this.game.houses.get(data.affectedHouse);
                const influenceTrack = this.game.getNameInfluenceTrack(data.influenceTrack);

                return <p>
                    <b>Doran Martell</b>: <b>{house.name}</b> decided to move <b>
                        {affectedHouse.name}</b> to the bottom of the <b>{influenceTrack}</b> track.
                </p>;
            }
            case "ser-gerris-drinkwater-used": {
                const house = this.game.houses.get(data.house);
                const influenceTrack = this.game.getNameInfluenceTrack(data.influenceTrack);

                return <p>
                    <b>Ser Gerris Drinkwater</b>: <b>{house.name}</b> decided to increase his position on <b>
                        {influenceTrack}</b> track.
                </p>;
            }
            case "qyburn-used": {
                const house = this.game.houses.get(data.house);
                const houseCard = this.allHouseCards.get(data.houseCard);

                return <p>
                    <b>Qyburn</b>: <b>{house.name}</b> decided to use the combat strength <b>{houseCard.combatStrength}</b> from <b>{houseCard.name}</b>.
                </p>;
            }
            case "aeron-damphair-used": {
                const house = this.game.houses.get(data.house);
                const tokens = data.tokens;

                return <p>
                    <b>Aeron Damphair</b>: <b>{house.name}</b> decided to increase
                        the combat strength of this card by <b>{tokens}</b>.
                </p>;
            }
            case "rodrik-the-reader-used":  {
                const house = this.game.houses.get(data.house);

                return <p>
                    <b>Rodrik the Reader</b>: <b>{house.name}</b> decided to choose
                        a card from Westeros Deck <b>{data.westerosDeckI + 1}</b>.
                </p>;
            }
            case "tyrion-lannister-choice-made": {
                const house = this.game.houses.get(data.house);
                const affectedHouse = this.game.houses.get(data.affectedHouse);
                const chooseToReplace = data.chooseToReplace;

                return <p>
                    <b>Tyrion Lannister</b>: <b>{house.name}</b> {!chooseToReplace && "didn't "}force{chooseToReplace && "d"} <b>
                        {affectedHouse.name}</b> to choose a new House card.
                </p>;
            }
            case "tyrion-lannister-house-card-replaced": {
                const affectedHouse = this.game.houses.get(data.affectedHouse);
                const newHouseCard = data.newHouseCard ? this.allHouseCards.get(data.newHouseCard) : null;

                return newHouseCard ? (
                    <p><b>{affectedHouse.name}</b> chose <b>{newHouseCard.name}.</b></p>
                ) : (
                    <p><b>{affectedHouse.name}</b> had no other available House card.</p>
                );
            }
            case "arianne-martell-prevent-movement":
                const enemyHouse = this.game.houses.get(data.enemyHouse);

                return <p>
                    <b>Arianne Martell</b>: <b>{enemyHouse.name}</b> cannot move their attacking
                    army to the embattled area.
                </p>;

            case "roose-bolton-house-cards-returned": {
                const house = this.game.houses.get(data.house);
                const returnedHouseCards = data.houseCards.map(hcid => this.allHouseCards.get(hcid));

                return <p>
                    <b>Roose Bolton</b>: <b>{house.name}</b> took back all discarded House
                    cards ({joinReactNodes(returnedHouseCards.map(hc => <b key={`roose_${hc.id}`}>{hc.name}</b>), ", ")}).
                </p>;
            }
            case "loras-tyrell-attack-order-moved":
                const order = orders.get(data.order);
                const embattledRegion = this.world.regions.get(data.region);

                return <p>
                    <b>Loras Tyrell</b>: The <b>{order.type.name}</b> Order was moved
                    to <b>{embattledRegion.name}</b>.
                </p>;

            case "queen-of-thorns-no-order-available": {
                const affectedHouse = this.game.houses.get(data.affectedHouse);

                return <p>
                    <b>Queen of Thorns</b>: <b>{affectedHouse.name}</b> had no adjacent Order tokens.
                </p>;
            }
            case "queen-of-thorns-order-removed": {
                const house = this.game.houses.get(data.house);
                const affectedHouse = this.game.houses.get(data.affectedHouse);
                const region = this.world.regions.get(data.region);
                const removedOrder = orders.get(data.orderRemoved);

                return <p>
                    <b>Queen of Thorns</b>: <b>{house.name}</b> removed
                    a <b>{removedOrder.type.name}</b> Order of <b>{affectedHouse.name}</b> in <b>{region.name}</b>.
                </p>;
            }
            case "tywin-lannister-power-tokens-gained": {
                const house = this.game.houses.get(data.house);
                const powerTokensGained = data.powerTokensGained;

                return <p>
                    <b>Tywin Lannister</b>: <b>{house.name}</b> gained {powerTokensGained} Power
                    tokens.
                </p>;
            }
            case "qarl-the-maid-tokens-gained": {
                const house = this.game.houses.get(data.house);
                const powerTokensGained = data.powerTokensGained;

                return <p>
                    <b>Qarl the Maid</b>: <b>{house.name}</b> gained {powerTokensGained} Power tokens.
                </p>;
            }
            case "renly-baratheon-no-knight-available": {
                const house = this.game.houses.get(data.house);

                return <p>
                    <b>Renly Baratheon</b>: <b>{house.name}</b> had no available Knight to upgrade to.
                </p>;
            }
            case "renly-baratheon-no-footman-available": {
                const house = this.game.houses.get(data.house);

                return <p>
                    <b>Renly Baratheon</b>: <b>{house.name}</b> had no available Footman to upgrade.
                </p>;
            }
            case "renly-baratheon-footman-upgraded-to-knight": {
                const house = this.game.houses.get(data.house);
                const region = this.world.regions.get(data.region);

                return <p>
                    <b>Renly Baratheon</b>: <b>{house.name}</b> upgraded a Footman to a Knight
                    in <b>{region.name}</b>.
                </p>;
            }
            case "mace-tyrell-casualties-prevented": {
                return <p>
                    <b>Mace Tyrell</b>: Casualties were prevented by <b>The Blackfish</b>.
                </p>;
            }
            case "mace-tyrell-no-footman-available":
                return <p>
                    <b>Mace Tyrell</b>: No enemy Footman was available to be killed.
                </p>;

            case "mace-tyrell-footman-killed": {
                const house = this.game.houses.get(data.house);
                const region = this.world.regions.get(data.region);

                return <p>
                    <b>Mace Tyrell</b>: <b>{house.name}</b> killed an enemy Footman
                    in <b>{region.name}</b>.
                </p>;
            }
            case "ser-ilyn-payne-footman-killed": {
                const house = this.game.houses.get(data.house);
                const region = this.world.regions.get(data.region);

                return <p>
                    <b>Ser Ilyn Payne</b>: <b>{house.name}</b> killed an enemy Footman
                    in <b>{region.name}</b>.
                </p>;
            }
            case "cersei-lannister-no-order-available":
                return <p>
                    <b>Cersei Lannister</b>: There were no Order tokens to be removed.
                </p>;

            case "cersei-lannister-order-removed": {
                const house = this.game.houses.get(data.house);
                const affectedHouse = this.game.houses.get(data.affectedHouse);
                const region = this.world.regions.get(data.region);
                const removedOrder = orders.get(data.order);

                return <p>
                    <b>Cersei Lannister</b>: <b>{house.name}</b> removed
                    a <b>{removedOrder.type.name}</b> Order
                    of <b>{affectedHouse.name}</b> in <b>{region.name}</b>.
                </p>;
            }
            case "robb-stark-retreat-location-overriden": {
                const house = this.game.houses.get(data.house);
                const affectedHouse = this.game.houses.get(data.affectedHouse);

                return <p>
                    <b>Robb Stark</b>: <b>{house.name}</b> chose the retreat location of the
                    retreating army of <b>{affectedHouse.name}</b>.
                </p>;
            }
            case "retreat-region-chosen": {
                const house = this.game.houses.get(data.house);
                const regionFrom = this.game.world.regions.get(data.regionFrom);
                const regionTo = this.game.world.regions.get(data.regionTo);
                return <p>
                        <b>{house.name}</b> retreats from <b>
                        {regionFrom.name}</b> to <b>{regionTo.name}</b>.
                </p>;
            }
            case "retreat-failed": {
                const house = this.game.houses.get(data.house);
                const region = this.world.regions.get(data.region);

                return <p>{
                    data.isAttacker ?
                        <><b>{house.name}</b> was not able to retreat to <b>{region.name}</b>.</>   :
                        <><b>{house.name}</b> was not able to retreat from <b>{region.name}</b>.</>
                }</p>;
            }
            case "retreat-casualties-suffered": {
                const house = this.game.houses.get(data.house);
                const units = data.units.map(ut => unitTypes.get(ut).name);
                return <p>
                    <p><b>{house.name}</b> suffered casualties from the retreat: <>{joinReactNodes(units.map((unitType, i) => <b key={`retreat_${unitType}_${i}`}>{unitType}</b>), ', ')}</>.</p>
                </p>;
            }
            case "enemy-port-taken": {
                const newController = this.game.houses.get(data.newController);
                const oldController = this.game.houses.get(data.oldController);
                const port = this.world.regions.get(data.port);
                return <p>
                    {data.shipCount > 0
                        ? <><b>{newController.name}</b> converted {data.shipCount} ship{data.shipCount == 1 ? "" : "s"} from <b>{oldController.name}</b> in <b>{port.name}</b>.</>
                        : <><b>{newController.name}</b> destroyed all <b>{oldController.name}</b> ships in <b>{port.name}</b>.</>}
                </p>;
            }
            case "ships-destroyed-by-empty-castle": {
                const house = this.game.houses.get(data.house);
                const port = this.game.world.regions.get(data.port);
                const castle = this.game.world.regions.get(data.castle);
                return <p>
                    <><b>{house.name}</b> lost {data.shipCount} Ship{data.shipCount>1?"s":""} in <b>{port.name}</b> because <b>{castle.name}</b> is empty now.</>
                </p>;
            }
            case "silence-at-the-wall-executed":
                return <p><b>Silence at the Wall</b>: Nothing happened.</p>;

            case "preemptive-raid-choice-done": {
                const house = this.game.houses.get(data.house);

                if (data.choice == 0) {
                    return <p>
                        <b>Preemptive Raid</b>: <b>{house.name}</b> chose to kill 2 of their
                        units.
                    </p>;
                } else {
                    return <p>
                        <b>Preemptive Raid</b>: <b>{house.name}</b> chose to reduce 2 positions
                        on their highest Influence track.
                    </p>;
                }
            }
            case "preemptive-raid-track-reduced": {
                const chooser = data.chooser ? this.game.houses.get(data.chooser) : null;
                const house = this.game.houses.get(data.house);
                const trackName = this.game.getNameInfluenceTrack(data.trackI);

                if (chooser == null) {
                    return <p>
                        <b>{house.name}</b> was reduced 2 positions on the <b>{trackName}</b> track.
                    </p>;
                } else {
                    return <p>
                        <b>{chooser.name}</b> chose to reduce <b>{house.name}</b> 2 positions
                        on the <b>{trackName}</b> track.
                    </p>;
                }
            }
            case "preemptive-raid-units-killed": {
                const house = this.game.houses.get(data.house);
                const units = data.units.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))] as [Region, UnitType[]]);

                return <p>
                    <b>{house.name}</b>{units.length > 0 ? (<> chose to
                    destroy {joinReactNodes(units.map(([region, unitTypes]) => <span key={`preemptive_${region.id}`}>{joinReactNodes(unitTypes.map((ut, i) => <b key={`preemptive_${ut.id}_${i}`}>{ut.name}</b>), ", ")} in <b>{region.name}</b></span>), " and ")}.</>)
                    : <> had no units to destroy.</>}
                </p>;
            }
            case "preemptive-raid-wildlings-attack": {
                const house = this.game.houses.get(data.house);

                return <p>
                    <b>Preemptive Raid</b>: A new Wildlings Attack with
                    strength <b>{data.wildlingStrength}</b> was triggered
                    where <b>{house.name}</b> will not be participating.
                </p>;
            }
            case "massing-on-the-milkwater-house-cards-back": {
                const house = this.game.houses.get(data.house);
                const houseCardsReturned = data.houseCardsReturned.map(hcid => this.allHouseCards.get(hcid));

                return <p>
                    <b>Massing on the Milkwater</b>: <b>{house.name}</b> took
                    back {joinReactNodes(houseCardsReturned.map(hc => <b key={`massing-on-the-milkwater-cards-back_${hc.id}`}>{hc.name}</b>), ", ")}
                </p>;
            }
            case "massing-on-the-milkwater-wildling-victory": {
                const lowestBidder = this.game.houses.get(data.lowestBidder);

                return <p>
                    <b>Massing on the Milkwater</b>: <b>{lowestBidder.name}</b> discards all House
                    cards with the highest combat strength, all other houses must discard one House card.
                </p>;
            }
            case "massing-on-the-milkwater-house-cards-removed": {
                const house = this.game.houses.get(data.house);
                const houseCardsUsed = data.houseCardsUsed.map(hcid => this.allHouseCards.get(hcid));

                return <p>
                    {houseCardsUsed.length > 0
                        ? <><b>{house.name}</b> discarded {joinReactNodes(houseCardsUsed.map(hc => <b key={`massing-on-the-milkwater-cards-removed_${hc.id}`}>{hc.name}</b>), ", ")}.</>
                        : <><b>{house.name}</b> did not discard a House card.</>}
                </p>;
            }
            case "a-king-beyond-the-wall-highest-top-track": {
                const house = this.game.houses.get(data.house);
                const trackName = this.game.getNameInfluenceTrack(data.trackI);

                return <p>
                    <b>A King Beyond the Wall</b>: <b>{house.name}</b> chose to move at the top
                    of the <b>{trackName}</b> track.
                </p>;
            }
            case "a-king-beyond-the-wall-lowest-reduce-tracks":
                const lowestBidder = this.game.houses.get(data.lowestBidder);

                return <p>
                    <b>A King Beyond the Wall</b>: <b>{lowestBidder.name}</b> was moved to the
                    bottom of all influence tracks.
                </p>;

            case "a-king-beyond-the-wall-house-reduce-track": {
                const house = this.game.houses.get(data.house);
                const trackName = this.game.getNameInfluenceTrack(data.trackI);

                return <p>
                    <b>A King Beyond the Wall</b>: <b>{house.name}</b> chose to move at the bottom
                    of the <b>{trackName}</b> influence track.
                </p>;
            }
            case "mammoth-riders-destroy-units": {
                const house = this.game.houses.get(data.house);
                const units = data.units.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))]) as [Region, UnitType[]][];

                return <p>
                    <b>Mammoth Riders</b>: <b>{house.name}</b>{units.length > 0 ? (<> chose to
                    destroy {joinReactNodes(units.map(([region, unitTypes]) => <span key={`mammoth-riders_${region.id}`}>{joinReactNodes(unitTypes.map((ut, i) => <b key={`mammoth-riders_${ut.id}_${i}`}>{ut.name}</b>), ", ")} in <b>{region.name}</b></span>), ", ")}.</>)
                    : <> had no units to destroy.</>}
                </p>;
            }
            case "mammoth-riders-return-card": {
                const house = this.game.houses.get(data.house);
                const houseCard = this.allHouseCards.get(data.houseCard);

                return <p>
                    <b>Mammoth Riders</b>: <b>{house.name}</b> chose to
                    regain <b>{houseCard.name}</b>.
                </p>;
            }
            case "the-horde-descends-highest-muster": {
                const house = this.game.houses.get(data.house);

                return <p>
                    <b>The Horde Descends</b>: <b>{house.name}</b> may muster forces in any one
                    Castle or Stronghold they control.
                </p>;
            }
            case "the-horde-descends-units-killed": {
                const house = this.game.houses.get(data.house);
                const units = data.units.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))]) as [Region, UnitType[]][];

                return <p>
                    <b>The Horde Descends</b>: <b>{house.name}</b>{units.length > 0 ? (<> chose to
                    destroy {joinReactNodes(units.map(([region, unitTypes]) => <span key={`the-horde-descends_${region.id}`}>{joinReactNodes(unitTypes.map((ut, i) => <b key={`the-horde-descends_${ut.id}_${i}`}>{ut.name}</b>), ", ")} in <b>{region.name}</b></span>), ", ")}.</>)
                    : <> had no units to destroy.</>}
                </p>;
            }
            case "crow-killers-knights-replaced": {
                const house = this.game.houses.get(data.house);
                const units = data.units.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))]) as [Region, UnitType[]][];

                return <p>
                    {units.length > 0
                    ? (<><b>Crow Killers</b>: <b>{house.name}</b> replaced {joinReactNodes(units.map(([region, unitTypes], i) => <span key={`crow-killers-replace_${i}`}><b>{unitTypes.length}</b> Knight{unitTypes.length > 1 && "s"} in <b>{region.name}</b></span>), ", ")} with Footmen.</>)
                    : (<><b>Crow Killers</b>: <b>{house.name}</b> had no Knights to replace with Footmen.</>)}
                </p>;
            }
            case "crow-killers-knights-killed": {
                const house = this.game.houses.get(data.house);
                const units: [Region, UnitType[]][] = data.units.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))]);

                return <p><b>Crow Killers</b>: <b>{house.name}</b> had to destroy {joinReactNodes(units.map(([region, unitTypes], i) => <span key={`crow-killers-kill_${i}`}><b>{unitTypes.length}</b> Knight{unitTypes.length > 1 && "s"} in <b>{region.name}</b></span>), ", ")}.</p>;
            }

            case "crow-killers-footman-upgraded": {
                const house = this.game.houses.get(data.house);
                const units = data.units.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))]) as [Region, UnitType[]][];

                return <p>
                    {units.length > 0
                    ? (<><b>Crow Killers</b>: <b>{house.name}</b> replaced {joinReactNodes(units.map(([region, unitTypes], i) => <span key={`crow-killers-upgrade_${i}`}><b>{unitTypes.length}</b> Footm{unitTypes.length == 1 ? "a" : "e"}n in <b>{region.name}</b></span>), ", ")} with Knights.</>)
                    : (<><b>Crow Killers</b>: <b>{house.name}</b> was not able to replace any Footman with Knights.</>)}
                </p>;
            }
            case "skinchanger-scout-nights-watch-victory": {
                const house = this.game.houses.get(data.house);

                return <p>
                    <b>Skinchanger Scout</b>: <b>{house.name}</b> gets
                    back <b>{data.powerToken}</b> Power tokens.
                </p>;
            }
            case "skinchanger-scout-wildling-victory": {
                const house = this.game.houses.get(data.house);
                const powerTokensLost = data.powerTokensLost.map(([hid, amount]) => [this.game.houses.get(hid), amount] as [House, number]);

                return <>
                    <p>
                        <b>Skinchanger Scout</b>: <b>{house.name}</b> lost all of their Power
                        tokens, all other houses lost 2 Power tokens.
                    </p>
                    <ul>
                        {powerTokensLost.map(([house, amount]) => (
                            <li key={`skinchanger-scout_${house.id}`}><b>{house.name}</b> lost <b>{amount}</b> Power tokens.</li>
                        ))}
                    </ul>
                </>;
            }
            case "rattleshirts-raiders-nights-watch-victory":
                const house = this.game.houses.get(data.house);

                return <p>
                    <b>Rattleshirt&apos;s Raiders</b>: <b>{house.name}</b> gained one level of supply,
                    and is now at <b>{data.newSupply}</b>.
                </p>;

            case "rattleshirts-raiders-wildling-victory": {
                const lowestBidder = this.game.houses.get(data.lowestBidder);
                const newSupply = data.newSupply.map(([hid, supply]) => [this.game.houses.get(hid), supply] as [House, number]);

                return <>
                    <b>Rattleshirt&apos;s Raiders</b>: <b>{lowestBidder.name}</b> lost 2 levels of supply,
                    all other houses lost 1 levels of supply.
                    <ul>
                        {newSupply.map(([house, supply]) => (
                            <li key={`rattleshirts-raiders_${house.id}`}><b>{house.name}</b> is now at <b>{supply}</b>.</li>
                        ))}
                    </ul>
                </>;
            }
            case "game-of-thrones-power-tokens-gained":
                const gains = data.gains.map(([hid, gain]) => [this.game.houses.get(hid), gain] as [House, number]);

                return <>
                    <ul>
                        {gains.map(([house, gain]) => (
                            <li key={`got-${house.id}`}><b>{house.name}</b> gained <b>{gain}</b> Power tokens.</li>
                        ))}
                    </ul>
                </>;
            case "immediatly-killed-after-combat": {
                const house = this.game.houses.get(data.house);
                const killedBecauseWounded = data.killedBecauseWounded.map(utid => unitTypes.get(utid).name);
                const killedBecauseCantRetreat = data.killedBecauseCantRetreat.map(utid => unitTypes.get(utid).name);
                return <p>
                    {killedBecauseWounded.length > 0 && (<><b>{house.name}</b> suffered battle casualties because these units were wounded: <>{joinReactNodes(killedBecauseWounded.map((unitType, i) => <b key={`wounded_${unitType}_${i}`}>{unitType}</b>), ', ')}</>.</>)}
                    {killedBecauseCantRetreat.length > 0 && (<><b>{house.name}</b> suffered battle casualties because these units can&apos;t retreat: <>{joinReactNodes(killedBecauseCantRetreat.map((unitType, i) => <b key={`cant-retreat_${unitType}_${i}`}>{unitType}</b>), ', ')}</>.</>)}
                </p>;
            }
            case "killed-after-combat": {
                const house = this.game.houses.get(data.house);
                const killed = data.killed.map(utid => unitTypes.get(utid).name);
                return killed.length > 0 ?
                <>
                    <b>{house.name}</b> suffered battle casualties and chose these units to be killed: <>{joinReactNodes(killed.map((unitType, i) => <b key={`casualties_${unitType}_${i}`}>{unitType}</b>), ', ')}</>.
                </> :
                <></>;
            }
            case "supply-adjusted":
                const supplies: [House, number][] = data.supplies.map(([hid, supply]) => [this.game.houses.get(hid), supply]);

                return (
                <>
                    <p>Supply levels have been adjusted:</p>
                    <div className="mt-1"><HouseNumberResultsComponent results={supplies} key="supply"/></div>
                </>);
            case "player-replaced": {
                const oldUser = this.props.ingameGameState.entireGame.users.get(data.oldUser);
                const newUser = data.newUser ? this.props.ingameGameState.entireGame.users.get(data.newUser) : null;
                const house = this.game.houses.get(data.house);

                return (
                    <>
                        <b>{oldUser.name}</b> (<b>{house.name}</b>) was replaced by {newUser ? <b>{newUser.name}</b> : " a vassal"}.
                    </>
                );
            }
            case "vassals-claimed": {
                    const vassals = data.vassals.map(hid => this.game.houses.get(hid));
                    const house = this.game.houses.get(data.house);

                    return <p>{vassals.length > 0
                        ? (<><b>{house.name}</b> claimed {joinReactNodes(vassals.map(v => <b key={v.id}>{v.name}</b>), ", ")} as
                                vassal{vassals.length > 0 && "s"}.</>)
                        : (<><b>{house.name}</b> passed their vassal marker set.</>)
                    }</p>;
                }
            case "commander-power-token-gained": {
                    const house = this.game.houses.get(data.house);
                    return <p>
                        Commander <b>{house.name}</b> gained a Power token for this battle.
                    </p>;
                }
            case "beric-dondarrion-used": {
                const house = this.game.houses.get(data.house);
                const casualty = unitTypes.get(data.casualty).name;
                return <p>
                    <b>Beric Dondarrion</b>: <b>{house.name}</b> chose a <b>{casualty}</b> to be killed.
                </p>;
                }
            case "varys-used": {
                const house = this.game.houses.get(data.house);
                return <p>
                    <b>Varys</b>: <b>{house.name}</b> is now on top of the Fiefdoms track.
                </p>;
            }
            case "jaqen-h-ghar-house-card-replaced": {
                const house = this.game.houses.get(data.house);
                const affectedHouse = this.game.houses.get(data.affectedHouse);
                const newHouseCard = this.allHouseCards.get(data.newHouseCard);

                return <p>
                    <b>Jaqen H&apos;Ghar</b>: <b>{house.name}</b> randomly chose <b>{newHouseCard.name}</b> as <b>
                        {affectedHouse.name}&apos;s</b> new house card.
                </p>;
            }
            case "jon-connington-used": {
                const house = this.game.houses.get(data.house);
                const region = this.game.world.regions.get(data.region);
                return <p>
                    <b>Jon Conningtion</b>: <b>{house.name}</b> chose to recruit a knight in <b>{region.name}</b>.
                </p>;
            }
            case "bronn-used": {
                const house = this.game.houses.get(data.house);
                return <p>
                    <b>Bronn</b>: <b>{house.name}</b> chose to discard 2 Power tokens to reduce Bron&apos;s combat strength to 0.
                </p>;
            }
            case "littlefinger-power-tokens-gained": {
                const house = this.game.houses.get(data.house);
                return <p>
                    <b>Littlefinger</b>: <b>{house.name}</b> gained {data.powerTokens} Power tokens.
                </p>;
            }
            case "alayne-stone-used": {
                const house = this.game.houses.get(data.house);
                const affectedHouse = this.game.houses.get(data.affectedHouse);
                return <p>
                    <b>Alayne Stone</b>: <b>{house.name}</b> forced <b>{affectedHouse.name}</b> to discard all his {data.lostPowerTokens} available Power tokens.
                </p>;
            }
            case "lysa-arryn-ffc-power-tokens-gained": {
                const house = this.game.houses.get(data.house);
                return <p>
                    <b>Lysa Arryn</b>: <b>{house.name}</b> gained {data.powerTokens} Power tokens.
                </p>;
            }
            case "anya-waynwood-power-tokens-gained": {
                const gains = data.gains.map(([hid, gain]) => [this.game.houses.get(hid), gain] as [House, number]);

                return <p>
                    <p><b>Anya Waynwood</b>:</p>
                    <ul>
                        {gains.map(([house, gain]) => (
                            <li key={`anya-waynwood-${house.id}`}><b>{house.name}</b> gained <b>{gain}</b> Power tokens.</li>
                        ))}
                    </ul>
                </p>;
            }
            case "robert-arryn-used": {
                const house = this.game.houses.get(data.house);
                const affectedHouse = this.game.houses.get(data.affectedHouse);
                const removedHouseCard = data.removedHouseCard ? this.allHouseCards.get(data.removedHouseCard) : null;

                return <p>
                    <b>Robert Arryn</b>: <b>{house.name}</b> decided to remove <b>Robert Arryn</b> {removedHouseCard &&
                    <>and <b>{removedHouseCard.name}</b> of <b>{affectedHouse.name}</b> </>}from the game.
                </p>;
            }
            case "house-card-removed-from-game": {
                const house = this.game.houses.get(data.house);
                const houseCard = this.allHouseCards.get(data.houseCard);

                return <p>
                    <b>{houseCard.name}</b> of house <b>{house.name}</b> was removed from the game.
                </p>;
            }
            case "viserys-targaryen-used": {
                const house = this.game.houses.get(data.house);
                const houseCard = this.allHouseCards.get(data.houseCard);

                return <p>
                    <b>Viserys Targaryen</b>: <b>{house.name}</b> decided to add the strength <b>{houseCard.combatStrength}</b> from <b>{houseCard.name}</b>.
                </p>;
            }
            case "illyrio-mopatis-power-tokens-gained": {
                const house = this.game.houses.get(data.house);
                const powerTokensGained = data.powerTokensGained;

                return <p>
                    <b>Illyrio Mopatis</b>: <b>{house.name}</b> gained {powerTokensGained} Power tokens.
                </p>;
            }
            case "daenerys-targaryen-b-power-tokens-discarded": {
                const house = this.game.houses.get(data.house);
                const affectedHouse = this.game.houses.get(data.affectedHouse);

                return <p>
                    <b>Daenerys Targaryen</b>: <b>{house.name}</b> forced house <b>{affectedHouse.name}</b> to
                    discard {data.powerTokensDiscarded} Power token{data.powerTokensDiscarded != 1 && "s"}.
                </p>;
            }
            case "missandei-used": {
                const house = this.game.houses.get(data.house);
                const houseCard = this.allHouseCards.get(data.houseCard);
                return <p>
                    <b>Missandei</b>: <b>{house.name}</b> decided to return <b>{houseCard.name}</b> to hand.
                </p>;
            }
            case "power-tokens-gifted": {
                const house = this.game.houses.get(data.house);
                const affectedHouse = this.game.houses.get(data.affectedHouse);
                return <p>
                    House <b>{house.name}</b> gifted {data.powerTokens} Power token{data.powerTokens > 1 && "s"} to house <b>{affectedHouse.name}</b>.
                </p>;
            }
            case "influence-track-position-chosen": {
                const house = this.game.houses.get(data.house);
                const track = this.game.getNameInfluenceTrack(data.trackerI);
                return <p>
                    House <b>{house.name}</b> has chosen position <b>{data.position}</b> on <b>{track} Track</b>.
                </p>;
            }
            case "ties-decided": {
                const house = this.game.houses.get(data.house);
                return <p>
                    House <b>{house.name}</b> has decided ties.
                </p>;
            }
        }
    }
}
