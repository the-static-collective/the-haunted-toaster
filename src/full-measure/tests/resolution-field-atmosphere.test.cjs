const test = require("node:test");
const assert = require("node:assert/strict");
const fsPromises = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  TEXT_OVERLAY_SEAM,
  applyAtmosphereToGraph,
} = require("../src/render/atmosphere.cjs");
const {
  applyResolutionFieldToAtmosphereGraph,
} = require("../src/render/atmosphere-resolution-field.cjs");
const { resolveFfmpeg, runProcess } = require("../src/render/tooling.cjs");

function smokeTimeline() {
  return {
    scoreAddress: "htvs1_resolution_field_smoke",
    timelineHash: "timeline-resolution-field-smoke",
    timebase: 1000,
    durationTicks: 8_000,
    baseState: { atmosphere: "smoke" },
  };
}

async function compileHalfScaleAtmosphere(tempDirectory, graph) {
  const atmosphere = await applyAtmosphereToGraph({
    graph,
    tempDirectory,
    timeline: smokeTimeline(),
    width: 640,
    height: 360,
  });
  const result = applyResolutionFieldToAtmosphereGraph({
    graph: atmosphere.graph,
    fileName: atmosphere.evidence.fileName,
    width: 640,
    height: 360,
    scale: 0.5,
  });
  return { atmosphere, result };
}

test("Resolution Field renders Atmosphere at half scale, returns it to native geometry, then protects typography", async () => {
  const tempDirectory = await fsPromises.mkdtemp(
    path.join(os.tmpdir(), "toaster-resolution-atmosphere-"),
  );
  const graph = `[stage0]null[other];\n${TEXT_OVERLAY_SEAM}`;

  try {
    const { atmosphere, result } = await compileHalfScaleAtmosphere(
      tempDirectory,
      graph,
    );

    assert.match(
      atmosphere.graph,
      /\[stage0\]ass=filename='atmosphere\.ass':alpha=1\[atmosphereStage\]/,
    );
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
      /\[atmosphereBase\]\[atmosphereResolutionOut\]overlay=[^;]*setsar=1\[atmosphereStage\]/,
    );
    assert.match(
      result.graph,
      /\[atmosphereStage\]ass=filename='text-overlay\.ass':alpha=1,format=yuv420p\[vout\]/,
    );

    assert.equal(result.evidence.policyVersion, "resolution-field-v0.1");
    assert.equal(result.evidence.scale, 0.5);
    assert.equal(result.evidence.internalWidth, 320);
    assert.equal(result.evidence.internalHeight, 180);
    assert.equal(result.evidence.outputWidth, 640);
    assert.equal(result.evidence.outputHeight, 360);
  } finally {
    await fsPromises.rm(tempDirectory, { recursive: true, force: true });
  }
});

test("Atmosphere Resolution Field graph executes through real FFmpeg before native typography", async () => {
  const tempDirectory = await fsPromises.mkdtemp(
    path.join(os.tmpdir(), "toaster-resolution-atmosphere-ffmpeg-"),
  );
  try {
    const graph = `[0:v]format=rgba[stage0];\n${TEXT_OVERLAY_SEAM}`;
    const { result } = await compileHalfScaleAtmosphere(tempDirectory, graph);
    await fsPromises.copyFile(
      path.join(tempDirectory, "atmosphere.ass"),
      path.join(tempDirectory, "text-overlay.ass"),
    );
    const graphPath = path.join(tempDirectory, "resolution-atmosphere.ffgraph");
    await fsPromises.writeFile(graphPath, `${result.graph}\n`, "utf8");

    await runProcess(
      resolveFfmpeg(),
      [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=640x360:r=12:d=0.5",
        "-filter_complex_script",
        graphPath,
        "-map",
        "[vout]",
        "-frames:v",
        "4",
        "-f",
        "null",
        "-",
      ],
      { cwd: tempDirectory },
    );
  } finally {
    await fsPromises.rm(tempDirectory, { recursive: true, force: true });
  }
});

test("production render forwards Resolution Field only from an explicit render option", async () => {
  const renderSource = await fsPromises.readFile(
    path.join(__dirname, "../src/render/render.cjs"),
    "utf8",
  );
  const hauntedSource = await fsPromises.readFile(
    path.join(__dirname, "../src/render/haunted-typography-render.cjs"),
    "utf8",
  );

  assert.match(
    renderSource,
    /atmosphereResolutionScale:\s*config\.atmosphereResolutionScale\s*\?\?\s*null/,
  );
  assert.match(
    hauntedSource,
    /atmosphereResolutionScale\s*=\s*null/,
  );
  assert.match(
    hauntedSource,
    /atmosphereResolutionScale\s*==\s*null\s*\|\|\s*!atmosphere\.evidence\.fileName/,
  );
});
