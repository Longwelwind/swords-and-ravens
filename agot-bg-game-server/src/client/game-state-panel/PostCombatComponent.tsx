import {observer} from "mobx-react";
import {Component, ReactNode} from "react";
import * as React from "react";
import ChooseCasualtiesGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/choose-casualties-game-state/ChooseCasualtiesGameState";
import ChooseCasualtiesComponent from "./ChooseCasualtiesComponent";
import GameStateComponentProps from "./GameStateComponentProps";
import renderChildGameState from "../utils/renderChildGameState";
import PostCombatGameState
, { CombatStats }    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/PostCombatGameState";
import AfterWinnerDeterminationComponent from "./house-card-abilities/AfterWinnerDeterminationComponent";
import AfterWinnerDeterminationGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-winner-determination-game-state/AfterWinnerDeterminationGameState";
import AfterCombatHouseCardAbilitiesGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/after-combat-house-card-abilities-game-state/AfterCombatHouseCardAbilitiesGameState";
import AfterCombatHouseCardAbilitiesComponent from "./house-card-abilities/AfterCombatHouseCardAbilitiesComponent";
import ResolveRetreatGameState
    from "../../common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/resolve-retreat-game-state/ResolveRetreatGameState";
import ResolveRetreatComponent from "./ResolveRetreatComponent";
import Col from "react-bootstrap/Col";
import CombatInfoComponent from "../CombatInfoComponent";
import HouseCard from "../../common/ingame-game-state/game-data-structure/house-card/HouseCard";
import unitTypes from "../../common/ingame-game-state/game-data-structure/unitTypes";
import { tidesOfBattleCards } from "../../common/ingame-game-state/game-data-structure/static-data-structure/tidesOfBattleCards";

@observer
export default class PostCombatComponent extends Component<GameStateComponentProps<PostCombatGameState>> {
    get postCombat(): PostCombatGameState {
        return this.props.gameState;
    }

    get combatStats(): CombatStats[] {
        return this.props.gameState.combatStats;
    }

    render(): ReactNode {
        const houseCombatDatas = this.combatStats.map(stat => {
            const house = this.postCombat.game.houses.get(stat.house);
            const houseCard = stat.houseCard ? this.getHouseCard(stat.houseCard) : null;
            const tidesOfBattleCard = stat.tidesOfBattleCard == undefined ? undefined : stat.tidesOfBattleCard != null ? tidesOfBattleCards.get(stat.tidesOfBattleCard) : null;

            return {
                ...stat,
                house,
                region: this.postCombat.world.regions.get(stat.region),
                houseCard: houseCard,
                armyUnits: stat.armyUnits.map(ut => unitTypes.get(ut)),
                tidesOfBattleCard: tidesOfBattleCard,
                isWinner: house == this.postCombat.winner
            };
        });
        return (
            <>
                {houseCombatDatas.length > 0 && <Col xs={12}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <h5>Battle for <b>{houseCombatDatas[1].region.name}</b></h5>
                    </div>
                    <CombatInfoComponent housesCombatData={houseCombatDatas}/>
                </Col>}
                <Col xs={12} className="text-center">
                    Winner: {this.postCombat.winner.name}
                </Col>
                {renderChildGameState(this.props, [
                    [ChooseCasualtiesGameState, ChooseCasualtiesComponent],
                    [ResolveRetreatGameState, ResolveRetreatComponent],
                    [AfterWinnerDeterminationGameState, AfterWinnerDeterminationComponent],
                    [AfterCombatHouseCardAbilitiesGameState, AfterCombatHouseCardAbilitiesComponent]
                ])}
            </>
        );
    }

    getHouseCard(id: string): HouseCard | null {
        const filtered = this.postCombat.combat.houseCombatDatas.values.filter(hcd => hcd.houseCard && hcd.houseCard.id == id);
        if (filtered.length == 1) {
            return filtered[0].houseCard;
        }

        return null;
    }
}
