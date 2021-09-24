import { observable } from "mobx";
import groupBy from "../../../utils/groupBy";
import BetterMap from "../../../utils/BetterMap";
import shuffleInPlace from "../../../utils/shuffleInPlace";
import Game from "./Game";
import House from "./House";
import LoanCard, { SerializedLoanCard } from "./loan-card/LoanCard";
import LoanCardType from "./loan-card/LoanCardType";

export default class IronBank {
    game: Game;
    @observable loanCardDeck: LoanCard[];
    @observable purchasedLoans: LoanCard[] = [];
    @observable loanSlots: (LoanCard | null)[] = [null, null, null];

    loanCosts = [7, 4, 1];

    get controllerOfBraavos(): House | null {
        const braavos = this.game.world.regions.tryGet("braavos", null);
        return braavos?.getController() ?? null;
    }

    get purchasedLoansPerHouse(): BetterMap<House, LoanCard[]> {
        return groupBy(this.purchasedLoans, lc => lc.purchasedBy) as BetterMap<House, LoanCard[]>;
    }

    get interestCost(): [House, number][] {
        return this.purchasedLoansPerHouse.entries.map(([house, lcs]) => [house, lcs.length]);
    }

    constructor(game: Game) {
        this.game = game;
    }

    getPurchasableLoans(house: House): {loan: LoanCardType, slotIndex: number, costs: number}[] {
        const costsForHouse = this.getLoanCostsForHouse(house);

        const result: {loan: LoanCardType, slotIndex: number, costs: number}[] = [];

        for (let i=0; i < costsForHouse.length; i++) {
            const loan = this.loanSlots[i];
            if (loan && house.powerTokens >= costsForHouse[i]) {
                result.push({
                    loan: loan.type,
                    costs: costsForHouse[i],
                    slotIndex: i
                });
            }
        }

        return result;
    }

    getLoanCostsForHouse(house: House): number[] {
        return house == this.controllerOfBraavos ? this.loanCosts.map(cost => cost - 1) : this.loanCosts;
    }

    drawNewLoanCard(): void {
        const drawnCard = this.loanCardDeck.shift();
        this.loanSlots.unshift(drawnCard ?? null);
        const removedFromSlots = this.loanSlots.pop();
        if (removedFromSlots) {
            removedFromSlots.discarded = true;
            this.loanCardDeck.push(removedFromSlots);
        }

        if (this.loanSlots.length != 3) {
            throw new Error();
        }

        this.sendUpdateLoanCards();
    }

    purchaseLoan(house: House, loanIndex: number, regionOfOrderId: string): LoanCardType | null{
        if (loanIndex >= this.loanSlots.length) {
            return null;
        }

        const loan = this.loanSlots[loanIndex];
        const costs = this.getLoanCostsForHouse(house)[loanIndex];
        if (!loan || house.powerTokens < costs) {
            return null;
        }

        this.game.ingame.changePowerTokens(house, -costs);

        loan.purchasedBy = house;
        this.purchasedLoans.push(loan);
        this.loanSlots[loanIndex] = null;

        this.game.ingame.log({
            type: "loan-purchased",
            house: house.id,
            loanType: loan.type.id,
            paid: costs,
            region: regionOfOrderId
        });

        this.sendUpdateLoanCards();

        return loan.type;
    }

    sendUpdateLoanCards(): void {
        this.game.ingame.entireGame.broadcastToClients({
            type: "update-loan-cards",
            loanCardDeck: shuffleInPlace(this.loanCardDeck.map(lc => (lc.serializeToClient()))),
            purchasedLoans: this.purchasedLoans.map(lc => lc.serializeToClient()),
            loanSlots: this.loanSlots.map(lc => lc?.serializeToClient() ?? null)
        });
    }

    // Returns the amount of unpaid interest
    payInterest(): [House, number][] {
        const result = new BetterMap<House, number>();
        this.interestCost.forEach(([house, cost]) => {
            const reallyPaid = this.game.ingame.changePowerTokens(house, -cost);

            const delta = cost + reallyPaid;
            if (delta > 0) {
                result.set(house, delta);
            }

            this.game.ingame.log({
                type: "interest-paid",
                house: house.id,
                cost: cost,
                paid: reallyPaid
            });
        });

        const sortedByTurnOrder = new BetterMap<House, number>();
        this.game.getTurnOrder().forEach(h => {
            if (result.has(h)) {
                sortedByTurnOrder.set(h, result.get(h));
            }
        })
        return sortedByTurnOrder.entries;
    }

    serializeToClient(admin: boolean): SerializedIronBank {
        return {
            loanCardDeck: admin
                ? this.loanCardDeck.map(c => c.serializeToClient())
                : shuffleInPlace(this.loanCardDeck.map(c => c.serializeToClient())),
            loanSlots: this.loanSlots.map(c => c?.serializeToClient() ?? null),
            purchasedLoans: this.purchasedLoans.map(c => c.serializeToClient())
        };
    }

    static deserializeFromServer(game: Game, data: SerializedIronBank): IronBank {
        const ironBank = new IronBank(game);

        ironBank.loanCardDeck = data.loanCardDeck.map(c => LoanCard.deserializeFromServer(game, c));
        ironBank.purchasedLoans = data.purchasedLoans.map(c => LoanCard.deserializeFromServer(game, c));
        ironBank.loanSlots = data.loanSlots.map(c => c ? LoanCard.deserializeFromServer(game, c) : null);

        return ironBank;
    }
}

export interface SerializedIronBank {
    loanCardDeck: SerializedLoanCard[];
    purchasedLoans: SerializedLoanCard[];
    loanSlots: (SerializedLoanCard | null)[];
}