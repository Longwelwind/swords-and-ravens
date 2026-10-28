const { JSDOM } = require("jsdom");

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost",
  pretendToBeVisual: true
});
const style = dom.window.document.createElement("style");
style.textContent =
  ".fade { transition-duration: 0.15s; transition-delay: 0s; }";
dom.window.document.head.append(style);

for (const name of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "Element",
  "Node",
  "SVGElement",
  "MutationObserver"
]) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: dom.window[name]
  });
}
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(
  dom.window
);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(
  dom.window
);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

for (const extension of [".png", ".jpg", ".svg", ".ico", ".ogg", ".mp3"]) {
  require.extensions[extension] = (module, filename) => {
    module.exports = filename;
  };
}
