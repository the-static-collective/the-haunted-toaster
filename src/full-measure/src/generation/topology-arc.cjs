const { canonicalStringify, deepFreeze, hashCanonical } = require("./canonical.cjs");
const { MUTATION_LATTICE_RENDERER_POLICY } = require("./renderer-policy.cjs");

const TOPOLOGY_ARC_POLICY = "topology-arc-v1";
const TOPOLOGY_ARC_DOMAIN = "HauntedToaster-TopologyArc-v1";
const TOPOLOGY_ARC_REFUSAL_SCHEMA = "haunted-toaster/topology-arc-refusal/v1";
const MAX_TOPOLOGY_ARC_WINDOWS = 2;
const SHAPE_PACK_TOPOLOGIES = Object.freeze([
  "elastic-spine",
  "split-horizon",
  "cathedral-fan",
  "echo-tunnel",
]);
const OUTCOMES = Object.freeze(["dissolve", "scar", "succession"]);
const SCAR_AXES = Object.freeze(["material", "motion"]);

const COMPILER_IDS = Object.freeze({
  linear: "linear-v1",
  circle: "circle-v2",
  "mirrored-ring": "mirrored-ring-v2",
  spiral: "spiral-polar-v2",
  "quad-mirror": "quad-mirror-v2",
  "elastic-spine": "elastic-spine-v3",
  "split-horizon": "split-horizon-v3",
  "cathedral-fan": "cathedral-fan-v3",
  "echo-tunnel": "echo-tunnel-v3",
});

function uniqueSorted(values) {
  return [...new Set((values || []).map(String))].sort();
}

function topologyCompilerId(topology) {
  const id = COMPILER_IDS[topology];
  if (!id) throw new TypeError(`No topology compiler identity is known for ${String(topology)}.`);
  return id;
}

function refusal(reason, evidence = {}) {
  const core = {
    schema: TOPOLOGY_ARC_REFUSAL_SCHEMA,
    reason,
    evidence: structuredClone(evidence),
  };
  return deepFreeze({
    ...core,
    refusalSha256: hashCanonical(core, "HauntedToaster-TopologyArcRefusal-v1"),
  });
}

function sectionBoundaries(analysis) {
  const sections = Array.isArray(analysis?.sections) ? analysis.sections : [];
  return sections.slice(1).map((section, index) => {
    const previous = sections[index] || {};
    const startSeconds = Number(section.startSeconds ?? section.start ?? 0);
    const previousEnergy = Number(previous.energy) || 0;
    const nextEnergy = Number(section.energy) || 0;
    return Object.freeze({
      ordinal: index + 1,
      startSeconds,
      contrast: Math.round(Math.abs(nextEnergy - previousEnergy) * 1_000_000) / 1_000_000,
      previousLabel: String(previous.label || `section-${index}`),
      nextLabel: String(section.label || `section-${index + 1}`),
    });
  }).filter((boundary) => Number.isFinite(boundary.startSeconds) && boundary.startSeconds > 0);
}

function deterministicOrder(rootSeed, domain, values) {
  return values.slice().sort((left, right) => {
    const leftHash = hashCanonical({ rootSeed: String(rootSeed), value: left }, domain);
    const rightHash = hashCanonical({ rootSeed: String(rootSeed), value: right }, domain);
    return leftHash.localeCompare(rightHash);
  });
}

function chooseGhostTopologies(sourceTopology, allowed, rootSeed) {
  const legal = uniqueSorted(allowed).filter((topology) => topology !== sourceTopology && COMPILER_IDS[topology]);
  const shapes = deterministicOrder(rootSeed, "HauntedToaster-TopologyArcShapeTie-v1", legal.filter((value) => SHAPE_PACK_TOPOLOGIES.includes(value)));
  const ancestors = deterministicOrder(rootSeed, "HauntedToaster-TopologyArcAncestorTie-v1", legal.filter((value) => !SHAPE_PACK_TOPOLOGIES.includes(value)));
  return [...shapes, ...ancestors];
}

function chooseOutcome(rootSeed, ordinal, usedSuccession, locks) {
  const digest = hashCanonical({ rootSeed: String(rootSeed), ordinal }, "HauntedToaster-TopologyArcOutcome-v1");
  const candidates = OUTCOMES.filter((outcome) => outcome !== "succession" || !usedSuccession);
  let outcome = candidates[Number.parseInt(digest.slice(0, 8), 16) % candidates.length];
  if (outcome === "scar" && SCAR_AXES.every((axis) => locks.includes(axis))) outcome = "dissolve";
  return outcome;
}

function chooseScar(rootSeed, ordinal, locks) {
  const legal = SCAR_AXES.filter((axis) => !locks.includes(axis));
  if (!legal.length) return null;
  const digest = hashCanonical({ rootSeed: String(rootSeed), ordinal, legal }, "HauntedToaster-TopologyArcScar-v1");
  const axis = legal[Number.parseInt(digest.slice(0, 8), 16) % legal.length];
  return deepFreeze({
    axis,
    policy: "ghost-residue-v1",
    residueOpacity: axis === "material" ? 0.14 : 0.1,
  });
}

function windowFor({ boundary, ghostTopology, outcome, scar, sourceTopology, timebase, durationSeconds, ordinal }) {
  const halfWidth = Math.min(2.5, Math.max(0.75, durationSeconds / 80));
  const entranceSeconds = Math.max(0, boundary.startSeconds - halfWidth);
  const peakSeconds = Math.max(entranceSeconds, Math.min(durationSeconds, boundary.startSeconds));
  const releaseSeconds = Math.max(peakSeconds, Math.min(durationSeconds, boundary.startSeconds + halfWidth));
  const core = {
    ordinal,
    sourceTopology,
    ghostTopology,
    sourceCompiler: topologyCompilerId(sourceTopology),
    ghostCompiler: topologyCompilerId(ghostTopology),
    entranceTick: Math.round(entranceSeconds * timebase),
    peakTick: Math.round(peakSeconds * timebase),
    releaseTick: Math.round(releaseSeconds * timebase),
    boundaryEvidence: {
      previousLabel: boundary.previousLabel,
      nextLabel: boundary.nextLabel,
      contrast: boundary.contrast,
    },
    overlapPolicy: "shared-stage-screen-v1",
    outcome,
    scar,
  };
  return deepFreeze({
    ...core,
    windowSha256: hashCanonical(core, "HauntedToaster-TopologyArcWindow-v1"),
  });
}

function normalizeWindows(windows) {
  const out = [];
  for (const window of windows.sort((a, b) => a.entranceTick - b.entranceTick || a.ordinal - b.ordinal)) {
    const previous = out[out.length - 1];
    if (!previous || previous.releaseTick <= window.entranceTick) {
      out.push(window);
      continue;
    }
    const shifted = {
      ...structuredClone(window),
      entranceTick: previous.releaseTick,
      peakTick: Math.max(previous.releaseTick, window.peakTick),
      releaseTick: Math.max(previous.releaseTick, window.releaseTick),
    };
    const { windowSha256: _ignored, ...core } = shifted;
    out.push(deepFreeze({
      ...core,
      windowSha256: hashCanonical(core, "HauntedToaster-TopologyArcWindow-v1"),
    }));
  }
  return out;
}

function planTopologyArc({
  analysis,
  score,
  constraints,
  rootSeed,
  toastFeelId = null,
  locks = [],
  timebase = 1000,
  durationSeconds: durationOverride = null,
} = {}) {
  if (!score?.topology) throw new TypeError("Topology Arc requires an accepted source topology.");
  if (rootSeed === undefined || rootSeed === null || String(rootSeed).length === 0) {
    throw new TypeError("Topology Arc requires rootSeed.");
  }
  const normalizedLocks = uniqueSorted(locks);
  const durationSeconds = Number(durationOverride ?? analysis?.durationSeconds ?? analysis?.duration ?? 0);
  const sourceTopology = score.topology;
  const allowed = constraints?.topology?.allowed || [];
  const boundaries = sectionBoundaries(analysis);

  let windows = [];
  let refusalEvidence = null;
  if (normalizedLocks.includes("topology")) {
    refusalEvidence = refusal("topology-lock-prohibits-topology-arc", { sourceTopology, locks: normalizedLocks });
  } else {
    const ghostTopologies = chooseGhostTopologies(sourceTopology, allowed, rootSeed);
    if (!ghostTopologies.length) {
      refusalEvidence = refusal("no-lawful-ghost-topology", { sourceTopology, allowed: uniqueSorted(allowed) });
    } else if (!boundaries.length || !(durationSeconds > 0)) {
      refusalEvidence = refusal("no-lawful-section-boundary", { boundaryCount: boundaries.length, durationSeconds });
    } else {
      const rankedBoundaries = boundaries.slice().sort((left, right) =>
        right.contrast - left.contrast || left.ordinal - right.ordinal);
      const requested = toastFeelId === "risky-hybrid" ? 2 : 1;
      const count = Math.min(MAX_TOPOLOGY_ARC_WINDOWS, requested, rankedBoundaries.length, ghostTopologies.length);
      let usedSuccession = false;
      const scheduled = [];
      for (let index = 0; index < count; index += 1) {
        const boundary = rankedBoundaries[index];
        const outcome = chooseOutcome(rootSeed, boundary.ordinal, usedSuccession, normalizedLocks);
        usedSuccession ||= outcome === "succession";
        const scar = outcome === "scar" ? chooseScar(rootSeed, boundary.ordinal, normalizedLocks) : null;
        scheduled.push(windowFor({
          boundary,
          ghostTopology: ghostTopologies[index],
          outcome,
          scar,
          sourceTopology,
          timebase: Number(timebase) || 1000,
          durationSeconds,
          ordinal: index,
        }));
      }
      windows = normalizeWindows(scheduled).sort((a, b) => a.entranceTick - b.entranceTick);
    }
  }

  const core = {
    policyVersion: TOPOLOGY_ARC_POLICY,
    sourceTopology,
    lockedAxes: normalizedLocks,
    maxWindows: MAX_TOPOLOGY_ARC_WINDOWS,
    windowCount: windows.length,
    windows,
    refusal: refusalEvidence,
  };
  return deepFreeze({
    ...core,
    planSha256: hashCanonical(core, TOPOLOGY_ARC_DOMAIN),
  });
}

function attachTopologyArc(timelineInput, options = {}) {
  if (timelineInput?.rendererPolicy !== MUTATION_LATTICE_RENDERER_POLICY) return timelineInput;
  const plan = planTopologyArc({
    ...options,
    timebase: timelineInput.timebase,
    durationSeconds: timelineInput.durationTicks / timelineInput.timebase,
  });
  const {
    timelineHash: _timelineHash,
    canonicalJson: _canonicalJson,
    topologyArc: _topologyArc,
    ...baseBody
  } = timelineInput;
  const body = {
    ...structuredClone(baseBody),
    topologyArc: plan,
  };
  const timelineHash = hashCanonical(body, "HauntedToaster-ResolvedTimeline-v1");
  return deepFreeze({
    ...body,
    timelineHash,
    canonicalJson: canonicalStringify(body),
  });
}

module.exports = {
  COMPILER_IDS,
  MAX_TOPOLOGY_ARC_WINDOWS,
  OUTCOMES,
  SCAR_AXES,
  SHAPE_PACK_TOPOLOGIES,
  TOPOLOGY_ARC_POLICY,
  TOPOLOGY_ARC_REFUSAL_SCHEMA,
  attachTopologyArc,
  planTopologyArc,
  topologyCompilerId,
};
