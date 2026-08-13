const test = require("node:test");
const assert = require("node:assert/strict");

const {
  compactNativeColorEvidence,
  compactToastFeelEvidence,
} = require("../src/render/render.cjs");

test("receipt Toast Feel evidence is compact and does not alter canonical execution identity", () => {
  const canonicalExecution = {
    scoreAddress: "htvs1_score",
    timelineHash: "timeline-hash",
  };
  const feel = {
    contractVersion: "toast-feel-v1",
    id: "wire-heat",
    name: "Wire Heat",
    semanticClass: "ordinary",
    pressureHash: "a".repeat(64),
    pressure: { contrast: 0.4 },
  };

  assert.deepEqual(compactToastFeelEvidence(feel), {
    contractVersion: "toast-feel-v1",
    id: "wire-heat",
    name: "Wire Heat",
    semanticClass: "ordinary",
    pressureHash: "a".repeat(64),
    seedParentScoreRef: null,
    stompPolicy: null,
  });
  assert.deepEqual(canonicalExecution, {
    scoreAddress: "htvs1_score",
    timelineHash: "timeline-hash",
  });
  assert.equal(compactToastFeelEvidence(null), null);
});

test("receipt Native Color evidence binds the accepted profile and timeline plan compactly", () => {
  const profile = {
    policyVersion: "native-chromatic-profile-v1",
    sourceSha256: "b".repeat(64),
    profileSha256: "c".repeat(64),
    sampledPixels: ["must", "not", "leak"],
    tempPath: "/tmp/nope.ppm",
  };
  const timeline = {
    timelineHash: "accepted-native-timeline",
    nativeColor: {
      policyVersion: "native-color-witness-v1",
      relationship: "echo",
      planSha256: "d".repeat(64),
      windowCount: 1,
    },
  };
  assert.deepEqual(compactNativeColorEvidence(profile, timeline), {
    policyVersion: "native-color-witness-v1",
    profilePolicyVersion: "native-chromatic-profile-v1",
    sourceSha256: "b".repeat(64),
    profileSha256: "c".repeat(64),
    relationship: "echo",
    planSha256: "d".repeat(64),
    windowCount: 1,
  });
  assert.equal(timeline.timelineHash, "accepted-native-timeline");
  assert.equal(compactNativeColorEvidence(null, timeline), null);
});
