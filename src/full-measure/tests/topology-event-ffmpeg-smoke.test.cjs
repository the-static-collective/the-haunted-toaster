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

function topologyEvent(kind, id, prepareTick, strikeTick, releaseTick, residueUntilTick, parameters) {
  return {
    id,
    kind,
    prepareTick,
    strikeTick,
    releaseTick,
    residueUntilTick,
    parameters,
    evidenceRefs: [`fixture:${id}`],
  };
}

const APERTURE = topologyEvent("aperture", "aperture-smoke-1", 100, 200, 400, 700, {
  anchorX: 0.48,
  anchorY: 0.42,
  radiusX: 0.24,
  radiusY: 0.22,
  focus: 0.82,
  peripheralCompression: 0.34,
  orbit: 0.18,
});

const SPEAK = topologyEvent("speak", "speak-smoke-1", 100, 200, 400, 700, {
  anchorX: 0.52,
  anchorY: 0.54,
  radiusX: 0.28,
  radiusY: 0.14,
  seamWidth: 0.18,
  emission: 0.72,
  residue: 0.31,
});

const GRAB = topologyEvent("grab", "grab-smoke-1", 100, 200, 400, 700, {
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
});

const GROW = topologyEvent("grow", "grow-smoke-1", 100, 200, 400, 700, {
  anchorX: 0.58,
  anchorY: 0.46,
  radiusX: 0.18,
  radiusY: 0.2,
  branchCount: 3,
  growth: 0.76,
  persistence: 0.68,
  ageBias: 0.42,
});

function bodyEvents() {
  return [
    { ...structuredClone(APERTURE), id: "body-aperture", prepareTick: 80, strikeTick: 140, releaseTick: 200, residueUntilTick: 260, evidenceRefs: ["fixture:body-aperture"] },
    { ...structuredClone(SPEAK), id: "body-speak", prepareTick: 280, strikeTick: 340, releaseTick: 400, residueUntilTick: 460, evidenceRefs: ["fixture:body-speak"] },
    { ...structuredClone(GRAB), id: "body-grab", prepareTick: 480, strikeTick: 540, releaseTick: 600, residueUntilTick: 660, evidenceRefs: ["fixture:body-grab"] },
    { ...structuredClone(GROW), id: "body-grow", prepareTick: 680, strikeTick: 740, releaseTick: 800, residueUntilTick: 900, evidenceRefs: ["fixture:body-grow"] },
  ];
}

function resolve(events) {
  const { family, candidate } = candidateFixture();
  return {
    candidate,
    timeline: generation.resolveTopologyEvents(candidate.timeline, {
      family,
      candidateIndex: candidate.index,
      events,
    }),
  };
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
  const { candidate, timeline } = resolve([GRAB]);
  const compiled = await executeTimeline(timeline, "grab.ffgraph");

  assert.equal(compiled.topology, candidate.timeline.baseState.topology);
  assert.equal(compiled.topologyEvents.planSha256, timeline.topologyEvents.planSha256);
  assert.match(compiled.graph, /grabTopologyFinal/);
});

for (const [kind, event] of [
  ["APERTURE", APERTURE],
  ["SPEAK", SPEAK],
  ["GROW", GROW],
]) {
  test(`${kind} executes real FFmpeg through the shared topology-event seam`, async () => {
    const { timeline } = resolve([event]);
    const compiled = await executeTimeline(timeline, `${kind.toLowerCase()}.ffgraph`);

    assert.deepEqual(compiled.topologyEvents.renderedKinds, [kind.toLowerCase()]);
    assert.match(compiled.graph, new RegExp(`${kind.toLowerCase()}TopologyFinal`, "i"));
  });
}

test("BODY executes APERTURE → SPEAK → GRAB → GROW in one shared production seam", async () => {
  const { timeline } = resolve(bodyEvents());
  const compiled = await executeTimeline(timeline, "body.ffgraph");

  assert.deepEqual(compiled.topologyEvents.renderedKinds, ["aperture", "speak", "grab", "grow"]);
  assert.deepEqual(compiled.topologyEffects.map((effect) => effect.kind), ["aperture", "speak", "grab", "grow"]);
  assert.match(compiled.graph, /apertureTopology/);
  assert.match(compiled.graph, /speakTopology/);
  assert.match(compiled.graph, /grabTopology/);
  assert.match(compiled.graph, /growTopologyFinal/);
});
