const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const generation = require("../src/generation/index.cjs");
const execution = require("../src/render/timeline-execution.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const constraints = readJson("constraints/wire-orchard.v1.json");
const profile = readJson("profiles/toaster-raster-1.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");

function resolvedFixture() {
  const artifact = generation.createVisualScore({
    seed: "issue-16-slice-a",
    constraints,
    overrides: {
      topology: "mirrored-ring",
      temporalDensity: "transient",
    },
  });
  return generation.resolve(analysis, artifact.score, constraints, profile);
}

test("execution adapter consumes the accepted timeline without resolving again", () => {
  const timeline = resolvedFixture();
  const adapter = execution.createTimelineExecution(timeline);

  assert.equal(adapter.timeline, timeline);
  assert.equal(adapter.timelineHash, timeline.timelineHash);
  assert.equal(adapter.scoreAddress, timeline.scoreAddress);
  assert.deepEqual(adapter.stateAtTick(0), generation.stateAtTick(timeline, 0));

  for (const patch of timeline.patches) {
    assert.deepEqual(
      adapter.stateAtTick(patch.atTick),
      generation.stateAtTick(timeline, patch.atTick),
    );
  }
});

test("canonical tick and seconds sampling produce the same semantic state", () => {
  const timeline = resolvedFixture();
  const adapter = execution.createTimelineExecution(timeline);
  const ticks = new Set([0, timeline.durationTicks]);
  for (const patch of timeline.patches) ticks.add(patch.atTick);

  for (const tick of ticks) {
    const seconds = execution.tickToSeconds(timeline, tick);
    assert.deepEqual(adapter.stateAtSeconds(seconds), adapter.stateAtTick(tick));
  }
});

test("execution segments are canonical patch intervals", () => {
  const timeline = resolvedFixture();
  const segments = execution.executionSegments(timeline);

  assert.equal(segments[0].startTick, 0);
  assert.equal(segments.at(-1).endTick, timeline.durationTicks);
  for (let index = 1; index < segments.length; index += 1) {
    assert.equal(segments[index - 1].endTick, segments[index].startTick);
  }
  for (const segment of segments) {
    assert.deepEqual(segment.state, generation.stateAtTick(timeline, segment.startTick));
  }
});

test("duration binding rejects a timeline for the wrong source", () => {
  const timeline = resolvedFixture();
  const duration = timeline.durationTicks / timeline.timebase;
  assert.equal(execution.assertTimelineDuration(timeline, duration), duration);
  assert.throws(
    () => execution.assertTimelineDuration(timeline, duration + 0.25),
    /does not match source duration/,
  );
});

test("sampling never mutates the accepted timeline", () => {
  const timeline = resolvedFixture();
  const before = generation.canonicalStringify(timeline);
  const adapter = execution.createTimelineExecution(timeline);

  adapter.stateAtTick(0);
  for (const segment of adapter.segments) adapter.stateAtTick(segment.startTick);

  assert.equal(generation.canonicalStringify(timeline), before);
});

test("adapter rejects malformed or unordered timeline input", () => {
  const timeline = resolvedFixture();
  assert.throws(() => execution.createTimelineExecution(null), /required/);
  assert.throws(
    () => execution.createTimelineExecution({ ...timeline, schema: "wrong" }),
    /Expected haunted-toaster\/resolved-timeline\/v1/,
  );
  if (timeline.patches.length > 1) {
    const malformed = structuredClone(timeline);
    malformed.patches = [...malformed.patches].reverse();
    assert.throws(
      () => execution.createTimelineExecution(malformed),
      /ordered by canonical tick/,
    );
  }
});
