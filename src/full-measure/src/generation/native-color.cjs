const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
  quantizeNumber,
} = require("./canonical.cjs");
const { isExpressiveRendererPolicy } = require("./renderer-policy.cjs");

const NATIVE_COLOR_POLICY = "native-color-witness-v1";
const NATIVE_COLOR_PLAN_SCHEMA = "haunted-toaster/native-color-plan/v1";
const RELATIONSHIPS = Object.freeze(["echo", "counterpoint"]);
const NATIVE_INFLUENCE = 0.68;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, Number(value)));
}

function relationshipState(profile, relationship) {
  if (relationship === "echo") {
    return deepFreeze({
      hueOffset: 0,
      saturationMultiplier: quantizeNumber(clamp(
        0.94 + Number(profile.chromaWeight) * 0.12,
        0.94,
        1.06,
      )),
    });
  }
  const direction = Number(profile.hueCentroidDegrees) < 180 ? 1 : -1;
  return deepFreeze({
    hueOffset: 54 * direction,
    saturationMultiplier: quantizeNumber(clamp(
      1.04 + Number(profile.chromaWeight) * 0.14,
      1.04,
      1.18,
    )),
  });
}

function decompressionWindows(timeline, analysis) {
  const sections = Array.isArray(analysis?.sections) ? analysis.sections : [];
  if (sections.length < 2) return [];
  const candidates = sections.slice(1).map((section, offset) => {
    const index = offset + 1;
    const previous = sections[index - 1];
    const energyDelta = quantizeNumber(Number(section.energy) - Number(previous.energy));
    return { index, section, previous, energyDelta };
  });
  candidates.sort((left, right) =>
    Math.abs(right.energyDelta) - Math.abs(left.energyDelta) || left.index - right.index);
  const chosen = candidates[0];
  const startTick = Math.max(0, Math.min(
    timeline.durationTicks,
    Math.round(Number(chosen.section.startSeconds) * timeline.timebase),
  ));
  const endTick = Math.max(0, Math.min(
    timeline.durationTicks,
    Math.round(Number(chosen.section.endSeconds) * timeline.timebase),
  ));
  if (endTick <= startTick) return [];
  return [deepFreeze({
    startTick,
    endTick,
    boundary: "section",
    previousSection: String(chosen.previous.label),
    nextSection: String(chosen.section.label),
    energyDelta: chosen.energyDelta,
    nativeInfluence: NATIVE_INFLUENCE,
  })];
}

function resolveNativeColorPlan(timeline, { profile, analysis, relationship } = {}) {
  if (!isExpressiveRendererPolicy(timeline?.rendererPolicy)) return timeline;
  if (!RELATIONSHIPS.includes(relationship)) {
    throw new TypeError(`Unknown Native Color relationship: ${String(relationship)}.`);
  }
  if (!profile || !/^[0-9a-f]{64}$/.test(String(profile.sourceSha256 || "")) ||
      !/^[0-9a-f]{64}$/.test(String(profile.profileSha256 || ""))) {
    throw new TypeError("Native Color requires a hashed NativeChromaticProfile.");
  }
  const state = relationshipState(profile, relationship);
  const windows = decompressionWindows(timeline, analysis);
  const planCore = {
    schema: NATIVE_COLOR_PLAN_SCHEMA,
    policyVersion: NATIVE_COLOR_POLICY,
    sourceSha256: profile.sourceSha256,
    profileSha256: profile.profileSha256,
    relationship,
    relationshipState: state,
    nativeSaturationTarget: quantizeNumber(clamp(
      0.88 + Number(profile.saturationMean) * 0.24,
      0.88,
      1.12,
    )),
    decompressionWindows: windows,
    windowCount: windows.length,
  };
  const nativeColor = deepFreeze({
    ...planCore,
    planSha256: hashCanonical(planCore, "HauntedToaster-NativeColorPlan-v1"),
  });
  const {
    timelineHash: _timelineHash,
    canonicalJson: _canonicalJson,
    nativeColor: _nativeColor,
    ...baseBody
  } = timeline;
  const body = { ...structuredClone(baseBody), nativeColor };
  const timelineHash = hashCanonical(body, "HauntedToaster-ResolvedTimeline-v1");
  if (timeline.timelineHash === timelineHash) return timeline;
  return deepFreeze({
    ...body,
    timelineHash,
    canonicalJson: canonicalStringify(body),
  });
}

function nativeColorAtTick(timeline, tick) {
  const plan = timeline?.nativeColor;
  if (!plan) return null;
  const target = Math.max(0, Math.round(Number(tick)));
  const window = plan.decompressionWindows.find(({ startTick, endTick }) =>
    target >= startTick && target < endTick);
  return deepFreeze({
    relationshipHueOffset: plan.relationshipState.hueOffset,
    relationshipSaturationMultiplier: plan.relationshipState.saturationMultiplier,
    nativeSaturationTarget: plan.nativeSaturationTarget,
    nativeInfluence: window ? window.nativeInfluence : 0,
  });
}

module.exports = {
  NATIVE_COLOR_PLAN_SCHEMA,
  NATIVE_COLOR_POLICY,
  NATIVE_INFLUENCE,
  RELATIONSHIPS,
  nativeColorAtTick,
  relationshipState,
  resolveNativeColorPlan,
};
