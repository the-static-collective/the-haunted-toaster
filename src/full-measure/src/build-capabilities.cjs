const { createCandidateSession, rendererProfile } = require("./candidate-session.cjs");
const {
  EXPRESSIVE_RENDERER_PROFILE_ID,
  MUTATION_LATTICE_RENDERER_PROFILE_ID,
} = require("./generation/renderer-policy.cjs");
const { MUTATION_LATTICE_POLICY } = require("./generation/mutation-lattice-generation.cjs");
const { TOPOLOGY_ARC_POLICY } = require("./generation/topology-arc.cjs");
const {
  CROSS_POLICY,
  TOASTMOOD_FIELD_POLICY,
} = require("./generation/beta-candidate-ecology.cjs");
const { OUTPUT_PROFILES } = require("./render/output-profiles.cjs");
const { TOAST_FEEL_CONTRACT, TOAST_FEELS } = require("./toast-feels.cjs");
const { NATIVE_COLOR_POLICY, RELATIONSHIPS } = require("./generation/native-color.cjs");
const { RENDER_FAILURE_EVIDENCE_SCHEMA } = require("./render/render-failure-evidence.cjs");
const { UI_WITNESS_POLICY } = require("./ui-witness-policy.cjs");
const {
  EXPRESSIVE_SEMANTIC_COMPILER_REGISTRIES,
  SEMANTIC_COMPILER_REGISTRIES,
} = require("./render/timeline-filter.cjs");
const {
  EXPRESSIVE_TOPOLOGY_COMPILERS,
  MUTATION_LATTICE_TOPOLOGY_COMPILERS,
  SHAPE_PACK_TOPOLOGIES,
  TOPOLOGY_COMPILERS,
} = require("./render/topology-compilers.cjs");

function activeCompilerRegistries() {
  if (rendererProfile.id === MUTATION_LATTICE_RENDERER_PROFILE_ID) {
    return Object.freeze({
      topology: MUTATION_LATTICE_TOPOLOGY_COMPILERS,
      semantic: EXPRESSIVE_SEMANTIC_COMPILER_REGISTRIES,
    });
  }
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

  const expressiveActive = [EXPRESSIVE_RENDERER_PROFILE_ID, MUTATION_LATTICE_RENDERER_PROFILE_ID]
    .includes(rendererProfile.id);
  const mutationLatticeActive = rendererProfile.id === MUTATION_LATTICE_RENDERER_PROFILE_ID;

  const capabilities = [
    typeof session.stageLabProposal === "function" && typeof session.generate === "function"
      ? "labProposalInfluenceToggle"
      : null,
    OUTPUT_PROFILES.delivery?.id === "delivery" ? "deliveryProfile" : null,
    ["circle", "mirrored-ring", "spiral", "quad-mirror"].every((name) => registries.topology[name])
      ? "boundedFieldEnvelopeV1"
      : null,
    ["toaster-raster-2", EXPRESSIVE_RENDERER_PROFILE_ID, MUTATION_LATTICE_RENDERER_PROFILE_ID]
      .includes(rendererProfile.id) && registries.topology.spiral && registries.topology["quad-mirror"]
      ? "visualLanguageV2"
      : null,
    expressiveActive &&
      registries.topology.circle?.id === "circle-v2" &&
      registries.semantic.camera?.orbit === "camera-orbit-v2"
      ? "internalResponseV1"
      : null,
    UI_WITNESS_POLICY === "ui-witness-v1" ? "uiWitnessV1" : null,
    TOAST_FEEL_CONTRACT === "toast-feel-v2" && TOAST_FEELS.length === 7
      ? "toastFeelV2"
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
    mutationLatticeActive && MUTATION_LATTICE_POLICY === "mutation-lattice-v1"
      ? "mutationLatticeV1"
      : null,
    mutationLatticeActive &&
      SHAPE_PACK_TOPOLOGIES.length === 4 &&
      SHAPE_PACK_TOPOLOGIES.every((name) => registries.topology[name]?.id?.endsWith("-v3"))
      ? "shapePackV1"
      : null,
    mutationLatticeActive && TOPOLOGY_ARC_POLICY === "topology-arc-v1"
      ? "topologyArcV1"
      : null,
    typeof session.generate === "function" &&
      typeof session.cross === "function" &&
      TOASTMOOD_FIELD_POLICY === "toastmood-field-v1" &&
      CROSS_POLICY === "two-parent-cross-v1"
      ? "betaCandidateEcologyV1"
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
