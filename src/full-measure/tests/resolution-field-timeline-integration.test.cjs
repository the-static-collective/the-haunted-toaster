const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  TEXT_OVERLAY_SEAM,
  applyAtmosphereToGraph,
} = require("../src/render/atmosphere.cjs");
const {
  applyResolutionFieldToAtmosphereGraph,
} = require("../src/render/atmosphere-resolution-field.cjs");
const { compileTimelineFilterGraph } = require("../src/render/timeline-filter.cjs");
const { resolveFfmpeg, runProcess } = require("../src/render/tooling.cjs");

const WIDTH = 640;
const HEIGHT = 360;
const FPS = 12;
const DURATION_SECONDS = 1;

function productionGraph() {
  return [
    "[0:a]anull[waveAudio]",
    `[waveAudio]showwaves=s=${WIDTH}x90:mode=cline:rate=${FPS}:colors=white[wave]`,
    `[wave]pad=${WIDTH}:${HEIGHT}:0:135:color=black@0.0[waveFull]`,
    "[1:v][waveFull]overlay=shortest=1:format=auto[stage0]",
    TEXT_OVERLAY_SEAM,
  ].join(";\n");
}

function smokeTimeline() {
  return {
    scoreAddress: "htvs1_resolution_timeline_integration",
    timelineHash: "timeline-resolution-timeline-integration",
    timebase: 1000,
    durationTicks: DURATION_SECONDS * 1000,
    baseState: { atmosphere: "smoke" },
  };
}

function productionExecution() {
  const state = Object.freeze({
    topology: "linear",
    motion: Object.freeze({ grammar: "still", amplitude: 0.5, variance: 0.5 }),
    palette: Object.freeze({ logic: "garment", contrastBias: 0, bleed: 0.5 }),
    material: Object.freeze({ texture: "clean", imperfection: 0 }),
    camera: Object.freeze({ grammar: "locked", variance: 0.5 }),
  });
  return Object.freeze({
    timeline: Object.freeze({ baseState: state }),
    timebase: 1000,
    durationTicks: DURATION_SECONDS * 1000,
    segments: Object.freeze([
      Object.freeze({
        startTick: 0,
        endTick: DURATION_SECONDS * 1000,
        startSeconds: 0,
        endSeconds: DURATION_SECONDS,
        state,
      }),
    ]),
  });
}

async function compileProductionResolutionGraph(tempDirectory, scale) {
  const atmosphere = await applyAtmosphereToGraph({
    graph: productionGraph(),
    tempDirectory,
    timeline: smokeTimeline(),
    width: WIDTH,
    height: HEIGHT,
  });
  const resolution = applyResolutionFieldToAtmosphereGraph({
    graph: atmosphere.graph,
    fileName: atmosphere.evidence.fileName,
    width: WIDTH,
    height: HEIGHT,
    scale,
  });
  return compileTimelineFilterGraph(resolution.graph, productionExecution());
}

test("production timeline accepts the Resolution Field stage0 consumer at every supported scale and executes through real FFmpeg", async () => {
  for (const scale of [1, 0.5, 0.25]) {
    const tempDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), `toaster-resolution-timeline-${scale}-`),
    );
    try {
      const compiled = await compileProductionResolutionGraph(tempDirectory, scale);
      assert.match(compiled.graph, /\[timelineFinal\]split=2\[atmosphereBase\]\[atmosphereCarrier\]/);
      assert.doesNotMatch(compiled.graph, /\[stage0\]split=2\[atmosphereBase\]\[atmosphereCarrier\]/);

      await fs.copyFile(
        path.join(tempDirectory, "atmosphere.ass"),
        path.join(tempDirectory, "text-overlay.ass"),
      );
      const graphPath = path.join(tempDirectory, "resolution-timeline.ffgraph");
      await fs.writeFile(graphPath, `${compiled.graph}\n`, "utf8");

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
          `sine=frequency=440:sample_rate=48000:duration=${DURATION_SECONDS}`,
          "-f",
          "lavfi",
          "-i",
          `color=c=black:s=${WIDTH}x${HEIGHT}:r=${FPS}:d=${DURATION_SECONDS}`,
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
      await fs.rm(tempDirectory, { recursive: true, force: true });
    }
  }
});
