const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const { dealCandidateMoves } = require("../src/candidate-move-deck.cjs");

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
    producedCount: 6,
    requestedCount: 6,
    shortfall: false,
    candidates: Array.from({ length: 6 }, (_, index) => ({
      index,
      role: index === 0 ? "baseline" : `frontier-${index}`,
      signature: `creature-${index + 1} · pulse · grain`,
      scoreAddress: `htvs1_${hash}_${index + 1}`,
      thumbnailDataUrl: "data:image/png;base64,",
      changedAxes: index ? ["motion"] : [],
      toastmoodLane: {
        id: `lane-${index + 1}`,
        name: `Lane ${index + 1}`,
      },
    })),
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
  window.candidateMoveDeck = { dealCandidateMoves };
  window.HTMLElement.prototype.scrollIntoView = () => {};

  const calls = { generated: [], stomped: [], mutated: [], crossed: [] };
  window.fullMeasure = {
    generateCandidates: async (config) => {
      calls.generated.push(config);
      return family("family-1");
    },
    mutateCandidates: async (config) => {
      calls.mutated.push(config);
      return family("family-mutate");
    },
    crossCandidates: async (config) => {
      calls.crossed.push(config);
      return family("family-cross");
    },
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

test("STOMP is dealt as one selected-candidate move and still uses the existing one-shot authority path", async () => {
  const view = harness();
  const { document, calls } = view;
  try {
    document.querySelector(".candidate-launch").click();
    await tick();
    await tick();
    assert.equal(calls.generated.length, 1);

    document.querySelector(".candidate-card").click();
    const moveCards = [...document.querySelectorAll(".candidate-move-card")];
    assert.equal(moveCards.length, 6);
    const stomp = moveCards.find((card) => card.dataset.moveKind === "stomp");
    assert.ok(stomp, "second six-up must deal one STOMP proposal");
    assert.match(stomp.textContent, /STOMP/);
    assert.match(stomp.textContent, /stranger six/i);

    stomp.click();
    await tick();
    await tick();
    assert.equal(calls.stomped.length, 1);
    assert.equal(calls.stomped[0].familyHash, "family-1");
    assert.equal(calls.stomped[0].parentIndex, 0);
    assert.equal(calls.stomped[0].locks.length, 0);
    assert.equal(calls.stomped[0].toastFeelId, "wire-heat");
    assert.match(calls.stomped[0].rootSeed, /:stomp:/);

    assert.equal(document.querySelectorAll("#candidateStomp").length, 0);
  } finally {
    view.dom.window.close();
  }
});

test("preload and candidate session keep the existing explicit STOMP execution path", () => {
  const preload = fs.readFileSync(path.join(root, "src", "preload.cjs"), "utf8");
  const session = fs.readFileSync(path.join(root, "src", "candidate-session.cjs"), "utf8");
  assert.match(preload, /stompCandidates:\s*\(config\)\s*=>\s*ipcRenderer\.invoke\("candidate:stomp", config\)/);
  assert.match(session, /ipcMain\.handle\("candidate:stomp"/);
  assert.match(session, /generateStompCandidateSet/);
  assert.doesNotMatch(session, /config\.stomp\s*===\s*true/);
});
