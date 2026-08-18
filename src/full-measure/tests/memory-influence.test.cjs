const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const generation = require("../src/generation/index.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const constraints = readJson("constraints/open-field.v3.json");
const profile = readJson("profiles/toaster-raster-4.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

function options(overrides = {}) {
  return {
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed: "receipt-memory-alpha9-six-up",
    count: 6,
    toastFeelId: "wire-heat",
    ...overrides,
  };
}

test("ordinary receipt memory gets exactly one bounded seat in alpha9 six-up and replays", () => {
  const withoutMemory = generation.generateCandidateSet(options());
  assert.equal(withoutMemory.producedCount, 6);

  const current = withoutMemory.candidates[5].scoreArtifact.score.topology;
  const target = constraints.topology.allowed.find((value) => value !== current);
  assert.ok(target, "fixture needs a lawful alternate topology");

  const memoryInfluence = {
    policy: "toaster-memory-influence-v1",
    capsuleSha256: "c".repeat(64),
    target: `topology:${target}`,
    reason: "coverage-explore",
    evidenceRefs: ["archive-cut:" + "a".repeat(64), "render:" + "1".repeat(64)],
  };
  const withMemory = generation.generateCandidateSet(options({ memoryInfluence }));

  assert.equal(withMemory.producedCount, 6);
  assert.notEqual(withMemory.familyHash, withoutMemory.familyHash);
  assert.deepEqual(
    withMemory.candidates.slice(0, 5).map((candidate) => candidate.scoreAddress),
    withoutMemory.candidates.slice(0, 5).map((candidate) => candidate.scoreAddress),
  );
  assert.equal(withMemory.candidates[5].memoryInfluence.applied, true);
  assert.equal(withMemory.candidates[5].scoreArtifact.score.topology, target);
  assert.equal(withMemory.candidates.filter((candidate) => candidate.memoryInfluence?.applied).length, 1);
  assert.deepEqual(withMemory.memoryInfluence, memoryInfluence);

  const replay = generation.replayCandidateFamily(withMemory, options());
  assert.equal(replay.ok, true);
  assert.deepEqual(replay.actualScoreAddresses, withMemory.scoreAddresses);
  assert.deepEqual(replay.actualTimelineHashes, withMemory.timelineHashes);
});

test("illegal or locked memory targets never seize candidate authority", () => {
  const parent = generation.createVisualScore({ seed: "memory-lock-parent", constraints });
  const illegal = generation.generateCandidateSet(options({
    parentScore: parent.score,
    memoryInfluence: {
      policy: "toaster-memory-influence-v1",
      capsuleSha256: "d".repeat(64),
      target: "topology:not-a-real-topology",
      reason: "coverage-explore",
      evidenceRefs: ["archive-cut:" + "b".repeat(64)],
    },
  }));
  assert.equal(illegal.candidates.filter((candidate) => candidate.memoryInfluence?.applied).length, 0);

  const locked = generation.generateCandidateSet(options({
    parentScore: parent.score,
    locks: ["topology"],
    memoryInfluence: {
      policy: "toaster-memory-influence-v1",
      capsuleSha256: "e".repeat(64),
      target: `topology:${constraints.topology.allowed.find((value) => value !== parent.score.topology)}`,
      reason: "coverage-explore",
      evidenceRefs: ["archive-cut:" + "b".repeat(64)],
    },
  }));
  assert.equal(locked.candidates.filter((candidate) => candidate.memoryInfluence?.applied).length, 0);
  assert.ok(locked.candidates.every((candidate) => candidate.scoreArtifact.score.topology === parent.score.topology));
});
