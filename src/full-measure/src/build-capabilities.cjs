const { createCandidateSession, rendererProfile } = require("./candidate-session.cjs");
const { OUTPUT_PROFILES } = require("./render/output-profiles.cjs");
const {
  SEMANTIC_COMPILER_REGISTRIES,
  TOPOLOGY_COMPILERS,
} = require("./render/timeline-filter.cjs");

function deriveBuildCapabilities() {
  const session = createCandidateSession();
  const topologyIds = Object.freeze(
    Object.fromEntries(Object.entries(TOPOLOGY_COMPILERS).map(([name, entry]) => [name, entry.id])),
  );
  const semanticCompilerIds = Object.freeze(
    Object.fromEntries(
      Object.entries(SEMANTIC_COMPILER_REGISTRIES).map(([axis, registry]) => [
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
    ["circle", "mirrored-ring", "spiral", "quad-mirror"].every((name) => TOPOLOGY_COMPILERS[name])
      ? "boundedFieldEnvelopeV1"
      : null,
    rendererProfile.id === "toaster-raster-2" && TOPOLOGY_COMPILERS.spiral && TOPOLOGY_COMPILERS["quad-mirror"]
      ? "visualLanguageV2"
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
  deriveBuildCapabilities,
};
