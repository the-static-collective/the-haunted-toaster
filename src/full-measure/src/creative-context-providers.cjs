const {
  buildCreativeContextTable,
  hashCanonical,
} = require("./generation/index.cjs");

function ref(domain, value) {
  return `sha256:${hashCanonical(value, domain)}`;
}

function buildCandidateCreativeContext({
  analysis,
  responseWitness = null,
  constraints,
  nativeChromaticProfile = null,
  memoryInfluence = null,
} = {}) {
  if (!analysis) {
    throw new TypeError("Creative context requires normalized song analysis.");
  }
  if (!constraints?.id) {
    throw new TypeError("Creative context requires admitted garment constraints.");
  }

  const entries = [
    {
      providerId: "source/song",
      policyVersion: "song-source-v1",
      evidenceRef: ref("HauntedToaster-CreativeContext-Song-v1", {
        analysis,
        responseWitness,
      }),
      authorityClass: "source-truth",
      ancestryClass: "none",
      allowedDecisions: ["family-composition", "temporal-response"],
      required: true,
      availability: "available",
      payload: {
        analysisHash: hashCanonical(
          analysis,
          "HauntedToaster-CreativeContext-Analysis-v1",
        ),
        responseWitnessHash: responseWitness
          ? hashCanonical(
              responseWitness,
              "HauntedToaster-CreativeContext-ResponseWitness-v1",
            )
          : null,
      },
    },
    {
      providerId: "constraint/garment",
      policyVersion: String(constraints.schema || constraints.version || constraints.id),
      evidenceRef: ref(
        "HauntedToaster-CreativeContext-Constraints-v1",
        constraints,
      ),
      authorityClass: "constraint",
      ancestryClass: "none",
      allowedDecisions: ["all-creative-axes"],
      required: true,
      availability: "available",
      payload: { constraintPackId: constraints.id },
    },
  ];

  if (nativeChromaticProfile) {
    entries.push({
      providerId: "source/image-native-color",
      policyVersion: String(
        nativeChromaticProfile.schema || "native-color-profile-v1",
      ),
      evidenceRef: `sha256:${String(nativeChromaticProfile.profileSha256)}`,
      authorityClass: "creative-material",
      ancestryClass: "none",
      allowedDecisions: ["native-color"],
      required: false,
      availability: "available",
      payload: structuredClone(nativeChromaticProfile),
    });
  }

  if (memoryInfluence) {
    entries.push({
      providerId: "memory/receipt-v1",
      policyVersion: String(
        memoryInfluence.policy || "toaster-memory-influence-v1",
      ),
      evidenceRef: ref(
        "HauntedToaster-CreativeContext-MemoryInfluence-v1",
        memoryInfluence,
      ),
      authorityClass: "influence-only",
      ancestryClass: "none",
      allowedDecisions: [
        "coverage",
        "topology",
        "motion",
        "palette",
        "material",
        "camera",
      ],
      required: false,
      availability: "available",
      payload: structuredClone(memoryInfluence),
    });
  }

  return buildCreativeContextTable({ entries });
}

module.exports = { buildCandidateCreativeContext };
