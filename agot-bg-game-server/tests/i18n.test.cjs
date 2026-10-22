require("./dom-setup.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test, beforeEach, afterEach } = require("node:test");
const React = require("react");
const {
  render,
  fireEvent,
  cleanup,
  act,
  waitFor
} = require("@testing-library/react");
const { observable, runInAction } = require("mobx");
const ts = require("typescript");
const { createInstance } = require("i18next");
const LanguageDetector = require("i18next-browser-languagedetector");
const {
  default: i18n,
  t,
  Trans,
  languages,
  translateGameText
} = require("../src/client/i18n");
const LanguageSelector = require("../src/client/i18n/LanguageSelector").default;
const Bidding =
  require("../src/client/game-state-panel/BiddingComponent").default;
const ChooseHouseCard =
  require("../src/client/game-state-panel/ChooseHouseCardComponent").default;
const BetterMap = require("../src/utils/BetterMap").default;
const { secondsToString } = require("../src/client/utils/secondsToString");
const en = require("../src/client/i18n/locales/en.json");

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage("en");
});

function flatten(value, prefix = "") {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) => {
      const name = prefix ? `${prefix}.${key}` : key;
      return typeof item === "string"
        ? [[name, item]]
        : Object.entries(flatten(item, name));
    })
  );
}

function tokens(text) {
  return (text.match(/\{\{[^}]+}}|<\/?[A-Za-z]\w*\s*\/?>/g) ?? []).sort();
}

function assertValidTags(text, key) {
  const stack = [];
  for (const [tag, closing, name, selfClosing] of text.matchAll(
    /<(\/?)([A-Za-z]\w*)(\/?)>/g
  )) {
    if (selfClosing) continue;
    if (closing)
      assert.equal(stack.pop(), name, `${key}: invalid nesting at ${tag}`);
    else stack.push(name);
  }
  assert.deepEqual(stack, [], `${key}: unclosed component tags`);
}

test("all languages cover the catalog and preserve interpolation and rich-text components", () => {
  const source = flatten(en);
  const pluralSuffix = /_(zero|one|two|few|many|other)$/;
  for (const { code } of languages) {
    const target = flatten(require(`../src/client/i18n/locales/${code}.json`));
    for (const [key, original] of Object.entries(source)) {
      assert.equal(typeof target[key], "string", `${code}: missing ${key}`);
      assert.ok(target[key].trim(), `${code}: empty ${key}`);
      const optionalSingularCount =
        key.endsWith("_one") &&
        !original.includes("{{count}}") &&
        source[key.replace(/_one$/, "_other")]?.includes("{{count}}");
      const actualTokens = optionalSingularCount
        ? tokens(target[key]).filter((token) => token !== "{{count}}")
        : tokens(target[key]);
      assert.deepEqual(
        actualTokens,
        tokens(original),
        `${code}: placeholders in ${key}`
      );
      assertValidTags(target[key], `${code}.${key}`);
    }
    for (const key of Object.keys(target)) {
      if (key in source) continue;
      assert.match(key, pluralSuffix, `${code}: obsolete or unexpected ${key}`);
      const original = source[key.replace(pluralSuffix, "_other")];
      assert.equal(
        typeof original,
        "string",
        `${code}: unknown plural family ${key}`
      );
      assert.deepEqual(
        tokens(target[key]),
        tokens(original),
        `${code}: plural placeholders in ${key}`
      );
      assertValidTags(target[key], `${code}.${key}`);
    }
    for (const [key, text] of Object.entries(target)) {
      assert.doesNotMatch(
        text,
        /animate__|(?:monster|baby)-dragon|^2-digit$|^translate\(|^rotate\(/,
        `${code}: non-UI ${key}`
      );
    }
  }
});

test("new locales supply every plural category for all translated plural families", () => {
  const source = flatten(en);
  for (const code of [
    "nl",
    "pl",
    "cs",
    "ja",
    "tr",
    "uk",
    "sv",
    "no",
    "hu",
    "ko"
  ]) {
    const target = flatten(require(`../src/client/i18n/locales/${code}.json`));
    const categories = new Intl.PluralRules(code).resolvedOptions()
      .pluralCategories;
    for (const key of Object.keys(source).filter((key) =>
      key.endsWith("_other")
    )) {
      for (const category of categories) {
        const pluralKey = key.replace(/_other$/, `_${category}`);
        assert.equal(
          typeof target[pluralKey],
          "string",
          `${code}: missing ${pluralKey}`
        );
      }
    }
  }
});

test("new locales do not ship English fallback paragraphs as translations", () => {
  const source = flatten(en);
  for (const code of [
    "nl",
    "pl",
    "cs",
    "ja",
    "tr",
    "uk",
    "sv",
    "no",
    "hu",
    "ko"
  ]) {
    const target = flatten(require(`../src/client/i18n/locales/${code}.json`));
    for (const [key, text] of Object.entries(source)) {
      const prose = text.replace(/<[^>]+>|\{\{[^}]+}}/g, " ");
      if ((prose.match(/[A-Za-z]+/g) ?? []).length < 12) continue;
      assert.notEqual(target[key], text, `${code}: untranslated ${key}`);
    }
  }
});

test("switching every language updates MobX labels without remounting or resetting a bid", async () => {
  const house = observable({
    id: "greyjoy",
    name: "Greyjoy",
    powerTokens: 7
  });
  const submitted = [];
  const gameState = observable({
    bids: new BetterMap(),
    participatingHouses: [house],
    powerTokensToBid: 0,
    getHousesLeftToBid: () => [],
    bid: (value) => submitted.push(value)
  });
  const reference = React.createRef();
  const view = render(
    React.createElement(
      React.Fragment,
      null,
      React.createElement(LanguageSelector),
      React.createElement(Bidding, {
        ref: reference,
        gameState,
        gameClient: { authenticatedPlayer: { house } }
      })
    )
  );
  const original = reference.current;
  const slider = view.getByRole("slider");
  await act(async () => {
    runInAction(() => {
      fireEvent.change(slider, { target: { value: "3" } });
    });
  });
  assert.equal(slider.value, "3");
  for (const { code, name } of languages) {
    fireEvent.click(view.getByRole("button", { expanded: false }));
    const option = await view.findByRole("menuitemradio", { name });
    assert.ok(option.querySelector('svg[aria-hidden="true"]'));
    await act(async () => {
      fireEvent.click(option);
    });
    await waitFor(() => assert.equal(i18n.resolvedLanguage, code));
    assert.equal(reference.current, original);
    assert.equal(view.getByRole("slider"), slider);
    assert.equal(slider.value, "3");
    const selector = view.getByRole("button", {
      name: `${t("language")}: ${name}`
    });
    assert.ok(selector.querySelector('svg[aria-hidden="true"]'));
    assert.equal(window.localStorage.getItem("snr.game.language"), code);
    assert.equal(
      document.documentElement.lang,
      code === "zh" ? "zh-Hans" : code
    );
    assert.ok(view.getByRole("button", { name: t("common.confirm") }));
  }
  fireEvent.click(view.getByRole("button", { name: t("common.confirm") }));
  assert.deepEqual(submitted, [3]);
});

test("the flagged language menu supports arrow keys, Escape and focus restoration", async () => {
  const view = render(React.createElement(LanguageSelector));
  const toggle = view.getByRole("button", { name: "Language: English" });
  toggle.focus();
  fireEvent.keyDown(toggle, { key: "ArrowDown", code: "ArrowDown" });
  const english = await view.findByRole("menuitemradio", { name: "English" });
  await waitFor(() => assert.equal(document.activeElement, english));
  fireEvent.keyDown(english, { key: "ArrowDown", code: "ArrowDown" });
  const czech = view.getByRole("menuitemradio", { name: "Čeština" });
  await waitFor(() => assert.equal(document.activeElement, czech));
  fireEvent.keyDown(czech, { key: "Escape", code: "Escape" });
  await waitFor(() => {
    assert.equal(toggle.getAttribute("aria-expanded"), "false");
    assert.equal(document.activeElement, toggle);
  });
});

test("shared waiting messages preserve rich house labels and escape player-controlled text", async () => {
  const maliciousName = '<img src=x onerror="alert(1)">';
  const view = render(
    React.createElement(Trans, {
      i18nKey: "common.waitingFor",
      components: {
        houses: React.createElement(
          "b",
          { "data-testid": "houses" },
          `Stark, ${maliciousName}`
        )
      }
    })
  );
  assert.equal(
    view.getByTestId("houses").textContent,
    `Stark, ${maliciousName}`
  );
  assert.equal(view.container.querySelector("img"), null);
  assert.match(view.container.textContent, /Waiting for Stark,/);
  await act(async () => {
    await i18n.changeLanguage("de");
  });
  assert.equal(
    view.getByTestId("houses").textContent,
    `Stark, ${maliciousName}`
  );
  assert.doesNotMatch(view.container.textContent, /Waiting for/);
  assert.equal(view.container.querySelector("img"), null);
});

test("support refusal translates the confirmation while preserving house names and cancellation", async (context) => {
  const commandedHouse = { id: "stark", name: "Stark" };
  const supportingHouse = { id: "tyrell", name: "Tyrell" };
  const refused = [];
  const prompts = [];
  let approved = false;
  context.mock.method(window, "confirm", (message) => {
    prompts.push(message);
    return approved;
  });
  const gameState = {
    houseCards: new BetterMap(),
    selectedHouseCard: null,
    combatGameState: {
      stats: [],
      game: {},
      dontSkipVsbQuestion: false,
      houseCombatDatas: new BetterMap([[commandedHouse, {}]]),
      tryGetCommandedHouseInCombat: () => commandedHouse
    },
    getWaitingForHouses: () => [],
    getSupportingHouses: () => [supportingHouse],
    getChoosableCards: () => [],
    canRefuseSupport: () => true,
    refuseSupport: (house) => refused.push(house)
  };
  const view = render(
    React.createElement(ChooseHouseCard, {
      gameState,
      gameClient: {
        authenticatedPlayer: { house: commandedHouse },
        doesControlHouse: () => true
      }
    })
  );
  await act(async () => {
    await i18n.changeLanguage("de");
  });
  const button = view.getByRole("button", {
    name: t("chooseHouseCard.refuseSupportFrom3f7482", { value0: "Tyrell" })
  });
  fireEvent.click(button);
  assert.deepEqual(refused, []);
  assert.equal(
    prompts[0],
    t("chooseHouseCard.confirmRefuseSupport", { house: "Tyrell" })
  );
  assert.match(prompts[0], /Tyrell/);
  assert.doesNotMatch(prompts[0], /Are you sure/);
  approved = true;
  fireEvent.click(button);
  assert.deepEqual(refused, [supportingHouse]);
});

test("rich text retains nested formatting, dynamic values and interactive component children", async () => {
  const clicked = [];
  const view = render(
    React.createElement(Trans, {
      i18nKey:
        "entireGame.fromRoundOnwardsEachHouseReceivesItsAlternativeDeck0f2244",
      components: {
        element0: React.createElement("b"),
        value1: React.createElement(
          "button",
          { onClick: () => clicked.push(true) },
          "4"
        )
      }
    })
  );
  assert.equal(view.container.querySelector("b button").textContent, "4");
  fireEvent.click(view.getByRole("button", { name: "4" }));
  await act(async () => {
    await i18n.changeLanguage("zh");
  });
  assert.equal(view.container.querySelector("b button").textContent, "4");
  fireEvent.click(view.getByRole("button", { name: "4" }));
  assert.deepEqual(clicked, [true, true]);
});

test("regional language codes, persisted preference and unsupported languages resolve safely", async () => {
  await i18n.changeLanguage("de-DE");
  assert.equal(i18n.resolvedLanguage, "de");
  assert.equal(i18n.services.languageDetector.detect()[0], "de-DE");
  await i18n.changeLanguage("pt-PT");
  assert.equal(i18n.resolvedLanguage, "pt");
  assert.equal(document.documentElement.lang, "pt");
  assert.notEqual(t("common.confirm"), "Confirm");
  await i18n.changeLanguage("zh-CN");
  assert.equal(i18n.resolvedLanguage, "zh");
  assert.equal(document.documentElement.lang, "zh-Hans");
  await i18n.changeLanguage("ja-JP");
  assert.equal(i18n.resolvedLanguage, "ja");
  assert.equal(document.documentElement.lang, "ja");
  assert.notEqual(t("common.confirm"), "Confirm");
  for (const [regionalCode, languageCode] of [
    ["tr-TR", "tr"],
    ["uk-UA", "uk"],
    ["sv-SE", "sv"],
    ["no-NO", "no"],
    ["nb-NO", "no"],
    ["hu-HU", "hu"],
    ["ko-KR", "ko"]
  ]) {
    await i18n.changeLanguage(regionalCode);
    assert.equal(i18n.resolvedLanguage, languageCode);
    assert.equal(document.documentElement.lang, languageCode);
    assert.notEqual(t("common.confirm"), "Confirm");
  }
  await i18n.changeLanguage("ar-SA");
  assert.equal(i18n.resolvedLanguage, "en");
  assert.equal(t("common.confirm"), "Confirm");
});

test("a fresh game client restores the site-wide language preference from localStorage", async () => {
  await i18n.changeLanguage("fr");
  assert.equal(window.localStorage.getItem("snr.game.language"), "fr");
  const freshClient = createInstance();
  await freshClient.use(LanguageDetector).init({
    ...i18n.options,
    detection: { ...i18n.options.detection }
  });
  assert.equal(freshClient.resolvedLanguage, "fr");
  assert.equal(freshClient.t("common.confirm"), t("common.confirm"));
  await freshClient.changeLanguage("it");
  assert.equal(window.localStorage.getItem("snr.game.language"), "it");
  assert.equal(i18n.services.languageDetector.detect()[0], "it");
});

test("empty community translations fall back to English rather than blanking controls", async () => {
  const original = i18n.getResource("de", "translation", "common.confirm");
  try {
    i18n.addResource("de", "translation", "common.confirm", "");
    await i18n.changeLanguage("de");
    assert.equal(t("common.confirm"), "Confirm");
  } finally {
    i18n.addResource("de", "translation", "common.confirm", original);
  }
});

test("server-owned prompts and unit descriptions translate only for display, never house names", async () => {
  const prompt =
    "House Stark may provide support against the Neutral Force in Winterfell.";
  await i18n.changeLanguage("es");
  const translated = translateGameText(prompt);
  assert.notEqual(translated, prompt);
  assert.match(translated, /Stark/);
  assert.match(translated, /Winterfell/);
  assert.equal(translateGameText("Stark"), "Stark");
  assert.equal(translateGameText("Tyrion Lannister"), "Tyrion Lannister");
  assert.equal(
    translateGameText("A future server prompt"),
    "A future server prompt"
  );
  assert.equal(translateGameText(undefined), undefined);
  assert.notEqual(
    translateGameText(
      "Adds 1 Combat Strength in battle. Costs 1 point of mustering."
    ),
    "Adds 1 Combat Strength in battle. Costs 1 point of mustering."
  );
  for (const count of [1, 2, 21]) {
    const source = en.gameText.houseTargaryenMayDiscardPowerTokenToMove69b917
      .replace("{{value0}}", count)
      .replace("{{value1}}", count === 1 ? "" : "s")
      .replace("{{value2}}", "Winterfell")
      .replace("{{value3}}", "Dragonstone");
    assert.equal(
      translateGameText(source),
      t("gameText.houseTargaryenMayDiscardPowerTokenToMove69b917", {
        count,
        value2: "Winterfell",
        value3: "Dragonstone"
      })
    );
    assert.notEqual(translateGameText(source), source);
  }
});

test("durations and token counts follow Russian, Portuguese, Polish, Czech and Ukrainian plural rules", async () => {
  await i18n.changeLanguage("ru");
  const ru = require("../src/client/i18n/locales/ru.json");
  for (const [days, suffix] of [
    [1, "one"],
    [2, "few"],
    [5, "many"],
    [21, "one"]
  ]) {
    const expected = ru.common[`duration_${suffix}`]
      .replaceAll("{{count}}", days)
      .replaceAll("{{time}}", "01:00");
    assert.equal(secondsToString((days * 24 + 1) * 3600), expected);
  }
  assert.equal(secondsToString(3600), "01:00");
  assert.match(t("common.gainPowerTokens", { count: 21 }), /21/);
  await i18n.changeLanguage("pt");
  assert.match(t("common.gainPowerTokens", { count: 0 }), /0/);
  assert.match(t("common.gainPowerTokens", { count: 21 }), /21/);
  await i18n.changeLanguage("pl");
  assert.equal(
    t("common.gainPowerTokens", { count: 2 }),
    "Zdobądź 2 żetony władzy"
  );
  assert.equal(
    t("common.gainPowerTokens", { count: 5 }),
    "Zdobądź 5 żetonów władzy"
  );
  await i18n.changeLanguage("cs");
  assert.equal(
    t("common.gainPowerTokens", { count: 3 }),
    "Získat 3 mocenské žetony"
  );
  assert.equal(
    t("common.gainPowerTokens", { count: 5 }),
    "Získat 5 mocenských žetonů"
  );
  await i18n.changeLanguage("uk");
  assert.equal(
    t("common.gainPowerTokens", { count: 1 }),
    "Отримати 1 жетон влади"
  );
  assert.equal(
    t("common.gainPowerTokens", { count: 2 }),
    "Отримати 2 жетони влади"
  );
  assert.equal(
    t("common.gainPowerTokens", { count: 5 }),
    "Отримати 5 жетонів влади"
  );
  assert.equal(
    t("common.gainPowerTokens", { count: 21 }),
    "Отримати 21 жетон влади"
  );
});

test("localization never replaces CSS classes, protocol values, date formatting parameters or emoji categories", () => {
  const directory = path.join(__dirname, "..", "src", "client");
  const technicalProperties = new Set([
    "id",
    "key",
    "type",
    "variant",
    "theme",
    "className",
    "transform",
    "hour",
    "minute",
    "second",
    "timeZone",
    "backgroundImage"
  ]);
  function inspect(file) {
    const source = fs.readFileSync(file, "utf8");
    const ast = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );
    function visit(node) {
      if (ts.isCallExpression(node) && node.expression.getText(ast) === "t") {
        for (let parent = node.parent; parent; parent = parent.parent) {
          if (ts.isCallExpression(parent) || ts.isFunctionLike(parent)) break;
          if (ts.isPropertyAssignment(parent) || ts.isJsxAttribute(parent)) {
            assert.ok(
              !technicalProperties.has(parent.name.getText(ast)),
              `${file}: translation in ${parent.name.getText(ast)}`
            );
            break;
          }
          if (
            ts.isBinaryExpression(parent) &&
            parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
          ) {
            assert.doesNotMatch(
              parent.left.getText(ast),
              /ClassName$|\.transform$/,
              `${file}: translated technical assignment`
            );
          }
        }
      }
      if (
        ts.isJsxSelfClosingElement(node) &&
        node.tagName.getText(ast) === "EmojiPicker"
      ) {
        const categories = node.attributes.properties.find(
          (a) => ts.isJsxAttribute(a) && a.name.getText(ast) === "categories"
        );
        for (const category of categories.initializer.expression.elements) {
          const label = category.properties.find(
            (p) => p.name?.getText(ast) === "name"
          );
          assert.ok(
            ts.isStringLiteral(label.initializer),
            "Emoji category identifiers must stay literal English"
          );
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== "i18n") walk(file);
      else if (entry.isFile() && file.endsWith(".tsx")) inspect(file);
    }
  }
  walk(directory);
});
