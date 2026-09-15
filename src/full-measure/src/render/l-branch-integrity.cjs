const {
  canonicalStringify,
  hashCanonical,
} = require("../generation/canonical.cjs");
const {
  MIX_EXECUTION_POLICY,
  MIX_EXECUTION_POLICY_V2,
  MIX_EXECUTION_SCHEMA,
  MIX_EXECUTION_SCHEMA_V2,
  MIX_PLAN_POLICY,
  MIX_PLAN_POLICY_V2,
  MIX_PLAN_SCHEMA,
  MIX_PLAN_SCHEMA_V2,
  assertLBranchTimeline,
} = require("../generation/l-branch.cjs");

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function contractForMixPlan(mixPlan) {
  if (mixPlan?.policyVersion === MIX_PLAN_POLICY) {
    return {
      planSchema: MIX_PLAN_SCHEMA,
      planHashDomain: "HauntedToaster-LBranchMixPlan-v1",
      executionSchema: MIX_EXECUTION_SCHEMA,
      executionPolicy: MIX_EXECUTION_POLICY,
      executionHashDomain: "HauntedToaster-LBranchMixExecution-v1",
    };
  }
  if (mixPlan?.policyVersion === MIX_PLAN_POLICY_V2) {
    return {
      planSchema: MIX_PLAN_SCHEMA_V2,
      planHashDomain: "HauntedToaster-LBranchMixPlan-v2",
      executionSchema: MIX_EXECUTION_SCHEMA_V2,
      executionPolicy: MIX_EXECUTION_POLICY_V2,
      executionHashDomain: "HauntedToaster-LBranchMixExecution-v2",
    };
  }
  throw new TypeError("ResolvedTimeline L BRANCH Mix Plan identity mismatch.");
}

function assertLBranchIntegrity(timeline) {
  assertLBranchTimeline(timeline);
  if (timeline.lBranch === undefined) return timeline;

  const binding = timeline.lBranch;
  const mixPlan = binding.mixPlan;
  const contract = contractForMixPlan(mixPlan);
  if (!mixPlan || mixPlan.schema !== contract.planSchema) {
    throw new TypeError("ResolvedTimeline L BRANCH Mix Plan identity mismatch.");
  }
  const { planHash, ...mixPlanCore } = mixPlan;
  if (
    !SHA256_PATTERN.test(String(planHash || "")) ||
    hashCanonical(mixPlanCore, contract.planHashDomain) !== planHash
  ) {
    throw new TypeError("ResolvedTimeline L BRANCH Mix Plan identity mismatch.");
  }

  const execution = binding.execution;
  if (
    !execution ||
    execution.schema !== contract.executionSchema ||
    execution.policyVersion !== contract.executionPolicy
  ) {
    throw new TypeError("ResolvedTimeline L BRANCH execution identity mismatch.");
  }
  const { executionHash, ...executionCore } = execution;
  if (
    !SHA256_PATTERN.test(String(executionHash || "")) ||
    hashCanonical(executionCore, contract.executionHashDomain) !== executionHash
  ) {
    throw new TypeError("ResolvedTimeline L BRANCH execution identity mismatch.");
  }
  if (execution.sourceTimelineHash !== mixPlan.sourceTimelineHash) {
    throw new TypeError("ResolvedTimeline L BRANCH source timeline identity mismatch.");
  }

  const { timelineHash, canonicalJson, ...timelineCore } = timeline;
  if (
    !SHA256_PATTERN.test(String(timelineHash || "")) ||
    hashCanonical(timelineCore, "HauntedToaster-ResolvedTimeline-v1") !== timelineHash
  ) {
    throw new TypeError("ResolvedTimeline L BRANCH timeline identity mismatch.");
  }
  if (canonicalJson !== canonicalStringify(timelineCore)) {
    throw new TypeError("ResolvedTimeline L BRANCH canonical JSON mismatch.");
  }

  return timeline;
}

module.exports = {
  assertLBranchIntegrity,
};
