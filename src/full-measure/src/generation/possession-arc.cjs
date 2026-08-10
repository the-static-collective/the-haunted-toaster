const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const { createPrng } = require("./prng.cjs");
const legacyResolver = require("./resolver.cjs");
const atmosphereGeneration = require("./atmosphere-generation.cjs");
const colorDrift = require("./color-drift.cjs");

const POSSESSION_ARC_POLICY = "possession-arc-v1";
const POSSESSION_ARC_DOMAIN = "HauntedToaster-PossessionArc-v1";
const MAX_ARC_TRANSITIONS = 3;
const ARC_AXES = Object.freeze(["motion", "material", "camera", "palette"]);
const CATEGORY_KEYS = Object.freeze({
  motion: "grammar",
  material: "texture",
  camera: "grammar",
  palette: "logic",
});
const INTENSITY_ORDER = Object.freeze({
  motion: Object.freeze(["still", "drift", "pulse", "orbit", "fracture"]),
  material: Object.freeze(["clean", "grain", "gate-weave", "photocopy"]),
  camera: Object.freeze(["locked", "drift", "push", "orbit"]),
  palette: Object.freeze(["garment", "analogous", "duotone", "split-complement"]),
});

function categoryOf(state, axis) {
  return state?.[axis]?.[CATEGORY_KEYS[axis]];
}

function allowedCategories(constraints, axis) {
  if (axis === "motion") return constraints?.motion?.grammar?.allowed || [];
  if (axis === "material") return constraints?.material?.texture?.allowed || [];
  if (axis === "camera") return constraints?.camera?.grammar?.allowed || [];
  if (axis === "palette") return constraints?.palette?.logic?.allowed || [];
  return [];
}

function normalizeArcLocks(locks = []) {
  return [...new Set((locks || []).map(String))]
    .filter((axis) => ARC_AXES.includes(axis))
    .sort();
}

function sectionBoundaries(analysis) {
  const sections = Array.isArray(analysis?.sections) ? analysis.sections : [];
  return sections.slice(1).map((section, index) => {
    const previous = sections[index];
    const previousEnergy = Number(previous?.energy) || 0;
    const nextEnergy = Number(section?.energy) || 0;
    return Object.freeze({
      atSeconds: Number(section.startSeconds),
      previousLabel: String(previous?.label || `section-${index}`),
      nextLabel: String(section?.label || `section-${index + 1}`),
      previousEnergy,
      nextEnergy,
      energyDelta: Math.round((nextEnergy - previousEnergy) * 1_000_000) / 1_000_000,
      contrast: Math.abs(nextEnergy - previousEnergy),
      ordinal: index + 1,
    });
  });
}

function strongestBoundaries(analysis, maximum = MAX_ARC_TRANSITIONS) {
  const candidates = sectionBoundaries(analysis);
  if (candidates.length <= maximum) return candidates;
  return candidates
    .slice()
    .sort((left, right) => right.contrast - left.contrast || left.ordinal - right.ordinal)
    .slice(0, maximum)
    .sort((left, right) => left.atSeconds - right.atSeconds);
}

function legalArcAxes(constraints, locks = []) {
  const locked = new Set(normalizeArcLocks(locks));
  return ARC_AXES.filter((axis) => {
    const policy = constraints?.patchPolicy?.axes?.[axis];
    return Boolean(
      !locked.has(axis) &&
      policy?.boundaries?.includes("section") &&
      allowedCategories(constraints, axis).length > 1,
    );
  });
}

function pickDifferentCategory(axis, current, allowed, energyDelta, prng) {
  const alternatives = allowed.filter((value) => value !== current);
  if (!alternatives.length) return current;
  const order = INTENSITY_ORDER[axis] || allowed;
  const currentRank = order.indexOf(current);
  if (currentRank >= 0 && Math.abs(energyDelta) >= 0.08) {
    const directional = alternatives.filter((value) => {
      const rank = order.indexOf(value);
      if (rank < 0) return false;
      return energyDelta > 0 ? rank > currentRank : rank < currentRank;
    });
    if (directional.length) return prng.pick(directional);
  }
  return prng.pick(alternatives);
}

function scheduledArcTransitions(timeline, analysis, score, constraints, locks = []) {
  const boundaries = strongestBoundaries(analysis);
  const legalAxes = legalArcAxes(constraints, locks);
  if (!boundaries.length || !legalAxes.length) return [];

  const prng = createPrng(
    `${score.seed}|${timeline.scoreAddress}|${timeline.analysisHash}|${POSSESSION_ARC_POLICY}`,
  );
  const usedAxes = new Set();
  const currentCategories = Object.fromEntries(
    legalAxes.map((axis) => [axis, categoryOf(timeline.baseState, axis)]),
  );
  const transitions = [];

  for (const boundary of boundaries) {
    const unused = legalAxes.filter((axis) => !usedAxes.has(axis));
    const pool = unused.length ? unused : legalAxes;
    const axis = prng.pick(pool);
    const from = currentCategories[axis];
    const to = pickDifferentCategory(
      axis,
      from,
      allowedCategories(constraints, axis),
      boundary.energyDelta,
      prng,
    );
    if (to === from) continue;
    currentCategories[axis] = to;
    usedAxes.add(axis);
    transitions.push({
      atTick: Math.max(
        0,
        Math.min(
          timeline.durationTicks,
          Math.round(boundary.atSeconds * timeline.timebase),
        ),
      ),
      boundary: "section",
      axis,
      from,
      to,
      transition: "cut",
      triggerEvidence: {
        previousSection: boundary.previousLabel,
        nextSection: boundary.nextLabel,
        previousEnergy: boundary.previousEnergy,
        nextEnergy: boundary.nextEnergy,
        energyDelta: boundary.energyDelta,
      },
    });
  }
  return transitions;
}

function categoricalPreservingPatch(patch, state) {
  const next = structuredClone(patch);
  if (!ARC_AXES.includes(next.axis) || !next.to?.[next.axis]) return next;
  const key = CATEGORY_KEYS[next.axis];
  next.to[next.axis][key] = categoryOf(state, next.axis);
  return next;
}

function transitionPatch(transition, state) {
  const axis = transition.axis;
  const key = CATEGORY_KEYS[axis];
  return {
    ...structuredClone(transition),
    from: categoryOf(state, axis),
    to: {
      [axis]: {
        ...structuredClone(state[axis]),
        [key]: transition.to,
      },
    },
  };
}

function interleaveTimeline(baseTimeline, scheduled) {
  const events = [
    ...baseTimeline.patches.map((patch, index) => ({
      kind: "patch",
      atTick: patch.atTick,
      priority: 0,
      index,
      value: patch,
    })),
    ...scheduled.map((transition, index) => ({
      kind: "arc",
      atTick: transition.atTick,
      priority: 1,
      index,
      value: transition,
    })),
  ].sort((left, right) =>
    left.atTick - right.atTick ||
    left.priority - right.priority ||
    left.index - right.index,
  );

  let state = structuredClone(baseTimeline.baseState);
  const patches = [];
  const transitions = [];

  for (const event of events) {
    if (event.kind === "patch") {
      const patch = categoricalPreservingPatch(event.value, state);
      patch.priorStateHash = hashCanonical(state, "HauntedToaster-ResolvedState-v1");
      patches.push(patch);
      state = legacyResolver.applyPatch(state, patch);
      continue;
    }

    const transition = transitionPatch(event.value, state);
    transition.priorStateHash = hashCanonical(state, "HauntedToaster-ResolvedState-v1");
    transitions.push(transition);
    state = legacyResolver.applyPatch(state, transition);
  }

  return { patches, transitions };
}

function applyPossessionArc(timelineInput, {
  analysis,
  score,
  constraints,
  locks = [],
} = {}) {
  if (!timelineInput || typeof timelineInput !== "object") {
    throw new TypeError("ResolvedTimeline is required for Possession Arc resolution.");
  }
  if (timelineInput.possessionArc?.policyVersion === POSSESSION_ARC_POLICY) {
    return timelineInput;
  }
  if (!analysis || !score || !constraints) {
    throw new TypeError("Possession Arc requires analysis, score, and constraints.");
  }

  const lockedAxes = normalizeArcLocks(locks);
  const scheduled = scheduledArcTransitions(
    timelineInput,
    analysis,
    score,
    constraints,
    lockedAxes,
  );
  if (!scheduled.length) return timelineInput;
  const { patches, transitions } = interleaveTimeline(timelineInput, scheduled);
  const affectedAxes = [...new Set(transitions.map((transition) => transition.axis))];
  const planCore = {
    policyVersion: POSSESSION_ARC_POLICY,
    transitionPolicy: "cut",
    maxTransitions: MAX_ARC_TRANSITIONS,
    lockedAxes,
    affectedAxes,
    transitions,
  };
  const planSha256 = hashCanonical(planCore, POSSESSION_ARC_DOMAIN);
  const possessionArc = {
    ...planCore,
    transitionCount: transitions.length,
    planSha256,
    dramaturgy: {
      budget: MAX_ARC_TRANSITIONS,
      spent: transitions.length,
    },
  };
  const {
    timelineHash: _timelineHash,
    canonicalJson: _canonicalJson,
    ...baseBody
  } = timelineInput;
  const body = {
    ...structuredClone(baseBody),
    patches,
    possessionArc,
  };
  const timelineHash = hashCanonical(body, "HauntedToaster-ResolvedTimeline-v1");
  return deepFreeze({
    ...body,
    timelineHash,
    canonicalJson: canonicalStringify(body),
  });
}

function stateAtTick(timeline, tick) {
  if (!timeline?.possessionArc?.transitions?.length) {
    return legacyResolver.stateAtTick(timeline, tick);
  }
  const target = Math.max(0, Math.round(Number(tick)));
  const events = [
    ...(timeline.patches || []).map((patch, index) => ({
      atTick: patch.atTick,
      priority: 0,
      index,
      value: patch,
    })),
    ...timeline.possessionArc.transitions.map((transition, index) => ({
      atTick: transition.atTick,
      priority: 1,
      index,
      value: transition,
    })),
  ].sort((left, right) =>
    left.atTick - right.atTick ||
    left.priority - right.priority ||
    left.index - right.index,
  );
  let state = structuredClone(timeline.baseState);
  for (const event of events) {
    if (event.atTick > target) break;
    state = legacyResolver.applyPatch(state, event.value);
  }
  return state;
}

function rebuildFamilyWithArc(family, options) {
  const locks = family.locks || options.locks || [];
  const candidates = family.candidates.map((candidate) => {
    const arcTimeline = applyPossessionArc(candidate.timeline, {
      analysis: options.analysis,
      score: candidate.scoreArtifact.score,
      constraints: options.garmentConstraints || options.constraints,
      locks,
    });
    const timeline = colorDrift.applyColorDrift(arcTimeline, {
      analysis: options.analysis,
    });
    return deepFreeze({
      ...candidate,
      timeline,
      timelineHash: timeline.timelineHash,
    });
  });
  const {
    familyHash: _familyHash,
    candidates: _candidates,
    timelineHashes: _timelineHashes,
    analysisHash: _analysisHash,
    constraintsHash: _constraintsHash,
    rendererProfileHash: _rendererProfileHash,
    ...stableCore
  } = family;
  const familyCore = {
    ...stableCore,
    analysisHash: candidates[0].timeline.analysisHash,
    constraintsHash: candidates[0].timeline.constraintsHash,
    rendererProfileHash: candidates[0].timeline.rendererProfileHash,
    timelineHashes: candidates.map((candidate) => candidate.timelineHash),
  };
  return deepFreeze({
    ...familyCore,
    familyHash: hashCanonical(familyCore, "HauntedToaster-CandidateFamily-v1"),
    candidates,
  });
}

function generateCandidateSet(options) {
  return rebuildFamilyWithArc(
    atmosphereGeneration.generateCandidateSet(options),
    options,
  );
}

function replayCandidateFamily(family, options = {}) {
  const replayed = generateCandidateSet({
    ...options,
    locks: family.locks,
    rootSeed: family.rootSeed,
    count: family.requestedCount,
    phase: family.phase,
  });
  const addressesMatch =
    canonicalStringify(replayed.scoreAddresses) === canonicalStringify(family.scoreAddresses);
  const timelinesMatch =
    canonicalStringify(replayed.timelineHashes) === canonicalStringify(family.timelineHashes);
  const familyHashMatches = replayed.familyHash === family.familyHash;
  return deepFreeze({
    schema: "haunted-toaster/candidate-family-replay/v1",
    ok: addressesMatch && timelinesMatch && familyHashMatches,
    addressesMatch,
    timelinesMatch,
    familyHashMatches,
    expectedFamilyHash: family.familyHash,
    actualFamilyHash: replayed.familyHash,
    expectedScoreAddresses: family.scoreAddresses,
    actualScoreAddresses: replayed.scoreAddresses,
    expectedTimelineHashes: family.timelineHashes,
    actualTimelineHashes: replayed.timelineHashes,
    replayed,
  });
}

function replaceFinalCandidateWithConverge(family, options = {}) {
  return rebuildFamilyWithArc(
    atmosphereGeneration.replaceFinalCandidateWithConverge(family, options),
    {
      ...options,
      garmentConstraints: options.constraints,
    },
  );
}

module.exports = {
  ARC_AXES,
  MAX_ARC_TRANSITIONS,
  POSSESSION_ARC_POLICY,
  applyPossessionArc,
  generateCandidateSet,
  legalArcAxes,
  normalizeArcLocks,
  replaceFinalCandidateWithConverge,
  replayCandidateFamily,
  scheduledArcTransitions,
  stateAtTick,
  strongestBoundaries,
};