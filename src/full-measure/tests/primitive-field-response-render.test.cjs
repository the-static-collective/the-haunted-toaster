const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const generation = require("../src/generation/index.cjs");
const { applyPrimitiveFieldToGraph } = require("../src/render/primitive-field.cjs");
const { resolveFfmpeg, runProcess } = require("../src/render/tooling.cjs");

function baseGraph() {
  return [
    "[0:v]format=rgba[waveFull]",
    "[1:v]format=rgba[spectral]",
    "[spectral][waveFull]overlay=0:0:shortest=1[stage0]",
    "[stage0]format=yuv420p[vout]",
  ].join(";\n");
}

function timeline(planSha256, energies) {
  return {
    rendererPolicy: generation.MUTATION_LATTICE_RENDERER_POLICY,
    timebase: 1000,
    durationTicks: 2000,
    baseState: {
      topology: "spiral",
      primitiveField: { structure: "ribs", dynamics: "magnetic" },
    },
    primitiveField: {
      policyVersion: "primitive-field-coverage-v1",
      structure: "ribs",
      dynamics: "magnetic",
      structureCompiler: "structure-ribs-v1",
      dynamicsCompiler: "dynamics-magnetic-v1",
    },
    nestedResponse: {
      policyVersion: "nested-response-contour-v1",
      granularity: "transient",
      knotCount: 3,
      knots: energies.map((energy, index) => ({
        atTick: index * 1000,
        sectionIndex: 0,
        macroEnergy: energy,
        localEnergy: energy,
        excursion: index === 0 ? 0 : energy - energies[index - 1],
        slope: index === 0 ? 0 : energy - energies[index - 1],
        direction: index === 0 || energy === energies[index - 1]
          ? 0
          : energy > energies[index - 1] ? 1 : -1,
      })),
      meterEvidenceUsed: false,
      idleMotionPolicyVersion: "topology-idle-v1",
      sourceWitnessSha256: `witness-${planSha256}`,
      planSha256,
    },
  };
}

async function proveFrames(temp, name, graph) {
  const graphPath = path.join(temp, `${name}.ffgraph`);
  await fs.writeFile(graphPath, `${graph}\n`, "utf8");
  await runProcess(
    resolveFfmpeg(),
    [
      "-y", "-hide_banner", "-loglevel", "error",
      "-f", "lavfi", "-i", "color=c=white:s=320x180:r=12:d=1",
      "-f", "lavfi", "-i", "color=c=black:s=320x180:r=12:d=1",
      "-filter_complex_script", graphPath,
      "-map", "[vout]",
      "-frames:v", "2",
      "-f", "null", "-",
    ],
    { cwd: temp },
  );
}

test("low, mid, and dense nested response compile distinct replayable Primitive Field motion and real FFmpeg frames", async () => {
  const specimens = [
    ["low", [0.2, 0.25, 0.3]],
    ["mid", [0.35, 0.55, 0.5]],
    ["dense", [0.55, 0.95, 0.95]],
  ];
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "ht-primitive-response-"));
  try {
    const compiled = [];
    for (const [name, energies] of specimens) {
      const accepted = timeline(`${name}-plan`, energies);
      const result = applyPrimitiveFieldToGraph({
        graph: baseGraph(),
        timeline: accepted,
        width: 320,
        height: 180,
      });
      const replay = applyPrimitiveFieldToGraph({
        graph: baseGraph(),
        timeline: structuredClone(accepted),
        width: 320,
        height: 180,
      });
      assert.deepEqual(result.evidence, replay.evidence);
      assert.equal(result.graph, replay.graph);
      assert.equal(result.evidence.structure.value, "ribs");
      assert.equal(result.evidence.dynamics.value, "magnetic");
      assert.match(result.graph, /primitiveField/);
      assert.match(result.graph, /\bt\b/);
      await proveFrames(temp, name, result.graph);
      compiled.push(result.graph);
    }
    assert.equal(new Set(compiled).size, specimens.length);
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
});
