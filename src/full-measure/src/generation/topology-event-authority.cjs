const { deepFreeze, hashCanonical } = require("./canonical.cjs");
const {
  CANDIDATE_FAMILY_POLICY,
  CANDIDATE_FAMILY_SCHEMA,
  LOCKABLE_AXES,
} = require("./candidate-family.cjs");

const FAMILY_HASH_DOMAIN = "HauntedToaster-CandidateFamily-v1";
const TOPOLOGY_EVENT_AUTHORITY_SCHEMA = "haunted-toaster/topology-event-authority/v1";
const TOPOLOGY_EVENT_AUTHORITY_POLICY = "candidate-birth-topology-authority-v1";
const TOPOLOGY_EVENT_AUTHORITY_DOMAIN = "HauntedToaster-TopologyEventAuthority-v1";
const SHA256_RE = /^[0-9a-f]{64}$/;
const SCORE_ADDRESS_RE = /^ht1_[0-9a-f]{64}$/;
const AUTHORITY_KEYS = Object.freeze([
  "schema",
  "policyVersion",
  "birthFamilySchema",
  "birthFamilyPolicy",
  "birthFamilyHash",
  "candidateIndex",
  "scoreAddress",
  "sourceTimelineHash",
  "sourceTopology",
  "lockedAxes",
  "analysisHash",
  "constraintsHash",
  "rendererProfileHash",
  "rootSeed",
  "slotIndex",
  "authoritySha256",
]);

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

function requireSha256(value, label) {
  if (typeof value !== "string" || !SHA256_RE.test(value)) {
    throw new TypeError(`${label} must be lowercase SHA-256.`);
  }
  return value;
}

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function requireIndex(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer.`);
  }
  return value;
}

function normalizeLockedAxes(value) {
  if (!Array.isArray(value)) {
    throw new TypeError("Topology event authority lockedAxes must be an array.");
  }
  const normalized = [...new Set(value.map(String))].sort();
  if (normalized.length !== value.length || normalized.some((lock, index) => lock !== value[index])) {
    throw new TypeError("Topology event authority lockedAxes must be unique and canonically sorted.");
  }
  for (const lock of normalized) {
    if (!LOCKABLE_AXES.includes(lock)) {
      throw new TypeError(`Topology event authority contains unknown lock: ${lock}`);
    }
  }
  return normalized;
}

function projectTopologyEventAuthority(family) {
  if (!family || typeof family !== "object" || Array.isArray(family)) {
    throw new TypeError("Topology event authority requires a candidate family object.");
  }
  if (family.schema !== CANDIDATE_FAMILY_SCHEMA || family.policy !== CANDIDATE_FAMILY_POLICY) {
    throw new TypeError("Topology event authority requires CandidateFamily v1 schema/policy.");
  }
  if (!Array.isArray(family.candidates) || !family.candidates.length) {
    throw new TypeError("Topology event authority requires accepted candidates.");
  }

  const core = {
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
    locks: structuredClone(family.locks),
    requestedCount: family.requestedCount,
    producedCount: family.producedCount,
    roles: structuredClone(family.roles),
    scoreAddresses: structuredClone(family.scoreAddresses),
    timelineHashes: structuredClone(family.timelineHashes),
    shortfall: family.shortfall ? structuredClone(family.shortfall) : null,
  };

  return deepFreeze({
    ...core,
    familyHash: hashCanonical(core, FAMILY_HASH_DOMAIN),
    candidates: family.candidates,
  });
}

function verifyAddressedBirthFamily(family) {
  ownDataObject(family, "Topology event birth family");
  requireNonEmptyString(family.schema, "Topology event birth family schema");
  requireNonEmptyString(family.policy, "Topology event birth family policy");
  requireSha256(family.familyHash, "Topology event birth family familyHash");
  requireNonEmptyString(String(family.rootSeed ?? ""), "Topology event birth family rootSeed");
  normalizeLockedAxes(family.locks || []);
  if (!Array.isArray(family.candidates) || family.candidates.length < 1) {
    throw new TypeError("Topology event birth family requires candidates.");
  }
  if (!Number.isSafeInteger(family.producedCount) || family.producedCount !== family.candidates.length) {
    throw new TypeError("Topology event birth family producedCount does not align with candidates.");
  }
  for (const key of ["scoreAddresses", "timelineHashes"]) {
    if (!Array.isArray(family[key]) || family[key].length !== family.candidates.length) {
      throw new TypeError(`Topology event birth family ${key} does not align with candidates.`);
    }
  }

  const {
    familyHash: _familyHash,
    candidates: _candidates,
    ...familyCore
  } = family;
  const actualHash = hashCanonical(familyCore, FAMILY_HASH_DOMAIN);
  if (actualHash !== family.familyHash) {
    throw new TypeError("Topology event birth family canonical address does not match familyHash.");
  }

  for (let index = 0; index < family.candidates.length; index += 1) {
    const candidate = ownDataObject(family.candidates[index], `Topology event birth candidate ${index}`);
    if (candidate.index !== index) {
      throw new TypeError("Topology event birth candidate indices are not aligned.");
    }
    if (candidate.scoreAddress !== family.scoreAddresses[index]) {
      throw new TypeError("Topology event birth candidate score address is not aligned with family evidence.");
    }
    if (candidate.timelineHash !== family.timelineHashes[index]) {
      throw new TypeError("Topology event birth candidate timeline hash is not aligned with family evidence.");
    }
    const timeline = ownDataObject(candidate.timeline, `Topology event birth candidate ${index} timeline`);
    if (timeline.scoreAddress !== candidate.scoreAddress) {
      throw new TypeError("Topology event birth timeline score address does not match candidate.");
    }
    if (timeline.timelineHash !== candidate.timelineHash) {
      throw new TypeError("Topology event birth timeline hash does not match candidate.");
    }
    if (!timeline.baseState || typeof timeline.baseState.topology !== "string") {
      throw new TypeError("Topology event birth timeline requires source topology.");
    }
  }
  return family;
}

function authorityCoreFromCandidate(family, candidate, candidateIndex) {
  const timeline = ownDataObject(candidate.timeline, "Topology event authority candidate timeline");
  if (candidate.index !== candidateIndex) {
    throw new TypeError("Topology event authority candidate index does not match birth family.");
  }
  if (candidate.scoreAddress !== timeline.scoreAddress) {
    throw new TypeError("Topology event authority score address does not match birth timeline.");
  }
  if (candidate.timelineHash !== timeline.timelineHash) {
    throw new TypeError("Topology event authority source timeline identity does not match candidate.");
  }
  if (!timeline.baseState || typeof timeline.baseState.topology !== "string") {
    throw new TypeError("Topology event authority requires source topology.");
  }

  return {
    schema: TOPOLOGY_EVENT_AUTHORITY_SCHEMA,
    policyVersion: TOPOLOGY_EVENT_AUTHORITY_POLICY,
    birthFamilySchema: requireNonEmptyString(family.schema, "Topology event authority birthFamilySchema"),
    birthFamilyPolicy: requireNonEmptyString(family.policy, "Topology event authority birthFamilyPolicy"),
    birthFamilyHash: requireSha256(family.familyHash, "Topology event authority birthFamilyHash"),
    candidateIndex,
    scoreAddress: requireNonEmptyString(candidate.scoreAddress, "Topology event authority scoreAddress"),
    sourceTimelineHash: requireSha256(timeline.timelineHash, "Topology event authority sourceTimelineHash"),
    sourceTopology: requireNonEmptyString(timeline.baseState.topology, "Topology event authority sourceTopology"),
    lockedAxes: normalizeLockedAxes(structuredClone(family.locks || [])),
    analysisHash: requireSha256(timeline.analysisHash, "Topology event authority analysisHash"),
    constraintsHash: requireSha256(timeline.constraintsHash, "Topology event authority constraintsHash"),
    rendererProfileHash: requireSha256(timeline.rendererProfileHash, "Topology event authority rendererProfileHash"),
    rootSeed: requireNonEmptyString(String(family.rootSeed ?? ""), "Topology event authority rootSeed"),
    slotIndex: requireIndex(
      Number.isSafeInteger(candidate.slotIndex) ? candidate.slotIndex : candidateIndex,
      "Topology event authority slotIndex",
    ),
  };
}

function issueTopologyEventAuthority(family, candidateIndex) {
  requireIndex(candidateIndex, "Topology event authority candidateIndex");
  verifyAddressedBirthFamily(family);
  const candidate = family.candidates[candidateIndex];
  if (!candidate) {
    throw new TypeError("Topology event authority candidateIndex does not exist in birth family.");
  }
  const core = authorityCoreFromCandidate(family, candidate, candidateIndex);
  return deepFreeze({
    ...core,
    authoritySha256: hashCanonical(core, TOPOLOGY_EVENT_AUTHORITY_DOMAIN),
  });
}

function attachTopologyEventAuthorities(family) {
  verifyAddressedBirthFamily(family);
  const candidates = family.candidates.map((candidate, index) => deepFreeze({
    ...candidate,
    topologyEventAuthority: issueTopologyEventAuthority(family, index),
  }));
  return deepFreeze({
    ...family,
    candidates,
  });
}

function verifyTopologyEventAuthority(input) {
  const authority = exactKeys(input, AUTHORITY_KEYS, "Topology event authority");
  if (authority.schema !== TOPOLOGY_EVENT_AUTHORITY_SCHEMA) {
    throw new TypeError(`Topology event authority must use ${TOPOLOGY_EVENT_AUTHORITY_SCHEMA}.`);
  }
  if (authority.policyVersion !== TOPOLOGY_EVENT_AUTHORITY_POLICY) {
    throw new TypeError(`Topology event authority must use ${TOPOLOGY_EVENT_AUTHORITY_POLICY}.`);
  }
  requireNonEmptyString(authority.birthFamilySchema, "Topology event authority birthFamilySchema");
  requireNonEmptyString(authority.birthFamilyPolicy, "Topology event authority birthFamilyPolicy");
  requireSha256(authority.birthFamilyHash, "Topology event authority birthFamilyHash");
  requireIndex(authority.candidateIndex, "Topology event authority candidateIndex");
  if (typeof authority.scoreAddress !== "string" || !SCORE_ADDRESS_RE.test(authority.scoreAddress)) {
    throw new TypeError("Topology event authority scoreAddress must be a canonical VisualScore address.");
  }
  requireSha256(authority.sourceTimelineHash, "Topology event authority sourceTimelineHash");
  requireNonEmptyString(authority.sourceTopology, "Topology event authority sourceTopology");
  const lockedAxes = normalizeLockedAxes(authority.lockedAxes);
  requireSha256(authority.analysisHash, "Topology event authority analysisHash");
  requireSha256(authority.constraintsHash, "Topology event authority constraintsHash");
  requireSha256(authority.rendererProfileHash, "Topology event authority rendererProfileHash");
  requireNonEmptyString(authority.rootSeed, "Topology event authority rootSeed");
  requireIndex(authority.slotIndex, "Topology event authority slotIndex");
  requireSha256(authority.authoritySha256, "Topology event authority authoritySha256");

  const core = {
    schema: authority.schema,
    policyVersion: authority.policyVersion,
    birthFamilySchema: authority.birthFamilySchema,
    birthFamilyPolicy: authority.birthFamilyPolicy,
    birthFamilyHash: authority.birthFamilyHash,
    candidateIndex: authority.candidateIndex,
    scoreAddress: authority.scoreAddress,
    sourceTimelineHash: authority.sourceTimelineHash,
    sourceTopology: authority.sourceTopology,
    lockedAxes,
    analysisHash: authority.analysisHash,
    constraintsHash: authority.constraintsHash,
    rendererProfileHash: authority.rendererProfileHash,
    rootSeed: authority.rootSeed,
    slotIndex: authority.slotIndex,
  };
  const actualHash = hashCanonical(core, TOPOLOGY_EVENT_AUTHORITY_DOMAIN);
  if (actualHash !== authority.authoritySha256) {
    throw new TypeError("Topology event authority canonical hash does not match authoritySha256.");
  }
  return deepFreeze({ ...core, authoritySha256: actualHash });
}

module.exports = {
  TOPOLOGY_EVENT_AUTHORITY_POLICY,
  TOPOLOGY_EVENT_AUTHORITY_SCHEMA,
  attachTopologyEventAuthorities,
  issueTopologyEventAuthority,
  projectTopologyEventAuthority,
  verifyTopologyEventAuthority,
};
