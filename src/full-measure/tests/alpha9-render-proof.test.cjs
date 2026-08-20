const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const generation = require("../src/generation/index.cjs");
const { attachTopologyArc } = require("../src/generation/topology-arc.cjs");
const { createTimelineExecution } = require("../src/render/timeline-execution.cjs");
const { createTimelinePreview } = require("../src/render/timeline-preview.cjs");
const { compileTimelineFilterGraph } = require("../src/render/timeline-filter.cjs");
const { resolveFfmpeg, runProcess } = require("../src/render/tooling.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const constraints = readJson("constraints/wire-orchard.v3.json");
const profile = readJson("profiles/toaster-raster-4.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");
const SHAPES = ["elastic-spine", "split-horizon", "cathedral-fan", "echo-tunnel"];

function scoreAndTimeline(topology) {
  const scoreArtifact = generation.createVisualScore({
    seed: `alpha9-ffmpeg-${topology}`,
    constraints,
    overrides: { topology, temporalDensity: "section" },
  });
  return {
    score: scoreArtifact.score,
    timeline: generation.resolve(analysis, scoreArtifact.score, constraints, profile),
  };
}

function productionLikeGraph() {
  return [
    "[0:a]aformat=channel_layouts=stereo[waveAudio]",
    "[waveAudio]showwaves=s=320x64:mode=cline:rate=12:colors=0xFFFFFF:scale=sqrt,format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=0.78[wave]",
    "[wave]pad=320:180:0:105:color=black@0.0[waveFull]",
    "[1:v]format=rgba[base]",
    "[base][waveFull]overlay=0:0:shortest=1[stage0]",
    "[stage0]ass=filename='alpha9-render-proof.ass':alpha=1,format=yuv420p[vout]",
  ].join(";\n");
}

function compiledGraphFor(topology) {
  const { timeline } = scoreAndTimeline(topology);
  return compileTimelineFilterGraph(
    productionLikeGraph(),
    createTimelineExecution(timeline),
  );
}

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

async function proveFrames(temp, name, compiled) {
  const graphPath = path.join(temp, `${name}.ffgraph`);
  await fsPromises.writeFile(graphPath, `${compiled.graph}\n`, "utf8");
  await runProcess(
    resolveFfmpeg(),
    [
      "-y",
      "-hide_banner",
      "-loglevel", "error",
      "-f", "lavfi",
      "-i", "sine=frequency=220:duration=1:sample_rate=48000",
      "-f", "lavfi",
      "-i", "color=c=black:s=320x180:r=12:d=1",
      "-filter_complex_script", graphPath,
      "-map", "[vout]",
      "-frames:v", "2",
      "-f", "null", "-",
    ],
    { cwd: temp },
  );
}

test("Shape Pack v1 compilers produce actual FFmpeg frames under raster-4", async () => {
  const temp = await fsPromises.mkdtemp(path.join(os.tmpdir(), "ht-alpha9-shapes-"));
  try {
    await fsPromises.writeFile(path.join(temp, "alpha9-render-proof.ass"), assFixture, "utf8");
    for (const topology of SHAPES) {
      const { timeline } = scoreAndTimeline(topology);
      const compiled = compileTimelineFilterGraph(
        productionLikeGraph(),
        createTimelineExecution(timeline),
      );
      assert.equal(compiled.topology, topology);
      assert.equal(compiled.topologyCompiler.endsWith("-v3"), true);
      assert.match(compiled.fieldEnvelope.policy, /^shape-pack-/);
      await proveFrames(temp, topology, compiled);
    }
  } finally {
    await fsPromises.rm(temp, { recursive: true, force: true });
  }
});

test("Topology Arc compiles the exact accepted schedule and produces FFmpeg frames", async () => {
  const temp = await fsPromises.mkdtemp(path.join(os.tmpdir(), "ht-alpha9-ghost-"));
  try {
    await fsPromises.writeFile(path.join(temp, "alpha9-render-proof.ass"), assFixture, "utf8");
    const { score, timeline: baseTimeline } = scoreAndTimeline("circle");
    const timeline = attachTopologyArc(baseTimeline, {
      analysis,
      score,
      constraints,
      locks: [],
      rootSeed: "alpha9-ghost-ffmpeg-proof",
      toastFeelId: "risky-hybrid",
    });
    assert.ok(timeline.topologyArc.windowCount > 0);

    const preview = createTimelinePreview(timeline);
    const compiled = compileTimelineFilterGraph(
      productionLikeGraph(),
      createTimelineExecution(timeline),
    );

    assert.equal(preview.timelineHash, timeline.timelineHash);
    assert.equal(preview.timeline.topologyArc.planSha256, timeline.topologyArc.planSha256);
    assert.equal(compiled.topologyArc.planSha256, timeline.topologyArc.planSha256);
    assert.equal(compiled.topologyArc.windowCount, timeline.topologyArc.windowCount);
    assert.deepEqual(
      compiled.topologyArc.windows.map(({ windowSha256, entranceTick, peakTick, releaseTick, outcome }) => ({
        windowSha256, entranceTick, peakTick, releaseTick, outcome,
      })),
      timeline.topologyArc.windows.map(({ windowSha256, entranceTick, peakTick, releaseTick, outcome }) => ({
        windowSha256, entranceTick, peakTick, releaseTick, outcome,
      })),
    );
    assert.match(compiled.graph, /arcGhostAudio0/);
    assert.match(compiled.graph, /overlay=0:0:enable=/);
    await proveFrames(temp, "topology-arc", compiled);
  } finally {
    await fsPromises.rm(temp, { recursive: true, force: true });
  }
});

test("Shape Pack layered topology compositing is bounded instead of screen-additive", () => {
  for (const topology of ["cathedral-fan", "echo-tunnel"]) {
    const compiled = compiledGraphFor(topology);
    assert.doesNotMatch(
      compiled.graph,
      /blend=all_mode=screen/,
      `${topology} must not turn repeated bright geometry into additive white pressure`,
    );
  }
});

test("Echo Tunnel has explicit recession falloff instead of concentric full-strength Circle clones", () => {
  const compiled = compiledGraphFor("echo-tunnel");
  const alphaStages = compiled.graph.match(/colorchannelmixer=aa=/g) || [];

  assert.ok(
    alphaStages.length >= 4,
    `echo-tunnel should carry per-depth alpha falloff; found only ${alphaStages.length} alpha stage(s)`,
  );
  assert.doesNotMatch(
    compiled.graph,
    /scale=\d+:\d+,pad=\d+:\d+:\(ow-iw\)\/2:\(oh-ih\)\/2:color=black@0/,
    "echo-tunnel nested planes must converge toward a vanishing axis rather than remain perfectly concentric",
  );
});
