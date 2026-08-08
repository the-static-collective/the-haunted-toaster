const test = require("node:test");
const assert = require("node:assert/strict");
const porchlight = require("../constraints/porchlight.v1.json");
const {
  LAB_PROPOSAL_SCHEMA,
  admitLabProposal,
  parseLabProposalTransfer,
} = require("../src/lab-proposal.cjs");

function transfer(overrides = {}) {
  return {
    schema: LAB_PROPOSAL_SCHEMA,
    proposal: {
      id: "lab-proposal-001",
      proposalType: "mutation",
      title: "Orbital Pulse",
      tagline: "Suggestion only",
      confidence: 0.9,
      rationale: [],
      mutations: [],
    },
    creativeIntent: {},
    suggestedVisualScore: {
      schema: "toaster-lab/suggested-visual-score/v1",
      authority: "non-canonical-suggestion",
      topology: "circle",
      motion: { grammar: "pulse" },
      palette: { logic: "duotone" },
      material: { texture: "grain" },
      lyric: { placement: "center" },
      camera: { grammar: "orbit" },
      temporalDensity: "phrase",
      ...overrides,
    },
    assetRefs: {},
    locks: [],
    provenance: {
      source: "toaster-lab",
      adapter: "generation-plan-to-proposal-transfer/v1",
      seed: 1042,
      generationPlanSchemaVersion: "test",
      note: "Suggestion only. Haunted Toaster owns validation, canonical addressing, resolution, and execution.",
    },
  };
}

test("accepts only the explicit Lab proposal-transfer envelope", () => {
  assert.equal(parseLabProposalTransfer(transfer()).schema, LAB_PROPOSAL_SCHEMA);
  assert.throws(
    () => parseLabProposalTransfer({ ...transfer(), schema: "something-else" }),
    /Expected toaster-lab\/proposal-transfer\/v1/,
  );
  assert.throws(
    () => parseLabProposalTransfer(transfer({ authority: "canonical" })),
    /explicitly non-authoritative/,
  );
});

test("Haunted Toaster admits the partial suggestion through its own canonical score API", () => {
  const admitted = admitLabProposal(transfer(), porchlight);
  assert.equal(admitted.scoreArtifact.schema, "haunted-toaster/score-artifact/v1");
  assert.match(admitted.scoreArtifact.address, /^htscore:/);
  assert.equal(admitted.scoreArtifact.score.topology, "circle");
  assert.equal(admitted.scoreArtifact.score.motion.grammar, "pulse");
  assert.equal(admitted.scoreArtifact.score.material.texture, "grain");
  assert.equal(admitted.scoreArtifact.score.camera.grammar, "orbit");
  assert.equal(admitted.scoreArtifact.score.temporalDensity, "phrase");
  assert.equal("authority" in admitted.scoreArtifact.score, false);
});

test("garment constraints can refuse a Lab suggestion before it becomes a parent", () => {
  assert.throws(
    () => admitLabProposal(transfer({ topology: "mirrored-ring" }), porchlight),
    /topology/,
  );
});

test("equivalent Lab suggestions admit to the same canonical score address", () => {
  const a = admitLabProposal(transfer(), porchlight);
  const b = admitLabProposal(transfer(), porchlight);
  assert.equal(a.scoreArtifact.address, b.scoreArtifact.address);
  assert.equal(a.scoreArtifact.canonicalJson, b.scoreArtifact.canonicalJson);
});
