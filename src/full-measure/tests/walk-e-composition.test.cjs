const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const generation = require("../src/generation/index.cjs");
const {
  attachLBranchToFamily,
  replayLBranchFamily,
} = require("../src/generation/l-branch.cjs");
const { createCandidateSession } = require("../src/candidate-session.cjs");
const { compileTopologyEvents } = require("../src/render/topology-events.cjs");
const { alignLyricsToTranscriptWithAnchors } = require("../src/align/anchor-guided.cjs");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const analysis = readJson("fixtures/analysis/sectional.v1.json");
const canonicalConstraints = readJson("constraints/wire-orchard.v1.json");
const canonicalProfile = readJson("profiles/toaster-raster-1.json");
const audioPath = path.resolve("/tmp/WALK E Breathing House.wav");

const mediaAnalysis = Object.freeze({
  filename: "WALK E Breathing House.wav",
  sizeBytes: 35_067_052,
  duration: analysis.durationSeconds,
  formatName: "wav",
  audio: Object.freeze({ codec: "pcm_s16le", sampleRate: 48_000, channels: 2 }),
  energySamples: Object.freeze([]),
  sections: Object.freeze(
    analysis.sections.map((section, index) =>
      Object.freeze({
        index,
        label: section.label,
        start: section.startSeconds,
        end: section.endSeconds,
        energy: section.energy,
      }),
    ),
  ),
});

function videoBinding() {
  return {
    schema: "haunted-toaster/video-source/v1",
    specimenId: `sha256:${"a".repeat(64)}:4096`,
    sourceSha256: "a".repeat(64),
    byteLength: 4096,
    path: path.resolve("/tmp/walk-e-specimen.mp4"),
    filename: "walk-e-specimen.mp4",
    probe: {
      durationSeconds: 1.5,
      width: 640,
      height: 360,
      frameRate: "30/1",
      container: "mp4",
      codec: "h264",
      hasAudio: false,
    },
    persisted: true,
  };
}

function previewResult(family) {
  return {
    familyHash: family.familyHash,
    candidates: family.candidates.map((candidate) => ({
      index: candidate.index,
      scoreAddress: candidate.scoreAddress,
      timelineHash: candidate.timelineHash,
    })),
  };
}

async function ordinaryRun({ rootSeed = "walk-e-ordinary", video = null } = {}) {
  let family = null;
  const session = createCandidateSession({
    async renderCandidateFamilyPreviews(_config, nextFamily) {
      family = nextFamily;
      return previewResult(nextFamily);
    },
  });
  session.noteAudio(audioPath, mediaAnalysis);
  if (video) session.noteVideo(video);
  const view = await session.generate({
    presetId: "openField",
    toastFeelId: "low-and-slow",
    rootSeed,
    lyrics: "",
  });
  assert.ok(family);
  session.select({ familyHash: view.familyHash, index: family.candidates[0].index });
  const execution = session.executionForRender({
    audioPath,
    imagePath: null,
    presetId: "openField",
    toastFeelId: "low-and-slow",
  });
  return { session, family, view, execution };
}

async function testSixRun({ rootSeed = "walk-e-test-six", video = null } = {}) {
  let family = null;
  const session = createCandidateSession({
    async renderCandidateFamilyPreviews(_config, nextFamily) {
      family = nextFamily;
      return previewResult(nextFamily);
    },
  });
  session.noteAudio(audioPath, mediaAnalysis);
  if (video) session.noteVideo(video);
  const view = await session.generateTestSix({
    presetId: "openField",
    rootSeed,
    lyrics: "",
  });
  assert.ok(family);
  session.select({ familyHash: view.familyHash, index: family.candidates[0].index });
  const execution = session.executionForRender({
    audioPath,
    imagePath: null,
    presetId: "openField",
  });
  return { session, family, view, execution };
}

function responseWitness() {
  return generation.deriveResponseWitness({
    energySamples: [],
    sections: analysis.sections,
    durationSeconds: analysis.durationSeconds,
  });
}

function event(kind, id, prepareTick, strikeTick, releaseTick, residueUntilTick, parameters) {
  return {
    id,
    kind,
    prepareTick,
    strikeTick,
    releaseTick,
    residueUntilTick,
    parameters,
    evidenceRefs: [`walk-e:${id}`],
  };
}

const aperture = event("aperture", "walk-e-aperture", 1000, 1800, 2600, 3400, {
  anchorX: 0.48,
  anchorY: 0.42,
  radiusX: 0.24,
  radiusY: 0.22,
  focus: 0.82,
  peripheralCompression: 0.34,
  orbit: 0.18,
});
const speak = event("speak", "walk-e-speak", 3500, 4200, 5000, 5900, {
  anchorX: 0.52,
  anchorY: 0.54,
  radiusX: 0.28,
  radiusY: 0.14,
  seamWidth: 0.18,
  emission: 0.72,
  residue: 0.31,
});
const grab = event("grab", "walk-e-grab", 6000, 6700, 7400, 8300, {
  anchorX: 0.25,
  anchorY: 0.5,
  targetX: 0.75,
  targetY: 0.45,
  radiusX: 0.22,
  radiusY: 0.18,
  pull: 0.8,
  recoil: 0.55,
  falloff: 0.7,
  residualVectorX: 0.08,
  residualVectorY: -0.03,
  residualStretch: 0.06,
});
const grow = event("grow", "walk-e-grow", 8400, 9000, 9600, 11000, {
  anchorX: 0.58,
  anchorY: 0.46,
  radiusX: 0.18,
  radiusY: 0.2,
  branchCount: 3,
  growth: 0.76,
  persistence: 0.68,
  ageBias: 0.42,
});

function familyWithAcceptedEvents(events, { candidateIndex = 0, rootSeed = "walk-e-topology-mix" } = {}) {
  const source = generation.generateCandidateSet({
    analysis,
    garmentConstraints: canonicalConstraints,
    rendererProfile: canonicalProfile,
    rootSeed,
    count: 6,
  });
  const candidate = source.candidates[candidateIndex];
  const resolvedTimeline = generation.resolveTopologyEvents(candidate.timeline, {
    family: source,
    candidateIndex,
    events,
  });
  const reboundCandidate = {
    ...candidate,
    timeline: resolvedTimeline,
    timelineHash: resolvedTimeline.timelineHash,
  };
  const reboundCandidates = source.candidates.map((entry, index) =>
    index === candidateIndex ? reboundCandidate : entry,
  );
  const rebound = {
    ...source,
    candidates: reboundCandidates,
    timelineHashes: reboundCandidates.map((entry) => entry.timelineHash),
  };
  const admitted = attachLBranchToFamily(rebound, {
    responseWitness: responseWitness(),
    lyricTrack: null,
  });
  return { rebound, admitted, candidate: admitted.candidates[candidateIndex] };
}

test("Video OFF × Mixer ON keeps foreign material absent while L BRANCH owns the accepted listening plan", async () => {
  const { execution } = await ordinaryRun({ rootSeed: "walk-e-mixer-only" });
  assert.equal(execution.foreignVisualMaterial, null);
  assert.match(execution.resolvedTimeline.lBranch?.laneBankHash || "", /^[0-9a-f]{64}$/);
  assert.match(execution.resolvedTimeline.lBranch?.mixPlan?.planHash || "", /^[0-9a-f]{64}$/);
});

test("Video ON × Mixer OFF keeps foreign material lawful without silently adding L BRANCH to TEST 6", async () => {
  const { execution } = await testSixRun({
    rootSeed: "walk-e-video-only",
    video: videoBinding(),
  });
  assert.equal(execution.resolvedTimeline.lBranch, undefined);
  assert.equal(execution.foreignVisualMaterial?.sourceSpecimenId, videoBinding().specimenId);
  assert.match(execution.foreignVisualMaterial?.planHash || "", /^[0-9a-f]{64}$/);
  assert.equal("video" in execution, false);
  assert.equal("videoPath" in execution, false);
});

test("Video ON × Mixer ON coexists without Video changing accepted candidate or timeline identity", async () => {
  const withVideo = await ordinaryRun({
    rootSeed: "walk-e-video-mixer",
    video: videoBinding(),
  });
  const withoutVideo = await ordinaryRun({
    rootSeed: "walk-e-video-mixer",
    video: null,
  });

  assert.equal(withVideo.family.familyHash, withoutVideo.family.familyHash);
  assert.equal(
    withVideo.execution.resolvedTimeline.timelineHash,
    withoutVideo.execution.resolvedTimeline.timelineHash,
  );
  assert.equal(
    withVideo.execution.resolvedTimeline.lBranch.mixPlan.planHash,
    withoutVideo.execution.resolvedTimeline.lBranch.mixPlan.planHash,
  );
  assert.equal(withVideo.execution.foreignVisualMaterial.sourceSpecimenId, videoBinding().specimenId);
  assert.equal(withoutVideo.execution.foreignVisualMaterial, null);
});

test("removing Video invalidates the stale selected candidate instead of silently reusing foreign material", async () => {
  const { session } = await ordinaryRun({
    rootSeed: "walk-e-video-removal",
    video: videoBinding(),
  });
  session.clearVideo();
  assert.equal(session.state().video, null);
  assert.throws(() =>
    session.executionForRender({
      audioPath,
      imagePath: null,
      presetId: "openField",
      toastFeelId: "low-and-slow",
    }),
  );
});

for (const [label, events] of [
  ["APERTURE", [aperture]],
  ["SPEAK", [speak]],
  ["GRAB", [grab]],
  ["GROW", [grow]],
  ["BODY", [aperture, speak, grab, grow]],
]) {
  test(`${label} × representative Mix Plan preserves both accepted authorities and exact L BRANCH replay`, () => {
    const { rebound, admitted, candidate } = familyWithAcceptedEvents(events, {
      candidateIndex: 0,
      rootSeed: `walk-e-${label.toLowerCase()}-mix`,
    });
    const compiled = compileTopologyEvents(candidate.timeline);
    assert.ok(compiled);
    assert.deepEqual(compiled.evidence.renderedKinds, events.map((entry) => entry.kind));
    assert.match(candidate.timeline.lBranch?.mixPlan?.planHash || "", /^[0-9a-f]{64}$/);
    assert.match(candidate.timeline.lBranch?.execution?.executionHash || "", /^[0-9a-f]{64}$/);

    const replay = replayLBranchFamily(admitted, {
      baseFamily: rebound,
      responseWitness: responseWitness(),
      lyricTrack: null,
    });
    assert.equal(replay.ok, true);
    assert.equal(replay.laneBankHashMatches, true);
    assert.equal(replay.mixPlanHashesMatch, true);
    assert.equal(replay.timelineHashesMatch, true);
    assert.equal(replay.familyHashMatches, true);
  });
}

test("GRAB-scoped Mix Plan × GRAB event stays bounded to the same accepted event window", () => {
  const { candidate } = familyWithAcceptedEvents([grab], {
    candidateIndex: 3,
    rootSeed: "walk-e-grab-scope-crossing",
  });
  const scoped = candidate.timeline.lBranch.execution.sends.filter(
    (send) => send.scope.kind === "grab",
  );
  assert.ok(scoped.length > 0);
  assert.ok(scoped.every((send) => send.scope.startTick === grab.prepareTick));
  assert.ok(scoped.every((send) => send.scope.endTick === grab.residueUntilTick));
  const compiled = compileTopologyEvents(candidate.timeline);
  assert.deepEqual(compiled.evidence.renderedKinds, ["grab"]);
  assert.ok(compiled.localDeformation);
});

test("Listener anchor-island Re-listen cannot mutate an already accepted visual execution", async () => {
  const { execution } = await ordinaryRun({ rootSeed: "walk-e-listener-authority" });
  const before = JSON.stringify(execution.resolvedTimeline);
  const lyrics = ["opening echo", "human anchor", "closing echo"].join("\n");
  const transcript = [
    { text: "opening echo", start: 1, end: 1.5, probability: 0.99 },
    { text: "human anchor", start: 5, end: 5.5, probability: 0.99 },
    { text: "closing echo", start: 9, end: 9.5, probability: 0.99 },
  ];
  const aligned = alignLyricsToTranscriptWithAnchors(lyrics, transcript, 12, {
    leadSeconds: 0,
    anchors: [{ lineIndex: 1, text: "human anchor", time: 5.123 }],
  });

  assert.equal(aligned.cues[1].status, "human");
  assert.equal(aligned.cues[1].start, 5.123);
  assert.equal(JSON.stringify(execution.resolvedTimeline), before);
});

test("walking TEST 6 remains barred from ordinary mutation ecology", async () => {
  const { session, view } = await testSixRun({ rootSeed: "walk-e-test-six-isolation" });
  await assert.rejects(
    session.mutate({
      familyHash: view.familyHash,
      parentIndex: 0,
      presetId: "openField",
      rootSeed: "walk-e-illegal-test-six-mutation",
      lyrics: "",
    }),
    /TEST 6 is a forced witness and cannot enter mutation ecology/i,
  );
});

test("ordinary six-up remains deterministic after the full WALK braid", async () => {
  const first = await ordinaryRun({ rootSeed: "walk-e-ordinary-determinism" });
  const second = await ordinaryRun({ rootSeed: "walk-e-ordinary-determinism" });
  assert.equal(first.family.familyHash, second.family.familyHash);
  assert.deepEqual(first.family.timelineHashes, second.family.timelineHashes);
  assert.deepEqual(
    first.family.candidates.map((candidate) => candidate.mixPlanHash),
    second.family.candidates.map((candidate) => candidate.mixPlanHash),
  );
});
