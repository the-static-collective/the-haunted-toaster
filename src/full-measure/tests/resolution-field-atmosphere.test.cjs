const test = require("node:test");
const assert = require("node:assert/strict");
const fsPromises = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  TEXT_OVERLAY_SEAM,
  applyAtmosphereToGraph,
} = require("../src/render/atmosphere.cjs");

function smokeTimeline() {
  return {
    scoreAddress: "htvs1_resolution_field_smoke",
    timelineHash: "timeline-resolution-field-smoke",
    timebase: 1000,
    durationTicks: 8_000,
    baseState: { atmosphere: "smoke" },
  };
}

test("Resolution Field renders Atmosphere at half scale, returns it to native geometry, then protects typography", async () => {
  const tempDirectory = await fsPromises.mkdtemp(
    path.join(os.tmpdir(), "toaster-resolution-atmosphere-"),
  );
  const graph = `[stage0]null[other];\n${TEXT_OVERLAY_SEAM}`;

  try {
    const result = await applyAtmosphereToGraph({
      graph,
      tempDirectory,
      timeline: smokeTimeline(),
      width: 640,
      height: 360,
      resolutionScale: 0.5,
    });

    assert.match(result.graph, /\[stage0\]split=2\[atmosphereBase\]\[atmosphereCarrier\]/);
    assert.match(
      result.graph,
      /\[atmosphereCarrier\]format=rgba,colorchannelmixer=aa=0\[atmosphereResolutionSource\]/,
    );
    assert.match(
      result.graph,
      /\[atmosphereResolutionSource\]scale=320:180:[^;]*setsar=1\[resolutionFieldWorking\]/,
    );
    assert.match(
      result.graph,
      /\[resolutionFieldWorking\]ass=filename='atmosphere\.ass':alpha=1\[resolutionFieldEffect\]/,
    );
    assert.match(
      result.graph,
      /\[resolutionFieldEffect\]scale=640:360:[^;]*setsar=1\[atmosphereResolutionOut\]/,
    );
    assert.match(
      result.graph,
      /\[atmosphereBase\]\[atmosphereResolutionOut\]overlay=[^;]*\[atmosphereStage\]/,
    );
    assert.match(
      result.graph,
      /\[atmosphereStage\]ass=filename='text-overlay\.ass':alpha=1,format=yuv420p\[vout\]/,
    );

    assert.equal(result.evidence.resolutionField.policyVersion, "resolution-field-v0.1");
    assert.equal(result.evidence.resolutionField.scale, 0.5);
    assert.equal(result.evidence.resolutionField.internalWidth, 320);
    assert.equal(result.evidence.resolutionField.internalHeight, 180);
    assert.equal(result.evidence.resolutionField.outputWidth, 640);
    assert.equal(result.evidence.resolutionField.outputHeight, 360);
  } finally {
    await fsPromises.rm(tempDirectory, { recursive: true, force: true });
  }
});
