const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { buildFilterGraph } = require("../src/render/render-legacy.cjs");
const { getPreset } = require("../src/render/presets.cjs");

const root = path.resolve(__dirname, "..");
const mainSource = fs.readFileSync(path.join(root, "src", "main.cjs"), "utf8");

test("unresolved Listener starts cannot become accidental 00:00 LRC cues", () => {
  assert.match(mainSource, /const start = parseClock\(cue\?\.start\);/);
  assert.doesNotMatch(
    mainSource,
    /Number\.isFinite\(Number\(cue\?\.start\)\)/,
  );
});

test("burned-in lyrics honor delayed starts and disappear across long gaps", async (t) => {
  const tempDirectory = await fsPromises.mkdtemp(
    path.join(os.tmpdir(), "toaster-subtitle-boundaries-"),
  );
  t.after(() =>
    fsPromises.rm(tempDirectory, { recursive: true, force: true }),
  );

  await buildFilterGraph({
    tempDirectory,
    analysis: {
      filename: "boundary-song.wav",
      duration: 60,
      sections: [],
    },
    preset: getPreset("openField"),
    title: "Boundary Song",
    artist: "",
    lyrics: [
      "[00:10.00]First line",
      "[00:40.00]Second line",
    ].join("\n"),
    hasImage: false,
    width: 1920,
    height: 1080,
    fps: 30,
  });

  const overlay = await fsPromises.readFile(
    path.join(tempDirectory, "text-overlay.ass"),
    "utf8",
  );
  const lyricEvents = overlay
    .split(/\r?\n/)
    .filter((line) => line.includes(",Lyrics,"));

  assert.equal(lyricEvents.length, 2);
  assert.match(
    lyricEvents[0],
    /^Dialogue: 0,0:00:10\.00,0:00:11\.66,Lyrics,/,
  );
  assert.match(
    lyricEvents[1],
    /^Dialogue: 0,0:00:40\.00,0:00:41\.66,Lyrics,/,
  );
  assert.doesNotMatch(
    lyricEvents.join("\n"),
    /^Dialogue: 0,0:00:00\.00,[^\n]*,Lyrics,/m,
  );
});
