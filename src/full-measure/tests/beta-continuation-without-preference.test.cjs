const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createCandidateSession } = require("../src/candidate-session.cjs");

const root = path.resolve(__dirname, "..");
const POLICY = "continuation-without-preference-v0";

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
      requestedCount: family.candidates.length,
      producedCount: family.candidates.length,
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

async function initialFamily(session, rootSeed = "continuation-without-preference") {
  session.noteAudio("beta-continuation-song.mp3", mediaAnalysis());
  return session.generate({
    presetId: "openField",
    rootSeed,
    title: "Continuation Without Preference",
    artist: "The Static Collective",
    lyrics: "",
  });
}

function renderConfig() {
  return {
    audioPath: "beta-continuation-song.mp3",
    presetId: "openField",
    imagePath: null,
  };
}

test("focus is observational; only KEEP grants ancestry and render authority", async () => {
  const session = createSession();
  const family = await initialFamily(session);

  const focused = session.select({ familyHash: family.familyHash, index: 0 });
  assert.equal(focused.acceptedHistoryCount, 0, "focus must not mutate accepted ancestry");
  assert.throws(
    () => session.executionForRender(renderConfig()),
    /KEEP|continuation|candidate/i,
    "focus alone must not grant final-render authority",
  );

  assert.equal(typeof session.keep, "function");
  const kept = session.keep({ familyHash: family.familyHash, index: 0 });
  assert.equal(kept.acceptedHistoryCount, 1);
  assert.equal(kept.continuation.policyVersion, POLICY);
  assert.equal(kept.continuation.verdict, "KEEP");
  assert.equal(kept.continuation.sourceFamilyHash, family.familyHash);
  assert.equal(kept.continuation.keptCandidate.index, 0);
  assert.equal(kept.continuation.keptCandidate.scoreAddress, family.candidates[0].scoreAddress);
  assert.equal(kept.continuation.keptCandidate.timelineHash, family.candidates[0].timelineHash);
  assert.equal(kept.continuation.chosenOperation, "render");

  const execution = session.executionForRender(renderConfig());
  assert.equal(execution.visualScore.schema, "visual-score/v1");
  assert.equal(execution.candidateGenealogy.continuation.policyVersion, POLICY);
  assert.equal(execution.candidateGenealogy.continuation.verdict, "KEEP");
});

test("SCRAPE rejects the whole family without creating accepted ancestry and deals deterministically", async () => {
  const firstSession = createSession();
  const replaySession = createSession();
  const first = await initialFamily(firstSession, "scrape-replay-root");
  const replay = await initialFamily(replaySession, "scrape-replay-root");

  assert.equal(typeof firstSession.scrape, "function");
  const firstDeal = await firstSession.scrape({
    familyHash: first.familyHash,
    presetId: "openField",
    title: "Continuation Without Preference",
    artist: "The Static Collective",
    lyrics: "",
  });
  const replayDeal = await replaySession.scrape({
    familyHash: replay.familyHash,
    presetId: "openField",
    title: "Continuation Without Preference",
    artist: "The Static Collective",
    lyrics: "",
  });

  assert.equal(firstDeal.continuation.policyVersion, POLICY);
  assert.equal(firstDeal.continuation.verdict, "SCRAPE");
  assert.equal(firstDeal.continuation.sourceFamilyHash, first.familyHash);
  assert.equal(firstDeal.continuation.keptCandidate, null);
  assert.equal(firstDeal.continuation.chosenOperation, "generate");
  assert.equal(firstDeal.continuation.acceptedHistoryCount, 0);
  assert.notEqual(firstDeal.familyHash, first.familyHash);
  assert.equal(firstDeal.familyHash, replayDeal.familyHash, "same evidence must replay the same deal");
  assert.equal(firstDeal.continuation.selectorBasis, replayDeal.continuation.selectorBasis);
});

test("ordinary renderer wiring exposes KEEP and SCRAPE while preserving manual moves as expert/debug", () => {
  const preload = fs.readFileSync(path.join(root, "src/preload.cjs"), "utf8");
  const ui = fs.readFileSync(path.join(root, "src/renderer/candidate-ui.js"), "utf8");

  assert.match(preload, /keepCandidate:\s*\(config\).*candidate:keep/s);
  assert.match(preload, /scrapeCandidates:\s*\(config\).*candidate:scrape/s);
  assert.match(ui, /id="candidateKeep"/);
  assert.match(ui, />KEEP</);
  assert.match(ui, /id="candidateScrape"/);
  assert.match(ui, />SCRAPE</);
  assert.match(ui, /api\.keepCandidate/);
  assert.match(ui, /api\.scrapeCandidates/);
  assert.match(ui, /EXPERT|DEBUG/i, "manual move deck must be demoted from ordinary judgement authority");
});
