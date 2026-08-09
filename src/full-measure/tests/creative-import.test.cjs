const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const porchlight = require("../constraints/porchlight.v2.json");
const absoluteResidual = require("../constraints/absolute-residual.v2.json");
const generation = require("../src/generation/index.cjs");
const {
  LAB_ADAPTER_ID,
  admitCreativeImport,
  parseCreativeImport,
} = require("../src/creative-import.cjs");

function legacyTransfer() {
  return {
    schema: "toaster-lab/proposal-transfer/v1",
    proposal: {
      id: "legacy-001",
      proposalType: "mutation",
      title: "Legacy seed",
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
    },
    assetRefs: {},
    locks: [],
    provenance: { source: "toaster-lab", seed: 70 },
  };
}

test("canonical VisualScore crosses the creative door unchanged when lawful", () => {
  const source = generation.createVisualScore({ seed: "bring-a-score", constraints: porchlight }).score;
  const parsed = parseCreativeImport(source);
  const admitted = admitCreativeImport(parsed, porchlight);
  assert.equal(parsed.kind, "canonical-visual-score");
  assert.equal(admitted.provenance.mode, "canonical-score");
  assert.equal(admitted.provenance.adapterId, null);
  assert.equal(admitted.scoreArtifact.address, generation.addressVisualScore(source));
  assert.deepEqual(admitted.scoreArtifact.score, source);
});

test("canonical VisualScore outside the selected garment is refused rather than translated", () => {
  const source = generation.createVisualScore({
    seed: "foreign-lawful-score",
    constraints: absoluteResidual,
    overrides: { topology: "mirrored-ring" },
  }).score;
  assert.throws(() => admitCreativeImport(source, porchlight), /topology/i);
});

test("Toaster Lab remains a named legacy adapter with source provenance", () => {
  const parsed = parseCreativeImport(legacyTransfer());
  const admitted = admitCreativeImport(parsed, porchlight);
  assert.equal(parsed.kind, "legacy-lab-proposal");
  assert.equal(admitted.provenance.mode, "legacy-adapter");
  assert.equal(admitted.provenance.sourceProducer, "toaster-lab");
  assert.equal(admitted.provenance.adapterId, LAB_ADAPTER_ID);
  assert.match(admitted.provenance.sourceObjectHash, /^[a-f0-9]+$/i);
});

test("renderer presents a producer-neutral creative import door", () => {
  const root = path.resolve(__dirname, "..");
  const ui = fs.readFileSync(path.join(root, "src", "renderer", "lab-proposal-ui.js"), "utf8");
  assert.match(ui, /Bring a Score/);
  assert.match(ui, /CREATIVE OBJECT · JSON/);
  assert.match(ui, /Use imported score/);
  assert.doesNotMatch(ui, />Import Lab Proposal</);
  assert.doesNotMatch(ui, />Use Lab Proposal</);
});
