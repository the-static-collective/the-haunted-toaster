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
const visualConstraints = readJson("constraints/wire-orchard.v2.json");
const profile = readJson("profiles/toaster-raster-1.json");
const visualProfile = readJson("profiles/toaster-raster-2.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

function executionFixture(topology) {
  const artifact = generation.createVisualScore({
    seed: `issue-16-ffmpeg-${topology}`,
    constraints,
    overrides: { topology, temporalDensity: "section" },
  });
  return createTimelineExecution(
    generation.resolve(analysis, artifact.score, constraints, profile),
  );
}

function visualExecutionFixture(topology) {
  const artifact = generation.createVisualScore({
    seed: `issue-41-ffmpeg-${topology}`,
    constraints: visualConstraints,
    overrides: {
      topology,
      temporalDensity: "section",
      motion: { grammar: "fracture" },
      material: { texture: "photocopy" },
      camera: { grammar: "orbit" },
      palette: { logic: "duotone" },
    },
  });
  return createTimelineExecution(
    generation.resolve(analysis, artifact.score, visualConstraints, visualProfile),
  );
}

function productionLikeGraph() {
  return [
    "[0:a]aformat=channel_layouts=stereo[waveAudio]",
    "[waveAudio]showwaves=s=320x64:mode=cline:rate=12:colors=0xFFFFFF:scale=sqrt,format=rgba,colorkey=black:0.08:0.0,colorchannelmixer=aa=0.78[wave]",
    "[wave]pad=320:180:0:105:color=black@0.0[waveFull]",
    "[1:v]format=rgba[base]",
    "[base][waveFull]overlay=0:0:shortest=1[stage0]",
    "[stage0]ass=filename='topology-smoke.ass':alpha=1,format=yuv420p[vout]",
  ].join(";\n");
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

async function smokeGraph(temp, topology, execution) {
  const compiled = compileTimelineFilterGraph(productionLikeGraph(), execution);
  const graphPath = path.join(temp, `${topology}.ffgraph`);
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
      "2",
      "-f",
      "null",
      "-",
    ],
    { cwd: temp },
  );
  return compiled;
}

test("circle and mirrored-ring compile actual FFmpeg frames through the legacy production compiler", async () => {
  const temp = await fsPromises.mkdtemp(path.join(os.tmpdir(), "ht-topology-smoke-"));
  try {
    await fsPromises.writeFile(path.join(temp, "topology-smoke.ass"), assFixture, "utf8");

    for (const topology of ["circle", "mirrored-ring"]) {
      const compiled = await smokeGraph(temp, topology, executionFixture(topology));
      assert.equal(compiled.topology, topology);
      assert.equal(compiled.rendererPolicy, generation.LEGACY_RENDERER_POLICY);
    }
  } finally {
    await fsPromises.rm(temp, { recursive: true, force: true });
  }
});

test("spiral and quad-mirror compile actual FFmpeg frames with visual-language-v1 operators", async () => {
  const temp = await fsPromises.mkdtemp(path.join(os.tmpdir(), "ht-visual-language-smoke-"));
  try {
    await fsPromises.writeFile(path.join(temp, "topology-smoke.ass"), assFixture, "utf8");

    for (const topology of ["spiral", "quad-mirror"]) {
      const compiled = await smokeGraph(temp, topology, visualExecutionFixture(topology));
      assert.equal(compiled.topology, topology);
      assert.equal(compiled.rendererPolicy, generation.VISUAL_LANGUAGE_RENDERER_POLICY);
      assert.equal(compiled.operators.length, 4);
      assert.equal(compiled.fieldEnvelope.policy, "bounded-full-height-v1");
    }
  } finally {
    await fsPromises.rm(temp, { recursive: true, force: true });
  }
});