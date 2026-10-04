"use strict";

const crypto = require("node:crypto");

const NEXTGEN_SCHEMA = "static-collective/nextgen-toaster-profile/v0";
const NEXTGEN_RECEIPT_SCHEMA = "static-collective/nextgen-toaster-proof-receipt/v0";
const NEXTGEN_POLICY = "nextgen-toaster-001";

const ORGANS = Object.freeze({
  census: Object.freeze({
    phase:"witness",
    repo:"the-static-collective/the-haunted-toaster",
    ref:"experiment/franken-tester-001",
    sha:"c52f1c26ca80c8676449449abb5133cbcd1f5445",
    authority:"diagnostic-only",
    purpose:"Branch ecology census, organ index, and bounded crossing matrix.",
  }),
  listener: Object.freeze({
    phase:"sense",
    repo:"the-static-collective/the-haunted-toaster",
    ref:"experiment/listener-look-twice-001",
    sha:"2b28002614b119841ca7e639b9be72b0da22987c",
    authority:"diagnostic-only",
    purpose:"Uncontaminated first-listen evidence for difficult Listener regions.",
  }),
  listeningEye: Object.freeze({
    phase:"orient",
    repo:"the-static-collective/the-haunted-toaster",
    ref:"fix/listening-eye-family-evidence-001",
    sha:"8d83d678221e28e7f81bb619fd9834fe28147f97",
    authority:"influence-only",
    purpose:"Six complementary song-derived art-direction lenses.",
  }),
  videoDigestion: Object.freeze({
    phase:"multiply",
    repo:"the-static-collective/the-haunted-toaster",
    ref:"fix/video-digestion-vout-contract-001",
    sha:"fce507efbe2381fcae4189a0f6b3689e0bf5c880",
    authority:"proposal-only",
    purpose:"One admitted video source becomes six deterministic composition descendants.",
  }),
  memoryPrism: Object.freeze({
    phase:"remember",
    repo:"the-static-collective/the-haunted-toaster",
    ref:"memory/six-up-prism-001",
    sha:"17194c34b9b248fd1edfa975c0cd6142d97b658a",
    authority:"proposal-pressure-only",
    purpose:"Six distinct bounded memory apertures over accepted render history.",
  }),
  batchConsole: Object.freeze({
    phase:"operate",
    repo:"the-static-collective/the-haunted-toaster",
    ref:"mutant/batch-console-309",
    sha:"b3b25c5cf99faaf5c7b9fc0ef6809939ecfca7b5",
    authority:"transport-only",
    purpose:"Album-folder transport around the ordinary KEEP and render authority path.",
  }),
  frankenComposer: Object.freeze({
    phase:"compose",
    repo:"the-static-collective/the-haunted-toaster",
    ref:"experimental/franken-composer-001",
    sha:"0916e1d1dd60d2834682e4bd182f26f15b2d8447",
    authority:"composition-plan-only",
    purpose:"Frozen renderer-neutral composition plan with Remotion and HyperFrames projections.",
  }),
  blender: Object.freeze({
    phase:"cinema",
    repo:"the-static-collective/the-haunted-blender",
    ref:"integration/franken-blender-002-cutout-machine",
    sha:"7cfdee2b7c823baa9219683f1a9cbfc68b21191b",
    authority:"material-and-proposal-only",
    purpose:"Flow Pantry, Toaster/Playdeck bridges, accepted takes, and deterministic cutout stage.",
  }),
  playdeck: Object.freeze({
    phase:"stage",
    repo:"the-static-collective/playdeck",
    ref:"experiment/franken-smash-001",
    sha:"012186fd67f4c4ef1c6591fc5e29cb559b5a80d0",
    authority:"continuation-and-render-proposal-only",
    purpose:"Six-up possibility ecology, KEEP continuity, Studio, and Remotion projection.",
  }),
});

const PIPELINE = Object.freeze([
  "listener",
  "listeningEye",
  "videoDigestion",
  "memoryPrism",
  "frankenComposer",
  "blender",
  "playdeck",
  "batchConsole",
  "census",
]);

const LAWS = Object.freeze([
  "LISTENING != PLACEMENT AUTHORITY",
  "INFLUENCE != VISUALSCORE AUTHORITY",
  "SOURCE != DESCENDANT",
  "MEMORY PRESSURE != COMMAND",
  "PROPOSAL != KEEP",
  "MATERIAL != COMPOSITION AUTHORITY",
  "RENDERER != PLAN AUTHORITY",
  "BATCH TRANSPORT != RENDER AUTHORITY",
  "TREE PROBE != RUNTIME QA",
  "RUNTIME PASS != PRODUCT GRADUATION",
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

function hash(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}

function createNextGenProfile() {
  return stable({
    schema:NEXTGEN_SCHEMA,
    policy:NEXTGEN_POLICY,
    authority:"integration-plan-only",
    name:"Haunted Toaster NextGen 001",
    productQuestion:"Can the branch ecology become one testable instrument without flattening organ authority?",
    pipeline:PIPELINE,
    organs:ORGANS,
    laws:LAWS,
    graduationGate:"Human-visible integrated witness required before promotion or release.",
  });
}

function requireSha(value, label) {
  if (typeof value !== "string" || !/^[a-f0-9]{40,64}$/.test(value)) {
    throw new TypeError(label + " must be a Git SHA.");
  }
  return value;
}

function validateEvidence(evidence) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw new TypeError("NextGen evidence must be an object keyed by organ.");
  }

  const normalized = {};
  for (const key of PIPELINE) {
    const expected = ORGANS[key];
    const actual = evidence[key];
    if (!actual || typeof actual !== "object" || Array.isArray(actual)) {
      throw new TypeError("Missing runtime evidence for organ " + key + ".");
    }
    if (actual.status !== "pass") {
      throw new TypeError("Organ " + key + " did not pass runtime proof.");
    }
    if (actual.repo !== expected.repo || actual.ref !== expected.ref) {
      throw new TypeError("Organ " + key + " source identity does not match the NextGen pin.");
    }
    const observedSha = requireSha(actual.sha, key + " evidence sha");
    if (observedSha !== expected.sha) {
      throw new TypeError("Organ " + key + " SHA does not match the NextGen pin.");
    }
    if (typeof actual.proof !== "string" || !actual.proof.trim()) {
      throw new TypeError("Organ " + key + " requires a named runtime proof.");
    }
    normalized[key] = {
      repo:actual.repo,
      ref:actual.ref,
      sha:observedSha,
      status:"pass",
      proof:actual.proof.trim(),
    };
  }
  return stable(normalized);
}

function sealNextGenProfile({kernelSha, evidence} = {}) {
  const profile = createNextGenProfile();
  const normalizedEvidence = validateEvidence(evidence);
  const body = stable({
    schema:NEXTGEN_RECEIPT_SCHEMA,
    policy:NEXTGEN_POLICY,
    authority:"integration-witness-only",
    status:"runtime-proofs-passed",
    kernelSha:requireSha(kernelSha, "kernelSha"),
    profile,
    evidence:normalizedEvidence,
    nonclaims:[
      "This receipt does not merge donor branches.",
      "This receipt does not grant publication authority.",
      "This receipt does not prove perceptual superiority.",
      "Playdeck proof follows its donor npm install workflow and is not lockfile-hermetic.",
      "This receipt does not graduate NextGen Toaster to main.",
    ],
  });
  return Object.freeze({...body, receiptHash:hash(body)});
}

module.exports = {
  NEXTGEN_SCHEMA,
  NEXTGEN_RECEIPT_SCHEMA,
  NEXTGEN_POLICY,
  ORGANS,
  PIPELINE,
  LAWS,
  createNextGenProfile,
  validateEvidence,
  sealNextGenProfile,
};
