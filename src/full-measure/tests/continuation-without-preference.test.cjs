const test = require("node:test");
const assert = require("node:assert/strict");

const { createCandidateSession } = require("../src/candidate-session.cjs");

function mediaAnalysis() {
  return {
    duration: 60,
    sections: [
      { start: 0, end: 20, energy: 0.25, label: "opening" },
      { start: 20, end: 42, energy: 0.72, label: "lift" },
      { start: 42, end: 60, energy: 0.48, label: "return" },
    ],
    energySamples: [],
  };
}

function createSession() {
  return createCandidateSession({
    renderCandidateFamilyPreviews: async (_source, family) => ({
      familyHash: family.familyHash,
      candidates: family.candidates.map((candidate) => ({
        index: candidate.index,
        role: candidate.role,
        scoreAddress: candidate.scoreAddress,
        timelineHash: candidate.timelineHash,
        toastmoodLane: candidate.toastmoodLane || null,
      })),
    }),
  });
}

async function generateField(session, rootSeed = "continuation-without-preference") {
  session.noteAudio("continuation-song.mp3", mediaAnalysis());
  return session.generate({
    presetId: "openField",
    rootSeed,
    title: "Continuation",
    artist: "Static Collective",
    lyrics: "",
  });
}

test("focusing a candidate is observational and does not admit accepted ancestry", async () => {
  const session = createSession();
  const family = await generateField(session);

  const focus = session.select({ familyHash: family.familyHash, index: 0 });

  assert.equal(focus.index, 0);
  assert.equal(focus.acceptedHistoryCount, 0);
  assert.equal(focus.continuationPermission, false);
});

test("KEEP is a distinct candidate-session authority transition", async () => {
  const session = createSession();
  const family = await generateField(session, "keep-authority-transition");

  assert.equal(typeof session.keep, "function");
  const kept = session.keep({ familyHash: family.familyHash, index: 2 });

  assert.equal(kept.verdict, "KEEP");
  assert.equal(kept.index, 2);
  assert.equal(kept.acceptedHistoryCount, 1);
  assert.equal(kept.continuationPermission, true);
  assert.equal(kept.receipt.authority, "continuation-only");
  assert.equal(kept.receipt.sourceFamilyHash, family.familyHash);
  assert.equal(kept.receipt.candidateIndex, 2);
});

test("SCRAPE is a distinct deterministic dealer transition without negative preference inference", async () => {
  const first = createSession();
  const second = createSession();
  const firstFamily = await generateField(first, "scrape-dealer-replay");
  const secondFamily = await generateField(second, "scrape-dealer-replay");

  assert.equal(typeof first.scrape, "function");
  assert.equal(typeof second.scrape, "function");

  const config = {
    familyHash: firstFamily.familyHash,
    presetId: "openField",
    rootSeed: "scrape-dealer-step-1",
    locks: [],
    lyrics: "",
  };
  const firstScrape = await first.scrape(config);
  const secondScrape = await second.scrape({
    ...config,
    familyHash: secondFamily.familyHash,
  });

  assert.equal(firstScrape.verdict, "SCRAPE");
  assert.equal(firstScrape.acceptedHistoryCount, 0);
  assert.equal(firstScrape.receipt.authority, "search-only");
  assert.equal(firstScrape.receipt.preferenceInference, "none");
  assert.equal(firstScrape.receipt.sourceFamilyHash, firstFamily.familyHash);
  assert.ok(firstScrape.receipt.operation);
  assert.ok(firstScrape.familyHash);
  assert.deepEqual(firstScrape.receipt, secondScrape.receipt);
  assert.equal(firstScrape.familyHash, secondScrape.familyHash);
});
