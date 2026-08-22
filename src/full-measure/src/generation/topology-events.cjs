const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
  quantizeNumber,
} = require("./canonical.cjs");
const {
  CANDIDATE_FAMILY_POLICY,
  CANDIDATE_FAMILY_SCHEMA,
} = require("./candidate-family.cjs");

const TOPOLOGY_EVENT_POLICY = "topology-events-v0.1";
const TOPOLOGY_EVENT_PLAN_SCHEMA = "haunted-toaster/topology-event-plan/v0.1";
const TOPOLOGY_EVENT_KINDS = deepFreeze(["aperture", "speak", "grab", "grow"]);
const FAMILY_HASH_DOMAIN = "HauntedToaster-CandidateFamily-v1";
const EVENT_HASH_DOMAIN = "HauntedToaster-TopologyEvent-v0.1";
const PLAN_HASH_DOMAIN = "HauntedToaster-TopologyEventPlan-v0.1";
const TIMELINE_HASH_DOMAIN = "HauntedToaster-ResolvedTimeline-v1";
const SHA256_RE = /^[0-9a-f]{64}$/;

function ownDataObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable) continue;
    if (descriptor.get || descriptor.set) {
      throw new TypeError(`${label}.${key} must be an own data property.`);
    }
  }
  return value;
}

function exactKeys(value, expected, label) {
  ownDataObject(value, label);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new TypeError(`${label} contains unknown or missing fields.`);
  }
  return value;
}

function safeTick(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer.`);
  }
  return value;
}

function boundedNumber(value, min, max, label, { exclusiveMin = false } = {}) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite.`);
  const normalized = quantizeNumber(value);
  if ((exclusiveMin ? normalized <= min : normalized < min) || normalized > max) {
    throw new TypeError(`${label} is out of bounds.`);
  }
  return normalized;
}

function normalizeEvidenceRefs(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("Topology event evidenceRefs must be a non-empty array.");
  }
  const refs = value.map((ref) => {
    if (typeof ref !== "string" || ref.length === 0) {
      throw new TypeError("Topology event evidenceRefs must contain non-empty strings.");
    }
    return ref;
  });
  return [...new Set(refs)].sort();
}

function verifyCandidateFamilyAddress(family) {
  ownDataObject(family, "CandidateFamily");
  if (family.schema !== CANDIDATE_FAMILY_SCHEMA || family.policy !== CANDIDATE_FAMILY_POLICY) {
    throw new TypeError("CandidateFamily v1 schema/policy is required.");
  }
  if (!SHA256_RE.test(family.familyHash || "")) {
    throw new TypeError("CandidateFamily familyHash must be lowercase SHA-256.");
  }

  const familyCore = {
    schema: family.schema,
    policy: family.policy,
    scoreSchema: family.scoreSchema,
    prng: family.prng,
    rootSeed: family.rootSeed,
    parentScoreRef: family.parentScoreRef,
    baselineScoreRef: family.baselineScoreRef,
    constraintPackId: family.constraintPackId,
    analysisHash: family.analysisHash,
    constraintsHash: family.constraintsHash,
    rendererProfileHash: family.rendererProfileHash,
    locks: family.locks,
    requestedCount: family.requestedCount,
    producedCount: family.producedCount,
    roles: family.roles,
    scoreAddresses: family.scoreAddresses,
    timelineHashes: family.timelineHashes,
    shortfall: family.shortfall,
  };
  const actualHash = hashCanonical(familyCore, FAMILY_HASH_DOMAIN);
  if (actualHash !== family.familyHash) {
    throw new TypeError("CandidateFamily canonical address does not match familyHash.");
  }

  if (!Number.isSafeInteger(family.producedCount) || family.producedCount < 1) {
    throw new TypeError("CandidateFamily producedCount is invalid.");
  }
  if (!Array.isArray(family.candidates) || family.candidates.length !== family.producedCount) {
    throw new TypeError("CandidateFamily candidates do not align with producedCount.");
  }
  for (const key of ["roles", "scoreAddresses", "timelineHashes"]) {
    if (!Array.isArray(family[key]) || family[key].length !== family.producedCount) {
      throw new TypeError(`CandidateFamily ${key} does not align with producedCount.`);
    }
  }
  for (let index = 0; index < family.candidates.length; index += 1) {
    const candidate = family.candidates[index];
    ownDataObject(candidate, `CandidateFamily.candidates[${index}]`);
    if (candidate.index !== index) {
      throw new TypeError("CandidateFamily candidate indices are not aligned.");
    }
    if (candidate.role !== family.roles[index]) {
      throw new TypeError("CandidateFamily roles are not aligned with candidates.");
    }
    if (candidate.scoreAddress !== family.scoreAddresses[index]) {
      throw new TypeError("CandidateFamily scoreAddresses are not aligned with candidates.");
    }
    if (candidate.timelineHash !== family.timelineHashes[index]) {
      throw new TypeError("CandidateFamily timelineHashes are not aligned with candidates.");
    }
    ownDataObject(candidate.timeline, `CandidateFamily.candidates[${index}].timeline`);
    if (candidate.timeline.timelineHash !== candidate.timelineHash) {
      throw new TypeError("CandidateFamily candidate timeline identity does not match timelineHashes.");
    }
    if (candidate.timeline.scoreAddress !== candidate.scoreAddress) {
      throw new TypeError("CandidateFamily candidate timeline scoreAddress does not match candidate address.");
    }
    if (!candidate.timeline.baseState || typeof candidate.timeline.baseState.topology !== "string") {
      throw new TypeError("CandidateFamily candidate timeline base topology is required.");
    }
  }
  return family;
}

function normalizeGrabParameters(parameters) {
  exactKeys(
    parameters,
    [
      "anchorX",
      "anchorY",
      "targetX",
      "targetY",
      "radiusX",
      "radiusY",
      "pull",
      "recoil",
      "falloff",
      "residualVectorX",
      "residualVectorY",
      "residualStretch",
    ],
    "GRAB parameters",
  );
  return {
    anchorX: boundedNumber(parameters.anchorX, 0, 1, "GRAB anchorX"),
    anchorY: boundedNumber(parameters.anchorY, 0, 1, "GRAB anchorY"),
    targetX: boundedNumber(parameters.targetX, 0, 1, "GRAB targetX"),
    targetY: boundedNumber(parameters.targetY, 0, 1, "GRAB targetY"),
    radiusX: boundedNumber(parameters.radiusX, 0, 1, "GRAB radiusX", { exclusiveMin: true }),
    radiusY: boundedNumber(parameters.radiusY, 0, 1, "GRAB radiusY", { exclusiveMin: true }),
    pull: boundedNumber(parameters.pull, 0, 1, "GRAB pull"),
    recoil: boundedNumber(parameters.recoil, 0, 1, "GRAB recoil"),
    falloff: boundedNumber(parameters.falloff, 0, 1, "GRAB falloff"),
    residualVectorX: boundedNumber(parameters.residualVectorX, -1, 1, "GRAB residualVectorX"),
    residualVectorY: boundedNumber(parameters.residualVectorY, -1, 1, "GRAB residualVectorY"),
    residualStretch: boundedNumber(parameters.residualStretch, -1, 1, "GRAB residualStretch"),
  };
}

function normalizeEvent(request, durationTicks) {
  exactKeys(
    request,
    ["id", "kind", "prepareTick", "strikeTick", "releaseTick", "residueUntilTick", "parameters", "evidenceRefs"],
    "Topology event request",
  );
  if (typeof request.id !== "string" || request.id.length === 0) {
    throw new TypeError("Topology event id must be a non-empty string.");
  }
  if (!TOPOLOGY_EVENT_KINDS.includes(request.kind)) {
    return { refusalReason: "unsupported-event-kind" };
  }
  if (request.kind !== "grab") {
    return { refusalReason: "unsupported-event-kind" };
  }

  const prepareTick = safeTick(request.prepareTick, "prepareTick");
  const strikeTick = safeTick(request.strikeTick, "strikeTick");
  const releaseTick = safeTick(request.releaseTick, "releaseTick");
  const residueUntilTick = safeTick(request.residueUntilTick, "residueUntilTick");
  if (!(prepareTick < strikeTick && strikeTick <= releaseTick && releaseTick < residueUntilTick)) {
    throw new TypeError("GRAB requires prepareTick < strikeTick <= releaseTick < residueUntilTick.");
  }
  if (residueUntilTick > durationTicks) {
    throw new TypeError("Topology event envelope exceeds timeline durationTicks.");
  }

  const core = {
    id: request.id,
    kind: request.kind,
    prepareTick,
    strikeTick,
    releaseTick,
    residueUntilTick,
    parameters: normalizeGrabParameters(request.parameters),
    evidenceRefs: normalizeEvidenceRefs(request.evidenceRefs),
  };
  return {
    event: deepFreeze({
      ...core,
      eventSha256: hashCanonical(core, EVENT_HASH_DOMAIN),
    }),
  };
}

function planFor({ family, candidate, timeline, events, refusalReason = null }) {
  const core = {
    schema: TOPOLOGY_EVENT_PLAN_SCHEMA,
    policyVersion: TOPOLOGY_EVENT_POLICY,
    acceptedFamilyHash: family.familyHash,
    acceptedScoreAddress: candidate.scoreAddress,
    sourceTimelineHash: timeline.timelineHash,
    sourceTopology: timeline.baseState.topology,
    lockedAxes: [...family.locks],
    eventCount: events.length,
    events,
    refusal: refusalReason ? { reason: refusalReason } : null,
  };
  return deepFreeze({
    ...core,
    planSha256: hashCanonical(core, PLAN_HASH_DOMAIN),
  });
}

function attachTopologyEventPlan(timeline, plan, family) {
  if (plan.sourceTimelineHash !== timeline.timelineHash) {
    throw new TypeError("Topology event plan sourceTimelineHash does not match timeline.");
  }
  if (plan.sourceTopology !== timeline.baseState.topology) {
    throw new TypeError("Topology event plan sourceTopology does not match timeline base topology.");
  }
  if (plan.acceptedScoreAddress !== timeline.scoreAddress) {
    throw new TypeError("Topology event plan score address does not match timeline.");
  }
  if (plan.acceptedFamilyHash !== family.familyHash) {
    throw new TypeError("Topology event plan family address does not match accepted CandidateFamily.");
  }

  const {
    timelineHash: _timelineHash,
    canonicalJson: _canonicalJson,
    topologyEvents: _priorTopologyEvents,
    ...currentBody
  } = timeline;
  const body = {
    ...currentBody,
    topologyEvents: plan,
  };
  return deepFreeze({
    ...body,
    timelineHash: hashCanonical(body, TIMELINE_HASH_DOMAIN),
    canonicalJson: canonicalStringify(body),
  });
}

function resolveTopologyEvents(timeline, options) {
  ownDataObject(timeline, "ResolvedTimeline");
  exactKeys(options, ["family", "candidateIndex", "events"], "Topology event options");
  const family = verifyCandidateFamilyAddress(options.family);
  if (!Number.isSafeInteger(options.candidateIndex) || options.candidateIndex < 0) {
    throw new TypeError("candidateIndex must be a non-negative safe integer.");
  }
  const candidate = family.candidates[options.candidateIndex];
  if (!candidate) throw new TypeError("candidateIndex does not exist in CandidateFamily.");
  if (timeline.scoreAddress !== candidate.scoreAddress) {
    throw new TypeError("ResolvedTimeline scoreAddress does not match selected candidate.");
  }
  if (!timeline.baseState || timeline.baseState.topology !== candidate.timeline.baseState.topology) {
    throw new TypeError("ResolvedTimeline base topology does not match selected candidate.");
  }
  if (!Number.isSafeInteger(timeline.durationTicks) || timeline.durationTicks < 1) {
    throw new TypeError("ResolvedTimeline durationTicks is invalid.");
  }
  if (!SHA256_RE.test(timeline.timelineHash || "")) {
    throw new TypeError("ResolvedTimeline timelineHash must be lowercase SHA-256.");
  }
  if (!Array.isArray(options.events)) {
    throw new TypeError("Topology event events must be an array.");
  }

  if (family.locks.includes("topology")) {
    return attachTopologyEventPlan(
      timeline,
      planFor({
        family,
        candidate,
        timeline,
        events: [],
        refusalReason: "topology-lock-prohibits-topology-events",
      }),
      family,
    );
  }
  if (options.events.length === 0) {
    return attachTopologyEventPlan(
      timeline,
      planFor({ family, candidate, timeline, events: [], refusalReason: "no-lawful-event-window" }),
      family,
    );
  }

  const normalized = [];
  for (const request of options.events) {
    const result = normalizeEvent(request, timeline.durationTicks);
    if (result.refusalReason) {
      return attachTopologyEventPlan(
        timeline,
        planFor({ family, candidate, timeline, events: [], refusalReason: result.refusalReason }),
        family,
      );
    }
    normalized.push(result.event);
  }
  normalized.sort((left, right) =>
    left.prepareTick - right.prepareTick || left.id.localeCompare(right.id),
  );

  return attachTopologyEventPlan(
    timeline,
    planFor({ family, candidate, timeline, events: normalized }),
    family,
  );
}

module.exports = {
  TOPOLOGY_EVENT_KINDS,
  TOPOLOGY_EVENT_PLAN_SCHEMA,
  TOPOLOGY_EVENT_POLICY,
  attachTopologyEventPlan,
  resolveTopologyEvents,
  verifyCandidateFamilyAddress,
};
