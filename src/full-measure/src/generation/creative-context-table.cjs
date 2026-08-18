const { canonicalStringify, deepFreeze, hashCanonical } = require("./canonical.cjs");

const CREATIVE_CONTEXT_TABLE_SCHEMA = "haunted-toaster/creative-context-table/v1";
const CREATIVE_CONTEXT_PROVIDER_POLICY = "creative-context-provider-v1";
const CREATIVE_CONTEXT_AUTHORITY_CLASSES = Object.freeze([
  "source-truth",
  "constraint",
  "ancestry",
  "influence-only",
  "creative-material",
]);
const ANCESTRY_CLASSES = Object.freeze(["none", "explicit-parent"]);
const AVAILABILITY = Object.freeze(["available", "unavailable"]);

function normalizeStringArray(value) {
  return [...new Set((value || []).map(String))].sort();
}

function normalizeEntry(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("Creative context entry must be an object.");
  }
  const providerId = String(input.providerId || "").trim();
  const policyVersion = String(input.policyVersion || "").trim();
  const authorityClass = String(input.authorityClass || "").trim();
  const ancestryClass = String(input.ancestryClass || "none").trim();
  const availability = String(input.availability || "available").trim();
  if (!providerId) throw new TypeError("Creative context providerId is required.");
  if (!policyVersion) {
    throw new TypeError(`Creative context provider ${providerId} requires policyVersion.`);
  }
  if (!CREATIVE_CONTEXT_AUTHORITY_CLASSES.includes(authorityClass)) {
    throw new TypeError(`Unknown creative context authority class: ${authorityClass}.`);
  }
  if (!ANCESTRY_CLASSES.includes(ancestryClass)) {
    throw new TypeError(`Unknown creative context ancestry class: ${ancestryClass}.`);
  }
  if (!AVAILABILITY.includes(availability)) {
    throw new TypeError(`Unknown creative context availability: ${availability}.`);
  }
  if (authorityClass === "influence-only" && ancestryClass !== "none") {
    throw new TypeError(`Influence-only provider ${providerId} cannot claim ancestry.`);
  }
  const required = input.required === true;
  if (required && availability !== "available") {
    throw new TypeError(`Required creative context provider ${providerId} is unavailable.`);
  }
  if (availability === "available" && !input.evidenceRef) {
    throw new TypeError(`Available creative context provider ${providerId} requires evidenceRef.`);
  }
  return deepFreeze({
    schema: CREATIVE_CONTEXT_PROVIDER_POLICY,
    providerId,
    policyVersion,
    evidenceRef: input.evidenceRef ? String(input.evidenceRef) : null,
    authorityClass,
    ancestryClass,
    allowedDecisions: normalizeStringArray(input.allowedDecisions),
    required,
    availability,
    payload: input.payload == null ? null : structuredClone(input.payload),
  });
}

function buildCreativeContextTable({ entries = [] } = {}) {
  const normalized = entries
    .map(normalizeEntry)
    .sort((left, right) => left.providerId.localeCompare(right.providerId));
  const seen = new Map();
  for (const item of normalized) {
    const previous = seen.get(item.providerId);
    if (previous && canonicalStringify(previous) !== canonicalStringify(item)) {
      throw new TypeError(
        `Duplicate creative context provider ${item.providerId} has contradictory evidence.`,
      );
    }
    if (!previous) seen.set(item.providerId, item);
  }
  const unique = [...seen.values()];
  const core = { schema: CREATIVE_CONTEXT_TABLE_SCHEMA, entries: unique };
  return deepFreeze({
    ...core,
    tableHash: hashCanonical(core, "HauntedToaster-CreativeContextTable-v1"),
  });
}

function assertCreativeContextTable(table) {
  if (!table || table.schema !== CREATIVE_CONTEXT_TABLE_SCHEMA) {
    throw new TypeError(`Expected ${CREATIVE_CONTEXT_TABLE_SCHEMA}.`);
  }
  const rebuilt = buildCreativeContextTable({ entries: table.entries });
  if (rebuilt.tableHash !== table.tableHash) {
    throw new TypeError("Creative Context Table hash mismatch.");
  }
  return rebuilt;
}

function findCreativeContextEntry(table, providerId) {
  const validated = assertCreativeContextTable(table);
  return validated.entries.find((item) => item.providerId === String(providerId)) || null;
}

module.exports = {
  CREATIVE_CONTEXT_AUTHORITY_CLASSES,
  CREATIVE_CONTEXT_PROVIDER_POLICY,
  CREATIVE_CONTEXT_TABLE_SCHEMA,
  assertCreativeContextTable,
  buildCreativeContextTable,
  findCreativeContextEntry,
};
