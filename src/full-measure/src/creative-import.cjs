const generation = require("./generation/index.cjs");
const {
  LAB_PROPOSAL_SCHEMA,
  admitLabProposal,
  parseLabProposalTransfer,
} = require("./lab-proposal.cjs");

const CREATIVE_IMPORT_HASH_DOMAIN = "HauntedToaster-CreativeImportSource-v1";
const LAB_ADAPTER_ID = "toaster-lab/proposal-transfer-v1";

function assertObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Creative import must be a JSON object.");
  }
  return value;
}

function validationError(result) {
  return result.errors.map((item) => `${item.path}: ${item.message}`).join("; ");
}

function parseCreativeImport(input) {
  const source = assertObject(input);

  if (source.schema === generation.VISUAL_SCORE_SCHEMA) {
    const parsed = generation.parseVisualScore(source);
    if (!parsed.ok) throw new TypeError(validationError(parsed));
    return Object.freeze({
      kind: "canonical-visual-score",
      title: "Canonical VisualScore",
      sourceObject: parsed.value,
      sourceObjectHash: generation.hashCanonical(parsed.value, CREATIVE_IMPORT_HASH_DOMAIN),
      sourceProducer: "haunted-toaster",
      adapterId: null,
    });
  }

  if (source.schema === LAB_PROPOSAL_SCHEMA) {
    const parsed = parseLabProposalTransfer(source);
    return Object.freeze({
      kind: "legacy-lab-proposal",
      title: parsed.proposal?.title || "Legacy Lab proposal",
      sourceObject: parsed,
      sourceObjectHash: generation.hashCanonical(parsed, CREATIVE_IMPORT_HASH_DOMAIN),
      sourceProducer: "toaster-lab",
      adapterId: LAB_ADAPTER_ID,
    });
  }

  throw new TypeError(
    `Unsupported creative object schema: ${String(source.schema || "missing schema")}.`,
  );
}

function admitCreativeImport(input, constraints) {
  const parsed = input?.kind ? input : parseCreativeImport(input);

  if (parsed.kind === "canonical-visual-score") {
    const check = generation.scoreWithinConstraints(parsed.sourceObject, constraints);
    if (!check.ok) throw new TypeError(validationError(check));
    return Object.freeze({
      scoreArtifact: generation.artifact(parsed.sourceObject, null),
      provenance: Object.freeze({
        mode: "canonical-score",
        sourceProducer: parsed.sourceProducer,
        adapterId: parsed.adapterId,
        sourceObjectHash: parsed.sourceObjectHash,
      }),
    });
  }

  if (parsed.kind === "legacy-lab-proposal") {
    const admitted = admitLabProposal(parsed.sourceObject, constraints);
    return Object.freeze({
      scoreArtifact: admitted.scoreArtifact,
      provenance: Object.freeze({
        mode: "legacy-adapter",
        sourceProducer: parsed.sourceProducer,
        adapterId: parsed.adapterId,
        sourceObjectHash: parsed.sourceObjectHash,
      }),
    });
  }

  throw new TypeError(`Unsupported creative import kind: ${String(parsed.kind)}.`);
}

module.exports = {
  CREATIVE_IMPORT_HASH_DOMAIN,
  LAB_ADAPTER_ID,
  admitCreativeImport,
  parseCreativeImport,
};
