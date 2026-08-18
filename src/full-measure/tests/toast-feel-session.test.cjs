const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { createCandidateSession } = require("../src/candidate-session.cjs");
const { listToastFeels } = require("../src/toast-feels.cjs");

const root = path.resolve(__dirname, "..");

function sessionFixture(dependencies = {}) {
  const previewFamilies = [];
  const session = createCandidateSession({
    async renderCandidateFamilyPreviews(_config, family) {
      previewFamilies.push(family);
      return { familyHash: family.familyHash, candidates: family.candidates.map(({ index }) => ({ index })) };
    },
    ...dependencies,
  });
  session.noteAudio("/tmp/toast-song.wav", {
    audio: { codec: "pcm_s16le" },
    duration: 12,
    sections: [
      { start: 0, end: 6, energy: 0.25, label: "verse" },
      { start: 6, end: 12, energy: 0.8, label: "chorus" },
    ],
  });
  return { session, previewFamilies };
}

test("candidate session binds exact Toast Feel identity through accepted execution", async () => {
  const { session } = sessionFixture();
  const view = await session.generate({
    presetId: "openField",
    toastFeelId: "wire-heat",
    rootSeed: "session-toast",
    lyrics: "",
  });
  session.select({ familyHash: view.familyHash, index: 0 });

  const matching = session.executionForRender({
    audioPath: "/tmp/toast-song.wav",
    imagePath: null,
    presetId: "openField",
    toastFeelId: "wire-heat",
  });
  const mismatch = session.executionForRender({
    audioPath: "/tmp/toast-song.wav",
    imagePath: null,
    presetId: "openField",
    toastFeelId: "ash-bloom",
  });

  assert.equal(matching.toastFeel.id, "wire-heat");
  assert.equal(matching.toastFeel.contractVersion, "toast-feel-v2");
  assert.equal(mismatch, null);
  matching.toastFeel.name = "Nope";
  assert.equal(session.executionForRender({
    audioPath: "/tmp/toast-song.wav",
    imagePath: null,
    presetId: "openField",
    toastFeelId: "wire-heat",
  }).toastFeel.name, "Wire Heat");
});

test("candidate session caches NativeChromaticProfile per admitted image identity", async () => {
  const calls = [];
  const profileFor = (imagePath) => ({
    sourceSha256: imagePath.includes("second") ? "6".repeat(64) : "5".repeat(64),
    profileSha256: imagePath.includes("second") ? "8".repeat(64) : "7".repeat(64),
    hueCentroidDegrees: 32,
    saturationMean: 0.74,
    chromaWeight: 0.8,
  });
  const { session, previewFamilies } = sessionFixture({
    async analyzeNativeChromaticProfile(imagePath) {
      calls.push(imagePath);
      return profileFor(imagePath);
    },
  });
  session.noteImage("/tmp/first-image.png");
  const config = { presetId: "openField", toastFeelId: "wire-heat", rootSeed: "native-session", lyrics: "" };
  await session.generate(config);
  await session.generate({ ...config, rootSeed: "native-session-two" });
  assert.equal(calls.length, 1);
  assert.ok(previewFamilies.at(-1).candidates.every(({ timeline }) => timeline.nativeColor));

  session.noteImage("/tmp/second-image.png");
  await session.generate({ ...config, rootSeed: "native-session-three" });
  assert.equal(calls.length, 2);
  assert.equal(previewFamilies.at(-1).nativeColor.profileSha256, "8".repeat(64));
});

test("candidate session never analyzes or invents Native Color without an image", async () => {
  let calls = 0;
  const { session, previewFamilies } = sessionFixture({
    async analyzeNativeChromaticProfile() {
      calls += 1;
      throw new Error("should not analyze");
    },
  });
  await session.generate({
    presetId: "openField",
    toastFeelId: "wire-heat",
    rootSeed: "no-image-native-session",
    lyrics: "",
  });
  assert.equal(calls, 0);
  assert.equal(previewFamilies.at(-1).nativeColor, undefined);
});

test("candidate session rejects missing and unknown Toast Feel ids", async () => {
  const { session } = sessionFixture();
  await assert.rejects(() => session.generate({
    presetId: "openField",
    rootSeed: "missing-toast",
  }), /Unknown Toast Feel/);
  await assert.rejects(() => session.generate({
    presetId: "openField",
    toastFeelId: "hot-garbage",
    rootSeed: "unknown-toast",
  }), /Unknown Toast Feel/);
});

test("main and preload expose the canonical manifest through one sandbox channel", () => {
  const main = fs.readFileSync(path.join(root, "src", "main.cjs"), "utf8");
  const preload = fs.readFileSync(path.join(root, "src", "preload.cjs"), "utf8");
  assert.match(main, /ipcMain\.handle\("app:toast-feels", \(\) => listToastFeels\(\)\)/);
  assert.match(preload, /getToastFeels:\s*\(\)\s*=>\s*ipcRenderer\.invoke\("app:toast-feels"\)/);

  const first = listToastFeels();
  first[0].name = "Nope";
  assert.equal(listToastFeels()[0].name, "Low & Slow");
});
