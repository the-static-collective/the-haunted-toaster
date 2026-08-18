const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createCandidateSession, CONSTRAINTS_BY_PRESET } = require("../src/candidate-session.cjs");
const generation = require("../src/generation/index.cjs");

function fixture() {
  const ancestor = generation.createVisualScore({
    seed: "historical-retoast-ancestor",
    constraints: CONSTRAINTS_BY_PRESET.openField,
  });
  const receiptSha256 = "1".repeat(64);
  const previewFamilies = [];
  const contextCalls = [];
  const memoryProvider = {
    async resolveReToastAncestor(identity) {
      assert.equal(identity, receiptSha256);
      return {
        receiptSha256,
        scoreAddress: ancestor.address,
        score: ancestor.score,
      };
    },
    async contextForGeneration({ mediaAnalysis, constraints, explicitAncestorReceiptSha256 }) {
      contextCalls.push({ mediaAnalysis, constraints, explicitAncestorReceiptSha256 });
      return {
        capsule: {
          schema: "haunted-toaster/memory-capsule/v1",
          policy: "toaster-memory-capsule-v1",
          archiveCut: "a".repeat(64),
          projectionSha256: "b".repeat(64),
          currentSongEvidenceHash: "song-evidence",
          currentSongEnergyClass: "mixed",
          explicitAncestorReceiptSha256: explicitAncestorReceiptSha256 || null,
          pressures: [],
          capsuleSha256: "c".repeat(64),
        },
        influencePlan: null,
        witnessDisposition: {
          policy: "toaster-witness-disposition-v1",
          capsuleSha256: "c".repeat(64),
          dispositions: [],
        },
      };
    },
  };
  const session = createCandidateSession({
    memoryProvider,
    async renderCandidateFamilyPreviews(_config, family) {
      previewFamilies.push(family);
      return {
        familyHash: family.familyHash,
        candidates: family.candidates.map((candidate) => ({
          index: candidate.index,
          scoreAddress: candidate.scoreAddress,
        })),
      };
    },
  });
  session.noteAudio("/tmp/retoast-song.wav", {
    audio: { codec: "pcm_s16le" },
    duration: 12,
    sections: [
      { start: 0, end: 6, energy: 0.25, label: "verse" },
      { start: 6, end: 12, energy: 0.8, label: "chorus" },
    ],
    energySamples: [],
  });
  return { session, ancestor, receiptSha256, previewFamilies, contextCalls };
}

const config = {
  presetId: "openField",
  toastFeelId: "wire-heat",
  rootSeed: "fresh-retoast-family",
  lyrics: "",
};

test("Re-toast uses an archived score as explicit ancestry for a fresh candidate family", async () => {
  const { session, ancestor, receiptSha256, previewFamilies, contextCalls } = fixture();
  const armed = await session.armReToast(receiptSha256);
  assert.deepEqual(armed, { receiptSha256 });

  const view = await session.generate(config);
  const family = previewFamilies.at(-1);
  assert.equal(view.reToastAncestor.receiptSha256, receiptSha256);
  assert.equal(view.reToastAncestor.scoreAddress, ancestor.address);
  assert.ok(
    family.candidates.every(
      (candidate) => candidate.scoreArtifact.derivation.parentScoreRefs[0] === ancestor.address,
    ),
  );
  assert.equal(contextCalls.at(-1).explicitAncestorReceiptSha256, receiptSha256);
  assert.ok(session.currentInfluenceTrace()?.edges.some((edge) => edge.relation === "inherited"));

  session.select({ familyHash: view.familyHash, index: 0 });
  const execution = session.executionForRender({
    audioPath: "/tmp/retoast-song.wav",
    imagePath: null,
    presetId: "openField",
    toastFeelId: "wire-heat",
  });
  assert.equal(execution.reToastAncestor.receiptSha256, receiptSha256);
  assert.equal(execution.resolvedTimeline.timelineHash, family.candidates[0].timelineHash);
  assert.equal(execution.memoryContext.influenceTrace.traceSha256, session.currentInfluenceTrace().traceSha256);
});

test("Re-toast arm survives failed generation and clears only after success", async () => {
  const { session, receiptSha256 } = fixture();
  await session.armReToast(receiptSha256);
  await assert.rejects(
    session.generate({ ...config, toastFeelId: "not-real" }),
    /Unknown Toast Feel/,
  );
  assert.deepEqual(session.clearReToast(), { receiptSha256 });
  await session.armReToast(receiptSha256);
  await session.generate(config);
  assert.equal(session.clearReToast(), null);
});

test("Lab Proposal import and Re-toast ancestry refuse to coexist", async () => {
  const { session, receiptSha256 } = fixture();
  await session.armReToast(receiptSha256);
  await assert.rejects(
    session.importLabProposal({ ...config, transfer: {} }),
    /Re-toast.*Lab Proposal|Lab Proposal.*Re-toast/i,
  );
});
