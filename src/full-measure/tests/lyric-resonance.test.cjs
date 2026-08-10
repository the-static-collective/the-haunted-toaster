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

test("canonically timed smoke lyric creates a smoke resonance event", () => {
  const score = generation.createVisualScore({
    seed: "lyric-resonance-red",
    constraints: porchlight,
    overrides: {
      atmosphere: "none",
      topology: "circle",
      temporalDensity: "section",
    },
  });
  const track = createLyricTrack(
    "[00:03.00]nothing left but smoke",
    sectional.durationSeconds,
  );
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
