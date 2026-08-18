const crypto = require("node:crypto");
const {
  VIDEO_SOURCE_SCHEMA,
  canonicalSpecimenId,
  normalizeSha256,
} = require("./schema.cjs");

const FRAME_RESERVOIR_SCHEMA = "haunted-toaster/frame-reservoir/v1";
const FRAME_RESERVOIR_POLICY_VERSION = "frame-reservoir-v1";
const FRAME_MOTION_AFFORDANCE_VOCABULARY_VERSION = "frame-motion-affordances-v1";
const MAX_REPRESENTATIVE_FRAMES = 24;

const FRAME_MOTION_AFFORDANCES = Object.freeze([
  Object.freeze({ id: "ken-burns-punch-v1", family: "crop-motion" }),
  Object.freeze({ id: "ken-burns-traverse-v1", family: "crop-motion" }),
  Object.freeze({ id: "mirror-x-v1", family: "reflection" }),
  Object.freeze({ id: "mirror-y-v1", family: "reflection" }),
  Object.freeze({ id: "rotate-quarter-v1", family: "rotation" }),
  Object.freeze({ id: "rotate-half-v1", family: "rotation" }),
  Object.freeze({ id: "quadrant-mirror-v1", family: "reflection" }),
  Object.freeze({ id: "nested-crop-v1", family: "crop-motion" }),
  Object.freeze({ id: "tunnel-fold-v1", family: "fold" }),
  Object.freeze({ id: "radial-echo-v1", family: "echo" }),
]);

const AFFORDANCE_IDS = Object.freeze(FRAME_MOTION_AFFORDANCES.map((item) => item.id));
const AFFORDANCE_ID_SET = new Set(AFFORDANCE_IDS);

function parseFrameRate(value) {
  const text = String(value || "").trim();
  const match = /^(\d+)\/(\d+)$/.exec(text);
  if (!match) throw new TypeError("A positive rational video frame rate is required.");
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (
    !Number.isSafeInteger(numerator)
    || !Number.isSafeInteger(denominator)
    || numerator <= 0
    || denominator <= 0
  ) {
    throw new TypeError("A positive rational video frame rate is required.");
  }
  return { text, numerator, denominator };
}

function inspectVideoBinding(binding) {
  if (!binding || typeof binding !== "object" || binding.schema !== VIDEO_SOURCE_SCHEMA) {
    throw new TypeError(`Frame Reservoir requires a canonical ${VIDEO_SOURCE_SCHEMA} video source binding.`);
  }
  if (!binding.probe || typeof binding.probe !== "object") {
    throw new TypeError("Frame Reservoir requires admitted video probe evidence.");
  }
  const specimenId = String(binding.specimenId || "").trim();
  if (!specimenId) throw new TypeError("Frame Reservoir requires a stable video specimen identity.");
  const sourceSha256 = normalizeSha256(binding.sourceSha256);
  const expectedSpecimenId = canonicalSpecimenId({
    sha256: sourceSha256,
    byteLength: binding.byteLength,
  });
  if (specimenId !== expectedSpecimenId) {
    throw new TypeError("Frame Reservoir video specimen identity must match admitted content identity.");
  }
  const durationSeconds = Number(binding.probe.durationSeconds);
  const width = Number(binding.probe.width);
  const height = Number(binding.probe.height);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new TypeError("Frame Reservoir requires a positive video duration from probe evidence.");
  }
  if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0) {
    throw new TypeError("Frame Reservoir requires positive integer video dimensions from probe evidence.");
  }
  const frameRate = parseFrameRate(binding.probe.frameRate);
  const frameCount = Math.max(
    1,
    Math.floor(((durationSeconds * frameRate.numerator) / frameRate.denominator) + 1e-9),
  );
  if (!Number.isSafeInteger(frameCount) || frameCount <= 0) {
    throw new RangeError("Derived frame count is outside the supported safe-integer range.");
  }
  return {
    specimenId,
    sourceSha256,
    durationSeconds,
    width,
    height,
    frameRate,
    frameCount,
  };
}

function addressInspectedFrame(inspected, ordinal) {
  if (!Number.isSafeInteger(ordinal) || ordinal < 0 || ordinal >= inspected.frameCount) {
    throw new RangeError(`Frame ordinal must be an integer from 0 through ${inspected.frameCount - 1}.`);
  }
  const atMillis = Math.round(
    (ordinal * inspected.frameRate.denominator * 1000) / inspected.frameRate.numerator,
  );
  return {
    frameId: `${inspected.specimenId}#frame:${ordinal}`,
    ordinal,
    atMillis,
  };
}

function addressFrame(binding, ordinal) {
  return addressInspectedFrame(inspectVideoBinding(binding), ordinal);
}

function chooseRepresentativeOrdinals(frameCount, representativeCount) {
  const requested = Number(representativeCount);
  if (!Number.isSafeInteger(requested) || requested <= 0) {
    throw new TypeError("Representative frame count must be a positive safe integer.");
  }
  const count = Math.min(requested, frameCount, MAX_REPRESENTATIVE_FRAMES);
  if (count === 1) return [0];
  const last = frameCount - 1;
  return Array.from({ length: count }, (_, index) => Math.floor((index * last) / (count - 1)));
}

function deriveFrameReservoir(binding, { representativeCount = 9 } = {}) {
  const inspected = inspectVideoBinding(binding);
  const representativeFrames = chooseRepresentativeOrdinals(
    inspected.frameCount,
    representativeCount,
  ).map((ordinal) => addressInspectedFrame(inspected, ordinal));

  return {
    schema: FRAME_RESERVOIR_SCHEMA,
    policyVersion: FRAME_RESERVOIR_POLICY_VERSION,
    specimenId: inspected.specimenId,
    sourceSha256: inspected.sourceSha256,
    durationSeconds: inspected.durationSeconds,
    width: inspected.width,
    height: inspected.height,
    frameRate: inspected.frameRate.text,
    frameCount: inspected.frameCount,
    frameCountBasis: "duration-times-probed-frame-rate-v1",
    representativeFrames,
    affordanceVocabularyVersion: FRAME_MOTION_AFFORDANCE_VOCABULARY_VERSION,
    affordanceIds: [...AFFORDANCE_IDS],
  };
}

function deriveFrameMotionSeed({ frameId, affordanceId } = {}) {
  const normalizedFrameId = String(frameId || "").trim();
  if (!normalizedFrameId) throw new TypeError("A stable frame identity is required.");
  const normalizedAffordanceId = String(affordanceId || "").trim();
  if (!AFFORDANCE_ID_SET.has(normalizedAffordanceId)) {
    throw new TypeError(`Unknown Frame Motion affordance: ${normalizedAffordanceId || "(missing)"}.`);
  }
  return crypto
    .createHash("sha256")
    .update("haunted-toaster/frame-motion-seed/v1\0", "utf8")
    .update(normalizedFrameId, "utf8")
    .update("\0", "utf8")
    .update(normalizedAffordanceId, "utf8")
    .digest("hex");
}

module.exports = {
  FRAME_MOTION_AFFORDANCES,
  FRAME_MOTION_AFFORDANCE_VOCABULARY_VERSION,
  FRAME_RESERVOIR_POLICY_VERSION,
  FRAME_RESERVOIR_SCHEMA,
  MAX_REPRESENTATIVE_FRAMES,
  addressFrame,
  deriveFrameMotionSeed,
  deriveFrameReservoir,
  parseFrameRate,
};
