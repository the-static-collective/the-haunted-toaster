const crypto = require("node:crypto");

const VIDEO_PHRASE_PLAN_SCHEMA = "haunted-toaster/video-phrase-plan/v1";
const VIDEO_PHRASE_PLAN_POLICY = "toaster-spectrum/v1";

const DIGEST_OPERATORS = Object.freeze([
  "clip-luma-texture-v1",
  "clip-luma-mask-v1",
  "clip-motion-mask-v1",
]);
const TRAVERSALS = Object.freeze(["forward", "reverse", "ping-pong"]);

function requiredString(value, label) {
  const text = String(value || "").trim();
  if (!text) throw new TypeError(`${label} must be a non-empty string.`);
  return text;
}

function positiveFinite(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new TypeError(`${label} must be finite and > 0.`);
  }
  return number;
}

function positiveSafeInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new TypeError(`${label} must be a positive safe integer.`);
  }
  return number;
}

function digestHex(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function unitFromHex(hex, offset = 0) {
  const slice = hex.slice(offset, offset + 13).padEnd(13, "0");
  return Number.parseInt(slice, 16) / 0xfffffffffffff;
}

function canonicalInputs({ videoBinding, timeline, seed }) {
  if (!videoBinding || typeof videoBinding !== "object" || Array.isArray(videoBinding)) {
    throw new TypeError("VideoPhrasePlan requires an admitted Video binding.");
  }
  if (!timeline || typeof timeline !== "object" || Array.isArray(timeline)) {
    throw new TypeError("VideoPhrasePlan requires a resolved timeline.");
  }

  const source = {
    specimenId: requiredString(videoBinding.specimenId, "Video specimenId"),
    sourceSha256: requiredString(videoBinding.sourceSha256, "Video sourceSha256").toLowerCase(),
    byteLength: positiveSafeInteger(videoBinding.byteLength, "Video byteLength"),
    durationSeconds: positiveFinite(videoBinding.probe?.durationSeconds, "Video durationSeconds"),
  };
  const normalizedTimeline = {
    durationTicks: positiveSafeInteger(timeline.durationTicks, "Timeline durationTicks"),
    timebase: positiveSafeInteger(timeline.timebase, "Timeline timebase"),
  };
  const normalizedSeed = requiredString(seed, "Video phrase seed");
  return { source, timeline: normalizedTimeline, seed: normalizedSeed };
}

function createVideoPhrasePlan(input = {}) {
  const normalized = canonicalInputs(input);
  const seedMaterial = JSON.stringify({
    domain: "HauntedToaster-VideoPhrasePlan-v1",
    source: normalized.source,
    timeline: normalized.timeline,
    seed: normalized.seed,
  });
  const seedHash = digestHex(seedMaterial);
  const spectrum = Number(unitFromHex(seedHash, 0).toFixed(6));
  const traversal = TRAVERSALS[Number.parseInt(seedHash.slice(13, 15), 16) % TRAVERSALS.length];
  const operatorId = DIGEST_OPERATORS[Number.parseInt(seedHash.slice(15, 17), 16) % DIGEST_OPERATORS.length];

  const phrases = [{
    phraseId: "phrase-1",
    startTick: 0,
    endTick: normalized.timeline.durationTicks,
    sourceWindow: {
      startSeconds: 0,
      endSeconds: normalized.source.durationSeconds,
    },
    traversal,
    cycles: 1,
    playbackRate: 1,
    digestion: [{ operatorId, weight: 1 }],
    transforms: {
      mirrorX: false,
      mirrorY: false,
      rotationDegrees: 0,
      crop: null,
      zoom: 1,
      opacity: 1,
    },
    release: "native",
  }];

  const payload = {
    schema: VIDEO_PHRASE_PLAN_SCHEMA,
    policyVersion: VIDEO_PHRASE_PLAN_POLICY,
    source: normalized.source,
    timeline: normalized.timeline,
    spectrum,
    phrases,
  };
  const planHash = digestHex(JSON.stringify(payload));
  return Object.freeze({ ...payload, planHash });
}

module.exports = {
  VIDEO_PHRASE_PLAN_POLICY,
  VIDEO_PHRASE_PLAN_SCHEMA,
  createVideoPhrasePlan,
};
