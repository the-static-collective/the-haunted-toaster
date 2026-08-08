const { createVisualScore } = require("./generation/index.cjs");

const LAB_PROPOSAL_SCHEMA = "toaster-lab/proposal-transfer/v1";
const LAB_SUGGESTION_SCHEMA = "toaster-lab/suggested-visual-score/v1";
const LAB_SUGGESTION_AUTHORITY = "non-canonical-suggestion";

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function parseLabProposalTransfer(input) {
  const transfer = assertObject(input, "Lab proposal transfer");
  if (transfer.schema !== LAB_PROPOSAL_SCHEMA) {
    throw new TypeError(`Expected ${LAB_PROPOSAL_SCHEMA}.`);
  }

  const suggestion = assertObject(transfer.suggestedVisualScore, "suggestedVisualScore");
  if (suggestion.schema !== LAB_SUGGESTION_SCHEMA) {
    throw new TypeError(`Expected ${LAB_SUGGESTION_SCHEMA}.`);
  }
  if (suggestion.authority !== LAB_SUGGESTION_AUTHORITY) {
    throw new TypeError("Lab suggestion must remain explicitly non-authoritative.");
  }

  return transfer;
}

function suggestionOverrides(transfer) {
  const suggestion = transfer.suggestedVisualScore;
  return {
    topology: suggestion.topology,
    motion: { grammar: suggestion.motion?.grammar },
    palette: { logic: suggestion.palette?.logic },
    material: { texture: suggestion.material?.texture },
    lyric: { placement: suggestion.lyric?.placement },
    camera: { grammar: suggestion.camera?.grammar },
    temporalDensity: suggestion.temporalDensity,
  };
}

function admitLabProposal(input, constraints) {
  const transfer = parseLabProposalTransfer(input);
  const seed = `toaster-lab:${transfer.provenance?.seed ?? transfer.proposal?.id ?? "proposal"}`;
  const scoreArtifact = createVisualScore({
    seed,
    constraints,
    overrides: suggestionOverrides(transfer),
  });

  return {
    transfer,
    scoreArtifact,
  };
}

module.exports = {
  LAB_PROPOSAL_SCHEMA,
  LAB_SUGGESTION_AUTHORITY,
  LAB_SUGGESTION_SCHEMA,
  admitLabProposal,
  parseLabProposalTransfer,
  suggestionOverrides,
};
