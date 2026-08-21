const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { TextEncoder } = require("node:util");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "..");
const rendererRoot = path.join(root, "src", "renderer");
const html = fs.readFileSync(path.join(rendererRoot, "index.html"), "utf8");

function loadRendererDocument() {
  return new JSDOM(html).window.document;
}

function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function candidateFamily(label = "initial") {
  return {
    schema: "haunted-toaster/candidate-family/v1",
    familyHash: `beta-family-${label}`,
    producedCount: 6,
    requestedCount: 6,
    shortfall: false,
    toastmoodField: label === "initial" ? { policy: "toastmood-field-v1" } : null,
    cross: label === "cross" ? { policy: "two-parent-cross-v1" } : null,
    candidates: Array.from({ length: 6 }, (_, index) => ({
      index,
      role: index === 0 ? "toastmood:low-and-slow" : "coverage",
      signature: `${label}-creature-${index + 1}`,
      scoreAddress: `htvs1_${label}_${index + 1}`,
      thumbnailDataUrl: "data:image/png;base64,",
      changedAxes: index ? ["topology"] : [],
      toastmoodLane: { id: `lane-${index + 1}`, name: `Lane ${index + 1}` },
    })),
  };
}

function candidateHarness(capabilities = []) {
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "file:///haunted-toaster/index.html",
  });
  const { window } = dom;
  const { document } = window;
  window.TextEncoder = TextEncoder;
  document.querySelector("#songFacts").classList.remove("is-hidden");
  document.querySelector("#audioDropTitle").textContent = "Specimen";
  window.toastFeel = {
    getToastFeelId: () => "low-and-slow",
    getCandidateToastFeelId: () => null,
  };
  window.HTMLElement.prototype.scrollIntoView = () => {};
  const calls = { generated: [], crossed: [] };
  window.fullMeasure = {
    getBuildInfo: async () => ({ capabilities }),
    generateCandidates: async (config) => {
      calls.generated.push(config);
      return candidateFamily("initial");
    },
    mutateCandidates: async () => candidateFamily("mutate"),
    crossCandidates: async (config) => {
      calls.crossed.push(config);
      return candidateFamily("cross");
    },
    stompCandidates: async () => candidateFamily("stomp"),
    selectCandidate: async () => ({}),
    clearCandidates: async () => {},
    clearCandidateImage: async () => {},
  };
  window.eval(fs.readFileSync(path.join(rendererRoot, "candidate-move-deck.js"), "utf8"));
  window.eval(fs.readFileSync(path.join(rendererRoot, "candidate-ui.js"), "utf8"));
  window.eval(fs.readFileSync(path.join(rendererRoot, "recent-toasts-ui.js"), "utf8"));
  return { dom, window, document, calls };
}

test("beta home semantic windows exist without hiding alpha Toast Feel truth", () => {
  const document = loadRendererDocument();

  assert.ok(document.querySelector("#videoSourceMount"));
  assert.ok(document.querySelector("#videoPantryWindow"));
  assert.ok(document.querySelector("#betaSixUpWindow")?.classList.contains("is-hidden"));
  assert.ok(document.querySelector("#betaSixUpGrid"));
  assert.ok(document.querySelector("#recentToastsWindow")?.classList.contains("is-hidden"));
  assert.ok(document.querySelector("#toastFeelChoices"));
});

test("production renderer loads the beta home presentation assets", () => {
  const document = loadRendererDocument();
  assert.ok(document.querySelector('link[href="./beta-home-ui.css"]'));
  assert.ok(document.querySelector('script[src="./recent-toasts-ui.js"]'));
});

test("alpha capability set keeps Toast Feel furniture and beta contact sheet hidden", async () => {
  const view = candidateHarness([]);
  try {
    await tick();
    await tick();
    assert.equal(view.document.querySelector("#toastFeelChoices").classList.contains("is-hidden"), false);
    assert.equal(view.document.querySelector("#betaSixUpWindow").classList.contains("is-hidden"), true);
    assert.equal(view.document.querySelector("#slateToastFeel").textContent, "Loading…");
  } finally {
    view.dom.window.close();
  }
});

test("beta candidate ecology projects the same six-up family without changing candidate authority", async () => {
  const view = candidateHarness(["betaCandidateEcologyV1"]);
  try {
    await tick();
    await tick();
    assert.equal(view.document.querySelector("#toastFeelChoices").classList.contains("is-hidden"), true);
    assert.equal(view.document.querySelector("#betaSixUpWindow").classList.contains("is-hidden"), false);
    assert.equal(view.document.querySelector("#garmentHeading").textContent, "Six-Up");
    assert.equal(view.document.querySelector("#slateToastFeel").closest("div").querySelector("dt").textContent, "Creative field");
    assert.equal(view.document.querySelector("#slateToastFeel").textContent, "Six-Up field");

    view.document.querySelector("#betaSixUpGenerate").click();
    await tick();
    await tick();

    assert.equal(view.calls.generated.length, 1);
    assert.equal(view.calls.generated[0].toastFeelId, null);
    assert.match(view.calls.generated[0].rootSeed, /:unselected:/);
    assert.doesNotMatch(view.calls.generated[0].rootSeed, /:toastmood-field:/);
    assert.equal(view.document.querySelectorAll("#betaSixUpGrid .beta-six-up-cell").length, 6);
    assert.equal(view.document.querySelectorAll("#candidateGrid .candidate-card").length, 6);

    view.document.querySelector("#betaSixUpGrid .beta-six-up-cell").click();
    assert.equal(view.document.querySelector(".candidate-modal").classList.contains("is-hidden"), false);
  } finally {
    view.dom.window.close();
  }
});

test("enabled CROSS button invokes the two-parent bridge and replaces the current six-up", async () => {
  const view = candidateHarness(["betaCandidateEcologyV1"]);
  try {
    await tick();
    await tick();

    view.document.querySelector(".candidate-launch").click();
    await tick();
    await tick();
    assert.equal(view.document.querySelectorAll("#candidateGrid .candidate-card").length, 6);

    view.document.querySelector("#candidateGrid .candidate-card").click();
    const crossButton = [...view.document.querySelectorAll('#candidateMoveGrid [data-move-kind="cross"]')]
      .find((button) => !button.disabled);
    assert.ok(crossButton, "expected an enabled CROSS proposal");

    crossButton.click();
    await tick();
    await tick();

    assert.equal(view.calls.crossed.length, 1);
    assert.equal(view.calls.crossed[0].familyHash, "beta-family-initial");
    assert.equal(view.calls.crossed[0].parentIndexes.length, 2);
    assert.notEqual(view.calls.crossed[0].parentIndexes[0], view.calls.crossed[0].parentIndexes[1]);
    assert.deepEqual(view.calls.crossed[0].locks, []);
    assert.equal(view.document.querySelectorAll("#candidateGrid .candidate-card").length, 6);
    assert.equal(
      view.document.querySelector("#candidateGrid .candidate-card strong")?.textContent,
      "cross-creature-1",
    );
  } finally {
    view.dom.window.close();
  }
});
