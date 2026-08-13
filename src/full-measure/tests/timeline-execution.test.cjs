const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const generation = require("../src/generation/index.cjs");
const execution = require("../src/render/timeline-execution.cjs");
const { createLyricTrack } = require("../src/render/lyrics.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const constraints = readJson("constraints/wire-orchard.v1.json");
const profile = readJson("profiles/toaster-raster-1.json");
const analysis = readJson("fixtures/analysis/sectional.v1.json");
const openField = readJson("constraints/open-field.v1.json");
const expressiveProfile = readJson("profiles/toaster-raster-3.json");

function resolvedNativeColorFixture() {
  const artifact = generation.createVisualScore({ seed: "native-color-execution", constraints: openField });
  const timeline = generation.resolve(analysis, artifact.score, openField, expressiveProfile);
  return generation.resolveNativeColorPlan(timeline, {
    analysis,
    relationship: "counterpoint",
    profile: {
      sourceSha256: "1".repeat(64),
      profileSha256: "2".repeat(64),
      hueCentroidDegrees: 32,
      saturationMean: 0.75,
      chromaWeight: 0.8,
    },
  });
}

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

function resolvedResonanceFixture() {
  const artifact = generation.createVisualScore({
    seed: "lyric-resonance-validation",
    constraints,
    overrides: {
      atmosphere: "none",
      topology: "mirrored-ring",
      temporalDensity: "transient",
    },
  });
  const lyrics = createLyricTrack(
    "[00:03.00]smoke\n[00:12.00]rain",
    analysis.durationSeconds,
  );
  return generation.resolve(analysis, artifact.score, constraints, profile, lyrics);
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

test("valid lyric resonance evidence is accepted as canonical timeline evidence", () => {
  const timeline = resolvedResonanceFixture();
  assert.equal(timeline.lyricResonance.events.length, 2);
  assert.equal(execution.assertResolvedTimeline(timeline), timeline);
});

test("lyric resonance validation fails closed on malformed semantic evidence", () => {
  const timeline = resolvedResonanceFixture();
  const cases = [
    {
      pattern: /Lyric Resonance schema/,
      mutate(value) {
        value.lyricResonance.schema = "wrong";
      },
    },
    {
      pattern: /Lyric Resonance policy/,
      mutate(value) {
        value.lyricResonance.policy = "wrong";
      },
    },
    {
      pattern: /Unsupported Lyric Resonance family/,
      mutate(value) {
        value.lyricResonance.events[0].family = "volcano";
      },
    },
    {
      pattern: /canonical tick window/,
      mutate(value) {
        value.lyricResonance.events[0].endTick = value.lyricResonance.events[0].startTick;
      },
    },
    {
      pattern: /exceeds durationTicks/,
      mutate(value) {
        value.lyricResonance.events[0].endTick = value.durationTicks + 1;
      },
    },
    {
      pattern: /intensity/,
      mutate(value) {
        value.lyricResonance.events[0].intensity = 1.2;
      },
    },
    {
      pattern: /cueIndices/,
      mutate(value) {
        value.lyricResonance.events[0].cueIndices = [2, 1];
      },
    },
    {
      pattern: /matchedTerms/,
      mutate(value) {
        value.lyricResonance.events[0].matchedTerms = ["smoke", "smoke"];
      },
    },
    {
      pattern: /ordered by canonical tick/,
      mutate(value) {
        value.lyricResonance.events = [...value.lyricResonance.events].reverse();
      },
    },
  ];

  for (const specimen of cases) {
    const malformed = structuredClone(timeline);
    specimen.mutate(malformed);
    assert.throws(
      () => execution.createTimelineExecution(malformed),
      specimen.pattern,
    );
  }
});

test("Native Color decompression start and end ticks are real execution boundaries", () => {
  const timeline = structuredClone(resolvedNativeColorFixture());
  timeline.patches = [];
  delete timeline.possessionArc;
  const segments = execution.executionSegments(timeline);
  assert.ok(segments.some(({ startTick }) => startTick === 82_000));
  assert.equal(segments.find(({ startTick }) => startTick === 82_000).endTick, 100_000);
});

test("Native Color plan validation fails closed on malformed evidence", () => {
  const timeline = resolvedNativeColorFixture();
  const cases = [
    ["schema", /Native Color schema/, (value) => { value.nativeColor.schema = "wrong"; }],
    ["policy", /Native Color policy/, (value) => { value.nativeColor.policyVersion = "wrong"; }],
    ["relationship", /Native Color relationship/, (value) => { value.nativeColor.relationship = "blend"; }],
    ["hash", /lowercase SHA-256/, (value) => { value.nativeColor.profileSha256 = "A".repeat(64); }],
    ["renderer", /renderer values/, (value) => { value.nativeColor.relationshipState.hueOffset = Infinity; }],
    ["influence", /influence/, (value) => { value.nativeColor.decompressionWindows[0].nativeInfluence = 0.5; }],
    ["boundary", /section boundary/, (value) => { value.nativeColor.decompressionWindows[0].boundary = "phrase"; }],
    ["range", /tick window/, (value) => { value.nativeColor.decompressionWindows[0].endTick = value.durationTicks + 1; }],
    ["order", /at most one|ordered and non-overlapping/, (value) => {
      const first = value.nativeColor.decompressionWindows[0];
      value.nativeColor.decompressionWindows = [first, { ...first, startTick: first.startTick + 1 }];
      value.nativeColor.windowCount = 2;
    }],
  ];
  for (const [, pattern, mutate] of cases) {
    const malformed = structuredClone(timeline);
    mutate(malformed);
    assert.throws(() => execution.createTimelineExecution(malformed), pattern);
  }
});
