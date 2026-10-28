require("./dom-setup.cjs");
const assert = require("node:assert/strict");
const { test, beforeEach, afterEach } = require("node:test");
const React = require("react");
const { act, render, fireEvent, cleanup } = require("@testing-library/react");
const { autorun, observable, runInAction } = require("mobx");
const { observer } = require("mobx-react");
const MapControls = require("../src/client/MapControls").default;
const MapContribution = require("../src/client/MapContribution").default;
const BetterMap = require("../src/utils/BetterMap").default;
const SelectRegion =
  require("../src/client/game-state-panel/SelectRegionComponent").default;
require("../src/common/EntireGame");
const Combat =
  require("../src/client/game-state-panel/CombatComponent").default;
const MapComponent = require("../src/client/MapComponent").default;
const WorldSnapshot = require("../src/client/WorldSnapshotComponent").default;
const PostCombat =
  require("../src/common/ingame-game-state/action-game-state/resolve-march-order-game-state/combat-game-state/post-combat-game-state/PostCombatGameState").default;

const GameState = require("../src/common/GameState").default;
const March =
  require("../src/client/game-state-panel/ResolveSingleMarchOrderComponent").default;
const Mustering =
  require("../src/client/game-state-panel/PlayerMusteringComponent").default;
const FacelessMen =
  require("../src/client/game-state-panel/TheFacelessMenComponent").default;
const SupplyTrack =
  require("../src/client/game-state-panel/utils/SupplyTrackComponent").default;
const {
  PlayerMusteringType
} = require("../src/common/ingame-game-state/westeros-game-state/mustering-game-state/player-mustering-game-state/PlayerMusteringGameState");

beforeEach((context) => {
  const warn = console.warn;
  context.mock.method(console, "warn", (...args) => {
    assert.doesNotMatch(args.join(" "), /\[MobX\]/);
    warn(...args);
  });
});

afterEach(cleanup);

function fixture() {
  const root = new GameState(null);
  const parent = new GameState(root);
  const child = new GameState(parent);
  runInAction(() => {
    root.childGameState = parent;
    parent.childGameState = child;
  });
  class TestRegion {
    constructor(id) {
      this.id = id;
      this.name = id;
      this.allUnits = [];
      this.units = new BetterMap();
      this.newUnits = [];
      this.removedUnits = [];
      this.type = { id: "land" };
    }
  }
  const regions = ["winterfell", "white-harbor"].map(
    (id) => new TestRegion(id)
  );
  return { root, parent, child, regions, controls: new MapControls() };
}

test("combat contributes one region-to-region march marker for a multi-unit army", () => {
  const { root, regions, controls } = fixture();
  const [from, to] = regions;
  const units = [1, 2, 3].map((id) => ({ id, region: from }));
  from.allUnits.push(...units);
  const combat = {
    attackingRegion: from,
    defendingRegion: to,
    attackingArmy: units,
    attacker: { getHighlightColor: () => "red" },
    hasChildGameState: () => false
  };
  const component = new Combat({ gameState: combat, gameClient: {} });
  controls.setLayer(Symbol(), {
    gameState: root,
    regions: component.modifyRegionsOnMap(),
    units: component.modifyUnitsOnMap()
  });
  controls.setLayer(Symbol(), {
    kind: "hover",
    regions: [[to, { highlight: { active: true, color: "blue" } }]]
  });
  const resolved = controls.resolve(root, regions);
  const arrows = MapComponent.prototype.renderMarchMarkers(
    resolved.regions,
    false,
    () => true
  );
  assert.equal(arrows.length, 1);
  assert.equal(
    arrows[0].props.start,
    `centered-units-container-div-for-march-markers-${from.id}`
  );
  assert.equal(
    arrows[0].props.end,
    `centered-units-container-div-for-march-markers-${to.id}`
  );
  assert.equal(arrows[0].props.color, "red");
  assert.equal(resolved.units.get(units[0]).highlight.color, "red");
  for (const visible of [new Set([from]), new Set([to]), new Set()]) {
    assert.equal(
      MapComponent.prototype.renderMarchMarkers(
        resolved.regions,
        true,
        (region) => visible.has(region)
      ).length,
      0
    );
  }
  assert.equal(
    MapComponent.prototype.renderMarchMarkers(
      resolved.regions,
      true,
      () => true
    ).length,
    1
  );
});

test("combat hides the region marker during selection, after defeat, after combat abilities, and after arrival", () => {
  const { regions } = fixture();
  const [from, to] = regions;
  const attacker = { getHighlightColor: () => "red" };
  const combat = {
    attackingRegion: from,
    defendingRegion: to,
    attackingArmy: [{ region: from }],
    attacker,
    hasChildGameState: () => false
  };
  const component = new Combat({
    gameState: combat,
    gameClient: { doesControlHouse: () => true }
  });
  const marker = () => component.modifyRegionsOnMap()[0][1].marchMarker;
  assert.ok(marker());
  combat.hasChildGameState = () => true;
  combat.getChildGameState = () => ({ house: attacker });
  assert.equal(marker(), undefined);
  combat.hasChildGameState = () => false;

  const postCombat = Object.create(PostCombat.prototype);
  postCombat.hasChildGameState = () => false;
  postCombat.winner = {};
  combat.childGameState = postCombat;
  assert.equal(marker(), undefined);
  postCombat.winner = attacker;
  assert.ok(marker());
  postCombat.hasChildGameState = () => true;
  assert.equal(marker(), undefined);
  postCombat.hasChildGameState = () => false;
  combat.attackingArmy[0].region = to;
  assert.equal(marker(), undefined);
  combat.attackingArmy = [];
  assert.equal(marker(), undefined);
});

test("replay march markers are anchored inside the region unit slots, including empty regions", () => {
  const { regions } = fixture();
  for (const region of regions) {
    region.unitSlot = { point: { x: 100, y: 200 }, width: 80 };
  }
  const snapshot = {
    worldSnapshot: regions.map((region) => ({ id: region.id, units: [] }))
  };
  const component = new WorldSnapshot({
    ingameGameState: {
      entireGame: { gameSettings: { playerCount: 6 } },
      world: { regions: new BetterMap(regions.map((r) => [r.id, r])) },
      replayManager: {
        selectedSnapshot: snapshot,
        highlighter: {
          marchMarkers: [[regions[0].id, { to: regions[1].id, color: "red" }]]
        }
      }
    }
  });
  const renderer = render(
    React.createElement("div", null, component.renderUnits(new BetterMap()))
  );
  const [arrow] = component.renderMarchMarkers();
  for (const endpoint of [arrow.props.start, arrow.props.end]) {
    const anchor = renderer.container.querySelector(`#${endpoint}`);
    assert.ok(anchor.classList.contains("center-relative-to-parent"));
    assert.ok(anchor.parentElement.classList.contains("units-container"));
    assert.equal(anchor.parentElement.style.left, "100px");
    assert.equal(anchor.parentElement.style.top, "200px");
    assert.equal(anchor.parentElement.style.width, "80px");
  }
});

test("child layers win regardless of registration order and can explicitly clear properties", () => {
  const { root, parent, child, regions, controls } = fixture();
  const [region, other] = regions;
  const childOwner = Symbol();
  const click = () => {};
  const wrap = (element) => element;
  controls.setLayer(childOwner, {
    gameState: child,
    regions: [
      [
        region,
        {
          highlight: { color: "yellow", text: undefined },
          onClick: undefined,
          wrap: undefined
        }
      ]
    ]
  });
  controls.setLayer(Symbol(), {
    gameState: parent,
    regions: [
      [
        region,
        {
          highlight: { active: true, color: "red", text: "old", strong: true },
          onClick: click,
          wrap
        }
      ]
    ]
  });
  const result = controls.resolve(root, regions).regions;
  assert.deepEqual(
    { ...result.get(region).highlight },
    {
      active: true,
      color: "yellow",
      text: undefined,
      strong: true
    }
  );
  assert.equal(result.get(region).onClick, undefined);
  assert.equal(result.get(region).wrap, undefined);
  assert.deepEqual(
    { ...result.get(other).highlight },
    { active: false, color: "white" }
  );
  controls.removeLayer(childOwner);
  assert.equal(
    controls.resolve(root, regions).regions.get(region).onClick,
    click
  );
});

test("hover masks only region highlights and restores live state without erasing animation or clicks", () => {
  const { root, child, regions, controls } = fixture();
  const [region, other] = regions;
  const unit = { id: 1 };
  region.allUnits.push(unit);
  const stateOwner = Symbol();
  const hoverOwner = Symbol();
  const click = () => {};
  controls.setLayer(stateOwner, {
    gameState: child,
    regions: [
      [
        region,
        {
          highlight: { active: true, color: "yellow", text: "move" },
          onClick: click
        }
      ]
    ],
    units: [
      [unit, { highlight: { active: true, color: "white" }, onClick: click }]
    ]
  });
  controls.setLayer(Symbol(), {
    kind: "animation",
    gameState: root,
    units: [[unit, { animateFadeOut: true }]]
  });
  controls.setLayer(hoverOwner, {
    kind: "hover",
    regions: [[other, { highlight: { active: true, color: "blue" } }]]
  });
  let result = controls.resolve(root, regions);
  assert.equal(result.regions.get(region).highlight.active, false);
  assert.equal(result.regions.get(region).highlight.text, undefined);
  assert.equal(result.regions.get(other).highlight.color, "blue");
  assert.equal(result.regions.get(region).onClick, click);
  assert.equal(result.units.get(unit).onClick, click);
  assert.equal(result.units.get(unit).animateFadeOut, true);
  controls.setLayer(stateOwner, {
    gameState: child,
    regions: [
      [region, { highlight: { active: true, color: "green" }, onClick: click }]
    ]
  });
  controls.removeLayer(hoverOwner);
  result = controls.resolve(root, regions);
  assert.equal(result.regions.get(region).highlight.color, "green");
  assert.equal(result.regions.get(other).highlight.active, false);
});

test("hover precedence follows activation, not rerenders, and owner cleanup is independent", () => {
  const { root, regions, controls } = fixture();
  const first = Symbol(),
    second = Symbol();
  const hover = (color) => ({
    kind: "hover",
    regions: [[regions[0], { highlight: { active: true, color } }]]
  });
  controls.setLayer(first, hover("red"));
  controls.setLayer(second, hover("blue"));
  controls.setLayer(first, hover("green"));
  assert.equal(
    controls.resolve(root, regions).regions.get(regions[0]).highlight.color,
    "blue"
  );
  controls.setLayer(first, { kind: "hover", regions: [] });
  controls.setLayer(first, hover("yellow"));
  assert.equal(
    controls.resolve(root, regions).regions.get(regions[0]).highlight.color,
    "yellow"
  );
  controls.removeLayer(first);
  controls.removeLayer(first);
  assert.equal(
    controls.resolve(root, regions).regions.get(regions[0]).highlight.color,
    "blue"
  );
});

test("replaced states stop contributing immediately, before React unmounts them", () => {
  const { root, parent, child, regions, controls } = fixture();
  const region = regions[0];
  controls.setLayer(Symbol(), {
    gameState: child,
    orders: [[region, { highlight: { active: true }, onClick: () => {} }]]
  });
  const observed = [];
  const stop = autorun(() => {
    observed.push(!!controls.resolve(root, regions).orders.get(region).onClick);
  });
  runInAction(() => {
    parent.childGameState = new GameState(parent);
  });
  stop();
  assert.deepEqual(observed, [true, false]);
});

function mapView(root, regions, controls) {
  return observer(function MapView() {
    const resolved = controls.resolve(root, regions);
    return React.createElement(
      "div",
      null,
      ...["regions", "units", "orders"].flatMap((kind) =>
        resolved[kind].entries.map(([entity, properties]) =>
          React.createElement("button", {
            key: `${kind}-${entity.id}`,
            "data-map": kind,
            "data-id": entity.id,
            "data-active": !!properties.highlight?.active,
            "data-color": properties.highlight?.color,
            onClick: properties.onClick
          })
        )
      )
    );
  });
}

function mapButton(renderer, kind, id) {
  return renderer.container.querySelector(
    `button[data-map="${kind}"][data-id="${id}"]`
  );
}

test("real region selection republishes on click, reset, and React prop replacement", () => {
  const { root, parent, child, regions, controls } = fixture();
  const house = { name: "Stark" };
  Object.assign(child, { house, regions, select() {} });
  const client = { doesControlHouse: () => true };
  const View = mapView(root, regions, controls);
  const tree = (state) =>
    React.createElement(
      React.Fragment,
      null,
      React.createElement(View),
      React.createElement(SelectRegion, {
        gameState: state,
        gameClient: client,
        mapControls: controls
      })
    );
  let renderer;
  act(() => {
    renderer = render(tree(child));
  });
  assert.equal(
    mapButton(renderer, "regions", regions[1].id).dataset.active,
    "true"
  );
  act(() => {
    fireEvent.click(mapButton(renderer, "regions", regions[0].id));
  });
  assert.equal(
    mapButton(renderer, "regions", regions[1].id).dataset.active,
    "false"
  );
  act(() => {
    fireEvent.click(renderer.getByRole("button", { name: "Reset" }));
  });
  assert.equal(
    mapButton(renderer, "regions", regions[1].id).dataset.active,
    "true"
  );
  const replacement = Object.assign(new GameState(parent), {
    house,
    regions: [regions[1]],
    select() {}
  });
  act(() => {
    runInAction(() => {
      parent.childGameState = replacement;
    });
    renderer.rerender(tree(replacement));
  });
  assert.equal(
    mapButton(renderer, "regions", regions[0].id).dataset.active,
    "false"
  );
  assert.equal(
    mapButton(renderer, "regions", regions[1].id).dataset.active,
    "true"
  );
  act(() => {
    renderer.unmount();
  });
  assert.equal(
    controls.resolve(root, regions).regions.get(regions[1]).onClick,
    undefined
  );
});

test("publisher moves between stores and StrictMode remounts leave no stale layer", () => {
  const { root, regions, controls } = fixture();
  const other = new MapControls();
  const tree = (store) =>
    React.createElement(
      React.StrictMode,
      null,
      React.createElement(MapContribution, {
        mapControls: store,
        regions: [[regions[0], { highlight: { active: true } }]]
      })
    );
  let renderer;
  act(() => {
    renderer = render(tree(controls));
  });
  act(() => {
    renderer.rerender(tree(other));
  });
  assert.equal(
    controls.resolve(root, regions).regions.get(regions[0]).highlight.active,
    false
  );
  assert.equal(
    other.resolve(root, regions).regions.get(regions[0]).highlight.active,
    true
  );
  act(() => {
    renderer.unmount();
  });
  act(() => {
    renderer = render(tree(other));
  });
  act(() => {
    renderer.unmount();
  });
  assert.equal(
    other.resolve(root, regions).regions.get(regions[0]).highlight.active,
    false
  );
});

test("real march controls update orders, selected units and valid destinations", () => {
  const { root, child, regions, controls } = fixture();
  const [from, to] = regions;
  const house = { id: "stark", name: "Stark" };
  class TestUnit {
    id = 1;
    allegiance = house;
    region = from;
    type = { id: "footman" };
  }
  const unit = new TestUnit();
  from.units.set(1, unit);
  from.allUnits.push(unit);
  from.game = { world: { getAdjacentPortOfCastle: () => null } };
  const targets = observable.box([to]);
  Object.assign(child, {
    house,
    ingame: { isVassalHouse: () => false },
    world: {
      regions: new BetterMap(regions.map((region) => [region.id, region]))
    },
    supportersAgainstNeutralForce: null,
    canLeavePowerToken: () => ({ success: false, reason: "no-all-units-go" }),
    getPossibleSupportingHousesAgainstNeutralForces: () => null,
    getRegionsWithMarchOrder: () => [from],
    getValidMarchUnits: () => [unit],
    getValidTargetRegions: () => targets.get(),
    getUsedButStillValidTargetRegions: () => [],
    doesMoveTriggerAttack: () => false
  });
  const client = {
    doesControlHouse: () => true,
    sfxManager: { playSoundWhenClickingMarchOrder() {}, fadeOutCurrentSfx() {} }
  };
  const View = mapView(root, regions, controls);
  let renderer;
  act(() => {
    renderer = render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(View),
        React.createElement(March, {
          gameState: child,
          gameClient: client,
          mapControls: controls
        })
      )
    );
  });
  assert.equal(mapButton(renderer, "orders", from.id).dataset.active, "true");
  act(() => {
    fireEvent.click(mapButton(renderer, "orders", from.id), { detail: 1 });
  });
  assert.equal(mapButton(renderer, "orders", from.id).dataset.color, "yellow");
  assert.equal(mapButton(renderer, "units", unit.id).dataset.active, "true");
  act(() => {
    fireEvent.click(mapButton(renderer, "units", unit.id));
  });
  assert.equal(mapButton(renderer, "units", unit.id).dataset.color, "yellow");
  assert.equal(mapButton(renderer, "regions", to.id).dataset.active, "true");
  act(() => {
    runInAction(() => {
      targets.set([]);
    });
  });
  assert.equal(mapButton(renderer, "regions", to.id).dataset.active, "false");
  act(() => {
    renderer.unmount();
  });
});

test("mustering popover values are tracked by their owner, not the map reaction", () => {
  const { root, child, regions, controls } = fixture();
  const region = regions[0];
  region.castleLevel = 2;
  region.game = { ingame: { fogOfWar: false } };
  region.getController = () => null;
  region.supplyIcons = 0;
  region.crownIcons = 0;
  const points = observable.box(0);
  const house = { name: "Stark" };
  Object.assign(child, {
    house,
    type: PlayerMusteringType.MUSTERING_WESTEROS_CARD,
    regions: [region],
    ingame: { isVassalHouse: () => false },
    getValidMusteringRulesForRegion: () => [{}],
    getValidMusteringRules: () => [],
    getUsedPointsForRegion: () => points.get()
  });
  let renderer;
  act(() => {
    renderer = render(
      React.createElement(Mustering, {
        gameState: child,
        gameClient: { doesControlHouse: () => true },
        mapControls: controls
      })
    );
  });
  let wrapper;
  const stop = autorun(() => {
    wrapper = controls
      .resolve(root, regions)
      .regions.get(region)
      .wrap(React.createElement("polygon"));
  });
  assert.equal(wrapper.props.show, false);
  const before = wrapper.props.overlay;
  act(() => {
    wrapper.props.onToggle(true);
  });
  assert.equal(wrapper.props.show, true);
  act(() => {
    runInAction(() => {
      points.set(1);
    });
  });
  assert.notEqual(wrapper.props.overlay, before);
  assert.equal(wrapper.props.children.type, "polygon");
  stop();
  act(() => {
    renderer.unmount();
  });
});

test("real supply hover masks selection and leaving restores the latest state", () => {
  const { root, child, regions, controls } = fixture();
  const house = {
    id: "stark",
    name: "Stark",
    supplyLevel: 0,
    getHighlightColor: () => "blue"
  };
  const [supplyRegion, selectedRegion] = regions;
  supplyRegion.supplyIcons = 1;
  selectedRegion.supplyIcons = 0;
  for (const region of regions) {
    region.getController = () => house;
  }
  root.world = {
    regions: new BetterMap(regions.map((region) => [region.id, region]))
  };
  const stateOwner = Symbol();
  const selection = (color) => ({
    gameState: child,
    regions: [
      [
        selectedRegion,
        { highlight: { active: true, color }, onClick: () => {} }
      ]
    ]
  });
  controls.setLayer(stateOwner, selection("yellow"));
  const View = mapView(root, regions, controls);
  let renderer;
  act(() => {
    renderer = render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(View),
        React.createElement(SupplyTrack, {
          ingame: root,
          gameClient: {},
          houses: [house],
          supplyRestrictions: [[2]],
          mapControls: controls
        })
      )
    );
  });
  const icon = renderer.container.querySelector(
    ".supply-icon.hover-weak-outline"
  );
  act(() => {
    fireEvent.mouseEnter(icon);
  });
  assert.equal(
    mapButton(renderer, "regions", supplyRegion.id).dataset.color,
    "blue"
  );
  assert.equal(
    mapButton(renderer, "regions", selectedRegion.id).dataset.active,
    "false"
  );
  assert.equal(
    typeof controls.resolve(root, regions).regions.get(selectedRegion).onClick,
    "function"
  );
  act(() => {
    controls.setLayer(stateOwner, selection("green"));
  });
  act(() => {
    fireEvent.mouseLeave(icon);
  });
  assert.equal(
    mapButton(renderer, "regions", selectedRegion.id).dataset.color,
    "green"
  );
  assert.equal(
    mapButton(renderer, "regions", supplyRegion.id).dataset.active,
    "false"
  );
  act(() => {
    renderer.unmount();
  });
});

test("conditional state panels keep player controls hidden from spectators", () => {
  const { root, child, regions, controls } = fixture();
  Object.assign(child, { house: { name: "Stark" }, availableUnits: [] });
  const tree = (controlsHouse) =>
    React.createElement(FacelessMen, {
      gameState: child,
      gameClient: { doesControlHouse: () => controlsHouse },
      mapControls: controls
    });
  let renderer;
  act(() => {
    renderer = render(tree(false));
  });
  assert.equal(renderer.queryAllByRole("button").length, 0);
  act(() => {
    renderer.rerender(tree(true));
  });
  assert.equal(renderer.queryAllByRole("button").length, 2);
  act(() => {
    renderer.unmount();
  });
  assert.equal(controls.resolve(root, regions).units.size, 0);
});
