const modifyingGameLogTypes = new Set([
  "combat-result",
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
  "qyburn-used",
  "aeron-damphair-used",
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
  "the-horde-descends-units-killed",
  "crow-killers-knights-replaced",
  "crow-killers-knights-killed",
  "crow-killers-footman-upgraded",
  "skinchanger-scout-nights-watch-victory",
  "skinchanger-scout-wildling-victory",
  "rattleshirts-raiders-nights-watch-victory",
  "rattleshirts-raiders-wildling-victory",
  "game-of-thrones-power-tokens-gained",
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
  "roose-bolton-house-cards-returned",
  "ser-ilyn-payne-footman-killed",
  "tywin-lannister-power-tokens-gained",
  "attack",
  "vassals-claimed",
  "claim-vassals-began",
]);

const relatedCombatResultTypes = new Set([
  "killed-after-combat",
  "immediatly-killed-after-combat",
  "retreat-region-chosen",
  "arianne-martell-prevent-movement",
  "arianne-martell-force-retreat",
  "retreat-casualties-suffered",
  "renly-baratheon-footman-upgraded-to-knight",
]);

const combatTerminationLogTypes = new Set([
  "attack",
  "march-resolved",
  "combat-result", // not really possible as "attack" must "preceed", but for safety...
  "action-phase-resolve-consolidate-power-began",
  "winner-declared",
  "turn-begin",
  "westeros-phase-began",
]);

const replacementLogTypes = new Set(["player-replaced", "vassal-replaced"]);

export default class ReplayConstants {
  static modifyingGameLogTypes = modifyingGameLogTypes;
  static relatedCombatResultTypes = relatedCombatResultTypes;
  static combatTerminationLogTypes = combatTerminationLogTypes;
  static replacementLogTypes = replacementLogTypes;
}
