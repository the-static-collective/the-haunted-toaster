const fs = require('node:fs/promises');
const { hashCanonical } = require('../generation/canonical.cjs');
const { listArchivedRenders } = require('./receipt-archive.cjs');
const { listHumanVerdicts } = require('./human-verdict.cjs');

const MEMORY_PROJECTION_SCHEMA = 'haunted-toaster/memory-projection/v1';
const MEMORY_PROJECTION_POLICY = 'receipt-memory-projection-v1';
const RECENT_RENDER_WINDOW = 12;

function songEnergyClass(sections = []) {
  const values = sections.map((section) => Number(section?.energy)).filter(Number.isFinite);
  const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0.5;
  if (mean < 0.34) return 'quiet';
  if (mean > 0.67) return 'dense';
  return 'mixed';
}

function stableToken(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    return text || null;
  }
  return `hash-${hashCanonical(value, 'HauntedToaster-MemoryFeature-v1').slice(0, 12)}`;
}

function extractReceiptFeatures(receipt = {}) {
  const features = [];
  features.push(`songEnergy:${songEnergyClass(receipt.treatment?.sections || [])}`);

  const simple = [
    ['garment', receipt.treatment?.garment?.id],
    ['toastFeel', receipt.treatment?.toastFeel?.id],
    ['nativeColor', receipt.treatment?.nativeColor?.relationship],
    ['topology', receipt.render?.visualCompiler?.topology],
    ['witnessWindow', receipt.render?.witnessWindow?.policyVersion],
  ];
  for (const [prefix, value] of simple) {
    const token = stableToken(value);
    if (token) features.push(`${prefix}:${token}`);
  }

  const operators = receipt.render?.visualCompiler?.operators;
  if (Array.isArray(operators)) {
    for (const operator of operators) {
      const token = stableToken(operator);
      if (token) features.push(`operator:${token}`);
    }
  } else {
    const token = stableToken(operators);
    if (token) features.push(`operator:${token}`);
  }

  return [...new Set(features)].sort();
}

function verdictWeight(verdict) {
  if (!verdict) return 0;
  const ratingWeight = (Number(verdict.rating) - 3) / 2;
  const dispositionWeight = verdict.disposition === 'keep'
    ? 0.5
    : verdict.disposition === 'compost'
      ? -0.5
      : 0;
  const reToastWeight = verdict.wouldReToast ? 0.25 : 0;
  return ratingWeight + dispositionWeight + reToastWeight;
}

function sortRenders(renders = []) {
  return renders
    .filter((render) => render?.receiptSha256 && render?.receipt?.validation?.accepted === true)
    .slice()
    .sort((left, right) =>
      String(left.createdAt || left.receipt?.createdAt || '').localeCompare(
        String(right.createdAt || right.receipt?.createdAt || ''),
      ) || String(left.receiptSha256).localeCompare(String(right.receiptSha256)));
}

function sortVerdicts(verdicts = []) {
  return verdicts
    .filter((verdict) => verdict?.schema === 'haunted-toaster/human-verdict/v1')
    .slice()
    .sort((left, right) =>
      String(left.createdAt || '').localeCompare(String(right.createdAt || '')) ||
      String(left.verdictId || '').localeCompare(String(right.verdictId || '')));
}

function increment(target, key, amount = 1) {
  target[key] = (target[key] || 0) + amount;
}

function sortedObject(source) {
  return Object.fromEntries(Object.entries(source).sort(([left], [right]) => left.localeCompare(right)));
}

function buildMemoryProjection({ renders = [], verdicts = [], witnessEncounters = [] } = {}) {
  const orderedRenders = sortRenders(renders);
  const orderedVerdicts = sortVerdicts(verdicts);
  const latestVerdicts = {};
  for (const verdict of orderedVerdicts) {
    latestVerdicts[verdict.renderReceiptSha256] = verdict;
  }

  const featureCounts = {};
  for (const render of orderedRenders) {
    for (const feature of extractReceiptFeatures(render.receipt)) increment(featureCounts, feature);
  }

  const recentFeatureCounts = {};
  for (const render of orderedRenders.slice(-RECENT_RENDER_WINDOW)) {
    for (const feature of extractReceiptFeatures(render.receipt)) increment(recentFeatureCounts, feature);
  }

  const relationshipWeights = {};
  for (const render of orderedRenders) {
    const features = extractReceiptFeatures(render.receipt);
    const songEnergy = features.find((feature) => feature.startsWith('songEnergy:'));
    if (!songEnergy) continue;
    const weight = verdictWeight(latestVerdicts[render.receiptSha256]);
    if (weight === 0) continue;
    for (const feature of features) {
      if (feature === songEnergy) continue;
      increment(relationshipWeights, `${songEnergy}|${feature}`, weight);
    }
  }

  const archiveCut = hashCanonical({
    renders: orderedRenders.map((render) => render.receiptSha256),
    verdicts: orderedVerdicts.map((verdict) => verdict.verdictId),
    witnessEncounters: (witnessEncounters || [])
      .map((item) => item?.witnessId)
      .filter(Boolean)
      .sort(),
  }, 'HauntedToaster-MemoryArchiveCut-v1');

  const core = {
    schema: MEMORY_PROJECTION_SCHEMA,
    policy: MEMORY_PROJECTION_POLICY,
    archiveCut,
    renderCount: orderedRenders.length,
    featureCounts: sortedObject(featureCounts),
    recentFeatureCounts: sortedObject(recentFeatureCounts),
    relationshipWeights: sortedObject(relationshipWeights),
    latestVerdicts: sortedObject(latestVerdicts),
  };

  return {
    ...core,
    projectionSha256: hashCanonical(core, 'HauntedToaster-MemoryProjection-v1'),
  };
}

async function rebuildMemoryProjection({ rootDir }) {
  const archived = await listArchivedRenders({ rootDir });
  const renders = [];
  for (const entry of archived) {
    const receipt = JSON.parse(await fs.readFile(entry.artifacts.receipt.path, 'utf8'));
    renders.push({ ...entry, receipt });
  }
  const verdicts = await listHumanVerdicts({ rootDir });
  return buildMemoryProjection({ renders, verdicts });
}

module.exports = {
  MEMORY_PROJECTION_POLICY,
  MEMORY_PROJECTION_SCHEMA,
  RECENT_RENDER_WINDOW,
  buildMemoryProjection,
  extractReceiptFeatures,
  rebuildMemoryProjection,
  songEnergyClass,
  verdictWeight,
};
