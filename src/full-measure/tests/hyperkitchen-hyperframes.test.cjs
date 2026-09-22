"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildKitchenSpecimen,
  compileHyperFramesProjection,
  renderHyperFramesHtml,
} = require("../src/hyperfood/hyperkitchen-hyperframes.cjs");

const SHA = "a".repeat(64);
const BYTE_LENGTH = 12345;
const ID = "sha256:" + SHA + ":" + BYTE_LENGTH;

function fixture(overrides = {}) {
  return buildKitchenSpecimen({ sourceSha256: SHA, byteLength: BYTE_LENGTH, ...overrides });
}

function projected(spec, overrides = {}) {
  return compileHyperFramesProjection({ spec, sourceSpecimenId: ID, ...overrides });
}

test("the existing HyperFood graph identity survives deterministic projection and HTML realization", () => {
  const first = fixture();
  const second = fixture();
  const a = projected(first.spec), b = projected(second.spec);
  assert.equal(first.specimenId, second.specimenId);
  assert.equal(a.specimenId, first.specimenId);
  assert.equal(a.projectionId, b.projectionId);
  assert.equal(a.traceSha256, b.traceSha256);
  assert.equal(renderHyperFramesHtml(a), renderHyperFramesHtml(b));
  assert.deepEqual(a.graphLineage, ["FRAME-EAT-FRAME@0.1.0", "PULSE@0.1.0"]);
  assert.equal(a.frameBudget, 24);
  assert.equal(a.frames[12].tMs, 500);
  assert.equal(a.frames[0].pulse.envelope, 0);
  assert.ok(a.frames[2].pulse.envelope > 0);
  assert.ok(a.frames[4].frameEatFrame.levels.length > a.frames[0].frameEatFrame.levels.length);
  assert.equal(a.authority, "projection-only");
  const html = renderHyperFramesHtml(a);
  assert.match(html, /data-composition-id="hk1_[0-9a-f]{64}"/);
  assert.match(html, /window\.__timelines/);
  assert.match(html, /window\.__hyperkitchen/);
  assert.match(html, /gsap\.timeline/);
  assert.match(html, /assets\/frame-0000\.png/);
  assert.doesNotMatch(html, /Date\.now|Math\.random|requestAnimationFrame/);
});

test("one explicit creative parameter changes the specimen and projection without changing the video source", () => {
  const parent = fixture();
  const child = fixture({ pulseParameters: {
    attackMs: 70, holdMs: 30, decayMs: 180, phaseOffsetMs: 0,
    scaleAmount: 0.20, rotationDeg: 2, translateXPx: 3,
    translateYPx: -2, opacityAmount: 0, brightnessAmount: 0.12, blurPx: 0,
  } });
  assert.notEqual(parent.specimenId, child.specimenId);
  assert.notEqual(projected(parent.spec).projectionId, projected(child.spec).projectionId);
  assert.equal(parent.spec.assets[0].sha256, child.spec.assets[0].sha256);
});

test("renderer-only exchange provenance cannot affect the HyperFood specimen identity", () => {
  const living = fixture();
  const a = projected(living.spec);
  const b = projected(living.spec, { exchangeManifestSha256: "b".repeat(64) });
  assert.equal(a.specimenId, b.specimenId);
  assert.notEqual(a.projectionId, b.projectionId);
  assert.equal(a.traceSha256, b.traceSha256);
});

test("wrong source, invalid events, unbounded depth, unknown nodes and cycles refuse", () => {
  const living = fixture();
  assert.throws(() => compileHyperFramesProjection({
    spec: living.spec, sourceSpecimenId: "sha256:" + "f".repeat(64) + ":" + BYTE_LENGTH,
  }), /source specimen differs/i);
  assert.throws(() => fixture({ events: [{ tMs: 2000, strength: 1 }] }), /exceeds duration/);
  assert.throws(() => projected(fixture({ frameParameters: { depth: 9 } }).spec), /allows at most eight/);
  const altered = structuredClone(living.spec);
  altered.graph.nodes.find((n) => n.op === "PULSE").op = "UNSUPPORTED-ORGANISM";
  assert.throws(() => projected(altered), /Unsupported HyperFood organism/);
  const cyclic = structuredClone(living.spec);
  cyclic.graph.edges.push({ from: "pulse.surface", to: "frame-eat-frame.surface" });
  assert.throws(() => projected(cyclic), /cycle|exactly one/i);
});

test("finite frame budget and expected HTML contract enforce exact scope", () => {
  assert.throws(() => fixture({ durationMs: 6000 }), /250.*4000/);
  assert.throws(() => fixture({ fps: 25 }), /24fps/);
  const specimen = fixture();
  const model = projected(specimen.spec);
  assert.throws(() => renderHyperFramesHtml({ ...model, frameBudget: 999 }), /frame trace/);
});
