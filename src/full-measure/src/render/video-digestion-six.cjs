const crypto = require("node:crypto");
const { bindHistoryToVideo } = require("../nextgen/history-capsule.cjs");
const {
  FOREIGN_MATERIAL_MOTION_OPERATOR_ID,
  FOREIGN_MATERIAL_ONCE_POLICY,
  FOREIGN_MATERIAL_OPERATOR_ID,
  FOREIGN_MATERIAL_SAMPLING_POLICY,
  FOREIGN_MATERIAL_STRETCH_POLICY,
  FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID,
  createForeignMaterialPlan,
} = require("./foreign-material.cjs");

const VIDEO_DIGESTION_SIX_SCHEMA = "haunted-toaster/video-digestion-six/v0";
const VIDEO_DIGESTION_SIX_POLICY = "same-source-six-roles-v0";

const SLOT_RECIPES = Object.freeze([
  Object.freeze({ roleId: "texture-loop", digestOperatorId: FOREIGN_MATERIAL_OPERATOR_ID, samplingPolicyId: FOREIGN_MATERIAL_SAMPLING_POLICY, projectionClass: "derived-texture" }),
  Object.freeze({ roleId: "texture-release", digestOperatorId: FOREIGN_MATERIAL_OPERATOR_ID, samplingPolicyId: FOREIGN_MATERIAL_ONCE_POLICY, projectionClass: "derived-texture" }),
  Object.freeze({ roleId: "topology-loop", digestOperatorId: FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID, samplingPolicyId: FOREIGN_MATERIAL_SAMPLING_POLICY, projectionClass: "derived-mask" }),
  Object.freeze({ roleId: "topology-stretch", digestOperatorId: FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID, samplingPolicyId: FOREIGN_MATERIAL_STRETCH_POLICY, projectionClass: "derived-mask" }),
  Object.freeze({ roleId: "motion-release", digestOperatorId: FOREIGN_MATERIAL_MOTION_OPERATOR_ID, samplingPolicyId: FOREIGN_MATERIAL_ONCE_POLICY, projectionClass: "derived-motion" }),
  Object.freeze({ roleId: "motion-stretch", digestOperatorId: FOREIGN_MATERIAL_MOTION_OPERATOR_ID, samplingPolicyId: FOREIGN_MATERIAL_STRETCH_POLICY, projectionClass: "derived-motion" }),
]);

function hashJson(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function createVideoDigestionSix({ videoBinding, timeline, analysisDurationSeconds = null, historyCapsule = null } = {}) {
  if (!videoBinding) return null;
  const sourceHistoryRef = historyCapsule
    ? bindHistoryToVideo({ historyCapsule, sourceSha256: videoBinding.sourceSha256 })
    : null;

  const descendants = SLOT_RECIPES.map((recipe, index) => {
    const plan = createForeignMaterialPlan({
      videoBinding: {
        ...videoBinding,
        digestOperatorId: recipe.digestOperatorId,
        samplingPolicyId: recipe.samplingPolicyId,
      },
      timeline,
      analysisDurationSeconds,
    });
    return Object.freeze({
      slot: index + 1,
      roleId: recipe.roleId,
      digestOperatorId: recipe.digestOperatorId,
      samplingPolicyId: recipe.samplingPolicyId,
      projectionClass: recipe.projectionClass,
      sourceSpecimenId: plan.sourceSpecimenId,
      sourceSha256: plan.sourceSha256,
      clipAnalysisHash: plan.clipAnalysisHash,
      planHash: plan.planHash,
      historyRef: sourceHistoryRef,
      plan,
    });
  });

  const first = descendants[0];
  for (const descendant of descendants.slice(1)) {
    if (
      descendant.sourceSpecimenId !== first.sourceSpecimenId
      || descendant.sourceSha256 !== first.sourceSha256
      || descendant.clipAnalysisHash !== first.clipAnalysisHash
    ) {
      throw new Error("Video Digestion Six descendants must retain one admitted source ancestry.");
    }
  }

  const canonical = {
    schema: VIDEO_DIGESTION_SIX_SCHEMA,
    policyVersion: VIDEO_DIGESTION_SIX_POLICY,
    authority: "proposal-only",
    sourceSpecimenId: first.sourceSpecimenId,
    sourceSha256: first.sourceSha256,
    clipAnalysisHash: first.clipAnalysisHash,
    sourceHistoryRef,
    descendants: descendants.map((descendant) => ({
      slot: descendant.slot,
      roleId: descendant.roleId,
      digestOperatorId: descendant.digestOperatorId,
      samplingPolicyId: descendant.samplingPolicyId,
      projectionClass: descendant.projectionClass,
      planHash: descendant.planHash,
      historyRef: descendant.historyRef,
    })),
  };

  return Object.freeze({
    ...canonical,
    sourceHistoryRef,
    descendants: Object.freeze(descendants),
    familyHash: hashJson(canonical),
  });
}

module.exports = {
  SLOT_RECIPES,
  VIDEO_DIGESTION_SIX_POLICY,
  VIDEO_DIGESTION_SIX_SCHEMA,
  createVideoDigestionSix,
};
