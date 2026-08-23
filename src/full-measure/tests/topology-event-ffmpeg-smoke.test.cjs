const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const generation = require("../src/generation/index.cjs");
const { createTimelineExecution } = require("../src/render/timeline-execution.cjs");
const { compileTimelineFilterGraph } = require("../src/render/timeline-filter.cjs");
const { resolveFfmpeg, runProcess } = require("../src/render/tooling.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const constraints = readJson("constraints/wire-orchard.v1.json");
const profile = readJson("profiles/toaster-raster-1.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

const assFixture = [
  "[Script Info]",
  "ScriptType: v4.00+",
  "PlayResX: 320",
  "PlayResY: 180",
  "ScaledBorderAndShadow: yes",
  "",
  "[V4+ Styles]",
  "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
  "Style: Default,Arial,20,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,1,0,2,10,10,10,1",
  "",
  "[Events]",
  "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  "",
].join("\n");

function productionLikeGraph() {
  return [
    "[0:a]aformat=channel_layouts=stereo[waveAudio]",
    "[waveAudio]showwaves=s=320x64:mode=cline:rate=12:colors=0xFFFFFF:scale=sqrt,format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=0.78[wave]",
    "[wave]pad=320:180:0:105:color=black@0.0[waveFull]",
    "[1:v]format=rgba[base]",
    "[base][waveFull]overlay=0:0:shortest=1[stage0]",
    "[stage0]ass=filename='topology-grab-smoke.ass':alpha=1,format=yuv420p[vout]",
  ].join(";\n");
}

function candidateFixture() {
  const family = generation.generateCandidateSet({
    analysis,
    garmentConstraints: constraints,
    rendererProfile: profile,
    rootSeed: "topology-event-ffmpeg-smoke-v0.1",
    count: 6,
  });
  const candidate = family.candidates.find((item) => item.timeline.baseState.topology !== "linear") || family.candidates[0];
  return { family, candidate };
}

async function executeTimeline(timeline, graphName) {
  const execution = createTimelineExecution(timeline);
  const compiled = compileTimelineFilterGraph(productionLikeGraph(), execution);
  const temp = await fsPromises.mkdtemp(path.join(os.tmpdir(), "ht-grab-smoke-"));

  try {
    await fsPromises.writeFile(path.join(temp, "topology-grab-smoke.ass"), assFixture, "utf8");
    const graphPath = path.join(temp, graphName);
    await fsPromises.writeFile(graphPath, `${compiled.graph}\n`, "utf8");

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
        "sine=frequency=220:duration=1:sample_rate=48000",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=320x180:r=12:d=1",
        "-filter_complex_script",
        graphPath,
        "-map",
        "[vout]",
        "-frames:v",
        "9",
        "-f",
        "null",
        "-",
      ],
      { cwd: temp },
    );
    return compiled;
  } finally {
    await fsPromises.rm(temp, { recursive: true, force: true });
  }
}

test("the accepted candidate executes real FFmpeg before GRAB is attached", async () => {
  const { candidate } = candidateFixture();
  const compiled = await executeTimeline(candidate.timeline, "baseline.ffgraph");
  assert.equal(compiled.topology, candidate.timeline.baseState.topology);
  assert.equal(compiled.topologyEvents, undefined);
});

test("GRAB compiles and executes real FFmpeg frames through anticipation, pull, recoil, and residual time", async () => {
  const { family, candidate } = candidateFixture();
  const timeline = generation.resolveTopologyEvents(candidate.timeline, {
    family,
    candidateIndex: candidate.index,
    events: [{
      id: "grab-smoke-1",
      kind: "grab",
      prepareTick: 100,
      strikeTick: 200,
      releaseTick: 400,
      residueUntilTick: 700,
      parameters: {
        anchorX: 0.25,
        anchorY: 0.5,
        targetX: 0.75,
        targetY: 0.45,
        radiusX: 0.22,
        radiusY: 0.18,
        pull: 0.8,
        recoil: 0.55,
        falloff: 0.7,
        residualVectorX: 0.08,
        residualVectorY: -0.03,
        residualStretch: 0.06,
      },
      evidenceRefs: ["fixture:grab-smoke-1"],
    }],
  });
  const compiled = await executeTimeline(timeline, "grab.ffgraph");

  assert.equal(compiled.topology, candidate.timeline.baseState.topology);
  assert.equal(compiled.topologyEvents.planSha256, timeline.topologyEvents.planSha256);
  assert.match(compiled.graph, /grabTopologyFinal/);
});
