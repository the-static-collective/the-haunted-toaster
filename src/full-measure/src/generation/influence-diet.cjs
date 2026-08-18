const { deepFreeze, hashCanonical } = require("./canonical.cjs");
const { assertCreativeContextTable } = require("./creative-context-table.cjs");

const INFLUENCE_DIET_SCHEMA = "haunted-toaster/influence-diet/v1";

function sortedUnique(value) {
  return [...new Set((value || []).map(String))].sort();
}

function buildInfluenceDiet({ table, consumedProviderIds = [], influenceOnlyProviderIds = [] } = {}) {
  const context = assertCreativeContextTable(table);
  const available = context.entries.filter((entry) => entry.availability === "available");
  const byId = new Map(available.map((entry) => [entry.providerId, entry]));
  const ate = sortedUnique(consumedProviderIds);
  const influenceOnly = sortedUnique(influenceOnlyProviderIds);

  for (const providerId of [...ate, ...influenceOnly]) {
    if (!byId.has(providerId)) {
      throw new TypeError(
        `Creative context provider ${providerId} is not present in Creative Context Table.`,
      );
    }
  }
  for (const providerId of ate) {
    const entry = byId.get(providerId);
    if (entry.authorityClass === "influence-only") {
      throw new TypeError(`Influence-only provider ${providerId} cannot be eaten.`);
    }
  }
  for (const providerId of influenceOnly) {
    const entry = byId.get(providerId);
    if (entry.authorityClass !== "influence-only") {
      throw new TypeError(`Provider ${providerId} is not influence-only.`);
    }
  }

  const overlap = ate.filter((providerId) => influenceOnly.includes(providerId));
  if (overlap.length) {
    throw new TypeError(`Provider ${overlap[0]} cannot occupy two Influence Diet categories.`);
  }

  const boundaries = available
    .filter((entry) => ["source-truth", "constraint"].includes(entry.authorityClass))
    .map((entry) => entry.providerId)
    .sort();
  const optional = available
    .filter((entry) => !boundaries.includes(entry.providerId))
    .map((entry) => entry.providerId);
  const used = new Set([...ate, ...influenceOnly]);
  const ignored = optional.filter((providerId) => !used.has(providerId)).sort();
  const core = {
    schema: INFLUENCE_DIET_SCHEMA,
    tableHash: context.tableHash,
    ate,
    ignored,
    influenceOnly,
    boundaries,
  };

  return deepFreeze({
    ...core,
    dietHash: hashCanonical(core, "HauntedToaster-InfluenceDiet-v1"),
  });
}

function assertInfluenceDiet(diet, table) {
  if (!diet || diet.schema !== INFLUENCE_DIET_SCHEMA) {
    throw new TypeError(`Expected ${INFLUENCE_DIET_SCHEMA}.`);
  }
  const rebuilt = buildInfluenceDiet({
    table,
    consumedProviderIds: diet.ate,
    influenceOnlyProviderIds: diet.influenceOnly,
  });
  if (rebuilt.dietHash !== diet.dietHash) {
    throw new TypeError("Influence Diet hash mismatch.");
  }
  return rebuilt;
}

module.exports = {
  INFLUENCE_DIET_SCHEMA,
  assertInfluenceDiet,
  buildInfluenceDiet,
};
