const OUTPUT_PROFILES = Object.freeze({
  master: Object.freeze({
    id: "master",
    label: "Master",
    container: "mp4",
    video: Object.freeze({
      encoder: "libx264",
      codec: "h264",
      preset: "medium",
      crf: 19,
      profile: "high",
      level: "4.2",
      pixelFormat: "yuv420p",
    }),
    audio: Object.freeze({
      mode: "preserve-portable-source",
      codec: "source-or-aac",
      bitrate: "320k",
    }),
    movflags: "+faststart",
  }),
  delivery: Object.freeze({
    id: "delivery",
    label: "Delivery 1080p30",
    container: "mp4",
    video: Object.freeze({
      encoder: "libx264",
      codec: "h264",
      preset: "medium",
      crf: 23,
      profile: "high",
      level: "4.2",
      pixelFormat: "yuv420p",
    }),
    audio: Object.freeze({
      mode: "aac-encode",
      codec: "aac",
      bitrate: "320k",
    }),
    movflags: "+faststart",
  }),
  efficient: Object.freeze({
    id: "efficient",
    label: "Efficient HEVC 1080p30",
    container: "mp4",
    video: Object.freeze({
      encoder: "libx265",
      codec: "hevc",
      preset: "medium",
      crf: 25,
      profile: null,
      level: null,
      pixelFormat: "yuv420p",
      codecTag: "hvc1",
    }),
    audio: Object.freeze({
      mode: "aac-encode",
      codec: "aac",
      bitrate: "320k",
    }),
    movflags: "+faststart",
  }),
});

function getOutputProfile(profileId = "delivery") {
  const normalized = String(profileId || "delivery").trim().toLowerCase();
  const profile = OUTPUT_PROFILES[normalized];
  if (!profile) {
    throw new Error(`Unknown output profile: ${profileId}. Expected master, delivery, or efficient.`);
  }
  return profile;
}

function resolveProfileAudioPlan(profile, sourceAudioPlan) {
  if (profile.audio.mode === "aac-encode") {
    return {
      mode: "delivery-aac-encode",
      codec: "aac",
      statement: `Encoded to AAC ${profile.audio.bitrate} for portable delivery.`,
      ffmpegArgs: ["-c:a", "aac", "-b:a", profile.audio.bitrate],
    };
  }
  return sourceAudioPlan;
}

function videoEncodingArgs(profile) {
  const args = [
    "-c:v", profile.video.encoder,
    "-preset", profile.video.preset,
    "-crf", String(profile.video.crf),
  ];
  if (profile.video.profile) args.push("-profile:v", profile.video.profile);
  if (profile.video.level) args.push("-level", profile.video.level);
  args.push("-pix_fmt", profile.video.pixelFormat);
  if (profile.video.codecTag) args.push("-tag:v", profile.video.codecTag);
  return args;
}

function transportReceipt(profile, audioPlan) {
  return {
    profileId: profile.id,
    container: profile.container,
    video: {
      codec: profile.video.codec,
      encoder: profile.video.encoder,
      preset: profile.video.preset,
      crf: profile.video.crf,
      profile: profile.video.profile,
      level: profile.video.level,
      pixelFormat: profile.video.pixelFormat,
      codecTag: profile.video.codecTag || null,
    },
    audio: {
      mode: audioPlan.mode,
      codec: audioPlan.codec,
      bitrate: profile.audio.mode === "aac-encode" ? profile.audio.bitrate : null,
    },
    movflags: profile.movflags,
  };
}

module.exports = {
  OUTPUT_PROFILES,
  getOutputProfile,
  resolveProfileAudioPlan,
  videoEncodingArgs,
  transportReceipt,
};
