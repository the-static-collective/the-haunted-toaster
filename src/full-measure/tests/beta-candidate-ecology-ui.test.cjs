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

test("move proposals stay a renderer-local deterministic projection with no preload or IPC authority", () => {
  const preload = source("src/preload.cjs");
  const session = source("src/candidate-session.cjs");
  const html = source("src/renderer/index.html");
  const wrapper = source("src/candidate-move-deck.cjs");

  assert.doesNotMatch(preload, /candidate-move-deck|candidate:deal-moves|dealCandidateMoves/);
  assert.doesNotMatch(session, /candidate:deal-moves/);
  assert.match(html, /src="\.\/candidate-move-deck\.js"/);
  assert.ok(
    html.indexOf('./candidate-move-deck.js') < html.indexOf('./candidate-ui.js'),
    "move dealer must load before candidate UI",
  );
  assert.match(wrapper, /require\("\.\/renderer\/candidate-move-deck\.js"\)/);
});

test("candidate UI replaces the verb toolbar with one contextual second six-up", () => {
  const ui = source("src/renderer/candidate-ui.js");
  assert.match(ui, /id="candidateMoveGrid"/);
  assert.match(ui, /id="candidateMoveRedeal"/);
  assert.match(ui, /window\.candidateMoveDeck/);
  assert.match(ui, /dealCandidateMoves/);
  assert.match(ui, /moveDealIndex/);
  assert.match(ui, /proposal\.parentIndexes/);
  assert.match(ui, /api\.crossCandidates/);
  assert.match(ui, /api\.stompCandidates/);
  assert.match(ui, /api\.mutateCandidates/);
  assert.match(ui, /id="candidateUse"/);
  assert.doesNotMatch(ui, /id="candidateCrossMark"/);
  assert.doesNotMatch(ui, /id="candidateCross"/);
  assert.doesNotMatch(ui, /Mark CROSS parent/);
  assert.doesNotMatch(ui, /CROSS A \+ B/);
});

test("re-deal is proposal-only and candidate operations are isolated behind proposal execution", () => {
  const ui = source("src/renderer/candidate-ui.js");
  const redealHandler = ui.match(/function redealMoves\(\)\s*\{([\s\S]*?)\n\s*\}/);
  assert.ok(redealHandler, "candidate UI must define one bounded re-deal handler");
  assert.match(redealHandler[1], /moveDealIndex\s*\+=\s*1/);
  assert.match(redealHandler[1], /renderMoveDeck\(\)/);
  assert.doesNotMatch(redealHandler[1], /mutateCandidates|crossCandidates|stompCandidates|generateCandidates/);
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

test("second six-up remains fixed furniture rather than a second scroll authority", () => {
  const css = source("src/renderer/candidate-ui.css");
  const moveGridRule = css.match(/\.candidate-move-grid\s*\{([^}]*)\}/s);
  assert.ok(moveGridRule, "second six-up grid must have an explicit layout rule");
  assert.doesNotMatch(moveGridRule[1], /overflow(?:-y)?:\s*(?:auto|scroll)/);
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
