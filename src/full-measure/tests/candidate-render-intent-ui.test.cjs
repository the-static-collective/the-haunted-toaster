const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "..");

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function flush() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function familyView(familyHash = "family-test", scoreAddress = "htvs1_candidate_test") {
  return {
    familyHash,
    producedCount: 1,
    requestedCount: 1,
    candidates: [{
      index: 0,
      role: "baseline",
      thumbnailDataUrl: "data:image/png;base64,",
      signature: "Spiral · drift · grain",
      scoreAddress,
      changedAxes: [],
      toastmoodLane: null,
    }],
  };
}

function createDom() {
  return new JSDOM(`
    <body>
      <section class="garment-panel"></section>
      <section class="shape-card"><div id="timeline"></div></section>
      <button id="renderButton" type="button">
        <span class="button-label">
          <small>SONG IN → MP4 OUT</small>
          <strong>Make full video</strong>
        </span>
      </button>
      <div id="audioDropTitle">2. The Thermos Gasket.wav</div>
      <div id="songFacts"></div>
      <input id="titleInput" value="2. The Thermos Gasket" />
      <input id="artistInput" value="" />
      <textarea id="lyricsInput">hello</textarea>
      <section class="render-panel"></section>
    </body>
  `, {
    runScripts: "outside-only",
    url: "file:///haunted-toaster/index.html",
  });
}

function installSharedWindowState(window) {
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.toastFeel = {
    getToastFeelId: () => "low-and-slow",
    getCandidateToastFeelId: () => null,
  };
  window.candidateMoveDeck = {
    dealCandidateMoves: () => ({
      dealAddress: "move-deal-test",
      dealIndex: 0,
      proposals: [],
    }),
  };
}

test("candidate UI keeps focus observational and requires explicit KEEP for render authority", async () => {
  const dom = createDom();
  const { window } = dom;
  installSharedWindowState(window);

  let selectCalls = 0;
  let keepCalls = 0;
  let clearCalls = 0;
  window.fullMeasure = {
    generateCandidates: async () => familyView(),
    selectCandidate: async () => {
      selectCalls += 1;
      throw new Error("ordinary UI must not use focus as render authority");
    },
    keepCandidate: async (request) => {
      keepCalls += 1;
      assert.equal(request.familyHash, "family-test");
      assert.equal(request.index, 0);
      return {
        verdict: "KEEP",
        familyHash: "family-test",
        index: 0,
        continuationPermission: true,
        toastFeel: null,
      };
    },
    scrapeCandidates: async () => { throw new Error("not exercised"); },
    clearCandidates: async () => {
      clearCalls += 1;
      return true;
    },
    clearCandidateImage: async () => true,
    mutateCandidates: async () => { throw new Error("not exercised"); },
    crossCandidates: async () => { throw new Error("not exercised"); },
    stompCandidates: async () => { throw new Error("not exercised"); },
  };

  window.eval(source("src/renderer/candidate-ui.js"));

  try {
    window.document.querySelector(".candidate-launch").click();
    await flush();
    await flush();

    const card = window.document.querySelector(".candidate-card");
    assert.ok(card, "real candidate UI must render a selectable card");
    card.click();

    assert.equal(selectCalls, 0, "card click is observational and must not silently become render authority");
    assert.equal(keepCalls, 0);
    assert.equal(
      window.document.querySelector("#renderButton .button-label strong").textContent,
      "Make full video",
      "render control must not claim a kept timeline before explicit KEEP",
    );

    const keep = window.document.querySelector("#candidateKeep");
    assert.ok(keep, "ordinary candidate UI must expose KEEP");
    keep.click();
    await flush();

    assert.equal(keepCalls, 1, "KEEP must perform the authoritative continuation transition");
    assert.equal(selectCalls, 0, "KEEP must not be implemented by the old focus/select binding");
    assert.equal(
      window.document.querySelector("#renderButton .button-label small").textContent,
      "KEPT TIMELINE → MP4",
    );
    assert.equal(
      window.document.querySelector("#renderButton .button-label strong").textContent,
      "Render kept vision",
    );

    const lyrics = window.document.querySelector("#lyricsInput");
    lyrics.value = "changed after candidate acceptance";
    lyrics.dispatchEvent(new window.Event("input", { bubbles: true }));
    await flush();

    assert.equal(clearCalls, 1, "render-context mutation must invalidate the kept candidate in main");
    assert.equal(
      window.document.querySelector("#renderButton .button-label strong").textContent,
      "Make full video",
      "the UI must visibly revoke stale KEEP authority rather than continue claiming it is bound",
    );
  } finally {
    window.close();
  }
});

test("SCRAPE is family-level and can deal another six without choosing a creature", async () => {
  const dom = createDom();
  const { window } = dom;
  installSharedWindowState(window);

  let scrapeCalls = 0;
  window.fullMeasure = {
    generateCandidates: async () => familyView("family-a", "score-a"),
    selectCandidate: async () => { throw new Error("not exercised"); },
    keepCandidate: async () => { throw new Error("not exercised"); },
    scrapeCandidates: async (request) => {
      scrapeCalls += 1;
      assert.equal(request.familyHash, "family-a");
      assert.deepEqual(request.locks, []);
      return {
        ...familyView("family-b", "score-b"),
        verdict: "SCRAPE",
        continuationPermission: false,
        receipt: {
          operation: {
            dealerMode: "diverse-redeal",
          },
        },
      };
    },
    clearCandidates: async () => true,
    clearCandidateImage: async () => true,
    mutateCandidates: async () => { throw new Error("not exercised"); },
    crossCandidates: async () => { throw new Error("not exercised"); },
    stompCandidates: async () => { throw new Error("not exercised"); },
  };

  window.eval(source("src/renderer/candidate-ui.js"));

  try {
    window.document.querySelector(".candidate-launch").click();
    await flush();
    await flush();

    const scrape = window.document.querySelector("#candidateScrape");
    assert.ok(scrape, "ordinary candidate UI must expose SCRAPE");
    assert.equal(scrape.disabled, false, "SCRAPE applies to the whole current family, not the focused candidate");
    assert.equal(window.document.querySelector(".candidate-card[aria-pressed='true']"), null);

    scrape.click();
    await flush();
    await flush();

    assert.equal(scrapeCalls, 1);
    assert.equal(window.document.querySelector(".candidate-card code").textContent, "score-b");
    assert.match(window.document.querySelector("#candidateStatus").textContent, /SCRAPE|dealt|family/i);
    assert.equal(
      window.document.querySelector("#renderButton .button-label strong").textContent,
      "Make full video",
      "SCRAPE must never grant render authority",
    );
  } finally {
    window.close();
  }
});
