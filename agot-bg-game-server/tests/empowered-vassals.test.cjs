require("./dom-setup.cjs");
const assert = require("node:assert/strict");
const { test, afterEach } = require("node:test");
const React = require("react");
const {
  render,
  fireEvent,
  cleanup,
  act,
  waitFor
} = require("@testing-library/react");
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
const {
  default: Vote,
  VoteState
} = require("../src/common/ingame-game-state/vote-system/Vote");
const {
  EnableEmpoweredVassals,
  ReplacePlayer
} = require("../src/common/ingame-game-state/vote-system/VoteType");
const IngameComponent = require("../src/client/IngameComponent").default;
const VoteComponent = require("../src/client/VoteComponent").default;
const GameLogListComponent =
  require("../src/client/GameLogListComponent").default;

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

function voteFixture(context, voterCount = 4) {
  const result = fixture(false);
  const { root, game, player } = result;
  const ingame = root.ingameGameState;
  root.users.set(player.user.id, player.user);
  for (const id of [
    "baratheon",
    "greyjoy",
    "tyrell",
    "martell",
    "arryn",
    "targaryen"
  ].slice(0, voterCount - 1)) {
    let house = game.houses.tryGet(id, null);
    if (!house) {
      house = new House(
        id,
        id,
        "white",
        new BetterMap(),
        0,
        20,
        0,
        new BetterMap()
      );
      game.houses.set(id, house);
    }
    if (game.vassalRelations.has(house)) game.vassalRelations.delete(house);
    const user = new User(id, id, id, root, new UserSettings());
    root.users.set(user.id, user);
    ingame.players.set(user, new Player(user, house));
  }
  const broadcasts = [];
  const saved = [];
  context.mock.method(root, "broadcastToClients", (message) =>
    broadcasts.push(message)
  );
  context.mock.method(root, "saveGame", (updateLastActive) =>
    saved.push({
      updateLastActive,
      settings: root.gameSettings.serializeToClient(),
      votes: ingame.votes.values.map((vote) =>
        vote.serializeToClient(true, null)
      )
    })
  );
  return { ...result, ingame, broadcasts, saved };
}

test("empowerment vote uses the replacement threshold, with unanimity for two voters", (context) => {
  for (const [voters, required] of [
    [1, 1],
    [2, 2],
    [3, 2],
    [4, 2],
    [5, 3],
    [6, 4],
    [7, 4]
  ]) {
    const { ingame, player } = voteFixture(context, voters);
    const vote = ingame.createVote(player.user, new EnableEmpoweredVassals());
    assert.equal(vote.positiveCountToPass, required);
    const replacementVote = new Vote(
      ingame,
      "replacement",
      vote.participatingHouses,
      player.user,
      new ReplacePlayer(player.user, player.user, player.house)
    );
    assert.equal(vote.positiveCountToPass, replacementVote.positiveCountToPass);
    assert.equal(vote.participatingHouses.length, voters);
    assert.ok(
      vote.participatingHouses.every((house) => !ingame.isVassalHouse(house))
    );
  }
});

test("server starts and accepts the vote, broadcasts settings, persists it and immediately empowers orders", (context) => {
  const {
    root,
    ingame,
    player,
    state,
    single,
    regions,
    vassal,
    broadcasts,
    saved
  } = voteFixture(context, 5);
  assert.equal(root.gameSettings.vassals, false);
  assert.deepEqual(ingame.canLaunchEnableEmpoweredVassalsVote(player), {
    result: true,
    reason: ""
  });
  runInAction(() =>
    ingame.onClientMessage(player.user, {
      type: "launch-enable-empowered-vassals-vote"
    })
  );
  const vote = ingame.votes.values[0];
  assert.ok(vote.type instanceof EnableEmpoweredVassals);
  assert.ok(broadcasts.some((message) => message.type == "vote-started"));
  const restored = Vote.deserializeFromServer(
    ingame,
    vote.serializeToClient(true, null)
  );
  assert.ok(restored.type instanceof EnableEmpoweredVassals);
  assert.equal(restored.positiveCountToPass, 3);

  const voters = ingame.players.values;
  for (const voter of voters.slice(0, 2)) {
    runInAction(() =>
      ingame.onClientMessage(voter.user, {
        type: "vote",
        vote: vote.id,
        choice: true
      })
    );
  }
  assert.equal(vote.state, VoteState.ONGOING);
  assert.equal(root.gameSettings.empoweredVassals, false);
  assert.equal(saved.length, 0);
  runInAction(() => {
    let state = root;
    while (state) {
      state.needsToBeTransmittedToClient = false;
      state = state.childGameState;
    }
  });
  runInAction(() =>
    root.onClientMessage(voters[2].user, {
      type: "vote",
      vote: vote.id,
      choice: true
    })
  );
  assert.equal(vote.state, VoteState.ACCEPTED);
  assert.equal(root.gameSettings.empoweredVassals, true);
  assert.equal(state.maxOrders, 3);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].updateLastActive, false);
  assert.equal(saved[0].settings.empoweredVassals, true);
  assert.equal(
    Vote.deserializeFromServer(ingame, saved[0].votes[0]).state,
    VoteState.ACCEPTED
  );
  assert.equal(
    ingame.gameLogManager.logs.at(-1).data.type,
    "empowered-vassals-enabled"
  );
  const settingsMessage = broadcasts.find(
    (message) => message.type == "game-settings-changed"
  );
  assert.equal(settingsMessage.settings.empoweredVassals, true);

  const client = fixture(false);
  runInAction(() => client.root.onServerMessage(settingsMessage, {}));
  assert.equal(client.root.gameSettings.empoweredVassals, true);
  assert.equal(client.state.maxOrders, 3);
  assert.ok(
    client.game.getOrdersListForHouse(client.vassal).includes(orders.get(1))
  );
  runInAction(() => {
    single.onPlayerMessage(player, {
      type: "place-order",
      regionId: regions[0].id,
      orderId: 1
    });
    single.onPlayerMessage(player, {
      type: "place-order",
      regionId: regions[1].id,
      orderId: 16
    });
    single.onPlayerMessage(player, {
      type: "place-order",
      regionId: regions[2].id,
      orderId: 17
    });
  });
  assert.equal(state.getPlacedOrdersOfHouse(vassal).length, 3);
  runInAction(() => {
    ingame.onClientMessage(voters[3].user, {
      type: "vote",
      vote: vote.id,
      choice: true
    });
    ingame.onClientMessage(player.user, {
      type: "launch-enable-empowered-vassals-vote"
    });
  });
  assert.equal(saved.length, 1);
  assert.equal(ingame.votes.size, 1);
});

test("server rejects ineligible and duplicate launches, and nonparticipants cannot cast votes", (context) => {
  for (const [name, reason, prepare] of [
    [
      "enabled",
      "already-enabled",
      ({ root }) => {
        root.gameSettings.empoweredVassals = true;
      }
    ],
    [
      "no vassals",
      "no-vassals",
      ({ game, ingame }) => {
        for (const house of ingame.getVassalHouses())
          game.houses.delete(house.id);
      }
    ],
    [
      "paused",
      "game-paused",
      ({ ingame }) => {
        ingame.paused = new Date();
      }
    ],
    [
      "ended",
      "already-ended",
      ({ ingame }) => {
        const Ended =
          require("../src/common/ingame-game-state/game-ended-game-state/GameEndedGameState").default;
        ingame.childGameState = new Ended(ingame);
      }
    ],
    [
      "cancelled",
      "already-cancelled",
      ({ ingame }) => {
        const Cancelled =
          require("../src/common/cancelled-game-state/CancelledGameState").default;
        ingame.childGameState = new Cancelled(ingame);
      }
    ]
  ]) {
    const data = voteFixture(context);
    runInAction(() => {
      prepare(data);
      assert.deepEqual(
        data.ingame.canLaunchEnableEmpoweredVassalsVote(data.player),
        { result: false, reason },
        name
      );
      data.ingame.onClientMessage(data.player.user, {
        type: "launch-enable-empowered-vassals-vote"
      });
    });
    assert.equal(data.ingame.votes.size, 0, name);
  }
  const { root, ingame, player } = voteFixture(context);
  const spectator = new User(
    "spectator",
    "Spectator",
    "Spectator",
    root,
    new UserSettings()
  );
  assert.equal(ingame.canLaunchEnableEmpoweredVassalsVote(null).result, false);
  assert.equal(
    ingame.canLaunchEnableEmpoweredVassalsVote(
      new Player(spectator, player.house)
    ).result,
    false
  );
  runInAction(() =>
    ingame.onClientMessage(spectator, {
      type: "launch-enable-empowered-vassals-vote"
    })
  );
  assert.equal(ingame.votes.size, 0);
  runInAction(() => {
    ingame.onClientMessage(player.user, {
      type: "launch-enable-empowered-vassals-vote"
    });
    ingame.onClientMessage(player.user, {
      type: "launch-enable-empowered-vassals-vote"
    });
  });
  assert.equal(ingame.votes.size, 1);
  assert.equal(
    ingame.canLaunchEnableEmpoweredVassalsVote(player).reason,
    "already-existing"
  );
  const vote = ingame.votes.values[0];
  runInAction(() =>
    ingame.onClientMessage(spectator, {
      type: "vote",
      vote: vote.id,
      choice: true
    })
  );
  assert.equal(vote.votes.size, 0);
  const outsider = new Player(spectator, ingame.getVassalHouses()[0]);
  runInAction(() =>
    ingame.onPlayerMessage(outsider, {
      type: "vote",
      vote: vote.id,
      choice: true
    })
  );
  assert.equal(vote.votes.size, 0);
});

test("refused votes leave vassals unchanged and stale votes cannot enable the setting", (context) => {
  const { ingame, root, player, saved } = voteFixture(context, 2);
  runInAction(() =>
    ingame.onClientMessage(player.user, {
      type: "launch-enable-empowered-vassals-vote"
    })
  );
  const vote = ingame.votes.values[0];
  runInAction(() => {
    ingame.onClientMessage(player.user, {
      type: "vote",
      vote: vote.id,
      choice: true
    });
  });
  assert.equal(vote.state, VoteState.ONGOING);
  runInAction(() =>
    ingame.onClientMessage(ingame.players.values[1].user, {
      type: "vote",
      vote: vote.id,
      choice: false
    })
  );
  assert.equal(vote.state, VoteState.REFUSED);
  assert.equal(root.gameSettings.empoweredVassals, false);
  assert.equal(saved.length, 0);
  for (const prepare of [
    ({ ingame, game }) => {
      for (const house of ingame.getVassalHouses())
        game.houses.delete(house.id);
    },
    ({ root }) => {
      root.gameSettings.empoweredVassals = true;
    },
    ({ ingame }) => {
      const Ended =
        require("../src/common/ingame-game-state/game-ended-game-state/GameEndedGameState").default;
      ingame.childGameState = new Ended(ingame);
    }
  ]) {
    const data = voteFixture(context);
    const vote = data.ingame.createVote(
      data.player.user,
      new EnableEmpoweredVassals()
    );
    runInAction(() => {
      prepare(data);
      data.ingame.onClientMessage(data.player.user, {
        type: "vote",
        vote: vote.id,
        choice: true
      });
    });
    assert.equal(vote.canVote.result, false);
    assert.equal(vote.votes.size, 0);
    assert.equal(data.saved.length, 0);
  }
});

test("controls show the empowerment icon last with its launch tooltip and confirm before launching", async (context) => {
  const { root, ingame, player } = voteFixture(context);
  const component = new IngameComponent({
    gameState: ingame,
    gameClient: {
      authenticatedPlayer: player,
      authenticatedUser: player.user,
      canActAsOwner: () => true,
      isRealOwner: () => true,
      notificationsVolume: 1,
      musicVolume: 1,
      sfxVolume: 1
    }
  });
  const messages = [];
  root.onSendClientMessage = (message) => messages.push(message);
  const confirm = context.mock.method(window, "confirm", () => false);
  const view = render(component.renderGameControlsPopover());
  const button = view.getByRole("button", { name: "Empowered Vassals" });
  assert.equal(
    Array.from(view.container.querySelectorAll("button")).at(-1),
    button
  );
  assert.match(button.querySelector("img").src, /empowered-vassals\.svg$/);
  assert.equal(button.disabled, false);
  fireEvent.focus(button);
  assert.ok(
    await view.findByText('Launch a vote to enable "Empowered Vassals" setting')
  );
  fireEvent.blur(button);
  await waitFor(() =>
    assert.equal(
      document.getElementById("enable-empowered-vassals-vote-tooltip") == null,
      true
    )
  );
  fireEvent.click(button);
  assert.equal(
    confirm.mock.calls[0].arguments[0],
    t("ingame.confirmEnableEmpoweredVassalsVote")
  );
  assert.equal(messages.length, 0);
  confirm.mock.mockImplementation(() => true);
  fireEvent.click(button);
  assert.deepEqual(messages, [
    { type: "launch-enable-empowered-vassals-vote" }
  ]);
  runInAction(() => ingame.onClientMessage(player.user, messages[0]));
  view.rerender(component.renderGameControlsPopover());
  assert.equal(
    view.getByRole("button", { name: "Empowered Vassals" }).disabled,
    true
  );
  runInAction(() => {
    root.gameSettings.empoweredVassals = true;
  });
  view.rerender(component.renderGameControlsPopover());
  assert.equal(view.queryByRole("button", { name: "Empowered Vassals" }), null);
  runInAction(() => {
    root.gameSettings.empoweredVassals = false;
    for (const house of ingame.getVassalHouses())
      ingame.game.houses.delete(house.id);
  });
  view.rerender(component.renderGameControlsPopover());
  assert.equal(view.queryByRole("button", { name: "Empowered Vassals" }), null);
});

test("the new vote description and activation log are localized", async (context) => {
  const { ingame, player } = voteFixture(context);
  const vote = ingame.createVote(player.user, new EnableEmpoweredVassals());
  const view = render(
    React.createElement(VoteComponent, {
      vote,
      ingame,
      gameClient: { authenticatedPlayer: player, canActAsOwner: () => false }
    })
  );
  const log = new GameLogListComponent({
    ingameGameState: ingame,
    gameClient: {},
    currentlyViewed: false
  });
  for (const language of ["en", "de"]) {
    await act(async () => {
      await i18n.changeLanguage(language);
    });
    assert.ok(
      view.getByText(t("vote.enableEmpoweredVassals"), { exact: false })
    );
    const logView = render(
      log.renderGameLogData({ type: "empowered-vassals-enabled" }, 1)
    );
    assert.ok(logView.getByText(t("gameLogList.empoweredVassalsEnabled")));
    logView.unmount();
  }
});

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
