const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const { listToastFeels } = require("../src/toast-feels.cjs");

const root = path.resolve(__dirname, "..");

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("Toast Feel controller distinguishes displayed default from explicit candidate pressure", async () => {
  const dom = new JSDOM('<div id="toastFeelChoices" aria-busy="true"></div>', {
    runScripts: "outside-only",
    url: "file:///haunted-toaster/index.html",
  });
  const { window } = dom;
  window.fullMeasure = { getToastFeels: async () => listToastFeels() };
  window.eval(source("src/renderer/toast-feel-controller.js"));

  try {
    await window.toastFeel.ready;
    assert.equal(window.toastFeel.getToastFeelId(), "low-and-slow");
    assert.equal(window.toastFeel.getCandidateToastFeelId(), null);

    const wireHeat = window.document.querySelector('[data-toast-feel-id="wire-heat"]');
    wireHeat.click();
    assert.equal(window.toastFeel.getToastFeelId(), "wire-heat");
    assert.equal(window.toastFeel.getCandidateToastFeelId(), "wire-heat");
  } finally {
    window.close();
  }
});

test("candidate UI sends no Toast Feel pressure until the human explicitly chooses one", () => {
  const ui = source("src/renderer/candidate-ui.js");
  assert.match(ui, /getCandidateToastFeelId/);
  assert.match(ui, /toastFeelId:\s*currentCandidateToastFeelId\(\)/);
});

test("preload and candidate UI expose exact two-parent CROSS as a separate action", () => {
  const preload = source("src/preload.cjs");
  const ui = source("src/renderer/candidate-ui.js");
  assert.match(preload, /crossCandidates:\s*\(config\)\s*=>\s*ipcRenderer\.invoke\("candidate:cross", config\)/);
  assert.match(ui, /id="candidateCross"/);
  assert.match(ui, /id="candidateCrossMark"/);
  assert.match(ui, /api\.crossCandidates/);
  assert.match(ui, /parentIndexes:\s*\[\.\.\.crossParents\]/);
  assert.match(ui, /crossParents\.length\s*!==\s*2/);
});

test("candidate hover changes emphasis without changing six-up geometry", () => {
  const css = source("src/renderer/candidate-ui.css");
  const hoverRule = css.match(/\.candidate-card:hover\s*\{([^}]*)\}/s);
  assert.ok(hoverRule, "candidate hover rule must remain explicit");
  assert.match(hoverRule[1], /border-color:/);
  assert.doesNotMatch(
    hoverRule[1],
    /transform\s*:/,
    "candidate hover must not translate the card inside the overflow container",
  );
});

test("six-up shell never owns native scrolling; candidate grid is the bounded scroll region", () => {
  const css = source("src/renderer/candidate-ui.css");
  const surfaceRule = css.match(/\.candidate-surface\s*\{([^}]*)\}/s);
  const gridRule = css.match(/\.candidate-grid\s*\{([^}]*)\}/s);

  assert.ok(surfaceRule, "candidate surface rule must remain explicit");
  assert.match(surfaceRule[1], /overflow:\s*hidden;/, "outer six-up shell must never become a native scroll container");
  assert.doesNotMatch(surfaceRule[1], /overflow(?:-y)?:\s*(?:auto|scroll)/, "outer shell cannot own native scrolling");
  assert.ok(gridRule, "candidate grid rule must remain explicit");
  assert.match(gridRule[1], /min-height:\s*0;/, "candidate grid must be allowed to shrink inside the viewport cap");
  assert.match(gridRule[1], /overflow-y:\s*auto;/, "only the bounded candidate grid may scroll when necessary");
});

test("accepted field candidate binds its elected lane through the existing production render event", () => {
  const ui = source("src/renderer/candidate-ui.js");
  const app = source("src/renderer/app.js");
  assert.match(ui, /candidate-toast-feel-binding/);
  assert.match(ui, /Field ·/);
  assert.match(ui, /source:\s*"candidate-lane"/);
  assert.match(ui, /event\.detail\?\.source\s*===\s*"candidate-lane"/);
  assert.match(app, /window\.addEventListener\("toast-feel-change"/);
});
