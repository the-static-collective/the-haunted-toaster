const test = require("node:test");
const assert = require("node:assert/strict");
const { getOutputProfile, resolveProfileAudioPlan, transportReceipt } = require("../src/render/output-profiles.cjs");

test("delivery is the portable default and remains downstream transport", () => {
  const profile = getOutputProfile();
  assert.equal(profile.id, "delivery");
  assert.equal(profile.video.encoder, "libx264");
  assert.equal(profile.video.crf, 23);
  assert.equal(profile.video.pixelFormat, "yuv420p");
  assert.equal(profile.movflags, "+faststart");

  const sourcePlan = { mode: "stream-copy", codec: "mp3", statement: "source", ffmpegArgs: ["-c:a", "copy"] };
  const audioPlan = resolveProfileAudioPlan(profile, sourcePlan);
  assert.deepEqual(audioPlan.ffmpegArgs, ["-c:a", "aac", "-b:a", "320k"]);
  assert.deepEqual(transportReceipt(profile, audioPlan), {
    profileId: "delivery",
    container: "mp4",
    video: { codec: "h264", encoder: "libx264", preset: "medium", crf: 23, profile: "high", level: "4.2", pixelFormat: "yuv420p" },
    audio: { mode: "delivery-aac-encode", codec: "aac", bitrate: "320k" },
    movflags: "+faststart",
  });
});

test("efficient is an explicit HEVC experiment without creative authority", () => {
  const profile = getOutputProfile("efficient");
  assert.equal(profile.id, "efficient");
  assert.equal(profile.video.encoder, "libx265");
  assert.equal(profile.video.codec, "hevc");
  assert.equal(profile.video.crf, 25);
  assert.equal(profile.video.preset, "medium");
  assert.equal(profile.video.profile, "main");
  assert.equal(profile.video.level, "4.1");
  assert.equal(profile.video.pixelFormat, "yuv420p");

  const audioPlan = resolveProfileAudioPlan(profile, { mode: "stream-copy", codec: "aac", statement: "source", ffmpegArgs: ["-c:a", "copy"] });
  assert.equal(transportReceipt(profile, audioPlan).video.codec, "hevc");
});

test("master preserves the proven CRF-19-ish path", () => {
  const profile = getOutputProfile("master");
  assert.equal(profile.video.crf, 19);
  assert.equal(profile.video.preset, "medium");
  const sourcePlan = { mode: "stream-copy", codec: "aac", statement: "Original portable stream copied without recompression.", ffmpegArgs: ["-c:a", "copy"] };
  assert.equal(resolveProfileAudioPlan(profile, sourcePlan), sourcePlan);
});

test("unknown output profiles refuse instead of silently changing transport", () => {
  assert.throws(() => getOutputProfile("tiny-mystery"), /Expected master, delivery, or efficient/);
});
