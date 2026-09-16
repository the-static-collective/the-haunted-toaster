const crypto = require("node:crypto");

const VIDEO_PHRASE_PLAN_SCHEMA = "haunted-toaster/video-phrase-plan/v1";
const VIDEO_PHRASE_PLAN_POLICY = "toaster-spectrum/v1";
const MAX_PHRASES = 6;
const MAX_OVERLAPS = 2;
const MAX_CYCLES = 4;
const ROTATIONS = Object.freeze([0, 90, 180, 270]);
const DIGEST_OPERATORS = Object.freeze([
  "clip-luma-texture-v1",
  "clip-luma-mask-v1",
  "clip-motion-mask-v1",
]);
const TRAVERSALS = Object.freeze(["forward", "reverse", "ping-pong"]);
const RELEASES = Object.freeze(["native", "hold"]);
const LEGACY_SAMPLING_POLICIES = Object.freeze([
  "loop-source-clip-v1",
  "play-source-once-v1",
  "stretch-source-clip-v1",
]);

function requiredString(value, label) {
  const text = String(value || "").trim();
  if (!text) throw new TypeError(`${label} must be a non-empty string.`);
  return text;
}

function finite(value, label, { min = -Infinity, max = Infinity } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new TypeError(`${label} must be finite in [${min}, ${max}].`);
  }
  return number;
}

function positiveFinite(value, label) {
  return finite(value, label, { min: Number.EPSILON });
}

function positiveSafeInteger(value, label, { max = Number.MAX_SAFE_INTEGER } = {}) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0 || number > max) {
    throw new TypeError(`${label} must be a positive safe integer <= ${max}.`);
  }
  return number;
}

function nonNegativeSafeInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer.`);
  }
  return number;
}

function oneOf(value, label, allowed) {
  const normalized = String(value || "").trim();
  if (!allowed.includes(normalized)) {
    throw new TypeError(`${label} must be one of: ${allowed.join(", ")}.`);
  }
  return normalized;
}

function digestHex(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function unitFromHex(hex, offset = 0) {
  const slice = hex.slice(offset, offset + 13).padEnd(13, "0");
  return Number.parseInt(slice, 16) / 0xfffffffffffff;
}

function canonicalSource(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("VideoPhrasePlan source must be an object.");
  }
  return {
    specimenId: requiredString(input.specimenId, "Video specimenId"),
    sourceSha256: requiredString(input.sourceSha256, "Video sourceSha256").toLowerCase(),
    byteLength: positiveSafeInteger(input.byteLength, "Video byteLength"),
    durationSeconds: positiveFinite(input.durationSeconds, "Video durationSeconds"),
  };
}

function canonicalTimeline(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("VideoPhrasePlan timeline must be an object.");
  }
  return {
    durationTicks: positiveSafeInteger(input.durationTicks, "Timeline durationTicks"),
    timebase: positiveSafeInteger(input.timebase, "Timeline timebase"),
  };
}

function canonicalInputs({ videoBinding, timeline, seed }) {
  if (!videoBinding || typeof videoBinding !== "object" || Array.isArray(videoBinding)) {
    throw new TypeError("VideoPhrasePlan requires an admitted Video binding.");
  }
  const source = canonicalSource({
    specimenId: videoBinding.specimenId,
    sourceSha256: videoBinding.sourceSha256,
    byteLength: videoBinding.byteLength,
    durationSeconds: videoBinding.probe?.durationSeconds,
  });
  return {
    source,
    timeline: canonicalTimeline(timeline),
    seed: requiredString(seed, "Video phrase seed"),
  };
}

function canonicalDigestion(input, phraseId) {
  if (!Array.isArray(input) || input.length === 0 || input.length > DIGEST_OPERATORS.length) {
    throw new TypeError(`Video phrase ${phraseId} digestion must contain 1..${DIGEST_OPERATORS.length} atoms.`);
  }
  const seen = new Set();
  return input.map((atom) => {
    const operatorId = oneOf(atom?.operatorId, `Video phrase ${phraseId} digestion operator`, DIGEST_OPERATORS);
    if (seen.has(operatorId)) {
      throw new TypeError(`Video phrase ${phraseId} digestion operator is duplicated: ${operatorId}.`);
    }
    seen.add(operatorId);
    return {
      operatorId,
      weight: finite(atom?.weight, `Video phrase ${phraseId} digestion weight`, { min: 0, max: 1 }),
    };
  });
}

function canonicalCrop(input, phraseId) {
  if (input === null || input === undefined) return null;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`Video phrase ${phraseId} crop must be null or an object.`);
  }
  const x = finite(input.x, `Video phrase ${phraseId} crop x`, { min: 0, max: 1 });
  const y = finite(input.y, `Video phrase ${phraseId} crop y`, { min: 0, max: 1 });
  const width = positiveFinite(input.width, `Video phrase ${phraseId} crop width`);
  const height = positiveFinite(input.height, `Video phrase ${phraseId} crop height`);
  if (width > 1 || height > 1 || x + width > 1 || y + height > 1) {
    throw new RangeError(`Video phrase ${phraseId} crop must stay inside the normalized source frame.`);
  }
  return { x, y, width, height };
}

function canonicalTransforms(input, phraseId) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(`Video phrase ${phraseId} transforms must be an object.`);
  }
  const rotationDegrees = Number(input.rotationDegrees);
  if (!ROTATIONS.includes(rotationDegrees)) {
    throw new TypeError(`Video phrase ${phraseId} rotation must be one of: ${ROTATIONS.join(", ")}.`);
  }
  if (typeof input.mirrorX !== "boolean" || typeof input.mirrorY !== "boolean") {
    throw new TypeError(`Video phrase ${phraseId} mirror flags must be boolean.`);
  }
  return {
    mirrorX: input.mirrorX,
    mirrorY: input.mirrorY,
    rotationDegrees,
    crop: canonicalCrop(input.crop, phraseId),
    zoom: finite(input.zoom, `Video phrase ${phraseId} zoom`, { min: 1, max: 4 }),
    opacity: finite(input.opacity, `Video phrase ${phraseId} opacity`, { min: 0, max: 1 }),
  };
}

function canonicalPhrase(input, context) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Video phrases must be objects.");
  }
  const phraseId = requiredString(input.phraseId, "Video phrase id");
  const startTick = nonNegativeSafeInteger(input.startTick, `Video phrase ${phraseId} startTick`);
  const endTick = nonNegativeSafeInteger(input.endTick, `Video phrase ${phraseId} endTick`);
  if (endTick <= startTick || endTick > context.timeline.durationTicks) {
    throw new RangeError(`Video phrase ${phraseId} span must be non-empty and stay inside timeline duration.`);
  }
  const sourceWindow = input.sourceWindow;
  if (!sourceWindow || typeof sourceWindow !== "object" || Array.isArray(sourceWindow)) {
    throw new TypeError(`Video phrase ${phraseId} source window must be an object.`);
  }
  const sourceStart = finite(sourceWindow.startSeconds, `Video phrase ${phraseId} source window start`, { min: 0 });
  const sourceEnd = finite(sourceWindow.endSeconds, `Video phrase ${phraseId} source window end`, { min: 0 });
  if (sourceEnd <= sourceStart || sourceEnd > context.source.durationSeconds) {
    throw new RangeError(`Video phrase ${phraseId} source window must be non-empty and stay inside source duration.`);
  }
  const cycles = positiveSafeInteger(input.cycles, `Video phrase ${phraseId} cycles`, { max: MAX_CYCLES });
  return {
    phraseId,
    startTick,
    endTick,
    sourceWindow: {
      startSeconds: sourceStart,
      endSeconds: sourceEnd,
    },
    traversal: oneOf(input.traversal, `Video phrase ${phraseId} traversal`, TRAVERSALS),
    cycles,
    playbackRate: positiveFinite(input.playbackRate, `Video phrase ${phraseId} playback rate`),
    digestion: canonicalDigestion(input.digestion, phraseId),
    transforms: canonicalTransforms(input.transforms, phraseId),
    release: oneOf(input.release, `Video phrase ${phraseId} release`, RELEASES),
  };
}

function assertOverlapDepth(phrases) {
  const events = [];
  for (const phrase of phrases) {
    events.push({ tick: phrase.startTick, delta: 1 });
    events.push({ tick: phrase.endTick, delta: -1 });
  }
  events.sort((a, b) => a.tick - b.tick || a.delta - b.delta);
  let depth = 0;
  for (const event of events) {
    depth += event.delta;
    if (depth > MAX_OVERLAPS) {
      throw new RangeError(`Video phrase overlap depth exceeds ${MAX_OVERLAPS}.`);
    }
  }
}

function canonicalPayload(plan) {
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    throw new TypeError("VideoPhrasePlan must be an object.");
  }
  if (plan.schema !== VIDEO_PHRASE_PLAN_SCHEMA) {
    throw new TypeError(`Expected ${VIDEO_PHRASE_PLAN_SCHEMA}.`);
  }
  if (plan.policyVersion !== VIDEO_PHRASE_PLAN_POLICY) {
    throw new TypeError(`Expected Video phrase policy ${VIDEO_PHRASE_PLAN_POLICY}.`);
  }
  const source = canonicalSource(plan.source);
  const timeline = canonicalTimeline(plan.timeline);
  const spectrum = finite(plan.spectrum, "Video phrase spectrum", { min: 0, max: 1 });
  if (!Array.isArray(plan.phrases) || plan.phrases.length === 0) {
    throw new TypeError("VideoPhrasePlan requires at least one phrase.");
  }
  if (plan.phrases.length > MAX_PHRASES) {
    throw new RangeError(`Video phrase limit is ${MAX_PHRASES}; too many phrases were declared.`);
  }
  const phrases = plan.phrases.map((phrase) => canonicalPhrase(phrase, { source, timeline }));
  const ids = new Set();
  for (const phrase of phrases) {
    if (ids.has(phrase.phraseId)) throw new TypeError(`Duplicate Video phrase id: ${phrase.phraseId}.`);
    ids.add(phrase.phraseId);
  }
  phrases.sort((a, b) => a.startTick - b.startTick || a.endTick - b.endTick || a.phraseId.localeCompare(b.phraseId));
  assertOverlapDepth(phrases);
  return {
    schema: VIDEO_PHRASE_PLAN_SCHEMA,
    policyVersion: VIDEO_PHRASE_PLAN_POLICY,
    source,
    timeline,
    spectrum,
    phrases,
  };
}

function hashVideoPhrasePlan(plan) {
  return digestHex(JSON.stringify(canonicalPayload(plan)));
}

function normalizeVideoPhrasePlan(plan) {
  const payload = canonicalPayload(plan);
  const planHash = digestHex(JSON.stringify(payload));
  if (plan.planHash !== undefined && String(plan.planHash) !== planHash) {
    throw new TypeError("VideoPhrasePlan planHash does not match canonical plan identity.");
  }
  return Object.freeze({ ...payload, planHash });
}

function identityTransforms() {
  return {
    mirrorX: false,
    mirrorY: false,
    rotationDegrees: 0,
    crop: null,
    zoom: 1,
    opacity: 1,
  };
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
  const phraseCount = Math.min(
    MAX_PHRASES,
    2 + Math.floor(spectrum * (MAX_PHRASES - 1)),
  );
  const zooms = [1, 1.1, 1.25, 1.5];
  const phrases = Array.from({ length: phraseCount }, (_, index) => {
    const phraseHash = digestHex(`${seedHash}:phrase:${index}`);
    const cellStart = Math.floor((index * normalized.timeline.durationTicks) / phraseCount);
    const cellEnd = Math.floor(((index + 1) * normalized.timeline.durationTicks) / phraseCount);
    const cellSpan = Math.max(1, cellEnd - cellStart);
    const startTick = index === 0
      ? cellStart
      : Math.min(
          cellEnd - 1,
          cellStart + Math.floor(cellSpan * (0.04 + 0.12 * unitFromHex(phraseHash, 0))),
        );
    const tailTicks = Math.floor(cellSpan * (0.08 + 0.18 * unitFromHex(phraseHash, 13)));
    const endTick = Math.max(startTick + 1, cellEnd - tailTicks);
    const traversal = TRAVERSALS[
      (Number.parseInt(phraseHash.slice(26, 28), 16) + index) % TRAVERSALS.length
    ];
    const digestionCount = 1
      + (Number.parseInt(phraseHash.slice(28, 30), 16) % DIGEST_OPERATORS.length);
    const operatorStart = Number.parseInt(phraseHash.slice(30, 32), 16) % DIGEST_OPERATORS.length;
    const digestion = Array.from({ length: digestionCount }, (_, atomIndex) => ({
      operatorId: DIGEST_OPERATORS[(operatorStart + atomIndex) % DIGEST_OPERATORS.length],
      weight: Number((1 / (atomIndex + 1)).toFixed(3)),
    }));
    const windowFraction = 0.35 + 0.55 * unitFromHex(phraseHash, 39);
    const windowDuration = normalized.source.durationSeconds * windowFraction;
    const sourceStart = (normalized.source.durationSeconds - windowDuration)
      * unitFromHex(phraseHash, 51);

    return {
      phraseId: `phrase-${index + 1}`,
      startTick,
      endTick,
      sourceWindow: {
        startSeconds: sourceStart,
        endSeconds: sourceStart + windowDuration,
      },
      traversal,
      cycles: 1 + (Number.parseInt(phraseHash.slice(40, 42), 16) % MAX_CYCLES),
      playbackRate: Number((0.75 + 0.75 * unitFromHex(phraseHash, 42)).toFixed(3)),
      digestion,
      transforms: {
        mirrorX: Number.parseInt(phraseHash.slice(32, 34), 16) % 3 === 0,
        mirrorY: Number.parseInt(phraseHash.slice(34, 36), 16) % 5 === 0,
        rotationDegrees: ROTATIONS[Number.parseInt(phraseHash.slice(36, 38), 16) % ROTATIONS.length],
        crop: null,
        zoom: zooms[Number.parseInt(phraseHash.slice(38, 40), 16) % zooms.length],
        opacity: Number((0.65 + 0.35 * unitFromHex(phraseHash, 27)).toFixed(3)),
      },
      release: "native",
    };
  });

  return normalizeVideoPhrasePlan({
    schema: VIDEO_PHRASE_PLAN_SCHEMA,
    policyVersion: VIDEO_PHRASE_PLAN_POLICY,
    source: normalized.source,
    timeline: normalized.timeline,
    spectrum,
    phrases,
  });
}

function phrasePlanForLegacyBinding({ videoBinding, timeline } = {}) {
  if (!videoBinding || typeof videoBinding !== "object" || Array.isArray(videoBinding)) {
    throw new TypeError("Legacy Video phrase lowering requires an admitted Video binding.");
  }
  const source = canonicalSource({
    specimenId: videoBinding.specimenId,
    sourceSha256: videoBinding.sourceSha256,
    byteLength: videoBinding.byteLength,
    durationSeconds: videoBinding.probe?.durationSeconds,
  });
  const normalizedTimeline = canonicalTimeline(timeline);
  const digestOperatorId = oneOf(
    videoBinding.digestOperatorId || DIGEST_OPERATORS[0],
    "Legacy Video digestion operator",
    DIGEST_OPERATORS,
  );
  const samplingPolicyId = oneOf(
    videoBinding.samplingPolicyId || LEGACY_SAMPLING_POLICIES[0],
    "Legacy Video sampling policy",
    LEGACY_SAMPLING_POLICIES,
  );
  const renderDurationSeconds = normalizedTimeline.durationTicks / normalizedTimeline.timebase;
  let endTick = normalizedTimeline.durationTicks;
  let cycles = 1;
  let playbackRate = 1;
  let release = "hold";

  if (samplingPolicyId === "loop-source-clip-v1") {
    cycles = Math.ceil(renderDurationSeconds / source.durationSeconds);
    if (cycles > MAX_CYCLES) {
      throw new RangeError(
        `Legacy loop requires ${cycles} cycles, exceeding VideoPhrasePlan v1 bound ${MAX_CYCLES}.`,
      );
    }
  } else if (samplingPolicyId === "play-source-once-v1") {
    endTick = Math.min(
      normalizedTimeline.durationTicks,
      Math.max(1, Math.round(source.durationSeconds * normalizedTimeline.timebase)),
    );
    release = "native";
  } else {
    playbackRate = source.durationSeconds / renderDurationSeconds;
  }

  const canonical = normalizeVideoPhrasePlan({
    schema: VIDEO_PHRASE_PLAN_SCHEMA,
    policyVersion: VIDEO_PHRASE_PLAN_POLICY,
    source,
    timeline: normalizedTimeline,
    spectrum: 0,
    phrases: [{
      phraseId: "legacy-phrase-1",
      startTick: 0,
      endTick,
      sourceWindow: { startSeconds: 0, endSeconds: source.durationSeconds },
      traversal: "forward",
      cycles,
      playbackRate,
      digestion: [{ operatorId: digestOperatorId, weight: 1 }],
      transforms: identityTransforms(),
      release,
    }],
  });

  return Object.freeze({
    ...canonical,
    legacy: Object.freeze({
      digestOperatorId,
      samplingPolicyId,
    }),
  });
}

module.exports = {
  DIGEST_OPERATORS,
  LEGACY_SAMPLING_POLICIES,
  MAX_CYCLES,
  MAX_OVERLAPS,
  MAX_PHRASES,
  RELEASES,
  ROTATIONS,
  TRAVERSALS,
  VIDEO_PHRASE_PLAN_POLICY,
  VIDEO_PHRASE_PLAN_SCHEMA,
  createVideoPhrasePlan,
  hashVideoPhrasePlan,
  normalizeVideoPhrasePlan,
  phrasePlanForLegacyBinding,
};