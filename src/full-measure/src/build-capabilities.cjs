const { createCandidateSession, rendererProfile } = require("./candidate-session.cjs");
const { EXPRESSIVE_RENDERER_PROFILE_ID } = require("./generation/renderer-policy.cjs");
const { OUTPUT_PROFILES } = require("./render/output-profiles.cjs");
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
