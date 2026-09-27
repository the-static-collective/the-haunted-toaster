const fs = require("node:fs/promises");
const {
  archiveSuccessfulRender,
  listArchivedRenders,
  readArchivedRender,
} = require("./receipt-archive.cjs");
const {
  appendHumanVerdict,
  listHumanVerdicts,
} = require("./human-verdict.cjs");
const {
  buildMemoryProjection,
  extractReceiptFeatures,
} = require("./memory-projection.cjs");
const {
  allowedFeatureUniverse,
  allowedPrismFeatureUniverse,
  deriveMemoryCapsule,
  deriveMemoryPrism,
  summarizeCurrentSongEvidence,
} = require("./memory-capsule.cjs");
const { deriveWitnessDisposition } = require("./witness-disposition.cjs");

async function resolvedRoot(rootProvider) {
  if (typeof rootProvider !== "function") {
    throw new TypeError("Toaster memory service requires a rootProvider function.");
  }
  const value = await rootProvider();
  if (!value || typeof value !== "string") {
    throw new TypeError("Toaster memory rootProvider must return a local path string.");
  }
  return value;
}

async function readJsonIfPresent(filePath) {
  if (!filePath) return null;
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function receiptForEntry(entry) {
  return readJsonIfPresent(entry.artifacts?.receipt?.path);
}

async function scoreForEntry(entry) {
  return readJsonIfPresent(entry.artifacts?.score?.path);
}

function latestVerdictMap(verdicts) {
  const map = new Map();
  for (const verdict of verdicts) map.set(verdict.renderReceiptSha256, verdict);
  return map;
}

function safeToastSummary(entry, receipt, latestVerdict) {
  return {
    receiptSha256: entry.receiptSha256,
    createdAt: entry.createdAt,
    title: entry.title,
    artist: entry.artist,
    visualIdentity: structuredClone(entry.visualIdentity || {}),
    features: extractReceiptFeatures(receipt || {}, null),
    availability: structuredClone(entry.availability || {}),
    latestVerdict: latestVerdict ? structuredClone(latestVerdict) : null,
  };
}

function createMemoryService({ rootProvider } = {}) {
  async function rootDir() {
    return resolvedRoot(rootProvider);
  }

  async function currentProjection() {
    const root = await rootDir();
    const [entries, verdicts] = await Promise.all([
      listArchivedRenders({ rootDir: root }),
      listHumanVerdicts({ rootDir: root }),
    ]);
    const renders = [];
    for (const entry of entries) {
      const [receipt, score] = await Promise.all([
        receiptForEntry(entry),
        scoreForEntry(entry),
      ]);
      if (!receipt) continue;
      renders.push({ ...entry, receipt, score });
    }
    return buildMemoryProjection({ renders, verdicts });
  }

  async function contextForGeneration({ mediaAnalysis, constraints } = {}) {
    const projection = await currentProjection();
    const currentSongEvidence = summarizeCurrentSongEvidence(mediaAnalysis);
    const capsule = deriveMemoryCapsule({
      projection,
      currentSongEvidence,
      allowedFeatures: allowedFeatureUniverse(constraints),
      explicitAncestorReceiptSha256: null,
    });
    const prism = deriveMemoryPrism({
      projection,
      currentSongEvidence,
      allowedFeatures: allowedPrismFeatureUniverse(constraints),
      capsuleSha256: capsule.capsuleSha256,
    });
    return {
      projectionSha256: projection.projectionSha256,
      capsule,
      prism,
      witnessDisposition: deriveWitnessDisposition(capsule),
    };
  }

  async function archiveRender(renderResult) {
    return archiveSuccessfulRender({
      rootDir: await rootDir(),
      renderResult,
    });
  }

  async function listPastToasts() {
    const root = await rootDir();
    const [entries, verdicts] = await Promise.all([
      listArchivedRenders({ rootDir: root }),
      listHumanVerdicts({ rootDir: root }),
    ]);
    const latest = latestVerdictMap(verdicts);
    const output = [];
    for (const entry of entries) {
      const receipt = await receiptForEntry(entry);
      if (!receipt) continue;
      output.push(safeToastSummary(entry, receipt, latest.get(entry.receiptSha256)));
    }
    return output;
  }

  async function getPastToast(receiptSha256) {
    const root = await rootDir();
    const entry = await readArchivedRender({ rootDir: root, receiptSha256 });
    const [receipt, verdicts] = await Promise.all([
      receiptForEntry(entry),
      listHumanVerdicts({ rootDir: root, renderReceiptSha256: receiptSha256 }),
    ]);
    if (!receipt) throw new Error(`Archived receipt ${receiptSha256} is unreadable.`);
    return safeToastSummary(entry, receipt, verdicts.at(-1) || null);
  }

  async function submitVerdict(config = {}) {
    return appendHumanVerdict({
      ...config,
      rootDir: await rootDir(),
    });
  }

  return Object.freeze({
    archiveSuccessfulRender: archiveRender,
    contextForGeneration,
    currentProjection,
    getPastToast,
    listPastToasts,
    submitVerdict,
  });
}

module.exports = {
  createMemoryService,
};
