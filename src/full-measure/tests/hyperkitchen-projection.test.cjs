const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { canonicalStringify } = require("../src/generation/canonical.cjs");
const { loadCatalog, emptyCatalog, saveCatalog, upsertSpecimen } =
  require("../src/video-pantry/catalog.cjs");
const { videoPantryCatalogPath } = require("../src/toaster-home.cjs");
const {
  buildKitchenSpecimen,
  compileHyperFramesProjection,
  renderHyperFramesHtml,
} = require("../src/hyperfood/hyperkitchen-hyperframes.cjs");
const { assertSource } = require("../src/hyperfood/hyperkitchen-local-render.cjs");

const sourceSha256 = crypto.createHash("sha256").update("blender-pantry-clip").digest("hex");
const specimenId = "sha256:" + sourceSha256 + ":19";
const source = () => buildKitchenSpecimen({ sourceSha256, byteLength: 19 });

function projection(input = source()) {
  return compileHyperFramesProjection({ spec: input.spec, sourceSpecimenId: specimenId });
}

test("HyperKitchen preserves the existing HyperFood FRAME-EAT-FRAME → PULSE identity", () => {
  const first = source();
  const second = source();
  assert.equal(first.specimenId, second.specimenId);
  assert.match(first.specimenId, /^hf0_[a-f0-9]{64}$/);
  assert.deepEqual(first.spec.graph.lineage, [
    "FRAME-EAT-FRAME@0.1.0", "PULSE@0.1.0",
  ]);
  assert.equal(first.spec.graph.output, "pulse.surface");
  assert.equal(first.spec.assets[0].sha256, sourceSha256);
  assert.equal(projection(first).specimenId, first.specimenId);
  assert.equal(projection(first).sourceSpecimenId, specimenId);
});

test("fixed absolute-time traces are deterministic and independent from renderer-only provenance", () => {
  const a = projection();
  const b = projection();
  const c = compileHyperFramesProjection({
    spec: source().spec,
    sourceSpecimenId: specimenId,
    exchangeManifestSha256: "a".repeat(64),
  });
  assert.equal(a.frameBudget, 24);
  assert.equal(a.traceSha256, b.traceSha256);
  assert.equal(a.projectionId, b.projectionId);
  assert.equal(c.traceSha256, a.traceSha256);
  assert.notEqual(c.projectionId, a.projectionId);
  assert.equal(c.specimenId, a.specimenId);
  assert.deepEqual(a.frames.map((x) => x.index), Array.from({ length: 24 }, (_, i) => i));
  assert.ok(a.frames[0].frameEatFrame.levels.length < a.frames[20].frameEatFrame.levels.length);
  assert.ok(a.frames.some((x) => x.pulse.envelope > 0));
});

test("mutating the named organism parameters produces an attributable new specimen and trace", () => {
  const parent = source();
  const child = buildKitchenSpecimen({
    sourceSha256, byteLength: 19,
    pulseParameters: {
      ...parent.spec.graph.nodes.find((x) => x.op === "PULSE").parameters,
      scaleAmount: 0.22,
    },
  });
  assert.notEqual(child.specimenId, parent.specimenId);
  assert.notEqual(projection(child).traceSha256, projection(parent).traceSha256);
  assert.notEqual(projection(child).projectionId, projection(parent).projectionId);
});

test("missing source, unsupported graph, excess frame depth and temporal budget fail closed", () => {
  assert.throws(() => compileHyperFramesProjection({
    spec: source().spec, sourceSpecimenId: "sha256:" + "f".repeat(64) + ":19",
  }), /source specimen differs/i);
  const tooDeep = buildKitchenSpecimen({
    sourceSha256, byteLength: 19,
    frameParameters: {
      ...source().spec.graph.nodes.find((x) => x.op === "FRAME-EAT-FRAME").parameters,
      depth: 9,
    },
  });
  assert.throws(() => projection(tooDeep), /eight finite/i);
  assert.throws(() => buildKitchenSpecimen({
    sourceSha256, byteLength: 19, durationMs: 6000,
  }), /250–4000/);
  assert.throws(() => buildKitchenSpecimen({
    sourceSha256, byteLength: 19,
    events: [{ tMs: 1500, strength: 1 }],
  }), /exceeds duration/i);
  const forged = structuredClone(source().spec);
  forged.graph.edges = [];
  assert.throws(() => compileHyperFramesProjection({
    spec: forged, sourceSpecimenId: specimenId,
  }), /requires exactly one|input/i);
});

test("HyperFrames-compatible source has pinned finite dimensions, time, asset IDs and no ambient randomness", () => {
  const a = renderHyperFramesHtml(projection());
  const b = renderHyperFramesHtml(projection());
  assert.equal(a, b);
  assert.match(a, /data-composition-id="hk1_[a-f0-9]{64}"/);
  assert.match(a, /data-width="320"/);
  assert.match(a, /data-duration="1"/);
  assert.match(a, /__timelines/);
  assert.match(a, /__hyperkitchen/);
  assert.match(a, /assets\/frame-0000.png/);
  assert.doesNotMatch(a, /Math\.random|Date\.now|requestAnimationFrame/);
});

test("input path and content must already be admitted in the existing VSPantry", async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "hyperkitchen-refusal-"));
  const videoPath = path.join(home, "test.mp4");
  await fs.writeFile(videoPath, "blender-pantry-clip");
  await assert.rejects(assertSource({ rootDir: home, videoPath }), /admitted in the existing VSPantry/i);
  const catalogue = videoPantryCatalogPath(home);
  let entry = emptyCatalog();
  const sha = crypto.createHash("sha256").update("blender-pantry-clip").digest("hex");
  const observedId = "sha256:" + sha + ":" + Buffer.byteLength("blender-pantry-clip");
  ({ catalog: entry } = upsertSpecimen(entry, {
    specimenId: observedId,
    sourceSha256: sha, byteLength: Buffer.byteLength("blender-pantry-clip"),
    paths: [videoPath], probe: { hasAudio: false, durationSeconds: 4 },
  }));
  await saveCatalog(catalogue, entry);
  assert.equal((await assertSource({ rootDir: home, videoPath })).specimenId, observedId);
  await fs.writeFile(videoPath, "tampered");
  await assert.rejects(assertSource({ rootDir: home, videoPath }), /admitted in the existing VSPantry/i);
});
