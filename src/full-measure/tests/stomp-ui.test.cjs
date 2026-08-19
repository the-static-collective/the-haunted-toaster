const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "..");
const rendererRoot = path.join(root, "src", "renderer");
const html = fs.readFileSync(path.join(rendererRoot, "index.html"), "utf8");

function tick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function family(hash = "family-1") {
  return {
    schema: "haunted-toaster/candidate-family/v1",
    familyHash: hash,
    producedCount: 1,
    requestedCount: 6,
    shortfall: true,
    candidates: [{
      index: 0,
      role: "baseline",
      signature: "spiral · pulse · grain",
      scoreAddress: `htvs1_${hash}`,
      thumbnailDataUrl: "data:image/png;base64,",
      changedAxes: [],
    }],
  };
}

function harness() {
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "file:///haunted-toaster/index.html",
  });
  const { window } = dom;
  const { document } = window;
  document.querySelector("#songFacts").classList.remove("is-hidden");
  document.querySelector("#audioDropTitle").textContent = "Specimen";
  window.toastFeel = {
    getToastFeelId: () => "wire-heat",
    getCandidateToastFeelId: () => "wire-heat",
  };
  window.HTMLElement.prototype.scrollIntoView = () => {};

  const calls = { generated: [], stomped: [] };
  window.fullMeasure = {
    generateCandidates: async (config) => {
      calls.generated.push(config);
      return family("family-1");
    },
    mutateCandidates: async () => family("family-mutate"),
    stompCandidates: async (config) => {
      calls.stomped.push(config);
      return family("family-stomp");
    },
    selectCandidate: async () => ({}),
    clearCandidates: async () => {},
    clearCandidateImage: async () => {},
  };

  window.eval(fs.readFileSync(path.join(rendererRoot, "candidate-ui.js"), "utf8"));
  return { dom, window, document, calls };
}

test("STOMP is a selected-candidate one-shot action with exact boredom copy", async () => {
  const view = harness();
  const { document, calls } = view;
  try {
    const stomp = document.querySelector("#candidateStomp");
    const help = document.querySelector("#candidateStompHelp");
    assert.ok(stomp);
    assert.equal(stomp.textContent.trim(), "STOMP");
    assert.equal(help?.textContent.trim(), "Bored? Floor the next six.");
    assert.equal(stomp.disabled, true);

    document.querySelector(".candidate-launch").click();
    await tick();
    await tick();
    assert.equal(calls.generated.length, 1);
    assert.equal(stomp.disabled, true);

    document.querySelector(".candidate-card").click();
    assert.equal(stomp.disabled, false);

    stomp.click();
    await tick();
    await tick();
    assert.equal(calls.stomped.length, 1);
    assert.equal(calls.stomped[0].familyHash, "family-1");
    assert.equal(calls.stomped[0].parentIndex, 0);
    assert.equal(calls.stomped[0].locks.length, 0);
    assert.equal(calls.stomped[0].toastFeelId, "wire-heat");
    assert.match(calls.stomped[0].rootSeed, /:stomp:/);

    // The returned family is ordinary six-up state; there is no armed toggle.
    assert.equal(stomp.getAttribute("aria-pressed"), null);
    assert.equal(stomp.disabled, true);
  } finally {
    view.dom.window.close();
  }
});

test("preload and candidate session expose an explicit STOMP request path", () => {
  const preload = fs.readFileSync(path.join(root, "src", "preload.cjs"), "utf8");
  const session = fs.readFileSync(path.join(root, "src", "candidate-session.cjs"), "utf8");
  assert.match(preload, /stompCandidates:\s*\(config\)\s*=>\s*ipcRenderer\.invoke\("candidate:stomp", config\)/);
  assert.match(session, /ipcMain\.handle\("candidate:stomp"/);
  assert.match(session, /generateStompCandidateSet/);
  assert.doesNotMatch(session, /config\.stomp\s*===\s*true/);
});
