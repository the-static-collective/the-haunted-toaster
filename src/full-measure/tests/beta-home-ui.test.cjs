const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const rendererRoot = path.join(__dirname, "..", "src", "renderer");
const html = fs.readFileSync(path.join(rendererRoot, "index.html"), "utf8");

function documentForRenderer() {
  return new JSDOM(html).window.document;
}

test("beta home semantic windows exist without creating a second candidate surface", () => {
  const document = documentForRenderer();

  assert.ok(document.querySelector("#videoSourceMount"));
  assert.ok(document.querySelector("#videoPantryWindow"));
  assert.ok(document.querySelector("#betaSixUpWindow")?.classList.contains("is-hidden"));
  assert.ok(document.querySelector("#betaSixUpGrid"));
  assert.ok(document.querySelector("#betaSixUpGenerate"));
  assert.ok(document.querySelector("#betaSixUpState"));
  assert.ok(document.querySelector("#recentToastsWindow")?.classList.contains("is-hidden"));
  assert.ok(document.querySelector("#recentToastsList"));
  assert.ok(document.querySelector("#toastFeelChoices"));
  assert.equal(document.querySelectorAll("#candidateGrid").length, 0);
});

test("production renderer loads beta home presentation assets", () => {
  const document = documentForRenderer();
  assert.ok(document.querySelector('link[href="./beta-home-ui.css"]'));
  assert.ok(document.querySelector('script[src="./recent-toasts-ui.js"]'));
});
