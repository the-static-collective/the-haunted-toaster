const { createVisualScore } = require("./generation/index.cjs");

const LAB_PROPOSAL_SCHEMA = "toaster-lab/proposal-transfer/v1";
const LAB_SUGGESTION_SCHEMA = "toaster-lab/suggested-visual-score/v1";
const LAB_SUGGESTION_AUTHORITY = "non-canonical-suggestion";

const PALETTE_LOGIC_ALIASES = Object.freeze({
  analogous: Object.freeze(["split-complement"]),
  "split-complement": Object.freeze(["analogous"]),
});

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

function admittedEnum(value, allowed, aliases = {}) {
  if (typeof value !== "string" || !Array.isArray(allowed)) return undefined;
  if (allowed.includes(value)) return value;
  const translated = aliases[value] || [];
  return translated.find((candidate) => allowed.includes(candidate));
}

function suggestionOverrides(transfer, constraints) {
  const suggestion = transfer.suggestedVisualScore;
  const overrides = {};

  const topology = admittedEnum(suggestion.topology, constraints?.topology?.allowed);
  if (topology !== undefined) overrides.topology = topology;

  const motionGrammar = admittedEnum(
    suggestion.motion?.grammar,
    constraints?.motion?.grammar?.allowed,
  );
  if (motionGrammar !== undefined) overrides.motion = { grammar: motionGrammar };

  const paletteLogic = admittedEnum(
    suggestion.palette?.logic,
    constraints?.palette?.logic?.allowed,
    PALETTE_LOGIC_ALIASES,
  );
  if (paletteLogic !== undefined) overrides.palette = { logic: paletteLogic };

  const materialTexture = admittedEnum(
    suggestion.material?.texture,
    constraints?.material?.texture?.allowed,
  );
  if (materialTexture !== undefined) overrides.material = { texture: materialTexture };

  const lyricPlacement = admittedEnum(
    suggestion.lyric?.placement,
    constraints?.lyric?.placement?.allowed,
  );
  if (lyricPlacement !== undefined) overrides.lyric = { placement: lyricPlacement };

  const cameraGrammar = admittedEnum(
    suggestion.camera?.grammar,
    constraints?.camera?.grammar?.allowed,
  );
  if (cameraGrammar !== undefined) overrides.camera = { grammar: cameraGrammar };

  const temporalDensity = admittedEnum(
    suggestion.temporalDensity,
    constraints?.temporalDensity?.allowed,
  );
  if (temporalDensity !== undefined) overrides.temporalDensity = temporalDensity;

  return overrides;
}

function admitLabProposal(input, constraints) {
  const transfer = parseLabProposalTransfer(input);
  const seed = `toaster-lab:${transfer.provenance?.seed ?? transfer.proposal?.id ?? "proposal"}`;
  const scoreArtifact = createVisualScore({
    seed,
    constraints,
    overrides: suggestionOverrides(transfer, constraints),
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
  PALETTE_LOGIC_ALIASES,
  admitLabProposal,
  admittedEnum,
  parseLabProposalTransfer,
  suggestionOverrides,
};
