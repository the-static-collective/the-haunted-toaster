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

function scrapeConfig(familyHash, rootSeed = "scrape-dealer-step") {
  return {
    familyHash,
    presetId: "openField",
    rootSeed,
    locks: [],
    lyrics: "",
  };
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
  assert.equal(kept.receipt.preferenceInference, "none");
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

  const firstScrape = await first.scrape(scrapeConfig(firstFamily.familyHash, "scrape-dealer-step-1"));
  const secondScrape = await second.scrape(scrapeConfig(secondFamily.familyHash, "scrape-dealer-step-1"));

  assert.equal(firstScrape.verdict, "SCRAPE");
  assert.equal(firstScrape.acceptedHistoryCount, 0);
  assert.equal(firstScrape.receipt.authority, "search-only");
  assert.equal(firstScrape.receipt.preferenceInference, "none");
  assert.equal(firstScrape.receipt.sourceFamilyHash, firstFamily.familyHash);
  assert.equal(firstScrape.receipt.operation.kind, "dealer");
  assert.equal(firstScrape.receipt.operation.dealerMode, "diverse-redeal");
  assert.equal(firstScrape.receipt.operation.scrapedFamilyParentAuthority, "none");
  assert.ok(firstScrape.familyHash);
  assert.notEqual(firstScrape.familyHash, firstFamily.familyHash);
  assert.deepEqual(firstScrape.receipt, secondScrape.receipt);
  assert.equal(firstScrape.familyHash, secondScrape.familyHash);
});

test("repeated SCRAPE escalates through fresh-seed STOMP without granting rejected candidates ancestry", async () => {
  const session = createSession();
  const initial = await generateField(session, "scrape-escalation-origin");

  const first = await session.scrape(scrapeConfig(initial.familyHash, "scrape-escalation"));
  assert.equal(first.receipt.operation.dealerMode, "diverse-redeal");
  assert.equal(first.receipt.operation.scrapeIndex, 0);
  assert.equal(first.acceptedHistoryCount, 0);

  const second = await session.scrape(scrapeConfig(first.familyHash, "scrape-escalation"));
  assert.equal(second.receipt.operation.dealerMode, "stomp-escalation");
  assert.equal(second.receipt.operation.scrapeIndex, 1);
  assert.equal(second.receipt.operation.scrapedFamilyParentAuthority, "none");
  assert.equal(second.receipt.operation.reusedMachinery, "STOMP");
  assert.equal(second.toastFeel?.semanticClass, "madd-clown");
  assert.equal(second.acceptedHistoryCount, 0);
  assert.notEqual(second.familyHash, first.familyHash);

  const third = await session.scrape(scrapeConfig(second.familyHash, "scrape-escalation"));
  assert.equal(third.receipt.operation.dealerMode, "fresh-birth");
  assert.equal(third.receipt.operation.scrapeIndex, 2);
  assert.equal(third.receipt.operation.scrapedFamilyParentAuthority, "none");
  assert.equal(third.acceptedHistoryCount, 0);
  assert.notEqual(third.familyHash, second.familyHash);
});
