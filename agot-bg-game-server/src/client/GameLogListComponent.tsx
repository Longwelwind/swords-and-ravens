import {Component, ReactNode} from "react";
import React from "react";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import IngameGameState from "../common/ingame-game-state/IngameGameState";
import {GameLogData} from "../common/ingame-game-state/game-data-structure/GameLog";
import Game from "../common/ingame-game-state/game-data-structure/Game";
import HouseCard from "../common/ingame-game-state/game-data-structure/house-card/HouseCard";
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
        return (
            <Card style={{height: "350px", overflowY: "scroll"}}>
                <Card.Body>
                    {this.props.ingameGameState.gameLogManager.logs.reverse().map((l, i) => (
                        <Row key={i}>
                            <Col xs="auto" className="text-muted">
                                <small>
                                    {l.time.getHours().toString().padStart(2, "0")}
                                    :{l.time.getMinutes().toString().padStart(2, "0")}
                                </small>
                            </Col>
                            <Col>
                                <div className="game-log-content">
                                    {this.renderGameLogData(l.data)}
                                </div>
                            </Col>
                        </Row>
                    ))}
                </Card.Body>
            </Card>
        );
    }

    renderGameLogData(data: GameLogData): ReactNode {
        switch (data.type) {
            case "turn-begin":
                return <>Turn <b>{data.turn}</b></>;

            case "support-declared":
                const supporter = this.game.houses.get(data.supporter);
                const supported = data.supported ? this.game.houses.get(data.supported) : null;
                if (supported) {
                    return <><b>{supporter.name}</b> supported <b>{supported.name}</b>.</>;
                } else {
                    return <><b>{supporter.name}</b> supported no-one.</>;
                }

            case "house-card-chosen":
                const houseCards: [House, HouseCard][] = data.houseCards.map(([houseId, houseCardId]) => {
                    const house = this.game.houses.get(houseId);
                    return [house, house.houseCards.get(houseCardId)];
                });

                return houseCards.map(([house, houseCard]) => <><b>{house.name}</b> chooses <b>{houseCard.name}</b><br/></>);

            case "attack":
                const attacker = this.game.houses.get(data.attacker);
                // A "null" for "attacked" means it was an attack against a neutral force
                const attacked = data.attacked ? this.game.houses.get(data.attacked) : null;
                const attackingRegion = this.game.world.regions.get(data.attackingRegion);
                const attackedRegion = this.game.world.regions.get(data.attackedRegion);
                const army = data.units.map(utid => unitTypes.get(utid));

                return (
                    <>
                        <b>{attacker.name}</b> attacked <b>{attacked ? attacked.name : "a neutral force"}</b> from <b>{attackingRegion.name}</b>
                        to <b>{attackedRegion.name}</b> with {army.map(ut => ut.name).join(', ')}.
                    </>
                );

            case "march-resolved":
                let house = this.game.houses.get(data.house);
                const startingRegion = this.world.regions.get(data.startingRegion);
                const moves: [Region, UnitType[]][] = data.moves.map(([rid, utids]) => [this.world.regions.get(rid), utids.map(utid => unitTypes.get(utid))]);

                return (
                    <>
                        <b>{house.name}</b> marched from <b>{startingRegion.name}</b>:
                        <ul>
                            {moves.map(([region, unitTypes]) => (
                                <li key={region.id}>{unitTypes.map((ut, i) => <b key={i}>{ut.name}</b>).join(", ")} to <b>{region.name}</b></li>
                            ))}
                        </ul>
                    </>
                );

            case "westeros-card-executed":
                const westerosCardType = westerosCardTypes.get(data.westerosCardType);

                return (
                    <>
                        <p>
                            Executing the next Westeros card:
                        </p>
                        <p>
                            <Row className="justify-content-center">
                                <Col xs="auto">
                                    <WesterosCardComponent cardType={westerosCardType} size="small" tooltip={true}/>
                                </Col>
                            </Row>
                        </p>
                    </>
                );

            case "westeros-cards-drawn":
                const drawnWesterosCardTypes = data.westerosCardTypes.map(wctid => westerosCardTypes.get(wctid));

                return (
                    <>
                        <p>
                            Westeros cards were drawn:
                        </p>
                        <p>
                            <Row className="justify-content-around">
                                {drawnWesterosCardTypes.map((wct, i) => (
                                    <Col xs="auto" key={i}>
                                        <WesterosCardComponent cardType={wct} size="small" tooltip={true}/>
                                    </Col>
                                ))}
                            </Row>
                        </p>
                        {data.addedWildlingStrength > 0 && (
                            <p>Wildling strength increased by {data.addedWildlingStrength}</p>
                        )}
                    </>
                );

            case "combat-result":
                const stats = data.stats.map(stat => ({
                    ...stat,
                    house: this.game.houses.get(stat.house),
                    region: this.world.regions.get(stat.region)
                }));

                return (
                    <>
                        <p>Combat result</p>

                        <p>
                            <table>
                                <tr>
                                    <th/>
                                    <th>Attacker</th>
                                    <th>Defender</th>
                                </tr>
                                <tr>
                                    <th/>
                                    <th>{stats[0].house.name}</th>
                                    <th>{stats[1].house.name}</th>
                                </tr>
                                <tr>
                                    <td>Army</td>
                                    <td>{stats[0].army} (+{stats[1].orderBonus})</td>
                                    <td>{stats[1].army} (+{stats[0].orderBonus})</td>
                                </tr>
                                <tr>
                                    <td>Support</td>
                                    <td>{stats[0].support}</td>
                                    <td>{stats[1].support}</td>
                                </tr>
                                <tr>
                                    <td>House Card</td>
                                    <td>{stats[0].houseCardStrength}</td>
                                    <td>{stats[1].houseCardStrength}</td>
                                </tr>
                                <tr>
                                    <td>Valyrian Steel Blade</td>
                                    <td>{stats[0].valyrianSteelBlade}</td>
                                    <td>{stats[1].valyrianSteelBlade}</td>
                                </tr>
                                <tr>
                                    <td>Total</td>
                                    <td>{stats[0].total}</td>
                                    <td>{stats[1].total}</td>
                                </tr>
                            </table>
                        </p>
                    </>
                );
            case "wildling-card-revealed":
                console.log(this.game.wildlingDeck);
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
                        Wildling bidding results:
                        <table>
                            {results.map(([bid, houses]) => houses.map(h => (
                                <tr key={h.id}>
                                    <td>{h.name}</td>
                                    <td>{bid}</td>
                                </tr>
                            )))}
                        </table>
                        {data.nightsWatchVictory ? (
                            <>The <strong>Night's Watch</strong> won!</>
                        ) : (
                            <>The <strong>Wildling</strong> won!</>
                        )}
                    </>
                );

            case "lowest-bidder-chosen":
                const lowestBidder = this.game.houses.get(data.lowestBidder);

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
                    const musterings = _.flatMap(data.musterings.map(([_, musterements]: [string, {region: string, from: string | null, to: string}[]]) =>
                    musterements.map(({region, from, to}) => ({
                        region: this.game.world.regions.get(region),
                        from: from ? unitTypes.get(from) : null,
                        to: unitTypes.get(to)
                    }))
                ));

                return (
                    <>
                        <p>
                            <strong>{house.name}</strong> mustered:
                        </p>
                        <ul>
                            {musterings.map(({region, from, to}) => (
                                <li>
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
                    </>
                );
        }
    }
}
