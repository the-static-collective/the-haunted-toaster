const {
  canonicalStringify,
  deepFreeze,
  hashCanonical,
} = require("./canonical.cjs");
const {
  generateCandidateSet,
} = require("./beta-candidate-ecology-compat.cjs");
const base = require("./nested-response-generation.cjs");
const {
  ATMOSPHERE_POLICY,
} = require("./atmosphere-generation.cjs");
const {
  buildGrabRequest,
} = require("./topology-event-generation.cjs");
const {
  projectTopologyEventAuthority,
} = require("./topology-event-authority.cjs");
const {
  resolveTopologyEvents,
} = require("./topology-events.cjs");

const TEST_SIX_SCHEMA = "haunted-toaster/test-six-family/v0";
const TEST_SIX_POLICY = "forced-witness-test-6-v0";
const TEST_SIX_DOMAIN = "HauntedToaster-TestSixFamily-v0";
const TEST_SIX_SOURCE_DOMAIN = "HauntedToaster-TestSixSourceSeed-v0";
const TIMELINE_DOMAIN = "HauntedToaster-ResolvedTimeline-v1";
const TOPOLOGY_ARC_DOMAIN = "HauntedToaster-TopologyArc-v1";
const TOPOLOGY_ARC_WINDOW_DOMAIN = "HauntedToaster-TopologyArcWindow-v1";

const FIXTURES = deepFreeze([
  {
    slot: "big-grab",
    label: "BIG GRAB",
    forcedCondition: "guaranteed-grab",
    grab: {
      anchorX: 0.28,
      anchorY: 0.54,
      targetX: 0.74,
      targetY: 0.43,
      radiusX: 0.3,
      radiusY: 0.25,
      pull: 0.92,
      recoil: 0.68,
      falloff: 0.72,
      residualVectorX: 0.12,
      residualVectorY: -0.05,
      residualStretch: 0.09,
    },
  },
  {
    slot: "tight-grab",
    label: "TIGHT GRAB",
    forcedCondition: "guaranteed-grab",
    grab: {
      anchorX: 0.45,
      anchorY: 0.46,
      targetX: 0.62,
      targetY: 0.42,
      radiusX: 0.1,
      radiusY: 0.08,
      pull: 0.58,
      recoil: 0.44,
      falloff: 0.9,
      residualVectorX: 0.04,
      residualVectorY: -0.02,
      residualStretch: 0.03,
    },
  },
  {
    slot: "wide-grab",
    label: "WIDE GRAB",
    forcedCondition: "guaranteed-grab",
    grab: {
      anchorX: 0.24,
      anchorY: 0.5,
      targetX: 0.69,
      targetY: 0.53,
      radiusX: 0.48,
      radiusY: 0.36,
      pull: 0.72,
      recoil: 0.5,
      falloff: 0.56,
      residualVectorX: 0.1,
      residualVectorY: 0.02,
      residualStretch: 0.07,
    },
  },
  {
    slot: "scar",
    label: "SCAR",
    forcedCondition: "guaranteed-scar",
    topologyArcOutcome: "scar",
  },
  {
    slot: "succession",
    label: "SUCCESSION",
    forcedCondition: "guaranteed-succession",
    topologyArcOutcome: "succession",
  },
  {
    slot: "kitchen-sink",
    label: "KITCHEN SINK",
    forcedCondition: "guaranteed-integration-stress",
    grab: {
      anchorX: 0.31,
      anchorY: 0.57,
      targetX: 0.71,
      targetY: 0.45,
      radiusX: 0.27,
      radiusY: 0.22,
      pull: 0.78,
      recoil: 0.58,
      falloff: 0.68,
      residualVectorX: 0.085,
      residualVectorY: -0.035,
      residualStretch: 0.065,
    },
    forcedRenderConfig: { atmosphereResolutionScale: 0.5 },
  },
]);

function fixtureReceipt(fixture) {
  return deepFreeze({
    forcedWitness: true,
    fixtureFamily: "test-6",
    fixtureSlot: fixture.slot,
    forcedCondition: fixture.forcedCondition,
    policyVersion: TEST_SIX_POLICY,
  });
}

function rehashTopologyArcWindow(window, outcome) {
  const {
    windowSha256: _windowSha256,
    outcome: _priorOutcome,
    scar: _priorScar,
    ...stable
  } = window;
  const scar = outcome === "scar"
    ? deepFreeze({ axis: "material", policy: "ghost-residue-v1", residueOpacity: 0.14 })
    : null;
  const core = {
    ...structuredClone(stable),
    outcome,
    scar,
  };
  return deepFreeze({
    ...core,
    windowSha256: hashCanonical(core, TOPOLOGY_ARC_WINDOW_DOMAIN),
  });
}

function forceExistingTopologyArcOutcome(timeline, outcome) {
  if (!timeline?.topologyArc || !Array.isArray(timeline.topologyArc.windows) || !timeline.topologyArc.windows.length) {
    throw new TypeError(`TEST 6 ${outcome} fixture requires an existing Topology Arc window.`);
  }
  if (outcome !== "scar" && outcome !== "succession") {
    throw new TypeError("TEST 6 may force only existing scar or succession outcomes.");
  }

  const windows = timeline.topologyArc.windows.map((window, index) =>
    index === 0 ? rehashTopologyArcWindow(window, outcome) : window,
  );
  const {
    planSha256: _planSha256,
    windows: _priorWindows,
    windowCount: _priorWindowCount,
    refusal: _priorRefusal,
    ...stablePlan
  } = timeline.topologyArc;
  const planCore = {
    ...structuredClone(stablePlan),
    windowCount: windows.length,
    windows,
    refusal: null,
  };
  const topologyArc = deepFreeze({
    ...planCore,
    planSha256: hashCanonical(planCore, TOPOLOGY_ARC_DOMAIN),
  });

  const {
    timelineHash: _timelineHash,
    canonicalJson: _canonicalJson,
    topologyArc: _priorTopologyArc,
    ...stableTimeline
  } = timeline;
  const body = {
    ...structuredClone(stableTimeline),
    topologyArc,
  };
  return deepFreeze({
    ...body,
    timelineHash: hashCanonical(body, TIMELINE_DOMAIN),
    canonicalJson: canonicalStringify(body),
  });
}

function projectExistingAtmosphereEvidence(timeline, sourceCandidate) {
  const scoreAtmosphere = sourceCandidate?.scoreArtifact?.score?.atmosphere;
  const acceptedAtmosphere = timeline?.baseState?.atmosphere;
  if (
    typeof scoreAtmosphere !== "string" ||
    typeof acceptedAtmosphere !== "string" ||
    scoreAtmosphere !== acceptedAtmosphere
  ) {
    throw new TypeError("TEST 6 KITCHEN SINK requires existing accepted Atmosphere authority.");
  }

  const {
    timelineHash: _timelineHash,
    canonicalJson: _canonicalJson,
    atmosphere: _priorAtmosphere,
    ...stableTimeline
  } = timeline;
  const body = {
    ...structuredClone(stableTimeline),
    atmosphere: deepFreeze({
      policyVersion: ATMOSPHERE_POLICY,
      kind: acceptedAtmosphere,
      source: "accepted-timeline-base-state",
      witnessOnly: true,
    }),
  };
  return deepFreeze({
    ...body,
    timelineHash: hashCanonical(body, TIMELINE_DOMAIN),
    canonicalJson: canonicalStringify(body),
  });
}

function generationOptions(options) {
  return {
    analysis: options.analysis,
    responseWitness: options.responseWitness,
    garmentConstraints: options.garmentConstraints,
    rendererProfile: options.rendererProfile,
    lyricTrack: options.lyricTrack,
    nativeChromaticProfile: options.nativeChromaticProfile || null,
  };
}

function sourceFamilyFor(options, rootSeed) {
  const sourceRootSeed = hashCanonical(
    {
      policyVersion: TEST_SIX_POLICY,
      rootSeed: String(rootSeed),
    },
    TEST_SIX_SOURCE_DOMAIN,
  );
  return generateCandidateSet({
    ...generationOptions(options),
    rootSeed: sourceRootSeed,
    count: 6,
    phase: "initial",
    toastFeelId: options.toastFeelId || null,
  });
}

function canonicalAuthorityForCandidate(sourceFamily, sourceCandidate, options) {
  const lane = sourceCandidate?.toastmoodLane;
  if (!lane?.sourceRootSeed || !lane?.id) {
    return {
      family: projectTopologyEventAuthority(sourceFamily),
      candidateIndex: sourceCandidate.index,
      sourceFamilyHash: sourceFamily.familyHash,
    };
  }

  const sourceAuthorityFamily = base.generateCandidateSet({
    ...generationOptions(options),
    rootSeed: lane.sourceRootSeed,
    count: 6,
    phase: "initial",
    toastFeelId: lane.id,
  });
  const candidateIndex = sourceAuthorityFamily.candidates.findIndex(
    (candidate) => candidate.timelineHash === sourceCandidate.timelineHash,
  );
  if (candidateIndex < 0) {
    throw new TypeError("TEST 6 could not recover source-family authority for the selected beta candidate.");
  }
  return {
    family: projectTopologyEventAuthority(sourceAuthorityFamily),
    candidateIndex,
    sourceFamilyHash: sourceAuthorityFamily.familyHash,
  };
}

function applyFixture(sourceFamily, sourceCandidate, fixture, options, fixtureIndex) {
  let timeline = sourceCandidate.timeline;
  if (fixture.topologyArcOutcome) {
    timeline = forceExistingTopologyArcOutcome(timeline, fixture.topologyArcOutcome);
  }
  if (fixture.grab) {
    const authority = canonicalAuthorityForCandidate(sourceFamily, sourceCandidate, options);
    timeline = resolveTopologyEvents(timeline, {
      family: authority.family,
      candidateIndex: authority.candidateIndex,
      events: [
        buildGrabRequest(timeline, {
          id: `test-6-${fixture.slot}`,
          parameters: fixture.grab,
          evidenceRefs: [
            "fixture-family:test-6",
            `fixture-slot:${fixture.slot}`,
            `event-authority:${authority.family.familyHash}`,
            `source-family:${authority.sourceFamilyHash}`,
            `field-family:${sourceFamily.familyHash}`,
          ],
          salt: `test-6:${fixture.slot}`,
        }),
      ],
    });
  }
  if (fixture.slot === "kitchen-sink") {
    timeline = projectExistingAtmosphereEvidence(timeline, sourceCandidate);
  }

  const receipt = fixtureReceipt(fixture);
  return deepFreeze({
    ...sourceCandidate,
    index: fixtureIndex,
    role: `test-6:${fixture.slot}`,
    timeline,
    timelineHash: timeline.timelineHash,
    forcedWitness: true,
    fixtureFamily: "test-6",
    fixtureSlot: fixture.slot,
    fixtureLabel: fixture.label,
    forcedCondition: fixture.forcedCondition,
    fixtureReceipt: receipt,
    forcedWitnessEvidence: receipt,
    forcedRenderConfig: fixture.forcedRenderConfig
      ? deepFreeze(structuredClone(fixture.forcedRenderConfig))
      : null,
  });
}

function generateTestSixWitnessFamily(options = {}) {
  const rootSeed = options.rootSeed;
  if (rootSeed === undefined || rootSeed === null || String(rootSeed).length === 0) {
    throw new TypeError("TEST 6 requires rootSeed.");
  }
  if (!options.analysis || !options.garmentConstraints || !options.rendererProfile) {
    throw new TypeError("TEST 6 requires analysis, garmentConstraints, and rendererProfile.");
  }

  const sourceFamily = sourceFamilyFor(options, rootSeed);
  if (!Array.isArray(sourceFamily.candidates) || sourceFamily.candidates.length !== FIXTURES.length) {
    throw new TypeError("TEST 6 source family must produce exactly six candidates.");
  }

  const candidates = FIXTURES.map((fixture, index) =>
    applyFixture(sourceFamily, sourceFamily.candidates[index], fixture, options, index),
  );
  const core = {
    schema: TEST_SIX_SCHEMA,
    policy: TEST_SIX_POLICY,
    forcedWitness: true,
    fixtureFamily: "test-6",
    rootSeed: String(rootSeed),
    sourceFamilyHash: sourceFamily.familyHash,
    sourceRootSeed: sourceFamily.rootSeed,
    parentScoreRef: sourceFamily.parentScoreRef,
    locks: sourceFamily.locks,
    requestedCount: FIXTURES.length,
    producedCount: candidates.length,
    roles: candidates.map((candidate) => candidate.role),
    scoreAddresses: candidates.map((candidate) => candidate.scoreAddress),
    timelineHashes: candidates.map((candidate) => candidate.timelineHash),
    fixtures: candidates.map((candidate) => candidate.fixtureReceipt),
    shortfall: null,
  };
  const familyHash = hashCanonical(core, TEST_SIX_DOMAIN);
  return deepFreeze({
    ...core,
    familyHash,
    candidates,
  });
}

module.exports = {
  FIXTURES,
  TEST_SIX_POLICY,
  TEST_SIX_SCHEMA,
  canonicalAuthorityForCandidate,
  fixtureReceipt,
  forceExistingTopologyArcOutcome,
  generateTestSixWitnessFamily,
  projectExistingAtmosphereEvidence,
};
