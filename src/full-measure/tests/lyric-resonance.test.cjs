const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const generation = require("../src/generation/index.cjs");
const { createLyricTrack } = require("../src/render/lyrics.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const porchlight = readJson("constraints/porchlight.v2.json");
const profile = readJson("profiles/toaster-raster-3.json");
const sectional = readJson("fixtures/analysis/sectional.v1.json");

function scoreFixture(seed = "lyric-resonance-score") {
  return generation.createVisualScore({
    seed,
    constraints: porchlight,
    overrides: {
      atmosphere: "none",
      topology: "circle",
      temporalDensity: "section",
    },
  });
}

function timedTrack(lines) {
  return createLyricTrack(lines.join("\n"), sectional.durationSeconds);
}

test("canonically timed smoke lyric creates a smoke resonance event", () => {
  const score = scoreFixture("lyric-resonance-red");
  const track = timedTrack(["[00:03.00]nothing left but smoke"]);
  assert.equal(track.timed, true);

  const timeline = generation.resolve(
    sectional,
    score.score,
    porchlight,
    profile,
    track,
  );

  assert.equal(
    timeline.lyricResonance.schema,
    "haunted-toaster/lyric-resonance/v1",
  );
  assert.equal(timeline.lyricResonance.events.length, 1);
  assert.equal(timeline.lyricResonance.events[0].family, "smoke");
  assert.equal(timeline.lyricResonance.events[0].startTick, 3000);
  assert.equal(timeline.lyricResonance.events[0].intensity, 1);
});

test("exact atmosphere words resonate more strongly than nearby semantic words", () => {
  const clock = { timebase: 1000, durationTicks: 20_000 };
  const exact = generation.resolveLyricResonance(
    timedTrack(["[00:03.00]smoke"]),
    clock,
  );
  const strong = generation.resolveLyricResonance(
    timedTrack(["[00:03.00]haze"]),
    clock,
  );
  const related = generation.resolveLyricResonance(
    timedTrack(["[00:03.00]ashes"]),
    clock,
  );

  assert.equal(exact.events[0].intensity, 1);
  assert.equal(strong.events[0].family, "smoke");
  assert.equal(strong.events[0].intensity, 0.72);
  assert.equal(related.events[0].intensity, 0.45);
});

test("all four atmosphere families can be summoned by exact timed words", () => {
  const resonance = generation.resolveLyricResonance(
    timedTrack([
      "[00:01.00]smoke",
      "[00:08.00]rain",
      "[00:15.00]dust",
      "[00:22.00]fireflies",
    ]),
    { timebase: 1000, durationTicks: 30_000 },
  );

  assert.deepEqual(
    resonance.events.map((event) => event.family),
    ["smoke", "rain", "dust", "firefly"],
  );
});

test("multiple semantic hits accumulate within one cue but remain bounded", () => {
  const resonance = generation.resolveLyricResonance(
    timedTrack(["[00:03.00]haze and ashes under smoke"]),
    { timebase: 1000, durationTicks: 20_000 },
  );

  assert.equal(resonance.events.length, 1);
  assert.equal(resonance.events[0].intensity, 1);
  assert.deepEqual(resonance.events[0].matchedTerms, ["haze", "ashes", "smoke"]);
});

test("nearby same-family lyric hits coalesce into one sustained invocation", () => {
  const resonance = generation.resolveLyricResonance(
    timedTrack([
      "[00:03.00]smoke",
      "[00:06.00]haze",
      "[00:14.00]smoke",
    ]),
    { timebase: 1000, durationTicks: 25_000 },
  );

  assert.equal(resonance.events.length, 2);
  assert.deepEqual(resonance.events[0].cueIndices, [0, 1]);
  assert.deepEqual(resonance.events[0].matchedTerms, ["smoke", "haze"]);
  assert.equal(resonance.events[0].startTick, 3000);
  assert.equal(resonance.events[0].intensity, 1);
  assert.equal(resonance.events[1].startTick, 14000);
});

test("plain or unrelated lyric text cannot acquire semantic timing authority", () => {
  const plain = createLyricTrack("smoke in the room", sectional.durationSeconds);
  const unrelated = timedTrack(["[00:03.00]telephone moon river"]);
  const clock = { timebase: 1000, durationTicks: 20_000 };

  assert.equal(plain.timed, false);
  assert.equal(generation.resolveLyricResonance(plain, clock), null);
  assert.equal(generation.resolveLyricResonance(unrelated, clock), null);
});

test("lyric resonance changes timeline identity without changing VisualScore identity", () => {
  const score = scoreFixture("lyric-resonance-identity");
  const smoke = generation.resolve(
    sectional,
    score.score,
    porchlight,
    profile,
    timedTrack(["[00:03.00]smoke"]),
  );
  const rain = generation.resolve(
    sectional,
    score.score,
    porchlight,
    profile,
    timedTrack(["[00:03.00]rain"]),
  );

  assert.equal(smoke.scoreAddress, score.address);
  assert.equal(rain.scoreAddress, score.address);
  assert.notEqual(smoke.timelineHash, rain.timelineHash);
});
