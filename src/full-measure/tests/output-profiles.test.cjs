const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getOutputProfile,
  resolveProfileAudioPlan,
  videoEncodingArgs,
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
  assert.deepEqual(audioPlan.ffmpegArgs, ["-c:a", "aac", "-b:a", "320k"]);
  assert.deepEqual(videoEncodingArgs(profile), [
    "-c:v", "libx264", "-preset", "medium", "-crf", "23",
    "-profile:v", "high", "-level", "4.2", "-pix_fmt", "yuv420p",
  ]);

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
      codecTag: null,
    },
    audio: {
      mode: "delivery-aac-encode",
      codec: "aac",
      bitrate: "320k",
    },
    movflags: "+faststart",
  });
});

test("efficient is an explicit HEVC experiment without creative authority", () => {
  const profile = getOutputProfile("efficient");
  assert.equal(profile.video.encoder, "libx265");
  assert.equal(profile.video.codec, "hevc");
  assert.equal(profile.video.crf, 25);
  assert.equal(profile.video.pixelFormat, "yuv420p");
  assert.equal(profile.video.codecTag, "hvc1");
  assert.equal(profile.video.profile, null);
  assert.equal(profile.video.level, null);
  assert.deepEqual(videoEncodingArgs(profile), [
    "-c:v", "libx265", "-preset", "medium", "-crf", "25",
    "-pix_fmt", "yuv420p", "-tag:v", "hvc1",
  ]);
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
  assert.throws(() => getOutputProfile("tiny-mystery"), /Expected master, delivery, or efficient/);
});
