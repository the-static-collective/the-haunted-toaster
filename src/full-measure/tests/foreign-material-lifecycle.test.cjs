const test = require("node:test");
const assert = require("node:assert/strict");
const {
  applyForeignMaterialToGraph,
  createForeignMaterialPlan,
} = require("../src/render/foreign-material.cjs");
const {
  FOREIGN_MATERIAL_LIFECYCLE_POLICY,
  FOREIGN_MATERIAL_LIFECYCLE_SCHEMA,
  projectForeignMaterialLifecycle,
} = require("../src/video-pantry/foreign-material-lifecycle.cjs");

const WALK_E_HEAD = "4ee1bea5a84092d3f178e4c7f9e2d9da2b91b786";

function sampleVideoBinding() {
  return {
    schema: "haunted-toaster/video-source/v1",
    specimenId: `sha256:${"a".repeat(64)}:4096`,
    sourceSha256: "a".repeat(64),
    byteLength: 4096,
    path: "/tmp/pantry/specimen.mp4",
    filename: "specimen.mp4",
    probe: {
      durationSeconds: 1.5,
      width: 640,
      height: 360,
      frameRate: "30/1",
    },
  };
}

function sampleTimeline() {
  return { durationTicks: 180, timebase: 30 };
}

function assimilatedEvidence() {
  const videoBinding = sampleVideoBinding();
  const foreignMaterialPlan = createForeignMaterialPlan({
    videoBinding,
    timeline: sampleTimeline(),
    analysisDurationSeconds: 6,
  });
  const compilerEvidence = applyForeignMaterialToGraph({
    graph: "color=c=black:s=320x180,format=rgba[vout]",
    foreignMaterialPlan,
    foreignMaterialInputIndex: 2,
    width: 320,
    height: 180,
    fps: 30,
  }).evidence;
  return { videoBinding, foreignMaterialPlan, compilerEvidence };
}

function receiptResidue({ videoBinding, foreignMaterialPlan }) {
  return {
    kind: "retained-render-receipt",
    receiptId: "receipt:coyotes-video-witness-2",
    sourceSpecimenId: videoBinding.specimenId,
    planHash: foreignMaterialPlan.planHash,
  };
}

test("#227 refuses metabolism when assimilation leaves a receipt but no attributable future pressure", () => {
  const evidence = assimilatedEvidence();
  const projection = projectForeignMaterialLifecycle({
    ...evidence,
    residueEvidence: receiptResidue(evidence),
    futurePressureEvidence: null,
    sourcePointers: {
      currentSpineHead: WALK_E_HEAD,
      witnessRef: "PR #249 / Windows Witness #2 / Coyotes In The Mix",
    },
  });

  assert.equal(projection.schema, FOREIGN_MATERIAL_LIFECYCLE_SCHEMA);
  assert.equal(projection.policyVersion, FOREIGN_MATERIAL_LIFECYCLE_POLICY);
  assert.equal(projection.stages.encountered.status, "supported");
  assert.equal(projection.stages.admitted.status, "supported");
  assert.equal(projection.stages.assimilated.status, "supported");
  assert.equal(projection.stages.residue.status, "supported");
  assert.equal(projection.stages.futurePressure.status, "absent");
  assert.equal(projection.result, "refuses");
  assert.equal(projection.reason, "no-attributable-future-pressure");
});

test("#227 supports metabolism only when later pressure is causally bound to retained residue", () => {
  const evidence = assimilatedEvidence();
  const residueEvidence = receiptResidue(evidence);
  const projection = projectForeignMaterialLifecycle({
    ...evidence,
    residueEvidence,
    futurePressureEvidence: {
      kind: "candidate-input",
      evidenceId: "future-pressure:1",
      sourceSpecimenId: evidence.videoBinding.specimenId,
      residueRef: residueEvidence.receiptId,
      effectRef: "candidate-context:foreign-residue-slot",
    },
    sourcePointers: { currentSpineHead: WALK_E_HEAD },
  });

  assert.equal(projection.stages.futurePressure.status, "supported");
  assert.equal(projection.result, "supports");
  assert.equal(projection.reason, "attributable-residue-changes-later-possibility");
});

test("#227 stays unresolved when admitted material never reaches attributable compiler evidence", () => {
  const evidence = assimilatedEvidence();
  const projection = projectForeignMaterialLifecycle({
    videoBinding: evidence.videoBinding,
    foreignMaterialPlan: evidence.foreignMaterialPlan,
    compilerEvidence: null,
    residueEvidence: null,
    futurePressureEvidence: null,
    sourcePointers: { currentSpineHead: WALK_E_HEAD },
  });

  assert.equal(projection.stages.encountered.status, "supported");
  assert.equal(projection.stages.admitted.status, "supported");
  assert.equal(projection.stages.assimilated.status, "unresolved");
  assert.equal(projection.result, "unresolved");
  assert.equal(projection.reason, "assimilation-not-attributable");
});

test("#227 projection is deterministic and local-path relocation does not change identity", () => {
  const firstEvidence = assimilatedEvidence();
  const movedBinding = {
    ...firstEvidence.videoBinding,
    path: "/another/cache/renamed.webm",
    filename: "renamed.webm",
  };
  const movedPlan = createForeignMaterialPlan({
    videoBinding: movedBinding,
    timeline: sampleTimeline(),
    analysisDurationSeconds: 6,
  });
  const movedCompilerEvidence = applyForeignMaterialToGraph({
    graph: "color=c=black:s=320x180,format=rgba[vout]",
    foreignMaterialPlan: movedPlan,
    foreignMaterialInputIndex: 2,
    width: 320,
    height: 180,
    fps: 30,
  }).evidence;
  const firstResidue = receiptResidue(firstEvidence);
  const movedResidue = receiptResidue({
    videoBinding: movedBinding,
    foreignMaterialPlan: movedPlan,
  });

  const first = projectForeignMaterialLifecycle({
    ...firstEvidence,
    residueEvidence: firstResidue,
    sourcePointers: { currentSpineHead: WALK_E_HEAD },
  });
  const moved = projectForeignMaterialLifecycle({
    videoBinding: movedBinding,
    foreignMaterialPlan: movedPlan,
    compilerEvidence: movedCompilerEvidence,
    residueEvidence: movedResidue,
    sourcePointers: { currentSpineHead: WALK_E_HEAD },
  });

  assert.equal(first.projectionHash, moved.projectionHash);
  assert.deepEqual(first, moved);
});

test("#227 removes the lifecycle projection when Video is absent", () => {
  assert.equal(projectForeignMaterialLifecycle({ videoBinding: null }), null);
});
