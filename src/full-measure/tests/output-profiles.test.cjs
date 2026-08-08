const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getOutputProfile,
  resolveProfileAudioPlan,
  transportReceipt,
} = require("../src/render/output-profiles.cjs");

test("delivery is the portable default and remains downstream transport", () => {
  const profile = getOutputProfile();
  assert.equal(profile.id, "delivery");
  assert.equal(profile.video.encoder, "libx264");
  assert.equal(profile.video.crf, 23);
  assert.equal(profile.video.pixelFormat, "yuv420p");
  assert.equal(profile.movflags, "+faststart");

  const sourcePlan = {
    mode: "stream-copy",
    codec: "mp3",
    statement: "source",
    ffmpegArgs: ["-c:a", "copy"],
  };
  const audioPlan = resolveProfileAudioPlan(profile, sourcePlan);
  assert.deepEqual(audioPlan.ffmpegArgs, ["-c:a", "aac", "-b:a", "192k"]);

  assert.deepEqual(transportReceipt(profile, audioPlan), {
    profileId: "delivery",
    container: "mp4",
    video: {
      codec: "h264",
      encoder: "libx264",
      preset: "medium",
      crf: 23,
      profile: "high",
      level: "4.2",
      pixelFormat: "yuv420p",
    },
    audio: {
      mode: "delivery-aac-encode",
      codec: "aac",
      bitrate: "192k",
    },
    movflags: "+faststart",
  });
});

test("master preserves the proven CRF-19-ish path", () => {
  const profile = getOutputProfile("master");
  assert.equal(profile.video.crf, 19);
  assert.equal(profile.video.preset, "medium");

  const sourcePlan = {
    mode: "stream-copy",
    codec: "aac",
    statement: "Original portable stream copied without recompression.",
    ffmpegArgs: ["-c:a", "copy"],
  };
  assert.equal(resolveProfileAudioPlan(profile, sourcePlan), sourcePlan);
});

test("unknown output profiles refuse instead of silently changing transport", () => {
  assert.throws(() => getOutputProfile("tiny-mystery"), /Expected master or delivery/);
});
