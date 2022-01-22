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
        return this.props.gameClient.isOwner();
    }

    get selectedGameSetupName(): string {
        const name = allGameSetups.get(this.props.entireGame.gameSettings.setupId).name;
        return name.substring(0, name.indexOf(" ("));
    }

    render(): ReactNode {
        return (
            <Col id="game-settings-container" xs={12} className="mt-2">
                <Row id="live-pbem-row" className="justify-content-center mb-3">
                    {this.props.entireGame.childGameState instanceof IngameGameState && (
                        <Col xs={12} className="text-center mb-2">
                            {this.selectedGameSetupName}
                        </Col>
                    )}
                        <Row className="justify-content-center">
                            <Col xs={12} className="d-flex align-items-center">
                                <OverlayTrigger overlay={
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
                                </OverlayTrigger>
                                {this.gameSettings.pbem && !(this.props.entireGame.childGameState instanceof IngameGameState) && (
                                    <FormCheck
                                        id="start-when-full-setting"
                                        className="mx-3"
                                        type="switch"
                                        label={
                                            <OverlayTrigger overlay={
                                                <Tooltip id="start-when-full-setting-tooltip">
                                                    If enabled, the game will start automatically once all seats are taken.
                                                </Tooltip>}>
                                                <label htmlFor="start-when-full-setting">Start when full</label>
                                            </OverlayTrigger>}
                                        checked={this.gameSettings.startWhenFull}
                                        onChange={() => this.changeGameSettings(() => this.gameSettings.startWhenFull = !this.gameSettings.startWhenFull)}
                                    />
                                )}
                            </Col>
                        </Row>
                </Row>
                {this.props.entireGame.childGameState instanceof LobbyGameState && this.renderLobbySettings()}
            </Col>
        );
    }
    renderLobbySettings(): ReactNode {
        return <Row className="mt-2">
            <Col md="12" lg="auto" id="base-settings-col" className="no-gutters">
                <Col xs="12">
                    <select id="setups" name="setups"
                        value={this.gameSettings.setupId}
                        onChange={e => this.onSetupChange(e.target.value)}
                        style={{marginBottom: "8px"}}
                    >
                        {this.createSetupItems()}
                    </select>
                </Col>
                <Col xs="auto">
                    <select id="player-count" name="playerCount"
                        value={this.gameSettings.playerCount}
                        onChange={e => this.onPlayerCountChange(e.target.value)}
                        style={{marginBottom: "8px"}}
                    >
                        {this.createPlayerCountItems()}
                    </select>&nbsp;&nbsp;Players
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="adwd-house-cards"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="adwd-house-cards-tooltip">
                                    The house cards will come from the A Dance with Dragons and A Feast for Crows expansions.
                                </Tooltip>}>
                                <label htmlFor="adwd-house-cards">Use <i>ADwD</i> house cards</label>
                            </OverlayTrigger>}
                        disabled={this.props.entireGame.isDanceWithDragons}
                        checked={this.gameSettings.adwdHouseCards}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.adwdHouseCards = !this.gameSettings.adwdHouseCards)}
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
                        id="random-houses-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="random-houses-tooltip">
                                    All houses will be randomized before the game starts.
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
                                    Only chosen houses will be randomized before the game starts.
                                    This way users can define player and vassal houses and are still able to randomize the player houses.
                                </Tooltip>}>
                                <label htmlFor="random-chosen-houses-setting">Random chosen houses</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.randomChosenHouses}
                        onChange={() => this.onRandomChosenHousesChange()}
                    />
                </Col>
            </Col>
            <Col md="12" lg="auto" id="mod-settings-col" className="no-gutters">
                <Col xs="12">
                    <FormCheck
                        id="vassals-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="vassals-tooltip">
                                    Unassigned houses will be vassals introduced by the Mother of Dragons expansion.
                                </Tooltip>}>
                                <label htmlFor="vassals-setting">MoD Vassals</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.vassals}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.vassals = !this.gameSettings.vassals)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="sea-orders-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="sea-orders-tooltip">
                                    Enable Sea Order tokens from the Mother of Dragons expansion.
                                </Tooltip>}>
                                <label htmlFor="sea-orders-setting">MoD Sea Order Tokens</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.seaOrderTokens}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.seaOrderTokens = !this.gameSettings.seaOrderTokens)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="seven-pt-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="seven-pt-tooltip">
                                    Houses will start with 7 Power tokens instead of 5.
                                </Tooltip>}>
                                <label htmlFor="seven-pt-setting">MoD Start with 7 PT</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.startWithSevenPowerTokens}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.startWithSevenPowerTokens = !this.gameSettings.startWithSevenPowerTokens)}
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
            </Col>
            <Col md="12" lg="auto" id="draft-settings-col" className="no-gutters">
                <Col xs="12">
                    <FormCheck
                        id="draft-house-cards-settings"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="draft-house-cards-tooltip">
                                    Players will draft their house cards or a position on a chosen Influence track step by step
                                    in a randomly chosen order before the game starts. House cards can be chosen from all 2nd Edition Base Game house cards
                                    and from all 2nd Edition expansions (ADwD, AFfC, MoD) house cards.
                                </Tooltip>}>
                                <label htmlFor="draft-house-cards-settings">Draft house cards</label>
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
                                    Same as normal draft mode but house cards can be chosen from the selected game scenario only.
                                </Tooltip>}>
                                <label htmlFor="limited-draft-setting">Limited draft</label>
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
                                    Players will draft their house cards simultaneously from the available decks of their house.
                                    Afterwards players will draft the Influence tracks step by step in a randomly chosen order.
                                </Tooltip>}>
                                <label htmlFor="thematic-draft-setting">Thematic draft</label>
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
                                    Players receive random house cards and influence positions. Can be combined with limited draft.
                                </Tooltip>}>
                                <label htmlFor="blind-draft-setting">Blind draft</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.blindDraft}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.blindDraft = !this.gameSettings.blindDraft)}
                    />
                </Col>
            </Col>
            <Col md="12" lg="auto" id="custom-settings-col" className="no-gutters">
                <Col xs="12">
                    <FormCheck
                        id="westeros-phase-variant-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="westeros-phase-variant-tooltip">
                                    Players may look at the next 3 Westeros cards from each deck at any time.
                                </Tooltip>}>
                                <label htmlFor="westeros-phase-variant-setting">CoK Westeros Phase Variant</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.cokWesterosPhase}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.cokWesterosPhase = !this.gameSettings.cokWesterosPhase)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="use-vassal-positions-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="use-vassal-positions-tooltip">
                                    Player houses will as well start with their vassal starting positions.
                                </Tooltip>}>
                                <label htmlFor="use-vassal-positions-setting">Use vassal starting positions</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.useVassalPositions}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.useVassalPositions = !this.gameSettings.useVassalPositions)}
                    />
                </Col>
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
                        id="endless-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="endless-setting-tooltip">
                                    The game will last until round 1000 unless a winner is declared earlier.
                                </Tooltip>}>
                                <label htmlFor="endless-setting">Endless mode</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.endless}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.endless = !this.gameSettings.endless)}
                    />
                </Col>
            </Col>
            <Col md="12" lg="auto" id="custom-settings-2-col" className="no-gutters">
                <Col xs="12">
                    <FormCheck
                        id="mixed-wd1-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="mixed-wd1-setting-tooltip">
                                    If enabled, 1&nbsp;<i>Mustering</i> card will be replaced by <i>Rally&nbsp;The&nbsp;Men</i>,
                                    1&nbsp;<i>Supply</i> by <i>Famine</i> and 1&nbsp;<i>A&nbsp;Throne&nbsp;of&nbsp;Blades</i> by <i>The&nbsp;Burden&nbsp;of&nbsp;Power</i>.
                                </Tooltip>}>
                                <label htmlFor="mixed-wd1-setting">Mixed Westeros Deck 1</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.mixedWesterosDeck1}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.mixedWesterosDeck1 = !this.gameSettings.mixedWesterosDeck1)}
                    />
                </Col>
                <Col xs="12">
                    <FormCheck
                        id="remove-tob3-setting"
                        type="switch"
                        label={
                            <OverlayTrigger overlay={
                                <Tooltip id="remove-tob3-setting-tooltip">
                                    If enabled, 3s cards will be removed from the Tides of Battle deck.
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
                                    If enabled, skull cards will be removed from the Tides of Battle deck.
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
                                    If enabled, the Tides of Battle deck will only contain two 2s cards instead of four.
                                </Tooltip>}>
                                <label htmlFor="limit-tob2-setting">Limit ToB 2s cards</label>
                            </OverlayTrigger>}
                        checked={this.gameSettings.limitTob2}
                        onChange={() => this.changeGameSettings(() => this.gameSettings.limitTob2 = !this.gameSettings.limitTob2)}
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