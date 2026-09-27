const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const generation = require("../src/generation/index.cjs");
const { CONSTRAINTS_BY_PRESET } = require("../src/candidate-session.cjs");
const { createMemoryService } = require("../src/memory/memory-service.cjs");

async function archiveFixture(rootDir) {
  const out = path.join(rootDir, "out");
  await fs.mkdir(out, { recursive: true });
  const outputPath = path.join(out, "memory.mp4");
  const receiptPath = path.join(out, "memory.video-receipt.json");
  const scorePath = path.join(out, "memory.score.json");
  const timelinePath = path.join(out, "memory.timeline.json");
  await fs.writeFile(outputPath, "video-bytes");

  const score = generation.createVisualScore({
    seed: "memory-service-prism-score",
    constraints: CONSTRAINTS_BY_PRESET.openField,
  }).score;
  await fs.writeFile(scorePath, JSON.stringify(score));
  await fs.writeFile(timelinePath, JSON.stringify({ schema: "haunted-toaster/resolved-timeline/v1" }));

  const receipt = {
    schema: "full-measure.video-receipt.v1",
    createdAt: "2026-09-27T18:00:00.000Z",
    treatment: {
      title: "Memory Prism Witness",
      artist: "Static Collective",
      garment: { id: "openField" },
      toastFeel: { id: "wire-heat" },
      nativeColor: { relationship: "warm-return" },
      sections: [
        { startSeconds: 0, endSeconds: 10, energy: 0.25 },
        { startSeconds: 10, endSeconds: 20, energy: 0.8 },
      ],
    },
    render: {
      witnessWindow: { policyVersion: "witness-window-v1" },
      visualCompiler: { topology: score.topology, operators: [] },
    },
    output: { filename: "memory.mp4", sha256: "f".repeat(64), sizeBytes: 11 },
    validation: { accepted: true },
  };
  await fs.writeFile(receiptPath, JSON.stringify(receipt));

  return {
    score,
    renderResult: {
      outputPath,
      receiptPath,
      scorePath,
      timelinePath,
      srtPath: null,
      vttPath: null,
      receipt,
    },
  };
}

const currentSong = {
  duration: 20,
  sections: [
    { start: 0, end: 10, energy: 0.25, label: "verse" },
    { start: 10, end: 20, energy: 0.8, label: "chorus" },
  ],
};

test("MEMORY-001 persistent service is silent with no past render and wakes after accepted archive", async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "ht-memory-prism-"));
  try {
    const service = createMemoryService({ rootProvider: () => rootDir });
    const cold = await service.contextForGeneration({
      mediaAnalysis: currentSong,
      constraints: CONSTRAINTS_BY_PRESET.openField,
    });
    assert.equal(cold.prism, null);

    const fixture = await archiveFixture(rootDir);
    const archived = await service.archiveSuccessfulRender(fixture.renderResult);
    assert.match(archived.receiptSha256, /^[a-f0-9]{64}$/);

    const warm = await service.contextForGeneration({
      mediaAnalysis: currentSong,
      constraints: CONSTRAINTS_BY_PRESET.openField,
    });
    assert.ok(warm.prism);
    assert.equal(warm.prism.seats.length, 6);
    assert.deepEqual(
      warm.prism.seats.map((seat) => seat.targetPrefix),
      ["topology", "motionGrammar", "materialTexture", "paletteLogic", "cameraGrammar", "temporalDensity"],
    );
    assert.ok(warm.prism.seats.every((seat) => seat.influence?.evidenceRefs?.some((ref) => ref.startsWith("archive-cut:"))));

    const projection = await service.currentProjection();
    assert.equal(projection.renderCount, 1);
    assert.equal(projection.featureCounts[`topology:${fixture.score.topology}`], 1);
    assert.equal(projection.featureCounts[`motionGrammar:${fixture.score.motion.grammar}`], 1);
    assert.equal(projection.featureCounts[`materialTexture:${fixture.score.material.texture}`], 1);
    assert.equal(projection.featureCounts[`paletteLogic:${fixture.score.palette.logic}`], 1);
    assert.equal(projection.featureCounts[`cameraGrammar:${fixture.score.camera.grammar}`], 1);
    assert.equal(projection.featureCounts[`temporalDensity:${fixture.score.temporalDensity}`], 1);
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});
