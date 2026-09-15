const {
  LYRIC_RESONANCE_FAMILIES,
  LYRIC_RESONANCE_POLICY,
  LYRIC_RESONANCE_SCHEMA,
  NATIVE_COLOR_PLAN_SCHEMA,
  NATIVE_COLOR_POLICY,
  NATIVE_INFLUENCE,
  RELATIONSHIPS,
  TIMELINE_SCHEMA,
  TOPOLOGY_EVENT_KINDS,
  TOPOLOGY_EVENT_PLAN_SCHEMA,
  TOPOLOGY_EVENT_POLICY,
  stateAtTick,
} = require("../generation/index.cjs");
const { assertLBranchIntegrity } = require("./l-branch-integrity.cjs");

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function assertNativeColor(timeline) {
  const plan = timeline.nativeColor;
  if (plan === undefined) return;
  if (!plan || typeof plan !== "object") {
    throw new TypeError("ResolvedTimeline.nativeColor must be an object when present.");
  }
  if (plan.schema !== NATIVE_COLOR_PLAN_SCHEMA) {
    throw new TypeError(`Native Color schema must be ${NATIVE_COLOR_PLAN_SCHEMA}.`);
  }
  if (plan.policyVersion !== NATIVE_COLOR_POLICY) {
    throw new TypeError(`Native Color policy must be ${NATIVE_COLOR_POLICY}.`);
  }
  if (!RELATIONSHIPS.includes(plan.relationship)) {
    throw new TypeError(`Native Color relationship must be ${RELATIONSHIPS.join(" or ")}.`);
  }
  for (const [label, value] of [
    ["sourceSha256", plan.sourceSha256],
    ["profileSha256", plan.profileSha256],
    ["planSha256", plan.planSha256],
  ]) {
    if (!SHA256_PATTERN.test(String(value || ""))) {
      throw new TypeError(`Native Color ${label} must be lowercase SHA-256.`);
    }
  }
  if (
    !Number.isFinite(plan.relationshipState?.hueOffset) ||
    !Number.isFinite(plan.relationshipState?.saturationMultiplier) ||
    !Number.isFinite(plan.nativeSaturationTarget)
  ) {
    throw new TypeError("Native Color renderer values must be finite.");
  }
  if (!Array.isArray(plan.decompressionWindows) || plan.decompressionWindows.length > 1 ||
      plan.windowCount !== plan.decompressionWindows.length) {
    throw new TypeError("Native Color v1 must contain at most one counted decompression window.");
  }
  let previousEndTick = -1;
  for (const window of plan.decompressionWindows) {
    if (
      !Number.isInteger(window.startTick) ||
      !Number.isInteger(window.endTick) ||
      window.startTick < 0 ||
      window.endTick <= window.startTick ||
      window.endTick > timeline.durationTicks
    ) {
      throw new TypeError("Native Color decompression tick window is invalid.");
    }
    if (window.startTick < previousEndTick) {
      throw new TypeError("Native Color windows must be ordered and non-overlapping.");
    }
    if (window.boundary !== "section") {
      throw new TypeError("Native Color v1 windows must use a section boundary.");
    }
    if (window.nativeInfluence !== NATIVE_INFLUENCE) {
      throw new TypeError(`Native Color v1 influence must be ${NATIVE_INFLUENCE}.`);
    }
    if (!Number.isFinite(window.energyDelta)) {
      throw new TypeError("Native Color window energyDelta must be finite.");
    }
    previousEndTick = window.endTick;
  }
}

function assertStrictAscendingIntegers(values, label) {
  if (!Array.isArray(values) || !values.length) {
    throw new TypeError(`${label} must be a non-empty array.`);
  }
  let previous = -1;
  for (const value of values) {
    if (!Number.isInteger(value) || value < 0 || value <= previous) {
      throw new TypeError(`${label} must contain strictly ordered non-negative integers.`);
    }
    previous = value;
  }
}

function assertStableTerms(values) {
  if (!Array.isArray(values) || !values.length) {
    throw new TypeError("Lyric Resonance matchedTerms must be a non-empty array.");
  }
  const seen = new Set();
  for (const value of values) {
    if (typeof value !== "string" || !value.length || seen.has(value)) {
      throw new TypeError("Lyric Resonance matchedTerms must contain unique non-empty strings.");
    }
    seen.add(value);
  }
}

function assertLyricResonance(timeline) {
  const resonance = timeline.lyricResonance;
  if (resonance === undefined) return;
  if (!resonance || typeof resonance !== "object") {
    throw new TypeError("ResolvedTimeline.lyricResonance must be an object when present.");
  }
  if (resonance.schema !== LYRIC_RESONANCE_SCHEMA) {
    throw new TypeError(`Lyric Resonance schema must be ${LYRIC_RESONANCE_SCHEMA}.`);
  }
  if (resonance.policy !== LYRIC_RESONANCE_POLICY) {
    throw new TypeError(`Lyric Resonance policy must be ${LYRIC_RESONANCE_POLICY}.`);
  }
  if (typeof resonance.sourceMode !== "string" || !resonance.sourceMode.length) {
    throw new TypeError("Lyric Resonance sourceMode must be a non-empty string.");
  }
  if (!Array.isArray(resonance.events)) {
    throw new TypeError("Lyric Resonance events must be an array.");
  }

  const familyOrder = new Map(
    LYRIC_RESONANCE_FAMILIES.map((family, index) => [family, index]),
  );
  let previousStartTick = -1;
  let previousFamilyIndex = -1;
  for (const event of resonance.events) {
    if (!event || typeof event !== "object") {
      throw new TypeError("Lyric Resonance event must be an object.");
    }
    if (!familyOrder.has(event.family)) {
      throw new TypeError(`Unsupported Lyric Resonance family: ${String(event.family)}.`);
    }
    if (
      !Number.isInteger(event.startTick) ||
      !Number.isInteger(event.endTick) ||
      event.startTick < 0 ||
      event.endTick <= event.startTick
    ) {
      throw new TypeError("Lyric Resonance event must have a valid canonical tick window.");
    }
    if (event.endTick > timeline.durationTicks) {
      throw new TypeError("Lyric Resonance event exceeds durationTicks.");
    }
    if (!Number.isFinite(event.intensity) || event.intensity < 0 || event.intensity > 1) {
      throw new TypeError("Lyric Resonance intensity must be finite and within [0, 1].");
    }
    assertStrictAscendingIntegers(event.cueIndices, "Lyric Resonance cueIndices");
    assertStableTerms(event.matchedTerms);

    const eventFamilyIndex = familyOrder.get(event.family);
    if (
      event.startTick < previousStartTick ||
      (event.startTick === previousStartTick && eventFamilyIndex < previousFamilyIndex)
    ) {
      throw new TypeError("Lyric Resonance events must be ordered by canonical tick.");
    }
    previousStartTick = event.startTick;
    previousFamilyIndex = eventFamilyIndex;
  }
}

function assertTopologyEvents(timeline) {
  const plan = timeline.topologyEvents;
  if (plan === undefined) return;
  if (!plan || typeof plan !== "object") {
    throw new TypeError("ResolvedTimeline.topologyEvents must be an object when present.");
  }
  if (plan.schema !== TOPOLOGY_EVENT_PLAN_SCHEMA) {
    throw new TypeError(`Topology Events schema must be ${TOPOLOGY_EVENT_PLAN_SCHEMA}.`);
  }
  if (plan.policyVersion !== TOPOLOGY_EVENT_POLICY) {
    throw new TypeError(`Topology Events policy must be ${TOPOLOGY_EVENT_POLICY}.`);
  }
  for (const [label, value] of [
    ["acceptedFamilyHash", plan.acceptedFamilyHash],
    ["sourceTimelineHash", plan.sourceTimelineHash],
    ["planSha256", plan.planSha256],
  ]) {
    if (!SHA256_PATTERN.test(String(value || ""))) {
      throw new TypeError(`Topology Events ${label} must be lowercase SHA-256.`);
    }
  }
  if (plan.acceptedScoreAddress !== timeline.scoreAddress) {
    throw new TypeError("Topology Events acceptedScoreAddress must match timeline.scoreAddress.");
  }
  if (plan.sourceTopology !== timeline.baseState.topology) {
    throw new TypeError("Topology Events sourceTopology must match frozen base topology.");
  }
  if (!Array.isArray(plan.lockedAxes) || !Array.isArray(plan.events) || plan.eventCount !== plan.events.length) {
    throw new TypeError("Topology Events counted arrays are invalid.");
  }
  if (plan.refusal !== null) {
    if (!plan.refusal || typeof plan.refusal !== "object" || typeof plan.refusal.reason !== "string") {
      throw new TypeError("Topology Events refusal envelope is invalid.");
    }
    if (plan.events.length !== 0) {
      throw new TypeError("Topology Events refusal cannot carry executable events.");
    }
    return;
  }

  let previousPrepareTick = -1;
  let previousId = "";
  for (const event of plan.events) {
    if (!event || typeof event !== "object" || !TOPOLOGY_EVENT_KINDS.includes(event.kind)) {
      throw new TypeError("Topology Events contains an unsupported primitive kind.");
    }
    if (typeof event.id !== "string" || !event.id.length || !SHA256_PATTERN.test(String(event.eventSha256 || ""))) {
      throw new TypeError("Topology Events event identity is invalid.");
    }
    const ticks = [event.prepareTick, event.strikeTick, event.releaseTick, event.residueUntilTick];
    if (ticks.some((tick) => !Number.isSafeInteger(tick) || tick < 0)) {
      throw new TypeError("Topology Events ticks must be non-negative safe integers.");
    }
    if (!(event.prepareTick < event.strikeTick && event.strikeTick <= event.releaseTick && event.releaseTick <= event.residueUntilTick)) {
      throw new TypeError("Topology Events envelope ordering is invalid.");
    }
    if (event.kind === "grab" && event.releaseTick >= event.residueUntilTick) {
      throw new TypeError("GRAB requires non-zero residual duration.");
    }
    if (event.residueUntilTick > timeline.durationTicks) {
      throw new TypeError("Topology Events envelope exceeds durationTicks.");
    }
    if (!Array.isArray(event.evidenceRefs) || !event.evidenceRefs.length) {
      throw new TypeError("Topology Events evidenceRefs must be non-empty.");
    }
    if (
      event.prepareTick < previousPrepareTick ||
      (event.prepareTick === previousPrepareTick && event.id.localeCompare(previousId) < 0)
    ) {
      throw new TypeError("Topology Events must be ordered by prepareTick then id.");
    }
    previousPrepareTick = event.prepareTick;
    previousId = event.id;
  }
}

function assertResolvedTimeline(timeline) {
  if (!timeline || typeof timeline !== "object") {
    throw new TypeError("ResolvedTimeline is required.");
  }
  if (timeline.schema !== TIMELINE_SCHEMA) {
    throw new TypeError(`Expected ${TIMELINE_SCHEMA}.`);
  }
  if (!Number.isInteger(timeline.timebase) || timeline.timebase <= 0) {
    throw new TypeError("ResolvedTimeline.timebase must be a positive integer.");
  }
  if (!Number.isInteger(timeline.durationTicks) || timeline.durationTicks < 0) {
    throw new TypeError("ResolvedTimeline.durationTicks must be a non-negative integer.");
  }
  if (!timeline.baseState || typeof timeline.baseState !== "object") {
    throw new TypeError("ResolvedTimeline.baseState is required.");
  }
  if (!Array.isArray(timeline.patches)) {
    throw new TypeError("ResolvedTimeline.patches must be an array.");
  }
  let previousTick = -1;
  for (const patch of timeline.patches) {
    if (!Number.isInteger(patch.atTick) || patch.atTick < previousTick) {
      throw new TypeError("ResolvedTimeline patches must be ordered by canonical tick.");
    }
    if (patch.atTick > timeline.durationTicks) {
      throw new TypeError("ResolvedTimeline patch exceeds durationTicks.");
    }
    previousTick = patch.atTick;
  }

  if (timeline.possessionArc !== undefined) {
    if (!timeline.possessionArc || typeof timeline.possessionArc !== "object") {
      throw new TypeError("ResolvedTimeline.possessionArc must be an object when present.");
    }
    if (!Array.isArray(timeline.possessionArc.transitions)) {
      throw new TypeError("ResolvedTimeline.possessionArc.transitions must be an array.");
    }
    let previousArcTick = -1;
    for (const transition of timeline.possessionArc.transitions) {
      if (!Number.isInteger(transition.atTick) || transition.atTick < previousArcTick) {
        throw new TypeError("Possession Arc transitions must be ordered by canonical tick.");
      }
      if (transition.atTick > timeline.durationTicks) {
        throw new TypeError("Possession Arc transition exceeds durationTicks.");
      }
      if (transition.boundary !== "section") {
        throw new TypeError("Possession Arc v1 transitions must occur at section boundaries.");
      }
      if (!["motion", "material", "camera", "palette"].includes(transition.axis)) {
        throw new TypeError(`Unsupported Possession Arc axis: ${String(transition.axis)}.`);
      }
      if (transition.transition !== "cut") {
        throw new TypeError("Possession Arc v1 supports cut transitions only.");
      }
      previousArcTick = transition.atTick;
    }
  }

  assertNativeColor(timeline);
  assertLyricResonance(timeline);
  assertTopologyEvents(timeline);
  assertLBranchIntegrity(timeline);
  return timeline;
}

function tickToSeconds(timeline, tick) {
  assertResolvedTimeline(timeline);
  return Number(tick) / timeline.timebase;
}

function secondsToTick(timeline, seconds) {
  assertResolvedTimeline(timeline);
  return Math.max(
    0,
    Math.min(
      timeline.durationTicks,
      Math.round(Number(seconds) * timeline.timebase),
    ),
  );
}

function semanticStateAtTick(timeline, tick) {
  assertResolvedTimeline(timeline);
  return stateAtTick(timeline, tick);
}

function semanticStateAtSeconds(timeline, seconds) {
  return semanticStateAtTick(timeline, secondsToTick(timeline, seconds));
}

function executionSegments(timeline) {
  assertResolvedTimeline(timeline);
  const starts = [0];
  const eventTicks = [
    ...timeline.patches.map((patch) => patch.atTick),
    ...(timeline.possessionArc?.transitions || []).map((transition) => transition.atTick),
    ...(timeline.nativeColor?.decompressionWindows || [])
      .flatMap((window) => [window.startTick, window.endTick]),
  ].sort((left, right) => left - right);
  for (const atTick of eventTicks) {
    if (atTick > 0 && atTick < timeline.durationTicks) {
      if (starts[starts.length - 1] !== atTick) starts.push(atTick);
    }
  }

  return starts.map((startTick, index) => {
    const endTick = starts[index + 1] ?? timeline.durationTicks;
    return Object.freeze({
      startTick,
      endTick,
      startSeconds: tickToSeconds(timeline, startTick),
      endSeconds: tickToSeconds(timeline, endTick),
      state: semanticStateAtTick(timeline, startTick),
    });
  });
}

function assertTimelineDuration(timeline, durationSeconds, toleranceSeconds = 0.001) {
  assertResolvedTimeline(timeline);
  const expectedSeconds = timeline.durationTicks / timeline.timebase;
  const delta = Math.abs(expectedSeconds - Number(durationSeconds));
  if (!Number.isFinite(delta) || delta > toleranceSeconds) {
    throw new RangeError(
      `ResolvedTimeline duration ${expectedSeconds}s does not match source duration ${durationSeconds}s (delta ${delta}s).`,
    );
  }
  return expectedSeconds;
}

function createTimelineExecution(timeline) {
  assertResolvedTimeline(timeline);
  return Object.freeze({
    timeline,
    timelineHash: timeline.timelineHash || null,
    scoreAddress: timeline.scoreAddress || null,
    timebase: timeline.timebase,
    durationTicks: timeline.durationTicks,
    segments: Object.freeze(executionSegments(timeline)),
    stateAtTick(tick) {
      return semanticStateAtTick(timeline, tick);
    },
    stateAtSeconds(seconds) {
      return semanticStateAtSeconds(timeline, seconds);
    },
  });
}

module.exports = {
  assertLyricResonance,
  assertNativeColor,
  assertResolvedTimeline,
  assertTimelineDuration,
  assertTopologyEvents,
  createTimelineExecution,
  executionSegments,
  secondsToTick,
  semanticStateAtSeconds,
  semanticStateAtTick,
  tickToSeconds,
};
