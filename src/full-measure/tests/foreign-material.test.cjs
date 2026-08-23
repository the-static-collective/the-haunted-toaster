const test = require("node:test");
const assert = require("node:assert/strict");
const {
  FOREIGN_MATERIAL_OPERATOR_ID,
  applyForeignMaterialToGraph,
  createForeignMaterialPlan,
  ffmpegInputArgsForForeignMaterial,
} = require("../src/render/foreign-material.cjs");

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
  return {
    durationTicks: 180,
    timebase: 30,
  };
}

test("createForeignMaterialPlan derives deterministic evidence from an admitted clip", () => {
  const binding = sampleVideoBinding();
  const first = createForeignMaterialPlan({
    videoBinding: binding,
    timeline: sampleTimeline(),
    analysisDurationSeconds: 6,
  });
  const second = createForeignMaterialPlan({
    videoBinding: binding,
    timeline: sampleTimeline(),
    analysisDurationSeconds: 6,
  });

  assert.equal(first.sourceSpecimenId, binding.specimenId);
  assert.equal(first.sourceSha256, binding.sourceSha256);
  assert.equal(first.assimilationPolicy.operatorId, FOREIGN_MATERIAL_OPERATOR_ID);
  assert.equal(first.placement.startTick, 0);
  assert.equal(first.placement.endTick, 180);
  assert.equal(first.placement.renderDurationSeconds, 6);
  assert.equal(first.sampling.mode, "stream-loop");
  assert.equal(first.clipAnalysis.representativeFrameCount, 9);
  assert.equal(first.planHash, second.planHash);
  assert.equal(first.clipAnalysisHash, second.clipAnalysisHash);
});

test("plan identity is stable when admitted clip bytes move to another local path", () => {
  const firstBinding = sampleVideoBinding();
  const movedBinding = {
    ...sampleVideoBinding(),
    path: "/another/machine/cache/renamed-source.webm",
    filename: "renamed-source.webm",
  };
  const first = createForeignMaterialPlan({
    videoBinding: firstBinding,
    timeline: sampleTimeline(),
    analysisDurationSeconds: 6,
  });
  const moved = createForeignMaterialPlan({
    videoBinding: movedBinding,
    timeline: sampleTimeline(),
    analysisDurationSeconds: 6,
  });

  assert.equal(first.planHash, moved.planHash);
  assert.equal(first.clipAnalysisHash, moved.clipAnalysisHash);
  assert.notEqual(first.sourcePath, moved.sourcePath);
  assert.notEqual(first.sourceFilename, moved.sourceFilename);
});

test("ffmpegInputArgsForForeignMaterial wires a looped clip input", () => {
  const plan = createForeignMaterialPlan({
    videoBinding: sampleVideoBinding(),
    timeline: sampleTimeline(),
    analysisDurationSeconds: 6,
  });
  assert.deepEqual(ffmpegInputArgsForForeignMaterial(plan), [
    "-stream_loop",
    "-1",
    "-i",
    "/tmp/pantry/specimen.mp4",
  ]);
});

test("no foreign material preserves the established graph and input path exactly", () => {
  const graph = "color=c=black:s=320x180,format=rgba[vout]";
  const applied = applyForeignMaterialToGraph({
    graph,
    foreignMaterialPlan: null,
    foreignMaterialInputIndex: null,
    width: 320,
    height: 180,
    fps: 30,
  });

  assert.equal(createForeignMaterialPlan({ videoBinding: null }), null);
  assert.deepEqual(ffmpegInputArgsForForeignMaterial(null), []);
  assert.equal(applied.graph, graph);
  assert.equal(applied.evidence, null);
});

test("applyForeignMaterialToGraph appends one shared assimilation operator", () => {
  const plan = createForeignMaterialPlan({
    videoBinding: sampleVideoBinding(),
    timeline: sampleTimeline(),
    analysisDurationSeconds: 6,
  });
  const applied = applyForeignMaterialToGraph({
    graph: "color=c=black:s=320x180,format=rgba[vout]",
    foreignMaterialPlan: plan,
    foreignMaterialInputIndex: 2,
    width: 320,
    height: 180,
    fps: 30,
  });

  assert.match(applied.graph, /\[2:v\]fps=30,scale=320:180/);
  assert.match(applied.graph, /blend=all_mode=softlight:all_opacity=0\.28/);
  assert.match(applied.graph, /\[vout\]$/);
  assert.equal(applied.evidence.planHash, plan.planHash);
  assert.equal(applied.evidence.sourceSpecimenId, plan.sourceSpecimenId);
  assert.equal(applied.evidence.operatorId, FOREIGN_MATERIAL_OPERATOR_ID);
  assert.equal(applied.evidence.opacity, 0.28);
  assert.equal(applied.evidence.inputIndex, 2);
});
