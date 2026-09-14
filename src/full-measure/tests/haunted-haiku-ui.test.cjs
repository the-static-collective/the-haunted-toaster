const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { JSDOM } = require("jsdom");

const uiModulePath = path.resolve(
  __dirname,
  "..",
  "src",
  "renderer",
  "haunted-haiku-ui.js",
);

test("completion UI has a dedicated Haunted Haiku receipt renderer", () => {
  assert.equal(
    fs.existsSync(uiModulePath),
    true,
    "renderer/haunted-haiku-ui.js should own the completion receipt presentation",
  );
});

test("Haunted Haiku receipt renders the ready-to-paste YouTube description below completion", () => {
  assert.equal(fs.existsSync(uiModulePath), true);
  const { renderHauntedHaikuReceipt } = require(uiModulePath);
  assert.equal(typeof renderHauntedHaikuReceipt, "function");

  const dom = new JSDOM(`<!doctype html><html><head></head><body>
    <div class="result-card" id="resultCard">
      <div class="result-check">✓</div>
      <div><span>Full measure rendered</span><strong id="resultName">specimen.mp4</strong></div>
      <div class="result-actions"></div>
    </div>
  </body></html>`);

  try {
    const description = [
      "porch light under daylight",
      "the reflection leaves first",
      "the house keeps the receipt",
      "",
      "Rearrange the Light · Haunted Toaster specimen · The Static Collective",
      "",
      "#HauntedToaster #TheStaticCollective #ExperimentalVideo",
    ].join("\n");
    const receipt = {
      publication: {
        hauntedHaiku: {
          schema: "haunted-haiku/v1",
          authority: "descriptive-only",
          lines: [
            "porch light under daylight",
            "the reflection leaves first",
            "the house keeps the receipt",
          ],
          youtubeDescription: description,
        },
      },
    };

    const section = renderHauntedHaikuReceipt(dom.window.document, receipt);
    assert.ok(section);
    assert.equal(section.dataset.authority, "descriptive-only");
    assert.equal(section.querySelector("strong").textContent, "Haunted Haiku");
    assert.equal(section.querySelector("pre").textContent, description);
    assert.equal(section.parentElement.id, "resultCard");
    assert.ok(dom.window.document.querySelector("#hauntedHaikuReceiptStyle"));
  } finally {
    dom.window.close();
  }
});

test("Haunted Haiku completion UI stays absent without an accepted publication witness", () => {
  assert.equal(fs.existsSync(uiModulePath), true);
  const { renderHauntedHaikuReceipt } = require(uiModulePath);
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="resultCard"></div></body></html>');

  try {
    assert.equal(renderHauntedHaikuReceipt(dom.window.document, {}), null);
    assert.equal(dom.window.document.querySelector("#hauntedHaikuReceipt"), null);
  } finally {
    dom.window.close();
  }
});
