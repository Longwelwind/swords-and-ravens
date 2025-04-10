import { GameLogData } from "../GameLog";
import IEntireGameSnapshot from "./IEntireGameSnapshot";

export default class GameReplayManager {
  private modifyingGameLogIds = [
    "turn-begin",
    "march-resolved",
    "westeros-cards-drawn",
    "wildling-bidding",
    "player-mustered",
    "raven-holder-replace-order",
    "raid-done",
    "combat-valyrian-sword-used",
    "clash-of-kings-bidding-done",
    "clash-of-kings-final-ordering",
    "consolidate-power-order-resolved",
    "armies-reconciled",
    "patchface-used",
    "melisandre-dwd-used",
    "jon-snow-used",
    "doran-used",
    "ser-gerris-drinkwater-used",
    "reek-used",
    "reek-returned-ramsay",
    "lysa-arryn-mod-used",
    "rodrik-the-reader-used",
    "qyburn-used",
    "aeron-damphair-used",
    "retreat-region-chosen",
    "retreat-failed",
    "retreat-casualties-suffered",
    "enemy-port-taken",
    "ships-destroyed-by-empty-castle",
    "preemptive-raid-units-killed",
    "preemptive-raid-track-reduced",
    "preemptive-raid-wildlings-attack",
    "massing-on-the-milkwater-house-cards-removed",
    "a-king-beyond-the-wall-lowest-reduce-tracks",
    "a-king-beyond-the-wall-house-reduce-track",
    "a-king-beyond-the-wall-highest-top-track",
    "mammoth-riders-destroy-units",
    "mammoth-riders-return-card",
    "the-horde-descends-highest-muster",
    "the-horde-descends-units-killed",
    "crow-killers-knights-replaced",
    "crow-killers-knights-killed",
    "crow-killers-footman-upgraded",
    "skinchanger-scout-nights-watch-victory",
    "skinchanger-scout-wildling-victory",
    "rattleshirts-raiders-nights-watch-victory",
    "rattleshirts-raiders-wildling-victory",
    "game-of-thrones-power-tokens-gained",
    "immediatly-killed-after-combat",
    "killed-after-combat",
    "supply-adjusted",
    "commander-power-token-gained",
    "beric-dondarrion-used",
    "varys-used",
    "jon-connington-used",
    "bronn-used",
    "house-card-picked",
    "littlefinger-power-tokens-gained",
    "alayne-stone-used",
    "lysa-arryn-ffc-power-tokens-gained",
    "anya-waynwood-power-tokens-gained",
    "robert-arryn-used",
    "house-card-removed-from-game",
    "viserys-targaryen-used",
    "illyrio-mopatis-power-tokens-gained",
    "daenerys-targaryen-b-power-tokens-discarded",
    "missandei-used",
    "power-tokens-gifted",
    "influence-track-position-chosen",
    "place-loyalty-choice",
    "loyalty-token-placed",
    "loyalty-token-gained",
    "fire-made-flesh-choice",
    "playing-with-fire-choice",
    "the-long-plan-choice",
    "move-loyalty-token-choice",
    "loan-purchased",
    "order-removed",
    "interest-paid",
    "debt-paid",
    "customs-officer-power-tokens-gained",
    "sellswords-placed",
    "the-faceless-men-units-destroyed",
    "pyromancer-executed",
    "expert-artificer-executed",
    "loyal-maester-executed",
    "master-at-arms-executed",
    "savvy-steward-executed",
    "special-objective-scored",
    "objective-scored",
    "ironborn-raid",
    "garrison-removed",
    "garrison-returned",
    "orders-revealed",
    "house-cards-returned",
    "leave-power-token-choice",
    "balon-greyjoy-asos-power-tokens-gained",
    "mace-tyrell-asos-order-placed",
    "bran-stark-used",
    "cersei-lannister-asos-power-tokens-discarded",
    "doran-martell-asos-used",
    "melisandre-of-asshai-power-tokens-gained",
    "salladhar-saan-asos-power-tokens-changed",
    "ser-ilyn-payne-asos-casualty-suffered",
    "stannis-baratheon-asos-used",
    "control-power-token-removed",
    "last-land-unit-transformed-to-dragon",
    "cersei-lannister-order-removed",
    "loras-tyrell-attack-order-moved",
    "mace-tyrell-footman-killed",
    "massing-on-the-milkwater-house-cards-back",
    "qarl-the-maid-tokens-gained",
    "queen-of-thorns-order-removed",
    "renly-baratheon-footman-upgraded-to-knight",
    "roose-bolton-house-cards-returned",
    "ser-ilyn-payne-footman-killed",
    "tywin-lannister-power-tokens-gained",
  ];

  /*
    Replacing GameLogData by ModifiingGameLog allows to check in VS Code that all modifying logs are handled in the applyLogEvent function.
  */
  applyLogEvent(
    log: GameLogData,
    snap: IEntireGameSnapshot
  ): IEntireGameSnapshot {
    if (!this.modifyingGameLogIds.includes(log.type) || !snap.gameSnapshot) {
      return snap;
    }

    switch (log.type) {
      case "turn-begin":
        snap.gameSnapshot.round = log.turn;
        return snap;

      case "march-resolved":
        return snap;

      case "westeros-cards-drawn":
        return snap;

      case "wildling-bidding":
        return snap;

      case "player-mustered":
        return snap;

      case "raven-holder-replace-order":
        return snap;

      case "raid-done":
        return snap;

      case "combat-valyrian-sword-used":
        return snap;

      case "clash-of-kings-bidding-done":
        return snap;

      case "clash-of-kings-final-ordering":
        return snap;

      case "consolidate-power-order-resolved":
        return snap;

      case "armies-reconciled":
        return snap;

      case "patchface-used":
        return snap;

      case "melisandre-dwd-used":
        return snap;

      case "jon-snow-used":
        return snap;

      case "doran-used":
        return snap;

      case "ser-gerris-drinkwater-used":
        return snap;

      case "reek-used":
        return snap;

      case "reek-returned-ramsay":
        return snap;

      case "lysa-arryn-mod-used":
        return snap;

      case "rodrik-the-reader-used":
        return snap;

      case "qyburn-used":
        return snap;

      case "aeron-damphair-used":
        return snap;

      case "retreat-region-chosen":
        return snap;

      case "retreat-failed":
        return snap;

      case "retreat-casualties-suffered":
        return snap;

      case "enemy-port-taken":
        return snap;

      case "ships-destroyed-by-empty-castle":
        return snap;

      case "preemptive-raid-units-killed":
        return snap;

      case "preemptive-raid-track-reduced":
        return snap;

      case "preemptive-raid-wildlings-attack":
        return snap;

      case "massing-on-the-milkwater-house-cards-removed":
        return snap;

      case "a-king-beyond-the-wall-lowest-reduce-tracks":
        return snap;

      case "a-king-beyond-the-wall-house-reduce-track":
        return snap;

      case "a-king-beyond-the-wall-highest-top-track":
        return snap;

      case "mammoth-riders-destroy-units":
        return snap;

      case "mammoth-riders-return-card":
        return snap;

      case "the-horde-descends-highest-muster":
        return snap;

      case "the-horde-descends-units-killed":
        return snap;

      case "crow-killers-knights-replaced":
        return snap;

      case "crow-killers-knights-killed":
        return snap;

      case "crow-killers-footman-upgraded":
        return snap;

      case "skinchanger-scout-nights-watch-victory":
        return snap;

      case "skinchanger-scout-wildling-victory":
        return snap;

      case "rattleshirts-raiders-nights-watch-victory":
        return snap;

      case "rattleshirts-raiders-wildling-victory":
        return snap;

      case "game-of-thrones-power-tokens-gained":
        return snap;

      case "immediatly-killed-after-combat":
        return snap;

      case "killed-after-combat":
        return snap;

      case "supply-adjusted":
        return snap;

      case "commander-power-token-gained":
        return snap;

      case "beric-dondarrion-used":
        return snap;

      case "varys-used":
        return snap;

      case "jon-connington-used":
        return snap;

      case "bronn-used":
        return snap;

      case "house-card-picked":
        return snap;

      case "littlefinger-power-tokens-gained":
        return snap;

      case "alayne-stone-used":
        return snap;

      case "lysa-arryn-ffc-power-tokens-gained":
        return snap;

      case "anya-waynwood-power-tokens-gained":
        return snap;

      case "robert-arryn-used":
        return snap;

      case "house-card-removed-from-game":
        return snap;

      case "viserys-targaryen-used":
        return snap;

      case "illyrio-mopatis-power-tokens-gained":
        return snap;

      case "daenerys-targaryen-b-power-tokens-discarded":
        return snap;

      case "missandei-used":
        return snap;

      case "power-tokens-gifted":
        return snap;

      case "influence-track-position-chosen":
        return snap;

      case "place-loyalty-choice":
        return snap;

      case "loyalty-token-placed":
        return snap;

      case "loyalty-token-gained":
        return snap;

      case "fire-made-flesh-choice":
        return snap;

      case "playing-with-fire-choice":
        return snap;

      case "the-long-plan-choice":
        return snap;

      case "move-loyalty-token-choice":
        return snap;

      case "loan-purchased":
        return snap;

      case "order-removed":
        return snap;

      case "interest-paid":
        return snap;

      case "debt-paid":
        return snap;

      case "customs-officer-power-tokens-gained":
        return snap;

      case "sellswords-placed":
        return snap;

      case "the-faceless-men-units-destroyed":
        return snap;

      case "pyromancer-executed":
        return snap;

      case "expert-artificer-executed":
        return snap;

      case "loyal-maester-executed":
        return snap;

      case "master-at-arms-executed":
        return snap;

      case "savvy-steward-executed":
        return snap;

      case "special-objective-scored":
        return snap;

      case "objective-scored":
        return snap;

      case "ironborn-raid":
        return snap;

      case "garrison-removed":
        return snap;

      case "garrison-returned":
        return snap;

      case "orders-revealed":
        return snap;

      case "house-cards-returned":
        return snap;

      case "leave-power-token-choice":
        return snap;

      case "balon-greyjoy-asos-power-tokens-gained":
        return snap;

      case "mace-tyrell-asos-order-placed":
        return snap;

      case "bran-stark-used":
        return snap;

      case "cersei-lannister-asos-power-tokens-discarded":
        return snap;

      case "doran-martell-asos-used":
        return snap;

      case "melisandre-of-asshai-power-tokens-gained":
        return snap;

      case "salladhar-saan-asos-power-tokens-changed":
        return snap;

      case "ser-ilyn-payne-asos-casualty-suffered":
        return snap;

      case "stannis-baratheon-asos-used":
        return snap;

      case "control-power-token-removed":
        return snap;

      case "last-land-unit-transformed-to-dragon":
        return snap;

      case "cersei-lannister-order-removed":
        return snap;

      case "loras-tyrell-attack-order-moved":
        return snap;

      case "mace-tyrell-footman-killed":
        return snap;

      case "massing-on-the-milkwater-house-cards-back":
        return snap;

      case "qarl-the-maid-tokens-gained":
        return snap;

      case "queen-of-thorns-order-removed":
        return snap;

      case "renly-baratheon-footman-upgraded-to-knight":
        return snap;

      case "roose-bolton-house-cards-returned":
        return snap;

      case "ser-ilyn-payne-footman-killed":
        return snap;

      case "tywin-lannister-power-tokens-gained":
        return snap;

      default:
        throw new Error(`Unhandled modifiing log type '${log.type}'`);
    }
  }
}
