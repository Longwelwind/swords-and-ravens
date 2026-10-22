// Generates the website's scenario catalog (setups, their player counts and participating houses)
// from data/baseGameData.json so the website's statistics never drift from the game server.
// The website's Docker build can't see this project, so the output is committed.
// Usage: yarn run generate-scenario-catalog
const fs = require("fs");
const path = require("path");

const data = require("../data/baseGameData.json");

// Display order used by the website (board order, expansions last).
const houseOrder = [
  "baratheon",
  "lannister",
  "stark",
  "greyjoy",
  "tyrell",
  "martell",
  "arryn",
  "targaryen"
];
const orderOf = (h) => {
  const i = houseOrder.indexOf(h);
  return i === -1 ? houseOrder.length : i;
};
const byHouseOrder = (a, b) => orderOf(a) - orderOf(b) || a.localeCompare(b);

const catalog = {
  houses: Object.keys(data.houses)
    .sort(byHouseOrder)
    .map((id) => ({
      id,
      name: data.houses[id].name,
      color: data.houses[id].color
    })),
  setups: Object.entries(data.setups).map(([id, setup]) => ({
    id,
    name: setup.name,
    playerSetups: setup.playerSetups
      .map((ps) => ({
        playerCount: ps.playerCount,
        houses: [...ps.houses].sort(byHouseOrder)
      }))
      .sort((a, b) => a.playerCount - b.playerCount)
  }))
};

const target = path.resolve(
  __dirname,
  "../../agot-bg-website-dotnet/agot-bg-website/GameData/scenarios.json"
);
fs.writeFileSync(target, JSON.stringify(catalog, null, 2) + "\n");
console.log(`Wrote ${target}`);
