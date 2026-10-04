const test = require("node:test");
const assert = require("node:assert/strict");
const {
  applyForeignMaterialToGraph,
  ffmpegInputArgsForForeignMaterial,
} = require("../src/render/foreign-material.cjs");
const { createVideoDigestionSix } = require("../src/render/video-digestion-six.cjs");

function binding(overrides = {}) {
  return {
    schema: "haunted-toaster/video-source/v1",
    specimenId: `sha256:${"a".repeat(64)}:4096`,
    sourceSha256: "a".repeat(64),
    byteLength: 4096,
    path: "/tmp/digestion-six.mp4",
    filename: "digestion-six.mp4",
    probe: { durationSeconds: 1, width: 64, height: 36, frameRate: "8/1" },
    ...overrides,
  };
}

const timeline = { durationTicks: 24, timebase: 8 };

test("same admitted clip yields six distinct proposal-only descendants with common ancestry", () => {
  const family = createVideoDigestionSix({ videoBinding: binding(), timeline });
  assert.equal(family.schema, "haunted-toaster/video-digestion-six/v0");
  assert.equal(family.authority, "proposal-only");
  assert.equal(family.descendants.length, 6);
  assert.equal(new Set(family.descendants.map((d) => d.planHash)).size, 6);
  assert.equal(new Set(family.descendants.map((d) => d.digestOperatorId)).size, 3);
  assert.equal(new Set(family.descendants.map((d) => d.samplingPolicyId)).size, 3);
  assert.equal(new Set(family.descendants.map((d) => d.sourceSpecimenId)).size, 1);
  assert.equal(new Set(family.descendants.map((d) => d.clipAnalysisHash)).size, 1);
});

test("family identity is path-independent and exact replay is deterministic", () => {
  const a = createVideoDigestionSix({ videoBinding: binding(), timeline });
  const b = createVideoDigestionSix({
    videoBinding: binding({ path: "/moved/same-bytes.mp4", filename: "renamed.mp4" }),
    timeline,
  });
  assert.equal(a.familyHash, b.familyHash);
  assert.deepEqual(a.descendants.map((d) => d.planHash), b.descendants.map((d) => d.planHash));
});

test("all six descendants compile through the shared foreign-material renderer contract", () => {
  const family = createVideoDigestionSix({ videoBinding: binding(), timeline });
  for (const descendant of family.descendants) {
    const compiled = applyForeignMaterialToGraph({
      graph: "[0:v]null[vout]",
      foreignMaterialPlan: descendant.plan,
      foreignMaterialInputIndex: 1,
      width: 64,
      height: 36,
      fps: 8,
    });
    assert.equal(compiled.evidence.planHash, descendant.planHash);
    assert.equal(compiled.evidence.operatorId, descendant.digestOperatorId);
    assert.equal(compiled.evidence.samplingPolicy, descendant.samplingPolicyId);
    assert.match(compiled.graph, /\\[vout\\]/);
    const args = ffmpegInputArgsForForeignMaterial(descendant.plan);
    assert.equal(args.at(-1), descendant.plan.sourcePath);
  }
});

test("no admitted clip means no video-digestion family", () => {
  assert.equal(createVideoDigestionSix({ videoBinding: null, timeline }), null);
});
