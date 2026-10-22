require("./dom-setup.cjs");
const assert = require("node:assert/strict");
const { test, afterEach } = require("node:test");
const React = require("react");
const { render, fireEvent, cleanup, act } = require("@testing-library/react");
const { runInAction } = require("mobx");
const EntireGame = require("../src/common/EntireGame").default;
const { GameSettings } = require("../src/common/GameSettings");
const Ingame =
  require("../src/common/ingame-game-state/IngameGameState").default;
const Game =
  require("../src/common/ingame-game-state/game-data-structure/Game").default;
const House =
  require("../src/common/ingame-game-state/game-data-structure/House").default;
const World =
  require("../src/common/ingame-game-state/game-data-structure/World").default;
const Player = require("../src/common/ingame-game-state/Player").default;
const { default: User, UserSettings } = require("../src/server/User");
const Planning =
  require("../src/common/ingame-game-state/planning-game-state/PlanningGameState").default;
const PlaceOrders =
  require("../src/common/ingame-game-state/planning-game-state/place-orders-for-vassals-game-state/PlaceOrdersForVassalsGameState").default;
const SinglePlaceOrders =
  require("../src/common/ingame-game-state/planning-game-state/place-orders-for-vassals-game-state/resolve-single-place-orders-for-vassals-game-state/ResolveSinglePlaceOrdersForVassalsGameState").default;
const SettingsComponent =
  require("../src/client/GameSettingsComponent").default;
const EntireGameComponent =
  require("../src/client/EntireGameComponent").default;
const SinglePlaceOrdersComponent =
  require("../src/client/game-state-panel/ResolveSinglePlaceOrdersForVassalsComponent").default;
const BetterMap = require("../src/utils/BetterMap").default;
const orders =
  require("../src/common/ingame-game-state/game-data-structure/orders").default;
const { default: i18n, languages, t } = require("../src/client/i18n");

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage("en");
});

function fixture(enabled) {
  const root = new EntireGame("test", "owner", "Empowered Vassals");
  root.gameSettings.vassals = false;
  root.gameSettings.empoweredVassals = enabled;
  const ingame = new Ingame(root);
  const game = new Game(ingame);
  ingame.game = game;
  const houses = ["stark", "lannister", "baratheon"].map(
    (id) =>
      new House(id, id, "white", new BetterMap(), 0, 20, 0, new BetterMap())
  );
  const [commander, vassal, secondVassal] = houses;
  const user = new User("owner", "Owner", "Owner", root, new UserSettings());
  const player = new Player(user, commander);
  ingame.players.set(user, player);
  game.houses = new BetterMap(houses.map((house) => [house.id, house]));
  game.vassalRelations.set(vassal, commander);
  game.vassalRelations.set(secondVassal, commander);
  game.kingsCourtTrack = houses;
  game.starredOrderRestrictions = [0, 0, 0];
  class TestRegion {
    constructor(id, house) {
      this.id = id;
      this.house = house;
      this.units = new Map([[1, {}]]);
    }
    getController() {
      return this.house;
    }
  }
  const regions = [vassal, secondVassal].flatMap((house) =>
    Array.from(
      { length: 4 },
      (_, i) => new TestRegion(`${house.id}-${i}`, house)
    )
  );
  game.world = new World(
    new BetterMap(regions.map((region) => [region.id, region])),
    root.gameSettings
  );
  const planning = new Planning(ingame);
  planning.planningRestrictions = [];
  const state = new PlaceOrders(planning);
  const single = new SinglePlaceOrders(state);
  runInAction(() => {
    root.childGameState = ingame;
    ingame.childGameState = planning;
    planning.childGameState = state;
    state.childGameState = single;
    single.house = commander;
  });
  return { root, game, player, vassal, secondVassal, regions, state, single };
}

for (const enabled of [false, true]) {
  test(`${enabled ? "empowered" : "standard"} vassals enforce the order cap through the server handler`, () => {
    const { state, single, player, regions, vassal } = fixture(enabled);
    const limit = enabled ? 3 : 2;
    for (let i = 0; i < limit; i++) {
      single.onPlayerMessage(player, {
        type: "place-order",
        regionId: regions[i].id,
        orderId: 16 + i
      });
    }
    assert.equal(state.getPlacedOrdersOfHouse(vassal).length, limit);
    assert.equal(state.canSubmit(player).status, true);
    assert.deepEqual(
      state.getPossibleRegionsForOrders(vassal),
      regions.slice(0, limit)
    );
    single.onPlayerMessage(player, {
      type: "place-order",
      regionId: regions[limit].id,
      orderId: 19
    });
    assert.equal(state.placedOrders.has(regions[limit]), false);
    single.onPlayerMessage(player, {
      type: "place-order",
      regionId: regions[0].id,
      orderId: null
    });
    assert.equal(state.getPossibleRegionsForOrders(vassal).length, 4);
    assert.equal(state.canSubmit(player).reason, "not-all-regions-filled");
  });

  test(`${enabled ? "empowered" : "standard"} vassals ${enabled ? "accept" : "reject"} March -1 without changing player orders`, () => {
    const { game, state, single, player, regions, vassal } = fixture(enabled);
    const playerOrders = game.getOrdersListForHouse(player.house);
    single.onPlayerMessage(player, {
      type: "place-order",
      regionId: regions[0].id,
      orderId: 1
    });
    assert.equal(state.placedOrders.has(regions[0]), enabled);
    if (enabled) {
      assert.equal(game.getOrdersListForHouse(vassal)[0], orders.get(1));
      assert.equal(state.placedOrders.get(regions[0]), orders.get(1));
      assert.equal(state.isOrderAvailable(vassal, orders.get(1)), false);
      assert.equal(state.isOrderAvailable(vassal, orders.get(16)), true);
      single.onPlayerMessage(player, {
        type: "place-order",
        regionId: regions[1].id,
        orderId: 1
      });
      assert.equal(state.placedOrders.has(regions[1]), false);
      single.onPlayerMessage(player, {
        type: "place-order",
        regionId: regions[1].id,
        orderId: 16
      });
      assert.equal(state.placedOrders.get(regions[1]), orders.get(16));
    }
    assert.equal(
      game.getOrdersListForHouse(vassal).includes(orders.get(3)),
      false
    );
    assert.deepEqual(game.getOrdersListForHouse(player.house), playerOrders);
  });
}

test("an over-limit vassal cannot be masked by another vassal during submission", () => {
  const { state, regions, player } = fixture(true);
  for (let i = 0; i < 4; i++)
    state.placedOrders.set(regions[i], orders.get(16 + i));
  assert.deepEqual(state.canSubmit(player), {
    status: false,
    reason: "too-much-orders-placed"
  });
});

test("the lobby setting round-trips, occupies the requested position, and stays independent of MoD Vassals", () => {
  const root = new EntireGame("test", "owner", "Lobby");
  const owner = new User("owner", "Owner", "Owner", root, new UserSettings());
  runInAction(() => root.firstStart());
  root.onSendClientMessage = (message) => {
    assert.equal(message.type, "change-game-settings");
    runInAction(() => root.lobbyGameState.onClientMessage(owner, message));
  };
  const view = render(
    React.createElement(SettingsComponent, {
      entireGame: root,
      gameClient: { isRealOwner: () => true }
    })
  );
  const switches = [...view.container.querySelectorAll("input")];
  const toggle = view.container.querySelector("#empowered-vassals-setting");
  assert.equal(
    switches[switches.indexOf(toggle) - 1].id,
    "gift-power-tokens-setting"
  );
  assert.equal(
    switches[switches.indexOf(toggle) + 1].id,
    "random-vassal-assignment-setting"
  );
  assert.equal(toggle.checked, false);
  fireEvent.click(toggle);
  assert.equal(toggle.checked, true);
  assert.equal(
    GameSettings.deserializeFromServer(root.gameSettings.serializeToClient())
      .empoweredVassals,
    true
  );
  fireEvent.click(view.container.querySelector("#vassals-setting"));
  assert.equal(root.gameSettings.vassals, false);
  assert.equal(toggle.checked, true);
  assert.equal(toggle.disabled, false);
  assert.equal(
    GameSettings.deserializeFromServer(root.gameSettings.serializeToClient())
      .empoweredVassals,
    true
  );
  fireEvent.click(toggle);
  assert.equal(toggle.checked, false);
  fireEvent.click(toggle);
  assert.equal(toggle.checked, true);
  assert.equal(root.gameSettings.empoweredVassals, true);
  assert.equal(
    GameSettings.deserializeFromServer({
      setupId: "base-game",
      playerCount: 6,
      pbem: true
    }).empoweredVassals,
    false
  );
});

test("the title-bar icon is only rendered for Empowered Vassals", () => {
  const root = new EntireGame("test", "owner", "Icons");
  const component = new EntireGameComponent({
    gameClient: { entireGame: root }
  });
  assert.equal(component.renderEmpoweredVassalsImage(), false);
  root.gameSettings.empoweredVassals = true;
  const view = render(component.renderEmpoweredVassalsImage());
  assert.match(
    view.getByRole("img", { name: "Empowered Vassals" }).src,
    /empowered-vassals\.svg$/
  );
});

test("the fewer-orders confirmation interpolates the active cap in every language", async () => {
  for (const { code } of languages) {
    await i18n.changeLanguage(code);
    for (const enabled of [false, true]) {
      const { single, state, player } = fixture(enabled);
      const component = new SinglePlaceOrdersComponent({
        gameState: single,
        gameClient: {
          authenticatedPlayer: player,
          doesControlHouse: () => true
        }
      });
      let confirmation;
      const original = window.confirm;
      window.confirm = (message) => {
        confirmation = message;
        return false;
      };
      try {
        act(() => component.onSubmitClick());
      } finally {
        window.confirm = original;
      }
      assert.equal(
        confirmation,
        t("resolveSinglePlaceOrdersForVassals.confirmFewerOrders", {
          maxOrders: state.maxOrders
        })
      );
      assert.ok(confirmation.includes(String(enabled ? 3 : 2)), code);
      assert.doesNotMatch(confirmation, /\{\{/);
    }
  }
});
