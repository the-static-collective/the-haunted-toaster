const { deepFreeze, hashCanonical } = require("./canonical.cjs");
const {
  CANDIDATE_FAMILY_POLICY,
  CANDIDATE_FAMILY_SCHEMA,
} = require("./candidate-family.cjs");

const FAMILY_HASH_DOMAIN = "HauntedToaster-CandidateFamily-v1";

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

module.exports = {
  projectTopologyEventAuthority,
};
