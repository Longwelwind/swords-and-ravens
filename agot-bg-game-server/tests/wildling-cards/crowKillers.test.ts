import setupAtwildlingsAttackGameState from "../utils/setupAtWildlingsAttackGameState";
import SelectUnitsGameState from "../../src/common/ingame-game-state/select-units-game-state/SelectUnitsGameState";
import CrowKillersWildlingVictoryGameState
    from "../../src/common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/crow-killers-wildling-victory-game-state/CrowKillersWildlingVictoryGameState";
import {footman, knight} from "../../src/common/ingame-game-state/game-data-structure/unitTypes";
import Unit from "../../src/common/ingame-game-state/game-data-structure/Unit";
import Region from "../../src/common/ingame-game-state/game-data-structure/Region";
import BetterMap from "../../src/utils/BetterMap";
import PlanningGameState from "../../src/common/ingame-game-state/planning-game-state/PlanningGameState";
import CrowKillersNightsWatchVictoryGameState
    from "../../src/common/ingame-game-state/westeros-game-state/wildlings-attack-game-state/crow-killers-nights-watch-victory-game-state/CrowKillersNightsWatchVictoryGameState";

describe("crow killers wildling card", () => {
    it("forces knights to be transformed into footmen on a wildling victory", () => {
        setupAtwildlingsAttackGameState({
            wildlingDeck: [{type: "crow-killers"}],
            wildlingStrength: 10,
            units: {
                "the-reach": [
                    {type: "footman", allegiance: "greyjoy"},
                    {type: "footman", allegiance: "greyjoy"},
                    {type: "knight", allegiance: "greyjoy"}
                ],
                "kings-landing": [
                    {type: "knight", allegiance: "stark"}
                ],
                "blackwater-bay": [
                    {type: "ship", allegiance: "lannister"}
                ],
                "blackwater": [
                    {type: "knight", allegiance: "greyjoy"}
                ],
                "dragonstone": [
                    {type: "footman", allegiance: "lannister"}
                ]
            },
            ironThroneTrack: ["lannister", "stark", "baratheon", "greyjoy"]
        }).execute(globalContext => {
            globalContext.lannister.as((_, bidding) => bidding.bid(0));
            globalContext.stark.as((_, bidding) => bidding.bid(1));
            globalContext.greyjoy.as((_, bidding) => bidding.bid(2));
            globalContext.baratheon.as((_, bidding) => bidding.bid(1));

            return globalContext.expectGameState<SelectUnitsGameState<CrowKillersWildlingVictoryGameState>>(SelectUnitsGameState);
        }).execute(globalContext => {
            // All knights of Lannister should be replaced by footman
            globalContext.forEach((context, _) => {
                const units = context.dragonstone.units.values;

                expect(units).toHaveLength(1);
                expect(units[0].allegiance).toBe(context.lannister);
                expect(units[0].type).toBe(footman);
            });

            globalContext.forEach((context, selectUnits) => expect(selectUnits.house).toBe(context.stark));

            globalContext.stark.as((context, selectUnits) => selectUnits.selectUnits(
                new BetterMap<Region, Unit[]>([[context.kingsLanding, context.kingsLanding.units.values]])
            ));

            return globalContext.expectGameState<SelectUnitsGameState<CrowKillersWildlingVictoryGameState>>(SelectUnitsGameState);
        }).execute(globalContext => {
            // Baratheon should have been passed since he doesn't have any units
            globalContext.forEach((context, selectUnits) => expect(selectUnits.house).toBe(context.greyjoy));

            globalContext.forEach((context, _) => {
                const units = context.kingsLanding.units.values;

                expect(units).toHaveLength(1);
                expect(units[0].allegiance).toBe(context.stark);
                expect(units[0].type).toBe(footman);
            });

            globalContext.greyjoy.as((context, selectUnits) => selectUnits.selectUnits(new BetterMap([
                [context.theReach, context.theReach.units.values.filter(u => u.type == knight)],
                [context.blackwater, context.blackwater.units.values]
            ])));

            return globalContext.expectGameState<PlanningGameState>(PlanningGameState);
        }).execute(globalContext => {
            globalContext.forEach((context, _) => {
                const unitsInTheReach = context.theReach.units.values;
                const unitsInTheBlackwater = context.blackwater.units.values;

                expect(unitsInTheReach).toHaveLength(3);
                unitsInTheReach.forEach(u => expect(u.type).toBe(footman));

                expect(unitsInTheBlackwater).toHaveLength(1);
                unitsInTheBlackwater.forEach(u => expect(u.type).toBe(footman));
            });
        });
    });

    it("allows footmen to be transformed into knights on a night's watch victory", () => {
        setupAtwildlingsAttackGameState({
            wildlingDeck: [{type: "crow-killers"}],
            wildlingStrength: 10,
            units: {
                "the-reach": [
                    {type: "footman", allegiance: "baratheon"},
                    {type: "footman", allegiance: "baratheon"},
                    {type: "knight", allegiance: "baratheon"}
                ],
                "kings-landing": [
                    {type: "knight", allegiance: "stark"}
                ],
                "blackwater-bay": [
                    {type: "ship", allegiance: "lannister"}
                ],
                "blackwater": [
                    {type: "footman", allegiance: "lannister"}
                ],
                "dragonstone": [
                    {type: "footman", allegiance: "baratheon"}
                ]
            },
            ironThroneTrack: ["lannister", "stark", "baratheon", "greyjoy"]
        }).execute(globalContext => {
            globalContext.lannister.as((_, bidding) => bidding.bid(3));
            globalContext.stark.as((_, bidding) => bidding.bid(3));
            globalContext.greyjoy.as((_, bidding) => bidding.bid(3));
            globalContext.baratheon.as((_, bidding) => bidding.bid(4));

            return globalContext.expectGameState<SelectUnitsGameState<CrowKillersNightsWatchVictoryGameState>>(SelectUnitsGameState);
        }).execute(globalContext => {
            globalContext.baratheon.as((context, selectUnits) => selectUnits.selectUnits(
                new BetterMap<Region, Unit[]>([
                    [context.theReach, [context.theReach.units.values.filter(u => u.type == footman)[0]]],
                    [context.dragonstone, context.dragonstone.units.values]
                ])
            ));

            return globalContext.expectGameState<PlanningGameState>(PlanningGameState);
        }).execute(globalContext => {
            globalContext.forEach((context, _) => {
                const unitsInTheReach = context.theReach.units.values;
                const unitsInDragonstone = context.dragonstone.units.values;

                expect(unitsInTheReach).toHaveLength(3);
                expect(unitsInTheReach.filter(u => u.type == knight)).toHaveLength(2);

                expect(unitsInDragonstone).toHaveLength(1);
                unitsInDragonstone.forEach(u => expect(u.type).toBe(knight));
            });
        });
    });
});
