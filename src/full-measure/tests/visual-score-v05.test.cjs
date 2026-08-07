const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const generation = require("../src/generation/index.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const porchlight = readJson("constraints/porchlight.v1.json");
const wireOrchard = readJson("constraints/wire-orchard.v1.json");
const profile = readJson("profiles/toaster-raster-1.json");
const sectional = readJson("fixtures/analysis/sectional.v1.json");
const sparse = readJson("fixtures/analysis/sparse.v1.json");

function assertInside(score, constraints) {
  const result = generation.scoreWithinConstraints(score, constraints);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
}

test("canonical JSON is ordered, quantized, addressed, and strict", () => {
  const first = { z: 1.123456789, a: { y: true, x: "witness" } };
  const second = { a: { x: "witness", y: true }, z: 1.1234567 };
  assert.equal(
    generation.canonicalStringify(first),
    '{"a":{"x":"witness","y":true},"z":1.123457}',
  );
  assert.equal(generation.canonicalStringify(first), generation.canonicalStringify(second));
  assert.equal(generation.hashCanonical(first), generation.hashCanonical(second));
  assert.throws(() => generation.canonicalStringify({ value: Number.NaN }), /non-finite/);
  assert.throws(() => generation.canonicalStringify({ value: undefined }), /undefined/);
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => generation.canonicalStringify(cyclic), /cycles/);
});

test("xoshiro256** / splitmix64-v1 has published vectors", () => {
  const prng = generation.createPrng("test");
  assert.deepEqual(prng.initialState, [
    "6159cf2d03173cd8",
    "f70bdbeae21b1e6d",
    "5b443d85ca1e5e89",
    "34b7461c89c7ac4d",
  ]);
  assert.deepEqual(
    Array.from({ length: 4 }, () =>
      prng.nextUint64().toString(16).padStart(16, "0"),
    ),
    [
      "8ad424df622c9831",
      "72a050c91feb4600",
      "36452d7fedb51a5d",
      "4301f444aa6f07f7",
    ],
  );
});

test("VisualScore is portable and rejects target-bound or unknown fields", () => {
  const artifact = generation.createVisualScore({
    seed: "portable",
    constraints: porchlight,
    overrides: { topology: "circle", temporalDensity: "section" },
  });
  const serialized = artifact.canonicalJson;
  assert.equal(serialized.includes("fingerprint"), false);
  assert.equal(serialized.includes("duration"), false);
  assert.equal(serialized.includes("sections"), false);
  assert.equal(artifact.address, generation.addressVisualScore(artifact.score));

  const invalid = { ...artifact.score, audioFingerprint: "not-allowed" };
  const result = generation.parseVisualScore(invalid);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((item) => item.code === "UNKNOWN_FIELD"));
});

test("the same score binds to multiple tracks without changing address", () => {
  const artifact = generation.createVisualScore({
    seed: "same-score",
    constraints: porchlight,
    overrides: { topology: "circle", temporalDensity: "section" },
  });
  const first = generation.resolve(sectional, artifact.score, porchlight, profile);
  const second = generation.resolve(sparse, artifact.score, porchlight, profile);
  assert.equal(first.scoreAddress, artifact.address);
  assert.equal(second.scoreAddress, artifact.address);
  assert.notEqual(first.analysisHash, second.analysisHash);
  assert.notEqual(first.timelineHash, second.timelineHash);
});

test("27 golden score/timeline cases remain exact", () => {
  const golden = readJson("fixtures/golden-v05.json");
  const loadedProfile = readJson(`profiles/${golden.profile}`);
  for (const fixture of golden.cases) {
    const constraints = readJson(`constraints/${fixture.constraint}`);
    const analysis = readJson(`fixtures/analysis/${fixture.analysis}`);
    const artifact = generation.createVisualScore({
      seed: fixture.seed,
      constraints,
    });
    const timeline = generation.resolve(
      analysis,
      artifact.score,
      constraints,
      loadedProfile,
    );
    assert.equal(artifact.address, fixture.scoreAddress);
    assert.equal(timeline.timelineHash, fixture.timelineHash);
    assert.equal(artifact.score.topology, fixture.topology);
    assert.equal(timeline.patches.length, fixture.patchCount);
  }
});

test("resolver obeys legal boundaries, budgets, and frozen topology", () => {
  const artifact = generation.createVisualScore({
    seed: "resolver-law",
    constraints: wireOrchard,
    overrides: {
      topology: "mirrored-ring",
      temporalDensity: "transient",
    },
  });
  const timeline = generation.resolve(
    sectional,
    artifact.score,
    wireOrchard,
    profile,
  );
  const transientTicks = new Set(
    sectional.transients.map((item) => Math.round(item.atSeconds * profile.timebase)),
  );
  assert.equal(timeline.baseState.topology, "mirrored-ring");
  assert.ok(timeline.patches.every((patch) => patch.axis !== "topology"));
  assert.ok(timeline.patches.every((patch) => patch.boundary === "transient"));
  assert.ok(timeline.patches.every((patch) => transientTicks.has(patch.atTick)));
  assert.ok(timeline.accounting.patchCount <= wireOrchard.patchPolicy.maxPatches);
  assert.ok(timeline.accounting.entropySpent <= wireOrchard.patchPolicy.entropyBudget);
  for (const patch of timeline.patches) {
    assert.equal(
      wireOrchard.patchPolicy.axes[patch.axis].boundaries.includes(patch.boundary),
      true,
    );
  }
});

test("canonical tick patches are independent of preview/export FPS", () => {
  const artifact = generation.createVisualScore({
    seed: "fps-independent",
    constraints: wireOrchard,
    overrides: { topology: "circle", temporalDensity: "phrase" },
  });
  const thirty = generation.resolve(
    sectional,
    artifact.score,
    wireOrchard,
    profile,
  );
  const sixtyProfile = structuredClone(profile);
  sixtyProfile.canvas.fps = 60;
  sixtyProfile.id = "toaster-raster-1-60fps";
  const sixty = generation.resolve(
    sectional,
    artifact.score,
    wireOrchard,
    sixtyProfile,
  );
  assert.deepEqual(thirty.baseState, sixty.baseState);
  assert.deepEqual(thirty.patches, sixty.patches);
  assert.equal(thirty.durationTicks, sixty.durationTicks);
  assert.notEqual(thirty.rendererProfileHash, sixty.rendererProfileHash);
  assert.notEqual(thirty.timelineHash, sixty.timelineHash);
});


test("pure generation core contains no ambient entropy or I/O", () => {
  const directory = path.join(root, "src", "generation");
  const files = fs
    .readdirSync(directory)
    .filter((name) => name.endsWith(".cjs"));
  for (const file of files) {
    const source = fs.readFileSync(path.join(directory, file), "utf8");
    for (const forbidden of [
      "Math.random(",
      "Date.now(",
      "new Date(",
      "process.env",
      'require("node:fs")',
      'require("node:http")',
      'require("node:https")',
      "fetch(",
    ]) {
      assert.equal(source.includes(forbidden), false, `${file} contains ${forbidden}`);
    }
  }
});
