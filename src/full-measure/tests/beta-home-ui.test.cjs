const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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

function candidateFamily() {
  return {
    schema: "haunted-toaster/candidate-family/v1",
    familyHash: "beta-family-1",
    producedCount: 6,
    requestedCount: 6,
    shortfall: false,
    candidates: Array.from({ length: 6 }, (_, index) => ({
      index,
      role: index === 0 ? "baseline" : "coverage",
      signature: `creature-${index + 1}`,
      scoreAddress: `htvs1_beta_${index + 1}`,
      thumbnailDataUrl: "data:image/png;base64,",
      changedAxes: index ? ["topology"] : [],
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
  document.querySelector("#songFacts").classList.remove("is-hidden");
  document.querySelector("#audioDropTitle").textContent = "Specimen";
  window.toastFeel = { getToastFeelId: () => "wire-heat" };
  window.HTMLElement.prototype.scrollIntoView = () => {};
  const calls = { generated: [] };
  window.fullMeasure = {
    getBuildInfo: async () => ({ capabilities }),
    generateCandidates: async (config) => {
      calls.generated.push(config);
      return candidateFamily();
    },
    mutateCandidates: async () => candidateFamily(),
    stompCandidates: async () => candidateFamily(),
    selectCandidate: async () => ({}),
    clearCandidates: async () => {},
    clearCandidateImage: async () => {},
  };
  window.eval(fs.readFileSync(path.join(rendererRoot, "candidate-ui.js"), "utf8"));
  return { dom, window, document, calls };
}

test("beta home semantic windows exist without hiding alpha Toast Feel truth", () => {
  const document = loadRendererDocument();

  assert.ok(document.querySelector("#videoSourceMount"));
  assert.ok(document.querySelector("#videoPantryWindow"));
  assert.ok(document.querySelector("#betaSixUpWindow")?.classList.contains("is-hidden"));
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

test("beta candidate ecology replaces preselection with the same six-up family projection", async () => {
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
    assert.equal(Object.hasOwn(view.calls.generated[0], "toastFeelId"), false);
    assert.equal(view.document.querySelectorAll("#betaSixUpGrid .beta-six-up-cell").length, 6);
    assert.equal(view.document.querySelectorAll("#candidateGrid .candidate-card").length, 6);

    view.document.querySelector("#betaSixUpGrid .beta-six-up-cell").click();
    assert.equal(view.document.querySelector(".candidate-modal").classList.contains("is-hidden"), false);
  } finally {
    view.dom.window.close();
  }
});
