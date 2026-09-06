const test = require("node:test");
const assert = require("node:assert/strict");
const {
  FOREIGN_MATERIAL_DIGEST_FAMILY_SCHEMA,
  FOREIGN_MATERIAL_DIGEST_POLICY_VERSION,
  FOREIGN_MATERIAL_OPERATOR_ID,
  FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID,
  applyForeignMaterialToGraph,
  createForeignMaterialDigestFamily,
  createForeignMaterialPlan,
} = require("../src/render/foreign-material.cjs");

function sampleVideoBinding(overrides = {}) {
  return {
    schema: "haunted-toaster/video-source/v1",
    specimenId: `sha256:${"b".repeat(64)}:8192`,
    sourceSha256: "b".repeat(64),
    byteLength: 8192,
    path: "/tmp/pantry/digest-source.mp4",
    filename: "digest-source.mp4",
    probe: {
      durationSeconds: 2,
      width: 640,
      height: 360,
      frameRate: "30/1",
    },
    ...overrides,
  };
}

function sampleTimeline() {
  return { durationTicks: 240, timebase: 30 };
}

function createFamily(binding = sampleVideoBinding()) {
  return createForeignMaterialDigestFamily({
    videoBinding: binding,
    timeline: sampleTimeline(),
    analysisDurationSeconds: 8,
  });
}

test("#250 yields exactly two deterministic descendants from one admitted clip", () => {
  const family = createFamily();
  const replay = createFamily();

  assert.equal(family.schema, FOREIGN_MATERIAL_DIGEST_FAMILY_SCHEMA);
  assert.equal(family.policyVersion, FOREIGN_MATERIAL_DIGEST_POLICY_VERSION);
  assert.equal(family.descendants.length, 2);
  assert.deepEqual(
    family.descendants.map((plan) => plan.assimilationPolicy.operatorId),
    [FOREIGN_MATERIAL_OPERATOR_ID, FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID],
  );
  assert.equal(family.descendants[0].sourceSpecimenId, family.sourceSpecimenId);
  assert.equal(family.descendants[1].sourceSpecimenId, family.sourceSpecimenId);
  assert.equal(family.descendants[0].clipAnalysisHash, family.clipAnalysisHash);
  assert.equal(family.descendants[1].clipAnalysisHash, family.clipAnalysisHash);
  assert.notEqual(family.descendants[0].planHash, family.descendants[1].planHash);
  assert.equal(family.familyHash, replay.familyHash);
  assert.deepEqual(family, replay);
});

test("#250 keeps the current clip-luma-texture plan as the exact control descendant", () => {
  const binding = sampleVideoBinding();
  const control = createForeignMaterialPlan({
    videoBinding: binding,
    timeline: sampleTimeline(),
    analysisDurationSeconds: 8,
  });
  const family = createFamily(binding);

  assert.equal(family.descendants[0].planHash, control.planHash);
  assert.deepEqual(family.descendants[0], control);
});

test("#250 topology descendant uses clip luminance only as a region mask over native imagery", () => {
  const family = createFamily();
  const topologyPlan = family.descendants[1];
  const applied = applyForeignMaterialToGraph({
    graph: "color=c=black:s=320x180,format=rgba[vout]",
    foreignMaterialPlan: topologyPlan,
    foreignMaterialInputIndex: 2,
    width: 320,
    height: 180,
    fps: 30,
  });

  assert.equal(topologyPlan.assimilationPolicy.operatorId, FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID);
  assert.equal(topologyPlan.assimilationPolicy.family, "topology-mask-assimilation");
  assert.equal(topologyPlan.assimilationPolicy.sourceRole, "region-mask");
  assert.equal(topologyPlan.assimilationPolicy.literalSourcePixelsSurvive, false);
  assert.match(applied.graph, /\[2:v\].*format=gray/);
  assert.match(applied.graph, /maskedmerge/);
  assert.doesNotMatch(applied.graph, /\[2:v\].*blend=/);
  assert.equal(applied.evidence.operatorId, FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID);
  assert.equal(applied.evidence.sourceRole, "region-mask");
  assert.equal(applied.evidence.literalSourcePixelsSurvive, false);
});

test("#250 digest family identity follows clip content rather than local path", () => {
  const first = createFamily();
  const moved = createFamily(sampleVideoBinding({
    path: "/another/cache/same-bytes.webm",
    filename: "same-bytes.webm",
  }));

  assert.equal(first.familyHash, moved.familyHash);
  assert.equal(first.descendants[0].planHash, moved.descendants[0].planHash);
  assert.equal(first.descendants[1].planHash, moved.descendants[1].planHash);
});

test("#250 refuses an unknown digest operator rather than falling back to texture", () => {
  assert.throws(
    () => createForeignMaterialPlan({
      videoBinding: sampleVideoBinding(),
      timeline: sampleTimeline(),
      analysisDurationSeconds: 8,
      operatorId: "clip-mystery-v99",
    }),
    /Unsupported foreign-material digest operator/,
  );
});
