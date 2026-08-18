const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

function loadRendererDocument() {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "src", "renderer", "index.html"),
    "utf8",
  );
  return new JSDOM(html).window.document;
}

test("beta home semantic windows exist without hiding alpha Toast Feel truth", () => {
  const document = loadRendererDocument();

  assert.ok(document.querySelector("#videoSourceMount"));
  assert.ok(document.querySelector("#videoPantryWindow"));
  assert.ok(document.querySelector("#betaSixUpWindow")?.classList.contains("is-hidden"));
  assert.ok(document.querySelector("#recentToastsWindow")?.classList.contains("is-hidden"));
  assert.ok(document.querySelector("#toastFeelChoices"));
});
