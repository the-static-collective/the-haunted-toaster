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

test("candidate UI requires explicit winner binding and visibly revokes it when render context changes", async () => {
  const dom = new JSDOM(`
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

  const { window } = dom;
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

  let selectCalls = 0;
  let clearCalls = 0;
  window.fullMeasure = {
    generateCandidates: async () => ({
      familyHash: "family-test",
      producedCount: 1,
      requestedCount: 1,
      candidates: [{
        index: 0,
        role: "baseline",
        thumbnailDataUrl: "data:image/png;base64,",
        signature: "Spiral · drift · grain",
        scoreAddress: "htvs1_candidate_test",
        changedAxes: [],
        toastmoodLane: null,
      }],
    }),
    selectCandidate: async (request) => {
      selectCalls += 1;
      assert.equal(request.familyHash, "family-test");
      assert.equal(request.index, 0);
      return { familyHash: "family-test", index: 0, toastFeel: null };
    },
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

    assert.equal(selectCalls, 0, "card click is proposal-only and must not silently become render authority");
    assert.equal(
      window.document.querySelector("#renderButton .button-label strong").textContent,
      "Make full video",
      "render control must not claim a chosen timeline before explicit acceptance",
    );

    window.document.querySelector("#candidateUse").click();
    await flush();

    assert.equal(selectCalls, 1, "Use selected timeline must perform the authoritative candidate binding");
    assert.equal(
      window.document.querySelector("#renderButton .button-label small").textContent,
      "CHOSEN TIMELINE → MP4",
    );
    assert.equal(
      window.document.querySelector("#renderButton .button-label strong").textContent,
      "Render chosen vision",
    );

    const lyrics = window.document.querySelector("#lyricsInput");
    lyrics.value = "changed after candidate acceptance";
    lyrics.dispatchEvent(new window.Event("input", { bubbles: true }));
    await flush();

    assert.equal(clearCalls, 1, "render-context mutation must invalidate the candidate in main");
    assert.equal(
      window.document.querySelector("#renderButton .button-label strong").textContent,
      "Make full video",
      "the UI must visibly revoke the stale winner rather than continue claiming it is bound",
    );
  } finally {
    window.close();
  }
});
