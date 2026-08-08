const test = require("node:test");
const assert = require("node:assert/strict");
const porchlight = require("../constraints/porchlight.v1.json");
const wireOrchard = require("../constraints/wire-orchard.v1.json");
const generation = require("../src/generation/index.cjs");
const {
  LAB_PROPOSAL_SCHEMA,
  admitLabProposal,
  parseLabProposalTransfer,
  suggestionOverrides,
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
  assert.equal(
    admitted.scoreArtifact.address,
    generation.addressVisualScore(admitted.scoreArtifact.score),
  );
  assert.equal(admitted.scoreArtifact.score.topology, "circle");
  assert.equal(admitted.scoreArtifact.score.motion.grammar, "pulse");
  assert.equal(admitted.scoreArtifact.score.material.texture, "grain");
  assert.equal(admitted.scoreArtifact.score.camera.grammar, "orbit");
  assert.equal(admitted.scoreArtifact.score.temporalDensity, "phrase");
  assert.equal("authority" in admitted.scoreArtifact.score, false);
});

test("keeps a Lab value unchanged when the selected garment already allows it", () => {
  const admitted = admitLabProposal(
    transfer({ palette: { logic: "analogous" } }),
    porchlight,
  );
  assert.equal(admitted.scoreArtifact.score.palette.logic, "analogous");
});

test("translates analogous palette intent into a lawful Wire Orchard palette", () => {
  const admitted = admitLabProposal(
    transfer({ palette: { logic: "analogous" } }),
    wireOrchard,
  );
  assert.equal(admitted.scoreArtifact.score.palette.logic, "split-complement");
  assert.equal(
    wireOrchard.palette.logic.allowed.includes(admitted.scoreArtifact.score.palette.logic),
    true,
  );
});

test("unsupported Lab vocabulary is omitted instead of being passed into canonical generation", () => {
  const proposal = transfer({ material: { texture: "liquid-mercury" } });
  const overrides = suggestionOverrides(proposal, wireOrchard);
  assert.equal("material" in overrides, false);

  const admitted = admitLabProposal(proposal, wireOrchard);
  assert.equal(
    wireOrchard.material.texture.allowed.includes(admitted.scoreArtifact.score.material.texture),
    true,
  );
  assert.notEqual(admitted.scoreArtifact.score.material.texture, "liquid-mercury");
});

test("garment-incompatible suggestions fall back to deterministic lawful generation", () => {
  const proposal = transfer({ topology: "mirrored-ring" });
  const overrides = suggestionOverrides(proposal, porchlight);
  assert.equal("topology" in overrides, false);

  const admitted = admitLabProposal(proposal, porchlight);
  assert.equal(porchlight.topology.allowed.includes(admitted.scoreArtifact.score.topology), true);
  assert.notEqual(admitted.scoreArtifact.score.topology, "mirrored-ring");
});

test("equivalent Lab suggestions admit to the same canonical score address", () => {
  const a = admitLabProposal(transfer(), porchlight);
  const b = admitLabProposal(transfer(), porchlight);
  assert.equal(a.scoreArtifact.address, b.scoreArtifact.address);
  assert.equal(a.scoreArtifact.canonicalJson, b.scoreArtifact.canonicalJson);
});
