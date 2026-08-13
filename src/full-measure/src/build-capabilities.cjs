const { createCandidateSession, rendererProfile } = require("./candidate-session.cjs");
const { EXPRESSIVE_RENDERER_PROFILE_ID } = require("./generation/renderer-policy.cjs");
const { OUTPUT_PROFILES } = require("./render/output-profiles.cjs");
const { TOAST_FEEL_CONTRACT, TOAST_FEELS } = require("./toast-feels.cjs");
const { NATIVE_COLOR_POLICY, RELATIONSHIPS } = require("./generation/native-color.cjs");
const { RENDER_FAILURE_EVIDENCE_SCHEMA } = require("./render/render-failure-evidence.cjs");
const { UI_WITNESS_POLICY } = require("./ui-witness-policy.cjs");
const {
  EXPRESSIVE_SEMANTIC_COMPILER_REGISTRIES,
  EXPRESSIVE_TOPOLOGY_COMPILERS,
  SEMANTIC_COMPILER_REGISTRIES,
  TOPOLOGY_COMPILERS,
} = require("./render/timeline-filter.cjs");

function activeCompilerRegistries() {
  const expressive = rendererProfile.id === EXPRESSIVE_RENDERER_PROFILE_ID;
  return Object.freeze({
    topology: expressive ? EXPRESSIVE_TOPOLOGY_COMPILERS : TOPOLOGY_COMPILERS,
    semantic: expressive
      ? EXPRESSIVE_SEMANTIC_COMPILER_REGISTRIES
      : SEMANTIC_COMPILER_REGISTRIES,
  });
}

function deriveBuildCapabilities() {
  const session = createCandidateSession();
  const registries = activeCompilerRegistries();
  const topologyIds = Object.freeze(
    Object.fromEntries(Object.entries(registries.topology).map(([name, entry]) => [name, entry.id])),
  );
  const semanticCompilerIds = Object.freeze(
    Object.fromEntries(
      Object.entries(registries.semantic).map(([axis, registry]) => [
        axis,
        Object.freeze({ ...registry }),
      ]),
    ),
  );

  const capabilities = [
    typeof session.stageLabProposal === "function" && typeof session.generate === "function"
      ? "labProposalInfluenceToggle"
      : null,
    OUTPUT_PROFILES.delivery?.id === "delivery" ? "deliveryProfile" : null,
    ["circle", "mirrored-ring", "spiral", "quad-mirror"].every((name) => registries.topology[name])
      ? "boundedFieldEnvelopeV1"
      : null,
    ["toaster-raster-2", EXPRESSIVE_RENDERER_PROFILE_ID].includes(rendererProfile.id) &&
      registries.topology.spiral && registries.topology["quad-mirror"]
      ? "visualLanguageV2"
      : null,
    rendererProfile.id === EXPRESSIVE_RENDERER_PROFILE_ID &&
      registries.topology.circle?.id === "circle-v2" &&
      registries.semantic.camera?.orbit === "camera-orbit-v2"
      ? "internalResponseV1"
      : null,
    UI_WITNESS_POLICY === "ui-witness-v1" ? "uiWitnessV1" : null,
    TOAST_FEEL_CONTRACT === "toast-feel-v1" && TOAST_FEELS.length === 7
      ? "toastFeelV1"
      : null,
    NATIVE_COLOR_POLICY === "native-color-witness-v1" &&
      RELATIONSHIPS.length === 2 &&
      RELATIONSHIPS[0] === "echo" &&
      RELATIONSHIPS[1] === "counterpoint"
      ? "nativeColorWitnessV1"
      : null,
    RENDER_FAILURE_EVIDENCE_SCHEMA === "full-measure.render-failure.v1"
      ? "renderFailureEvidenceV1"
      : null,
  ].filter(Boolean);

  return Object.freeze({
    rendererProfileGeneration: rendererProfile.id,
    capabilities: Object.freeze(capabilities),
    topologyCompilers: topologyIds,
    semanticCompilers: semanticCompilerIds,
  });
}

module.exports = {
  activeCompilerRegistries,
  deriveBuildCapabilities,
};
