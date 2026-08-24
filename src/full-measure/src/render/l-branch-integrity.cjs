const {
  canonicalStringify,
  hashCanonical,
} = require("../generation/canonical.cjs");
const {
  MIX_EXECUTION_POLICY,
  MIX_EXECUTION_SCHEMA,
  MIX_PLAN_POLICY,
  MIX_PLAN_SCHEMA,
  assertLBranchTimeline,
} = require("../generation/l-branch.cjs");

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function assertLBranchIntegrity(timeline) {
  assertLBranchTimeline(timeline);
  if (timeline.lBranch === undefined) return timeline;

  const binding = timeline.lBranch;
  const mixPlan = binding.mixPlan;
  if (
    !mixPlan ||
    mixPlan.schema !== MIX_PLAN_SCHEMA ||
    mixPlan.policyVersion !== MIX_PLAN_POLICY
  ) {
    throw new TypeError("ResolvedTimeline L BRANCH Mix Plan identity mismatch.");
  }
  const { planHash, ...mixPlanCore } = mixPlan;
  if (
    !SHA256_PATTERN.test(String(planHash || "")) ||
    hashCanonical(mixPlanCore, "HauntedToaster-LBranchMixPlan-v1") !== planHash
  ) {
    throw new TypeError("ResolvedTimeline L BRANCH Mix Plan identity mismatch.");
  }

  const execution = binding.execution;
  if (
    !execution ||
    execution.schema !== MIX_EXECUTION_SCHEMA ||
    execution.policyVersion !== MIX_EXECUTION_POLICY
  ) {
    throw new TypeError("ResolvedTimeline L BRANCH execution identity mismatch.");
  }
  const { executionHash, ...executionCore } = execution;
  if (
    !SHA256_PATTERN.test(String(executionHash || "")) ||
    hashCanonical(executionCore, "HauntedToaster-LBranchMixExecution-v1") !== executionHash
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
