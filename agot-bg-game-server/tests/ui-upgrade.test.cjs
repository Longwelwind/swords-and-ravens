require("./dom-setup.cjs");
const assert = require("node:assert/strict");
const { test, beforeEach, afterEach } = require("node:test");
const React = require("react");
const {
  render,
  fireEvent,
  cleanup,
  act,
  waitFor
} = require("@testing-library/react");
const { runInAction } = require("mobx");
const { OverlayTrigger, Modal, Button } = require("react-bootstrap");
const ImagePopover = require("../src/client/utils/ImagePopover").default;
const VolumeSlider =
  require("../src/client/utils/VolumeSliderComponent").default;
const AutoScroll = require("../src/client/utils/AutoScroll").default;
require("../src/common/EntireGame");
const EntireGame = require("../src/common/EntireGame").default;
const GameSettings = require("../src/client/GameSettingsComponent").default;
const SettingsModel = require("../src/common/GameSettings").GameSettings;

beforeEach((context) => {
  for (const method of ["warn", "error"]) {
    const original = console[method];
    context.mock.method(console, method, (...args) => {
      assert.doesNotMatch(
        args.join(" "),
        /\[MobX\]|findDOMNode|element\.ref|does not recognize|not wrapped in act|deprecated/i
      );
      original(...args);
    });
  }
});

afterEach(cleanup);

test("volume sliders retain native range controls and publish the selected volume", () => {
  const values = [];
  const view = render(
    React.createElement(VolumeSlider, {
      volume: 50,
      name: "Music",
      onVolumeChange: (value) => values.push(value)
    })
  );
  const slider = view.getByRole("slider");
  fireEvent.change(slider, { target: { value: "75" } });
  assert.equal(slider.value, "75");
  assert.match(view.container.textContent, /Music: 75/);
  assert.deepEqual(values, [75]);
});

test("bidding, gifting, and Aeron sliders retain their limits and submit the selected tokens", () => {
  const Bidding =
    require("../src/client/game-state-panel/BiddingComponent").default;
  const Gift = require("../src/client/GiftPowerTokensComponent").default;
  const Aeron =
    require("../src/client/game-state-panel/house-card-abilities/AeronDamphairDwDAbilityComponent").default;
  const BetterMap = require("../src/utils/BetterMap").default;
  const house = { id: "greyjoy", name: "Greyjoy", powerTokens: 7 };
  const player = { house };
  const submitted = [];
  const biddingState = {
    bids: new BetterMap(),
    participatingHouses: [house],
    powerTokensToBid: 0,
    getHousesLeftToBid: () => [],
    bid: (value) => submitted.push(value)
  };
  let view = render(
    React.createElement(Bidding, {
      gameState: biddingState,
      gameClient: { authenticatedPlayer: player }
    })
  );
  let slider = view.getByRole("slider");
  assert.equal(slider.max, "7");
  fireEvent.change(slider, { target: { value: "3" } });
  fireEvent.click(view.getByRole("button", { name: "Confirm" }));
  assert.deepEqual(submitted, [3]);
  view.unmount();

  view = render(
    React.createElement(Gift, {
      authenticatedPlayer: player,
      toHouse: {
        id: "stark",
        name: "Stark",
        powerTokens: 17,
        maxPowerTokens: 20
      },
      ingame: {
        game: { countPowerTokensOnBoard: () => 1 },
        canGiftPowerTokens: () => true,
        entireGame: {
          sendMessageToServer: (message) => submitted.push(message)
        }
      }
    })
  );
  slider = view.getByRole("slider");
  assert.equal(slider.max, "2");
  act(() =>
    runInAction(() => {
      fireEvent.change(slider, { target: { value: "2" } });
    })
  );
  act(() =>
    runInAction(() => {
      fireEvent.click(view.getByRole("button", { name: "Confirm" }));
    })
  );
  assert.deepEqual(submitted[1], {
    type: "gift-power-tokens",
    toHouse: "stark",
    powerTokens: 2
  });
  view.unmount();

  view = render(
    React.createElement(Aeron, {
      gameState: {
        house,
        maxAllowedPowerTokens: 4,
        sendPowerTokens: (value) => submitted.push(value)
      },
      gameClient: { authenticatedPlayer: player, doesControlHouse: () => true }
    })
  );
  slider = view.getByRole("slider");
  assert.equal(slider.max, "4");
  act(() =>
    runInAction(() => {
      fireEvent.change(slider, { target: { value: "4" } });
    })
  );
  fireEvent.click(view.getByRole("button", { name: "Confirm" }));
  assert.equal(submitted[2], 4);
});

test("game settings switches still toggle and retain independent labels after the Bootstrap migration", () => {
  const game = new EntireGame("fixture", "owner", "UI upgrade");
  runInAction(() => {
    game.firstStart();
  });
  game.onSendClientMessage = (message) => {
    assert.equal(message.type, "change-game-settings");
    runInAction(() => {
      game.gameSettings = SettingsModel.deserializeFromServer(message.settings);
    });
  };
  const view = render(
    React.createElement(GameSettings, {
      entireGame: game,
      gameClient: { isRealOwner: () => true }
    })
  );
  const setting = view.container.querySelector("#start-when-full-setting");
  assert.ok(setting.closest(".form-switch"));
  const previous = setting.checked;
  fireEvent.click(setting);
  assert.equal(setting.checked, !previous);
});

test("image overlays forward their DOM ref without leaking Popper internals under React 19", async () => {
  const view = render(
    React.createElement(
      OverlayTrigger,
      {
        trigger: "click",
        rootClose: true,
        overlay: React.createElement(ImagePopover, {
          "data-testid": "card-preview",
          className: "vertical-game-card",
          style: { width: 100, height: 150 }
        })
      },
      React.createElement("button", null, "Card")
    )
  );
  fireEvent.click(view.getByRole("button", { name: "Card" }));
  const preview = await view.findByTestId("card-preview");
  assert.equal(preview.getAttribute("popper"), null);
  assert.equal(preview.getAttribute("hasDoneInitialMeasure"), null);
  fireEvent.click(document.body);
  await waitFor(() => assert.ok(view.queryByTestId("card-preview") === null));
});

test("modals can close and restore focus to their trigger with React 19", async () => {
  function Dialog() {
    const [show, setShow] = React.useState(false);
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(
        Button,
        { onClick: () => setShow(true) },
        "Open settings"
      ),
      React.createElement(
        Modal,
        { show, onHide: () => setShow(false), animation: false },
        React.createElement(
          Modal.Header,
          { closeButton: true },
          React.createElement(Modal.Title, null, "Settings")
        ),
        React.createElement(Modal.Body, null, "Game preferences")
      )
    );
  }
  const view = render(React.createElement(Dialog));
  const trigger = view.getByRole("button", { name: "Open settings" });
  trigger.focus();
  fireEvent.click(trigger);
  assert.ok(await view.findByRole("dialog"));
  fireEvent.click(view.getByRole("button", { name: "Close" }));
  await waitFor(() => assert.ok(view.queryByRole("dialog") === null));
  assert.ok(document.activeElement === trigger);
});

test("map arrows still render their SVG path under React 19", () => {
  const Xarrow = require("react-xarrows").default;
  const view = render(
    React.createElement(
      React.Fragment,
      null,
      React.createElement("div", { id: "arrow-start" }, "Start"),
      React.createElement("div", { id: "arrow-end" }, "End"),
      React.createElement(Xarrow, { start: "arrow-start", end: "arrow-end" })
    )
  );
  assert.ok(view.container.querySelector("svg path[d]"));
});

test("emoji selection still publishes the chosen emoji under React 19", (context) => {
  const original = globalThis.IntersectionObserver;
  context.after(() => {
    globalThis.IntersectionObserver = original;
  });
  globalThis.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe(target) {
      this.callback([{ target, isIntersecting: true, intersectionRatio: 1 }]);
    }
    unobserve() {}
    disconnect() {}
  };
  const { default: EmojiPicker, EmojiStyle } = require("emoji-picker-react");
  const selected = [];
  const view = render(
    React.createElement(EmojiPicker, {
      emojiStyle: EmojiStyle.NATIVE,
      lazyLoadEmojis: false,
      onEmojiClick: (emoji) => selected.push(emoji.emoji)
    })
  );
  const emoji = view.container
    .querySelector('[data-epr-unified="1f600"]')
    ?.closest("button");
  assert.ok(emoji, "The grinning-face emoji should be visible");
  fireEvent.click(emoji);
  assert.deepEqual(selected, ["\u{1F600}"]);
});

test("toast notifications still render and dismiss under React 19", async () => {
  const { ToastContainer, toast } = require("react-toastify");
  const view = render(
    React.createElement(ToastContainer, { autoClose: false })
  );
  act(() => {
    toast("Your turn", { toastId: "turn" });
  });
  assert.ok(await view.findByText("Your turn"));
  const notification = view.getByRole("alert");
  act(() => {
    toast.dismiss("turn");
  });
  fireEvent.animationEnd(notification);
  await waitFor(() => assert.ok(view.queryByText("Your turn") === null));
});

test("autoscroll follows content, lets readers scroll up, and resumes via the latest button", async (context) => {
  const observers = [];
  const original = globalThis.ResizeObserver;
  context.after(() => {
    globalThis.ResizeObserver = original;
  });
  globalThis.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
      observers.push(this);
    }
    observe(element) {
      this.element = element;
    }
    disconnect() {
      this.disconnected = true;
    }
    notify(height) {
      this.callback([{ contentRect: { height } }]);
    }
  };
  const view = render(
    React.createElement(
      AutoScroll,
      {
        initialScrollBehavior: "auto",
        className: "h-100",
        scrollViewClassName: "overflow-x-hidden"
      },
      "Messages"
    )
  );
  const viewport = view.container.querySelector(".auto-scroll-viewport");
  viewport.style.overflow = "auto";
  Object.defineProperties(viewport, {
    clientHeight: { configurable: true, value: 100 },
    scrollHeight: { configurable: true, value: 1000 }
  });
  const observer = observers.find((observer) => observer.element);
  await act(async () => observer.notify(1000));
  await waitFor(() => assert.equal(viewport.scrollTop, 899));
  fireEvent.wheel(viewport, { deltaY: -100 });
  assert.ok(view.getByRole("button", { name: "Scroll to latest" }));
  viewport.scrollTop = 200;
  Object.defineProperty(viewport, "scrollHeight", {
    configurable: true,
    value: 1200
  });
  await act(async () => {
    observer.notify(1200);
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  assert.equal(viewport.scrollTop, 200);
  fireEvent.click(view.getByRole("button", { name: "Scroll to latest" }));
  await waitFor(() => assert.ok(Math.abs(viewport.scrollTop - 1099) < 1), {
    timeout: 3000
  });
  assert.equal(view.queryByRole("button", { name: "Scroll to latest" }), null);
  view.unmount();
  assert.ok(observer.disconnected);
});
