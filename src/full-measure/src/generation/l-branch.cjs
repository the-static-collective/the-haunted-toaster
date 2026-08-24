const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
  quantizeNumber,
} = require("./canonical.cjs");

const LANE_BANK_SCHEMA = "haunted-toaster/lane-bank/v1";
const LANE_BANK_POLICY = "l-branch-lane-bank-v1";
const LANE_SCHEMA = "haunted-toaster/evidence-lane/v1";
const MIX_PLAN_SCHEMA = "haunted-toaster/l-branch-mix-plan/v1";
const MIX_PLAN_POLICY = "l-branch-mix-plan-v1";
const MIX_EXECUTION_SCHEMA = "haunted-toaster/l-branch-mix-execution/v1";
const MIX_EXECUTION_POLICY = "l-branch-mix-execution-v1";
const TIMELINE_BINDING_SCHEMA = "haunted-toaster/l-branch-timeline/v1";
const TIMELINE_BINDING_POLICY = "l-branch-timeline-v1";
const FAMILY_BINDING_SCHEMA = "haunted-toaster/l-branch-family/v1";
const FAMILY_BINDING_POLICY = "l-branch-family-v1";

const LANE_IDS = Object.freeze([
  "raw-energy-envelope",
  "transient-pressure",
  "vocal-salience",
]);
const DESTINATIONS = Object.freeze(["topology", "primitive-field", "atmosphere"]);
const RESPONSE_MODES = Object.freeze(["follow", "oppose", "accent"]);
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

const STRATEGIES = Object.freeze([
  Object.freeze({
    id: "breath-led",
    sends: Object.freeze([
      Object.freeze({ lane: "raw-energy-envelope", target: "topology", gain: 0.82, resolution: 0.72, response: "follow", smoothing: 0.48, scope: "whole" }),
      Object.freeze({ lane: "transient-pressure", target: "atmosphere", gain: 0.34, resolution: 0.5, response: "accent", smoothing: 0.18, scope: "whole" }),
    ]),
  }),
  Object.freeze({
    id: "pressure-counterpoint",
    sends: Object.freeze([
      Object.freeze({ lane: "transient-pressure", target: "topology", gain: 0.91, resolution: 0.88, response: "oppose", smoothing: 0.08, scope: "whole" }),
      Object.freeze({ lane: "raw-energy-envelope", target: "primitive-field", gain: 0.46, resolution: 0.44, response: "follow", smoothing: 0.55, scope: "whole" }),
      Object.freeze({ lane: "vocal-salience", target: "atmosphere", gain: 0.32, resolution: 0.38, response: "accent", smoothing: 0.64, scope: "whole" }),
    ]),
  }),
  Object.freeze({
    id: "voice-architecture",
    sends: Object.freeze([
      Object.freeze({ lane: "vocal-salience", target: "primitive-field", gain: 0.84, resolution: 0.66, response: "accent", smoothing: 0.42, scope: "whole" }),
      Object.freeze({ lane: "raw-energy-envelope", target: "atmosphere", gain: 0.37, resolution: 0.31, response: "follow", smoothing: 0.7, scope: "whole" }),
    ]),
  }),
  Object.freeze({
    id: "bounded-grab",
    sends: Object.freeze([
      Object.freeze({ lane: "transient-pressure", target: "primitive-field", gain: 0.95, resolution: 0.94, response: "accent", smoothing: 0.06, scope: "grab" }),
      Object.freeze({ lane: "raw-energy-envelope", target: "topology", gain: 0.43, resolution: 0.58, response: "follow", smoothing: 0.33, scope: "whole" }),
      Object.freeze({ lane: "vocal-salience", target: "atmosphere", gain: 0.52, resolution: 0.52, response: "oppose", smoothing: 0.51, scope: "whole" }),
    ]),
  }),
  Object.freeze({
    id: "atmosphere-recoil",
    sends: Object.freeze([
      Object.freeze({ lane: "raw-energy-envelope", target: "atmosphere", gain: 0.89, resolution: 0.57, response: "oppose", smoothing: 0.62, scope: "whole" }),
      Object.freeze({ lane: "transient-pressure", target: "topology", gain: 0.56, resolution: 0.83, response: "accent", smoothing: 0.15, scope: "whole" }),
      Object.freeze({ lane: "vocal-salience", target: "primitive-field", gain: 0.28, resolution: 0.35, response: "follow", smoothing: 0.76, scope: "whole" }),
    ]),
  }),
  Object.freeze({
    id: "braided-triad",
    sends: Object.freeze([
      Object.freeze({ lane: "raw-energy-envelope", target: "primitive-field", gain: 0.63, resolution: 0.64, response: "follow", smoothing: 0.39, scope: "whole" }),
      Object.freeze({ lane: "transient-pressure", target: "atmosphere", gain: 0.73, resolution: 0.79, response: "oppose", smoothing: 0.21, scope: "whole" }),
      Object.freeze({ lane: "vocal-salience", target: "topology", gain: 0.68, resolution: 0.61, response: "accent", smoothing: 0.46, scope: "whole" }),
    ]),
  }),
]);

function clamp01(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(1, Math.max(0, numeric));
}

function q(value) {
  return quantizeNumber(clamp01(value));
}

function finiteNonNegative(value, label) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new TypeError(`${label} must be finite and non-negative.`);
  }
  return numeric;
}

function laneArtifact(core) {
  const normalized = {
    schema: LANE_SCHEMA,
    id: core.id,
    evidenceClass: core.evidenceClass,
    producerPolicy: core.producerPolicy,
    sourceEvidenceHash: core.sourceEvidenceHash,
    signalKind: "knots",
    knots: core.knots.map((knot) => ({
      atSeconds: quantizeNumber(finiteNonNegative(knot.atSeconds, `${core.id}.atSeconds`)),
      value: q(knot.value),
    })),
  };
  return deepFreeze({
    ...normalized,
    laneHash: hashCanonical(normalized, `HauntedToaster-LBranchLane-${core.id}-v1`),
  });
}

function rawEnergyLane(responseWitness) {
  const knots = Array.isArray(responseWitness?.knots) ? responseWitness.knots : [];
  if (!knots.length) return null;
  return laneArtifact({
    id: "raw-energy-envelope",
    evidenceClass: "raw-observation",
    producerPolicy: "raw-energy-envelope-v1",
    sourceEvidenceHash: responseWitness.witnessSha256,
    knots: knots.map((knot) => ({ atSeconds: knot.atSeconds, value: knot.localEnergy })),
  });
}

function transientPressureLane(responseWitness) {
  const knots = Array.isArray(responseWitness?.knots) ? responseWitness.knots : [];
  if (!knots.length) return null;
  return laneArtifact({
    id: "transient-pressure",
    evidenceClass: "inferred",
    producerPolicy: "transient-pressure-from-response-slope-v1",
    sourceEvidenceHash: responseWitness.witnessSha256,
    knots: knots.map((knot) => ({
      atSeconds: knot.atSeconds,
      value: clamp01(
        Math.max(0, Number(knot.slope) || 0) * 3.2 +
        Math.max(0, Number(knot.excursion) || 0) * 0.35,
      ),
    })),
  });
}

function vocalKnots(lyricTrack, durationSeconds) {
  if (lyricTrack?.timed !== true || !Array.isArray(lyricTrack.cues) || !lyricTrack.cues.length) {
    return [];
  }
  const duration = finiteNonNegative(durationSeconds, "durationSeconds");
  const events = [];
  lyricTrack.cues.forEach((cue, index) => {
    const start = Math.min(
      duration,
      finiteNonNegative(cue.start, `lyricTrack.cues[${index}].start`),
    );
    const nextStart = index + 1 < lyricTrack.cues.length
      ? Math.max(start, Number(lyricTrack.cues[index + 1].start) || start)
      : duration;
    const explicitEnd = Number(cue.end);
    const inferredEnd = Math.min(duration, start + 2.5, nextStart || duration);
    const end = Number.isFinite(explicitEnd) && explicitEnd > start
      ? Math.min(duration, explicitEnd, nextStart || duration)
      : inferredEnd;
    if (end <= start) return;
    events.push({ atSeconds: start, value: 1 });
    events.push({ atSeconds: end, value: 0 });
  });
  const byTime = new Map();
  for (const event of events) {
    const key = quantizeNumber(event.atSeconds);
    byTime.set(key, Math.max(byTime.get(key) || 0, event.value));
  }
  return [...byTime.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([atSeconds, value]) => ({ atSeconds, value }));
}

function vocalSalienceLane(responseWitness, lyricTrack) {
  const knots = vocalKnots(lyricTrack, responseWitness?.durationSeconds ?? 0);
  if (!knots.length) return null;
  return laneArtifact({
    id: "vocal-salience",
    evidenceClass: "inferred",
    producerPolicy: "timed-lyric-vocal-salience-v1",
    sourceEvidenceHash: hashCanonical({
      responseWitnessSha256: responseWitness?.witnessSha256 || null,
      mode: lyricTrack.mode || null,
      cues: lyricTrack.cues,
    }, "HauntedToaster-VocalSalienceSource-v1"),
    knots,
  });
}

function buildLaneBank({ responseWitness, lyricTrack = null } = {}) {
  if (!responseWitness || responseWitness.policyVersion !== "response-witness-v1") {
    throw new TypeError("Lane Bank v1 requires response-witness-v1 admitted evidence.");
  }
  if (!SHA256_PATTERN.test(String(responseWitness.witnessSha256 || ""))) {
    throw new TypeError("Lane Bank v1 requires a lowercase SHA-256 response witness identity.");
  }
  const byId = new Map();
  for (const lane of [
    rawEnergyLane(responseWitness),
    transientPressureLane(responseWitness),
    vocalSalienceLane(responseWitness, lyricTrack),
  ]) {
    if (lane) byId.set(lane.id, lane);
  }
  const lanes = LANE_IDS.filter((id) => byId.has(id)).map((id) => byId.get(id));
  const absentLaneIds = LANE_IDS.filter((id) => !byId.has(id));
  const core = {
    schema: LANE_BANK_SCHEMA,
    policyVersion: LANE_BANK_POLICY,
    sourceWitnessSha256: responseWitness.witnessSha256,
    durationSeconds: quantizeNumber(
      finiteNonNegative(responseWitness.durationSeconds ?? 0, "durationSeconds"),
    ),
    laneIds: lanes.map((lane) => lane.id),
    lanes,
    absentLaneIds,
  };
  return deepFreeze({
    ...core,
    laneBankHash: hashCanonical(core, "HauntedToaster-LBranchLaneBank-v1"),
  });
}

function lawfulGrabScope(candidate) {
  const events = candidate?.timeline?.topologyEvents?.events;
  if (!Array.isArray(events)) return null;
  const event = events.find(
    (item) => item?.kind === "grab" && typeof item.id === "string" && item.id.length,
  );
  if (!event) return null;
  const startTick = Number(event.prepareTick);
  const endTick = Number(event.residueUntilTick);
  const durationTicks = Number(candidate.timeline.durationTicks);
  if (
    !Number.isSafeInteger(startTick) ||
    !Number.isSafeInteger(endTick) ||
    startTick < 0 ||
    endTick <= startTick ||
    endTick > durationTicks
  ) return null;
  return deepFreeze({ kind: "grab", regionRef: event.id, startTick, endTick });
}

function wholeScope() {
  return deepFreeze({ kind: "whole-layer" });
}

function normalizeSend(request, laneBank, candidate) {
  if (!LANE_IDS.includes(request.lane)) {
    throw new TypeError(`Unknown L BRANCH lane: ${String(request.lane)}.`);
  }
  if (!DESTINATIONS.includes(request.target)) {
    throw new TypeError(`Unknown L BRANCH destination: ${String(request.target)}.`);
  }
  if (!RESPONSE_MODES.includes(request.response)) {
    throw new TypeError(`Unknown L BRANCH response: ${String(request.response)}.`);
  }
  if (!laneBank.lanes.some((lane) => lane.id === request.lane)) return null;
  let scope;
  if (request.scope === "grab") {
    scope = lawfulGrabScope(candidate);
    if (!scope) return null;
  } else {
    scope = wholeScope();
  }
  return deepFreeze({
    sourceLaneId: request.lane,
    target: request.target,
    gain: q(request.gain),
    resolution: q(request.resolution),
    response: request.response,
    smoothing: q(request.smoothing),
    scope,
  });
}

function buildMixPlan({ laneBank, candidate } = {}) {
  if (
    !laneBank ||
    laneBank.schema !== LANE_BANK_SCHEMA ||
    !SHA256_PATTERN.test(String(laneBank.laneBankHash || ""))
  ) {
    throw new TypeError("Mix Plan requires an addressed Lane Bank v1.");
  }
  if (!candidate?.timeline || typeof candidate.timelineHash !== "string") {
    throw new TypeError("Mix Plan requires a candidate with an accepted source ResolvedTimeline.");
  }
  const index = Number(candidate.index);
  if (!Number.isInteger(index) || index < 0) {
    throw new TypeError("Mix Plan candidate index must be a non-negative integer.");
  }
  const strategy = STRATEGIES[index % STRATEGIES.length];
  const sends = strategy.sends
    .map((request) => normalizeSend(request, laneBank, candidate))
    .filter(Boolean);
  const consumed = new Set(sends.map((send) => send.sourceLaneId));
  const core = {
    schema: MIX_PLAN_SCHEMA,
    policyVersion: MIX_PLAN_POLICY,
    laneBankHash: laneBank.laneBankHash,
    sourceTimelineHash: candidate.timelineHash,
    scoreAddress: candidate.scoreAddress,
    candidateIndex: index,
    strategyId: strategy.id,
    sends,
    ignoredLaneIds: laneBank.lanes
      .map((lane) => lane.id)
      .filter((id) => !consumed.has(id)),
  };
  return deepFreeze({
    ...core,
    planHash: hashCanonical(core, "HauntedToaster-LBranchMixPlan-v1"),
  });
}

function assertSend(send, laneBank, timeline) {
  if (!send || !LANE_IDS.includes(send.sourceLaneId)) {
    throw new TypeError("L BRANCH send has an unknown source lane.");
  }
  if (!laneBank.lanes.some((lane) => lane.id === send.sourceLaneId)) {
    throw new TypeError(`L BRANCH send references unavailable lane ${send.sourceLaneId}.`);
  }
  if (!DESTINATIONS.includes(send.target)) {
    throw new TypeError(`L BRANCH send has unknown destination ${String(send.target)}.`);
  }
  if (!RESPONSE_MODES.includes(send.response)) {
    throw new TypeError(`L BRANCH send has unknown response ${String(send.response)}.`);
  }
  for (const key of ["gain", "resolution", "smoothing"]) {
    if (!Number.isFinite(send[key]) || send[key] < 0 || send[key] > 1) {
      throw new TypeError(`L BRANCH send ${key} must be within [0, 1].`);
    }
  }
  if (send.scope?.kind === "whole-layer") return;
  if (send.scope?.kind !== "grab") {
    throw new TypeError("L BRANCH send scope must be whole-layer or grab.");
  }
  const lawful = lawfulGrabScope({ timeline });
  if (
    !lawful ||
    lawful.regionRef !== send.scope.regionRef ||
    lawful.startTick !== send.scope.startTick ||
    lawful.endTick !== send.scope.endTick
  ) {
    throw new TypeError("L BRANCH GRAB scope is not an accepted GRAB on this timeline.");
  }
}

function movingAverage(values, radius) {
  if (!radius) return values.slice();
  return values.map((_value, index) => {
    const start = Math.max(0, index - radius);
    const end = Math.min(values.length, index + radius + 1);
    const window = values.slice(start, end);
    return window.reduce((sum, value) => sum + value, 0) / window.length;
  });
}

function resolvedLaneKnots(lane, send, timeline) {
  const timebase = finiteNonNegative(timeline.timebase, "timeline.timebase");
  if (!timebase) throw new TypeError("timeline.timebase must be positive.");
  const durationTicks = finiteNonNegative(timeline.durationTicks, "timeline.durationTicks");
  const raw = lane.knots.map((knot) => ({
    atTick: Math.max(
      0,
      Math.min(
        durationTicks,
        Math.round(finiteNonNegative(knot.atSeconds, "lane knot time") * timebase),
      ),
    ),
    value: clamp01(knot.value),
  }));
  const radius = Math.round(send.smoothing * 3);
  const smoothed = movingAverage(raw.map((knot) => knot.value), radius);
  const step = Math.max(1, 1 + Math.round((1 - send.resolution) * 4));
  let previous = smoothed[0] ?? 0;
  const projected = raw
    .map((knot, index) => {
      const value = smoothed[index] ?? 0;
      let responseValue = value;
      if (send.response === "oppose") responseValue = 1 - value;
      else if (send.response === "accent") responseValue = Math.abs(value - previous);
      previous = value;
      return { atTick: knot.atTick, value: q(responseValue * send.gain) };
    })
    .filter(
      (_knot, index, values) =>
        index === 0 || index === values.length - 1 || index % step === 0,
    );
  if (send.scope.kind !== "grab") return projected;
  return projected.filter(
    (knot) => knot.atTick >= send.scope.startTick && knot.atTick <= send.scope.endTick,
  );
}

function compileMixPlan({ laneBank, mixPlan, timeline } = {}) {
  if (!laneBank || laneBank.laneBankHash !== mixPlan?.laneBankHash) {
    throw new TypeError("Mix Plan Lane Bank identity mismatch.");
  }
  if (!timeline || timeline.timelineHash !== mixPlan.sourceTimelineHash) {
    throw new TypeError("Mix Plan source timeline identity mismatch.");
  }
  const lanes = new Map(laneBank.lanes.map((lane) => [lane.id, lane]));
  const sends = mixPlan.sends.map((send, index) => {
    assertSend(send, laneBank, timeline);
    const lane = lanes.get(send.sourceLaneId);
    return deepFreeze({
      index,
      sourceLaneId: send.sourceLaneId,
      sourceLaneHash: lane.laneHash,
      target: send.target,
      gain: send.gain,
      resolution: send.resolution,
      response: send.response,
      smoothing: send.smoothing,
      scope: structuredClone(send.scope),
      knots: resolvedLaneKnots(lane, send, timeline),
    });
  });
  const core = {
    schema: MIX_EXECUTION_SCHEMA,
    policyVersion: MIX_EXECUTION_POLICY,
    laneBankHash: laneBank.laneBankHash,
    planHash: mixPlan.planHash,
    sourceTimelineHash: mixPlan.sourceTimelineHash,
    sends,
  };
  return deepFreeze({
    ...core,
    executionHash: hashCanonical(core, "HauntedToaster-LBranchMixExecution-v1"),
  });
}

function bindTimeline(timeline, laneBank, mixPlan) {
  if (timeline.timelineHash !== mixPlan.sourceTimelineHash) {
    throw new TypeError("Cannot admit a Mix Plan onto a different source timeline.");
  }
  const execution = compileMixPlan({ laneBank, mixPlan, timeline });
  const {
    timelineHash: _timelineHash,
    canonicalJson: _canonicalJson,
    lBranch: _lBranch,
    ...baseBody
  } = timeline;
  const lBranch = {
    schema: TIMELINE_BINDING_SCHEMA,
    policyVersion: TIMELINE_BINDING_POLICY,
    laneBankHash: laneBank.laneBankHash,
    mixPlan,
    execution,
  };
  const body = { ...structuredClone(baseBody), lBranch };
  const timelineHash = hashCanonical(body, "HauntedToaster-ResolvedTimeline-v1");
  return deepFreeze({
    ...body,
    timelineHash,
    canonicalJson: canonicalStringify(body),
  });
}

function attachLBranchToFamily(family, { responseWitness, lyricTrack = null } = {}) {
  if (!family?.candidates?.length) {
    throw new TypeError("L BRANCH admission requires a CandidateFamily.");
  }
  const laneBank = buildLaneBank({ responseWitness, lyricTrack });
  const candidates = family.candidates.map((candidate) => {
    const mixPlan = buildMixPlan({ laneBank, candidate });
    const timeline = bindTimeline(candidate.timeline, laneBank, mixPlan);
    return deepFreeze({
      ...candidate,
      timeline,
      timelineHash: timeline.timelineHash,
      laneBankHash: laneBank.laneBankHash,
      mixPlanHash: mixPlan.planHash,
    });
  });
  const {
    familyHash: _familyHash,
    candidates: _candidates,
    timelineHashes: _timelineHashes,
    lBranch: _lBranch,
    ...stableCore
  } = family;
  const familyBinding = {
    schema: FAMILY_BINDING_SCHEMA,
    policyVersion: FAMILY_BINDING_POLICY,
    sourceFamilyHash: family.familyHash,
    laneBank,
    laneBankHash: laneBank.laneBankHash,
    mixPlanHashes: candidates.map((candidate) => candidate.mixPlanHash),
  };
  const core = {
    ...structuredClone(stableCore),
    timelineHashes: candidates.map((candidate) => candidate.timelineHash),
    lBranch: familyBinding,
  };
  return deepFreeze({
    ...core,
    familyHash: hashCanonical(core, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  });
}

function replayLBranchFamily(
  family,
  { baseFamily, responseWitness, lyricTrack = null } = {},
) {
  if (!family?.lBranch || family.lBranch.schema !== FAMILY_BINDING_SCHEMA) {
    throw new TypeError("L BRANCH replay requires an admitted L BRANCH family.");
  }
  if (!baseFamily || baseFamily.familyHash !== family.lBranch.sourceFamilyHash) {
    throw new TypeError("L BRANCH replay source family identity mismatch.");
  }
  const replayed = attachLBranchToFamily(baseFamily, { responseWitness, lyricTrack });
  const laneBankHashMatches =
    replayed.lBranch.laneBankHash === family.lBranch.laneBankHash;
  const mixPlanHashesMatch =
    canonicalStringify(replayed.lBranch.mixPlanHashes) ===
    canonicalStringify(family.lBranch.mixPlanHashes);
  const timelineHashesMatch =
    canonicalStringify(replayed.timelineHashes) ===
    canonicalStringify(family.timelineHashes);
  const familyHashMatches = replayed.familyHash === family.familyHash;
  return deepFreeze({
    schema: "haunted-toaster/l-branch-family-replay/v1",
    ok:
      laneBankHashMatches &&
      mixPlanHashesMatch &&
      timelineHashesMatch &&
      familyHashMatches,
    laneBankHashMatches,
    mixPlanHashesMatch,
    timelineHashesMatch,
    familyHashMatches,
    replayed,
  });
}

function assertLBranchTimeline(timeline) {
  if (!timeline || typeof timeline !== "object") {
    throw new TypeError("ResolvedTimeline is required.");
  }
  if (timeline.lBranch === undefined) return timeline;
  const binding = timeline.lBranch;
  if (
    !binding ||
    binding.schema !== TIMELINE_BINDING_SCHEMA ||
    binding.policyVersion !== TIMELINE_BINDING_POLICY
  ) {
    throw new TypeError("ResolvedTimeline L BRANCH binding is invalid.");
  }
  if (
    !SHA256_PATTERN.test(String(binding.laneBankHash || "")) ||
    binding.mixPlan?.laneBankHash !== binding.laneBankHash ||
    binding.execution?.laneBankHash !== binding.laneBankHash
  ) {
    throw new TypeError("ResolvedTimeline L BRANCH Lane Bank identity mismatch.");
  }
  if (
    !SHA256_PATTERN.test(String(binding.mixPlan?.planHash || "")) ||
    binding.execution?.planHash !== binding.mixPlan.planHash
  ) {
    throw new TypeError("ResolvedTimeline L BRANCH Mix Plan identity mismatch.");
  }
  return timeline;
}

module.exports = {
  DESTINATIONS,
  FAMILY_BINDING_POLICY,
  FAMILY_BINDING_SCHEMA,
  LANE_BANK_POLICY,
  LANE_BANK_SCHEMA,
  LANE_IDS,
  MIX_EXECUTION_POLICY,
  MIX_EXECUTION_SCHEMA,
  MIX_PLAN_POLICY,
  MIX_PLAN_SCHEMA,
  RESPONSE_MODES,
  STRATEGIES,
  TIMELINE_BINDING_POLICY,
  TIMELINE_BINDING_SCHEMA,
  assertLBranchTimeline,
  attachLBranchToFamily,
  buildLaneBank,
  buildMixPlan,
  compileMixPlan,
  replayLBranchFamily,
};
