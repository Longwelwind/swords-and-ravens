import { observer } from "mobx-react";
import { Component, ReactNode } from "react";
import * as React from "react";
import FormCheck from "react-bootstrap/FormCheck";
import GameClient from "./GameClient";
import { GameSettings } from "../common/EntireGame";
import EntireGame from "../common/EntireGame";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import LobbyGameState from "../common/lobby-game-state/LobbyGameState";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { allGameSetups, getGameSetupContainer } from "../common/ingame-game-state/game-data-structure/createGame";
import IngameGameState from "../common/ingame-game-state/IngameGameState";

interface GameSettingsComponentProps {
    gameClient: GameClient;
    entireGame: EntireGame;
}

@observer
export default class GameSettingsComponent extends Component<GameSettingsComponentProps> {
    get entireGame(): EntireGame {
        return this.props.entireGame;
    }

    get gameSettings(): GameSettings {
        return this.entireGame.gameSettings;
    }

    get canChangeGameSettings(): boolean {
        if (this.entireGame.lobbyGameState) {
            return this.props.gameClient.isRealOwner();
        } else if (this.entireGame.ingameGameState) {
            return this.props.gameClient.canActAsOwner();
        }
        return false;
    }

    get selectedGameSetupName(): string {
        const name = allGameSetups.get(this.props.entireGame.gameSettings.setupId).name;
        return name.substring(0, name.indexOf(" ("));
    }

    render(): ReactNode {
        const isIngame = this.props.entireGame.childGameState instanceof IngameGameState;
        return (
            <Col id="game-settings-container" xs={12} className="mt-2">
                <Row id="live-pbem-row" className="justify-content-center mb-3">
                    {isIngame && (
                        <Col xs={12} className="text-center mb-2">
                            {this.selectedGameSetupName}
                        </Col>
                    )}
                    <Row className="justify-content-center">
                        <Col xs={12} className="d-flex align-items-center">
                            {isIngame && this.props.entireGame.gameSettings.onlyLive ? <></> : <OverlayTrigger overlay={
                                <Tooltip id="pbem-tooltip">
                                    <b>Live Game</b><br />
                                    A live game can be played when all players are online.
                                    They are notified by sound when it is their turn.<br /><br />
                                    <b>P</b>lay <b>B</b>y <b>E</b>-<b>M</b>ail<br />
                                    The asynchronous game mode. Players receive an e-mail when it is their turn.
                                    Those games are typically played over days or weeks.
                                </Tooltip>}
                            >
                                <select id="pbem-setting" name="pbem"
                                    value={this.gameSettings.pbem ? "PBEM" : "Live"}
                                    onChange={e => this.changeGameSettings(() => this.gameSettings.pbem = e.target.value == "PBEM")}>
                                    <option key="Live" value="Live">Live Game</option>
                                    <option key="PBEM" value="PBEM">Play By E-Mail</option>
                                </select>
                            </OverlayTrigger>}
                            {this.gameSettings.pbem && !isIngame && (
                                <FormCheck
                                    id="start-when-full-setting"
                                    className="mx-3 mt-2"
                                    type="switch"
                                    label={
                                        <OverlayTrigger overlay={
                                            <Tooltip id="start-when-full-setting-tooltip">
                                                If this option is enabled, the game will start automatically once all seats are taken.
                                            </Tooltip>}>
                                            <label htmlFor="start-when-full-setting">Start when full</label>
                                        </OverlayTrigger>}
                                    checked={this.gameSettings.startWhenFull}
                                    onChange={() => this.changeGameSettings(() => this.gameSettings.startWhenFull = !this.gameSettings.startWhenFull)}
                                />
                            )}
                            {!this.gameSettings.pbem && !isIngame && (
                                <FormCheck
                                    id="only-live-setting"
                                    className="mx-3 mt-2"
                                    type="switch"
                                    label={
                                        <OverlayTrigger overlay={
                                            <Tooltip id="only-live-setting-tooltip" className="tooltip-w-100">
                                                If this option is enabled each player will have a game clock of 45, 60, 75, 90 or 120 minutes.<br/>
                                                When a player&apos;s time runs out, he is automatically turned into a vassal and this cannot be undone!<br/>
                                                The last remaining player immediately wins the game.<br/>
                                                All player clocks can be extended by vote once for 15 minutes and a second time in the last round.<br/>
                                                After 2 failed voting attempts, no further voting can be initiated.<br/>
                                                In addition, these games can be paused, but public games will automatically resume after 10 minutes<br/>
                                                and the game host will not be able to switch to PBEM in-game.
                                            </Tooltip>}>
                                            <label htmlFor="only-live-setting">Game clock</label>
                                        </OverlayTrigger>}
                                    checked={this.gameSettings.onlyLive}
                                    onChange={() => this.changeGameSettings(() => this.gameSettings.onlyLive = !this.gameSettings.onlyLive)}
                                />
                            )}
                            {this.gameSettings.onlyLive && !isIngame &&
                            <div>
                                <select id="initial-live-clock"
                                    value={this.gameSettings.initialLiveClock}
                                    onChange={e => this.onInitialLiveClockChange(e.target.value)}
                                >
                                    <option key="45" value={45}>45</option>
                                    <option key="60" value={60}>60</option>
                                    <option key="75" value={75}>75</option>
                                    <option key="90" value={90}>90</option>
                                    <option key="120" value={120}>120</option>
                                </select>&nbsp;min
                            </div>}
                            {this.gameSettings.onlyLive && !isIngame &&
                            <FormCheck
                                id="fixed-clock-setting"
                                className="mx-3 mt-2"
                                type="switch"
                                label={
                                    <OverlayTrigger overlay={
                                        <Tooltip id="fixed-clock-setting-tooltip">
                                            If this option is enabled, players will not be able to vote to extend their clocks.
                                        </Tooltip>}>
                                        <label htmlFor="fixed-clock-setting">Fixed clock</label>
                                    </OverlayTrigger>}
                                checked={this.gameSettings.fixedClock}
                                onChange={() => this.changeGameSettings(() => this.gameSettings.fixedClock = !this.gameSettings.fixedClock)}
                            />}
                            {!isIngame &&
                            <FormCheck
                                id="private-game-setting"
                                className="mx-3 mt-2"
                                type="switch"
                                label={
                                    <OverlayTrigger overlay={
                                        <Tooltip id="private-game-setting-tooltip">
                                            Enable this option if you know all participants and if you want to prevent
                                            security and replacement mechanisms from being activated.
                                        </Tooltip>}>
                                        <label htmlFor="private-game-setting">Private Game</label>
                                    </OverlayTrigger>}
                                checked={this.gameSettings.private}
                                onChange={() => this.changeGameSettings(() => this.gameSettings.private = !this.gameSettings.private)}
                            />}
                        </Col>
                    </Row>
                </Row>
                {this.props.entireGame.childGameState instanceof LobbyGameState && this.renderLobbySettings()}
            </Col>
        );
    }

    renderGameSetupsTooltipContent(): ReactNode {
        switch(this.gameSettings.setupId) {
            case "base-game":
                return <>
                    <h5>The official <i>A&nbsp;Game&nbsp;of&nbsp;Thrones&nbsp;Board&nbsp;Game&nbsp;-&nbsp;2nd&nbsp;edition</i></h5>
                    This setup supports 3-player and 6-player modes. The rulebook is available online.<br/>
                    The Neutral Force tokens for 4 and 5 players are not implemented, as the unoffical variants<br/>
                    and the Vassals of Mother&nbsp;of&nbsp;Dragons expansion are much better.
                </>;
            case "mother-of-dragons":
                return <>
                    <h5>The official <i>Mother&nbsp;of&nbsp;Dragons</i> expansion</h5>
                    This expansion adds 2 additional houses: Arryn and Targaryen, as well as some more interesting mechanics:<br/>
                    Vassals, Sea Orders and the Iron Bank. If the game is selected with 8 players and House Targaryen,<br/>
                    a completely new map part &apos;Essos&apos; is also added. The rulebook is available online.
                </>;
            case "a-dance-with-dragons":
                return <>
                    <h5>The official <i>Dance&nbsp;with&nbsp;Dragons</i> expansion</h5>
                    This expansion thematically reflects a later point in the Game of Thrones story<br/>
                    and therefore <i>lasts only <b>6</b> rounds!</i> It adds new house cards and new starting positions<br/>
                    for all 6 houses from the base game.
                </>;
            case "a-feast-for-crows":
                return <>
                    <h5>The official <i>A&nbsp;Feast&nbsp;for&nbsp;Crows</i> expansion</h5>
                    This is a 4 player expansion. It adds House Arryn and a completely new way to score victory points.<br/>
                    Instead of capturing castles you have to complete secret objectives.<br/>
                    The exact rules can be found in the game as a tooltip in the Objectives tab.
                </>;
            case "a-dance-with-mother-of-dragons":
                return <>
                    <h5>The unofficial <i>A&nbsp;Dance&nbsp;with&nbsp;Mother&nbsp;of&nbsp;Dragons</i> variant</h5>
                    This is a community-created variant and combines <i>A&nbsp;Dance&nbsp;with&nbsp;Dragons</i> and Mother&nbsp;with&nbsp;Dragons.<br/>
                    So it also <i>lasts only <b>6</b> rounds</i>, offers new starting positions and is played with the<br/>
                    Dance&nbsp;with&nbsp;Dragons / Feast&nbsp;for&nbsp;Crows house cards and the Mother&nbsp;of&nbsp;Dragons B deck for Targaryen.
                </>;
            case "struggle-in-the-north":
                return <>
                    <h5>The unofficial <i>Struggle&nbsp;in&nbsp;the&nbsp;North</i> variant</h5>
                    This is a community-created variant for 4 and 5 players only.<br/>
                    It is very similar to the base game with fewer players, but instead of Neutral Force tokens,<br/>
                    the southern territories of House Martell and House Tyrell, respectively, are blocked areas.
                </>;
            case "rumble-in-the-south":
                return <>
                    <h5>The unofficial <i>Rumbe&nbsp;in&nbsp;the&nbsp;South</i> variant</h5>
                    This is a community-created variant for 4 players only.<br/>
                    House Stark and House Greyjoy do not participate and thus Pyke is blocked<br/>
                    as well as almost all of North.
                </>;
            case "race-to-kings-landing":
                return <>
                    <h5>The unofficial <i>Race&nbsp;to&nbsp;Kings&nbsp;Landing</i> variant</h5>
                    This is a community-created variant for 5 players only.<br/>
                    House Baratheon does not participate and thus Dragonstone is blocked.
                </>;
            case "no-kraken-for-dinner":
                return <>
                    <h5>The unofficial <i>No&nbsp;Kraken&nbsp;for&nbsp;Dinner</i> variant</h5>
                    This is a community-created variant for 5 players only.<br/>
                    House Greyjoy does not participate and thus Pyke is blocked.
                </>;
            case "learn-the-game":
                return <>
                    <h5>Teach&nbsp;the&nbsp;Game&nbsp;mode</h5>
                    This mode allows you to start the game with only 2 players to explain the basic mechanics to a friend.<br/>
                    Additionally, the mode can be used with vassals from the Mother&nbsp;of&nbsp;Dragons expansion<br/>
                    and the &apos;Random vassal assignment&apos; option to make the game semi-playable with two players.<br/>
                    However, victories do not count towards the win rate.
                </>;
            default:
                return null;
        }
    }

    renderLobbySettings(): ReactNode {
        return <Row className="mt-2 justify-content-center">
            <Col xs="auto" id="base-settings-col" className="no-gutters">
                <OverlayTrigger overlay={
                    <Tooltip id="game-setups-tooltip" className="tooltip-w-100">
                        {this.renderGameSetupsTooltipContent()}
                    </Tooltip>}
                    placement="top"
                    delay={{show: 250, hide: 750}}
                >
                    <Col xs="12">
                        <select className="custom-select" id="game-setups" name="setups"
                            value={this.gameSettings.setupId}
                            onChange={e => this.onSetupChange(e.target.value)}
                            style={{marginBottom: "8px"}}
                        >
                            {this.createSetupItems()}
                        </select>
                    </Col>
                </OverlayTrigger>
                <Col xs="auto" className="d-flex justify-content-between">
                    <div className="mr-2">
                        <select id="player-count" name="playerCount"
                            value={this.gameSettings.playerCount}
                            onChange={e => this.onPlayerCountChange(e.target.value)}
                            style={{marginBottom: "8px"}}
                        >
                            {this.createPlayerCountItems()}
                        </select>&nbsp;Players
                    </div>
                    <OverlayTrigger overlay={
                        <Tooltip id="vp-count-setting-tooltip">
                            Defines the number of Victory&nbsp;points needed to win the game.
                        </Tooltip>}>
                        <div>
                            <select id="vp-count-setting"
                                value={this.gameSettings.victoryPointsCountNeededToWin}
                                onChange={e => this.onVpCountChange(e.target.value)}
                                style={{marginBottom: "8px"}}
                            >
                                <option key="6" value={6}>6</option>
                                <option key="7" value={7}>7</option>
                                <option key="8" value={8}>8</option>
                                <option key="9" value={9}>9</option>
                                <option key="10" value={10}>10</option>
                            </select>&nbsp;VPs
                        </div>
                    </OverlayTrigger>
                    {this.props.entireGame.gameSettings.playerCount >= 8 && <OverlayTrigger overlay={
                        <Tooltip id="lt-count-setting-tooltip">
                            Defines the number of Loyalty&nbsp;tokens needed to win the game.
                        </Tooltip>}>
                        <div>
                            <select id="lt-count-setting"
                                value={this.gameSettings.loyaltyTokenCountNeededToWin}
                                onChange={e => this.onLtCountChange(e.target.value)}
                                style={{marginBottom: "8px"}}
                            >
                                <option key="6" value={6}>6</option>
                                <option key="7" value={7}>7</option>
                                <option key="8" value={8}>8</option>
                                <option key="9" value={9}>9</option>
                                <option key="10" value={10}>10</option>
                            </select>&nbsp;LTs
                        </div>
                    </OverlayTrigger>}
                </Col>
                {this.props.entireGame.isFeastForCrows && <Col xs="12">
                    <FormCheck
                        id="add-port-to-the-eyrie-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="add-port-to-the-eyrie-setting-tooltip">
                                    If this option is enabled, the Eyrie has a port and House Arryn scores
                                    only 1 victory point for Mercantile Ventures (the objective about ports).
                                </Tooltip>}>
                                <label htmlFor="add-port-to-the-eyrie-setting">Add a port to The Eyrie</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.addPortToTheEyrie}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.addPortToTheEyrie = !this.gameSettings.addPortToTheEyrie)}
                    />
                </Col>}
                <Col xs="12">
                    <FormCheck
                        id="adwd-house-cards"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="adwd-house-cards-tooltip">
                                    If this option is enabled, the House cards from the <i>A&nbsp;Dance&nbsp;with&nbsp;Dragons</i> and <i>A&nbsp;Feast&nbsp;for&nbsp;Crows</i> expansions are used.
                                </Tooltip>}>
                                <label htmlFor="adwd-house-cards">Use <i>ADwD</i> House cards</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.adwdHouseCards}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.adwdHouseCards = !this.gameSettings.adwdHouseCards)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="asos-house-cards-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="asos-house-cards-setting-tooltip">
                                    If this option is enabled, the House cards from the 1st edition expansion <i>A&nbsp;Storm&nbsp;of&nbsp;Swords</i> are used.
                                </Tooltip>}>
                                <label htmlFor="asos-house-cards-setting">Use <i>ASoS</i> House cards</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.asosHouseCards}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.asosHouseCards = !this.gameSettings.asosHouseCards)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="decks-evolution-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="decks-evolution-setting-tooltip">
                                    This is a community variant, starting with the house cards from the base game. However, from round <b>5</b> onwards, each house returns its alternative deck when the last house card has been played.
                                </Tooltip>}>
                                <label htmlFor="decks-evolution-setting">House cards evolution</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.houseCardsEvolution}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.houseCardsEvolution = !this.gameSettings.houseCardsEvolution)}
                    />
                </Col>
                {this.props.entireGame.isCustomBalancingOptionAvailable(this.gameSettings) && <Col xs="12">
                    <FormCheck
                        id="custom-balancing-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="custom-balancing-tooltip">
                                    A community proposal to {this.props.entireGame.isMotherOfDragons ?
                                        "avoid an early gang up against Targaryen" :
                                        "improve Tyrell's starting position"}. For details see<br/>
                                    <a href="https://community.swordsandravens.net/viewtopic.php?t=6" target="_blank" rel="noopener noreferrer">
                                        Tex&apos;s balance proposal
                                    </a>.
                                </Tooltip>}
                                delay={{show: 0, hide: 1500}}>
                                <label htmlFor="custom-balancing-setting">Custom Balancing</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.customBalancing}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.customBalancing = !this.gameSettings.customBalancing)}
                    />
                </Col>}
            </Col>
            <Col xs="6" lg="auto" id="mod-settings-col" className="no-gutters">
                <Col xs="12">
                    <FormCheck
                        id="vassals-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="vassals-tooltip">
                                    Unassigned houses will be vassals introduced by the <i>Mother&nbsp;of&nbsp;Dragons</i> expansion.
                                </Tooltip>}>
                                <label htmlFor="vassals-setting">MoD Vassals</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.vassals}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.vassals = !this.gameSettings.vassals)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="iron-bank-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="iron-bank-setting-tooltip">
                                    Enable the Iron&nbsp;Bank from the <i>Mother&nbsp;of&nbsp;Dragons</i> expansion. All player houses start with 7 Power tokens instead of 5.
                                    <br/><br/>
                                    <i>Note: Enabling the Iron&nbsp;Bank makes the Iron&nbsp;Bank sea order available, even if sea orders are deactivated.</i>
                                </Tooltip>}>
                                <label htmlFor="iron-bank-setting">MoD Iron&nbsp;Bank</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.ironBank}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.ironBank = !this.gameSettings.ironBank)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="sea-orders-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="sea-orders-tooltip">
                                    Enable Sea&nbsp;Order tokens from the <i>Mother&nbsp;of&nbsp;Dragons</i> expansion.
                                </Tooltip>}>
                                <label htmlFor="sea-orders-setting">MoD Sea Order Tokens</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.seaOrderTokens}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.seaOrderTokens = !this.gameSettings.seaOrderTokens)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="gift-power-tokens-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="gift-power-tokens-tooltip">
                                    Players can freely gift Power tokens to other players.
                                </Tooltip>}>
                                <label htmlFor="gift-power-tokens-setting">MoD Gifting Power Tokens</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.allowGiftingPowerTokens}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.allowGiftingPowerTokens = !this.gameSettings.allowGiftingPowerTokens)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="random-vassal-assignment-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="random-vassal-assignment-tooltip">
                                    Vassals are randomly assigned to the player houses.
                                </Tooltip>}>
                                <label htmlFor="random-vassal-assignment-setting">Random vassal assignment</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.randomVassalAssignment}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.randomVassalAssignment = !this.gameSettings.randomVassalAssignment)}
                    />
                </Col>
            </Col>
            <Col xs="6" lg="auto" id="extended-base-settings-col" className="no-gutters">
                <Col xs="12">
                    <FormCheck
                        id="random-houses-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="random-houses-tooltip">
                                    House assignments are created randomly.
                                </Tooltip>}>
                                <label htmlFor="random-houses-setting">Random houses</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.randomHouses}
                        onChange={() => this.onRandomHousesChange()}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="random-chosen-houses-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="random-chosen-houses-tooltip">
                                    Only the selected house assignments are randomly exchanged.
                                    This way, users can define player and vassal houses and are still able to randomize the player houses.
                                </Tooltip>}>
                                <label htmlFor="random-chosen-houses-setting">Random chosen houses</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.randomChosenHouses}
                        onChange={() => this.onRandomChosenHousesChange()}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="tides-of-battle-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="tides-of-battle-tooltip">
                                    Optional game module that enhances the risks and uncertainty of combat.
                                </Tooltip>}>
                                <label htmlFor="tides-of-battle-setting">Tides of Battle</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.tidesOfBattle}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.tidesOfBattle = !this.gameSettings.tidesOfBattle)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="remove-tob3-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="remove-tob3-setting-tooltip">
                                    If this option is enabled, 3s cards will be removed from the Tides of Battle deck.
                                </Tooltip>}>
                                <label htmlFor="remove-tob3-setting">Remove 3s cards from ToB</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.removeTob3}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.removeTob3 = !this.gameSettings.removeTob3)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="remove-tob-skulls-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="remove-tob-skulls-setting-tooltip">
                                    If this option is enabled, skull cards will be removed from the Tides of Battle deck.
                                </Tooltip>}>
                                <label htmlFor="remove-tob-skulls-setting">Remove skulls from ToB</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.removeTobSkulls}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.removeTobSkulls = !this.gameSettings.removeTobSkulls)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="limit-tob2-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="limit-tob2-setting-tooltip">
                                    If this option is enabled, the Tides of Battle deck will only contain two 2s cards instead of four.
                                </Tooltip>}>
                                <label htmlFor="limit-tob2-setting">Limit ToB 2s cards</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.limitTob2}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.limitTob2 = !this.gameSettings.limitTob2)}
                    />
                </Col>
            </Col>
            <Col xs="6" lg="auto" id="draft-settings-col" className="no-gutters">
                <Col xs="12">
                    <FormCheck
                        id="draft-house-cards-settings"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="draft-house-cards-tooltip">
                                    Players will draft their House cards or a position on a chosen Influence track step by step
                                    in a randomly chosen order before the game starts. House cards can be chosen from all 2nd Edition Base Game House cards
                                    and from all expansions (ASoS, ADwD, AFfC, MoD) House cards.
                                </Tooltip>}>
                                <label htmlFor="draft-house-cards-settings">Draft House cards</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.draftHouseCards}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.draftHouseCards = !this.gameSettings.draftHouseCards)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="limited-draft-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="limited-draft-tooltip">
                                    Same as normal draft mode but House cards can be chosen from the selected game scenario only.
                                </Tooltip>}>
                                <label htmlFor="limited-draft-setting">Limited Draft</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.limitedDraft}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.limitedDraft = !this.gameSettings.limitedDraft)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="thematic-draft-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="thematic-draft-tooltip">
                                    Players will draft their House cards simultaneously from the available decks of their house.
                                </Tooltip>}>
                                <label htmlFor="thematic-draft-setting">Thematic Draft</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.thematicDraft}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.thematicDraft = !this.gameSettings.thematicDraft)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="blind-draft-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="blind-draft-tooltip">
                                    Players receive random House cards and Influence positions. Can be combined with <i>Limited Draft</i>.
                                </Tooltip>}>
                                <label htmlFor="blind-draft-setting">Blind Draft</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.blindDraft}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.blindDraft = !this.gameSettings.blindDraft)}
                    />
                </Col>
            </Col>
            <Col xs="6" lg="auto" id="custom-settings-col" className="no-gutters">
                <Col xs="12">
                    <FormCheck
                        id="mixed-wd1-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="mixed-wd1-setting-tooltip">
                                    If this option is enabled, one <i>Mustering</i> card will be replaced by <i>Rally&nbsp;The&nbsp;Men</i>,{" "}
                                    one <i>A&nbsp;Throne&nbsp;of&nbsp;Blades</i> card by <i>The&nbsp;Burden&nbsp;of&nbsp;Power</i> and the{" "}
                                    <i>Last&nbsp;Days&nbsp;of&nbsp;Summer</i> card by <i>Famine</i>.
                                </Tooltip>}>
                                <label htmlFor="mixed-wd1-setting">Mixed Westeros Deck 1</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.mixedWesterosDeck1}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.mixedWesterosDeck1 = !this.gameSettings.mixedWesterosDeck1)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="westeros-phase-variant-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="westeros-phase-variant-tooltip">
                                    Players may look at the next 3 Westeros cards from each deck at any time.
                                </Tooltip>}>
                                <label htmlFor="westeros-phase-variant-setting">CoK Westeros Phase</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.cokWesterosPhase}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.cokWesterosPhase = !this.gameSettings.cokWesterosPhase)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="endless-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="endless-setting-tooltip">
                                    The number of game rounds is increased to 1000.
                                </Tooltip>}>
                                <label htmlFor="endless-setting">Endless</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.endless}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.endless = !this.gameSettings.endless)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="faceless-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="faceless-setting-tooltip">
                                    Player names will be hidden and revealed after game ended.
                                </Tooltip>}>
                                <label htmlFor="faceless-setting">Faceless</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.faceless}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.faceless = !this.gameSettings.faceless)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="fog-of-war-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="fog-of-war-setting-tooltip">
                                    Limit visibility to controlled regions, adjacent regions, and regions you attack or are attacked from.
                                </Tooltip>}>
                                <label htmlFor="fog-of-war-setting">Fog of War</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.fogOfWar}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.fogOfWar = !this.gameSettings.fogOfWar)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="no-private-chats-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="no-private-chats-setting-tooltip">
                                    Players will not be able to create private chat rooms.
                                </Tooltip>}>
                                <label htmlFor="no-private-chats-setting">Disable private chats</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.noPrivateChats}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.noPrivateChats = !this.gameSettings.noPrivateChats)}
                    />
                </Col>
            </Col>
            <Col xs="6" lg="auto" id="custom-settings-2-col" className="no-gutters">
                <Col xs="12">
                    <FormCheck
                        id="preceding-mustering-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="preceding-mustering-tooltip">
                                    All players can recruit units like during a mustering event in their castles before the game starts.
                                </Tooltip>}>
                                <label htmlFor="preceding-mustering-setting">Preceding mustering</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.precedingMustering}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.precedingMustering = !this.gameSettings.precedingMustering)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="random-start-positions-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="random-start-positions-setting-tooltip">
                                    Houses randomly change their start positions.
                                </Tooltip>}>
                                <label htmlFor="random-start-positions-setting">Random start positions</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.randomStartPositions}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.randomStartPositions = !this.gameSettings.randomStartPositions)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="use-vassal-positions-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="use-vassal-positions-tooltip">
                                    Player houses will as well start with their vassal start positions.
                                </Tooltip>}>
                                <label htmlFor="use-vassal-positions-setting">Vassal start positions</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.useVassalPositions}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.useVassalPositions = !this.gameSettings.useVassalPositions)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="hold-vps-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="hold-vps-setting-tooltip">
                                    When this option is enabled, players do not win immediately when they score their 7th victory point.
                                    Instead, to win the game, players must hold 7 victory points until the end of the round.
                                </Tooltip>}>
                                <label htmlFor="hold-vps-setting">Hold victory points</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.holdVictoryPointsUntilEndOfRound}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.holdVictoryPointsUntilEndOfRound = !this.gameSettings.holdVictoryPointsUntilEndOfRound)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="tournament-mode-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="tournament-mode-tooltip">
                                    This option is intended for tournaments. It disables the possibility to launch the following votes:<br/>
                                    Offer replacement, Replace vassal, Swap houses, Extend player clocks, Declare winner, Abort game and End game.
                                </Tooltip>}>
                                <label htmlFor="tournament-mode-setting">Tournament mode</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.tournamentMode}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.tournamentMode = !this.gameSettings.tournamentMode)}
                    />
                </Col>
            </Col>
        </Row>
    }

    createSetupItems(): ReactNode {
        const items: JSX.Element[] = [];

        allGameSetups.forEach((setupData, setupId) => {
            items.push(<option key={setupId} value={setupId}>{setupData.name}</option>);
        });

        return items;
    }

    createPlayerCountItems(): ReactNode {
        const items: JSX.Element[] = [];

        const playerSetups = getGameSetupContainer(this.gameSettings.setupId).playerSetups;

        playerSetups.forEach(gameSetup => {
            items.push(<option key={gameSetup.playerCount} value={gameSetup.playerCount}>{gameSetup.playerCount}</option>);
        });

        return items;
    }

    onSetupChange(newVal: string): void {
        if (!this.canChangeGameSettings) {
            return;
        }

        this.gameSettings.setupId = newVal;

        // On setup change set player count to it's default value which should be the highest value (last element)
        const container = getGameSetupContainer(newVal);
        const playerCounts = container.playerSetups.map(playerSetup => playerSetup.playerCount);
        const defaultPlayerCount = playerCounts[playerCounts.length - 1];
        this.gameSettings.playerCount = defaultPlayerCount;

        this.changeGameSettings();
    }

    onPlayerCountChange(newVal: string): void {
        if (!this.canChangeGameSettings) {
            return;
        }

        this.gameSettings.playerCount = parseInt(newVal);

        this.changeGameSettings();
    }

    onInitialLiveClockChange(newVal: string): void {
        if (!this.canChangeGameSettings) {
            return;
        }

        this.gameSettings.initialLiveClock = parseInt(newVal);

        this.changeGameSettings();
    }

    onVpCountChange(newVal: string): void {
        if (!this.canChangeGameSettings) {
            return;
        }

        this.gameSettings.victoryPointsCountNeededToWin = parseInt(newVal);

        this.changeGameSettings();
    }

    onLtCountChange(newVal: string): void {
        if (!this.canChangeGameSettings) {
            return;
        }

        this.gameSettings.loyaltyTokenCountNeededToWin = parseInt(newVal);

        this.changeGameSettings();
    }

    onRandomChosenHousesChange(): void {
        if (!this.entireGame.gameSettings.randomChosenHouses && this.entireGame.gameSettings.randomHouses) {
            return;
        }

        this.changeGameSettings(() => this.entireGame.gameSettings.randomChosenHouses = !this.entireGame.gameSettings.randomChosenHouses)
    }

    onRandomHousesChange(): void {
        if (!this.entireGame.gameSettings.randomHouses && this.entireGame.gameSettings.randomChosenHouses) {
            return;
        }

        this.changeGameSettings(() => this.entireGame.gameSettings.randomHouses = !this.entireGame.gameSettings.randomHouses)
    }

    componentDidMount(): void {
        // Fake a dummy initial settings change, to properly update the Stark / Bolton house name the first time
        if (this.props.gameClient.isRealOwner() &&
            this.props.entireGame.childGameState instanceof LobbyGameState &&
            this.props.entireGame.childGameState.players.size == 0) {
            this.changeGameSettings(() => {});
        }
    }

    /**
     * Helper function to modify gameSettings and update the game settings.
     * @param action Function that modifies gameSettings
     */
    changeGameSettings(action: () => void = () => { }): void {
        if (!this.canChangeGameSettings) {
            return;
        }

        action();

        this.props.entireGame.updateGameSettings(this.gameSettings);
    }
}
