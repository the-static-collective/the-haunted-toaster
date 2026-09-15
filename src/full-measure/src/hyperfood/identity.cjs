const {
  addressCanonical,
  canonicalStringify,
} = require("../generation/canonical.cjs");
const {
  normalizeHyperFoodSpec,
} = require("./schema.cjs");

const HYPERFOOD_SPECIMEN_DOMAIN = "HauntedToaster-HyperFood-Specimen-v0";
const HYPERFOOD_SPECIMEN_PREFIX = "hf0_";

function semanticPayload(input) {
  return normalizeHyperFoodSpec(input);
}

function specimenId(input) {
  return addressCanonical(semanticPayload(input), {
    domain: HYPERFOOD_SPECIMEN_DOMAIN,
    prefix: HYPERFOOD_SPECIMEN_PREFIX,
  });
}

function canonicalSpecimenJson(input) {
  return canonicalStringify(semanticPayload(input));
}

module.exports = {
  HYPERFOOD_SPECIMEN_DOMAIN,
  HYPERFOOD_SPECIMEN_PREFIX,
  canonicalSpecimenJson,
  semanticPayload,
  specimenId,
};
