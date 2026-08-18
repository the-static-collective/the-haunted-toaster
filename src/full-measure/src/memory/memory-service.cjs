const fs = require("node:fs/promises");
const {
  archiveSuccessfulRender,
  listArchivedRenders,
  readArchivedRender,
  resolveArchivedArtifact,
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
  deriveGenerationPressure,
  deriveMemoryCapsule,
  summarizeCurrentSongEvidence,
} = require("./memory-capsule.cjs");
const { deriveWitnessDisposition } = require("./witness-disposition.cjs");
const {
  appendWitnessEncounter,
  listWitnessEncounters,
} = require("./witness-encounter.cjs");
const primitiveFieldScore = require("../generation/primitive-field-score.cjs");

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

async function receiptForEntry(entry) {
  return JSON.parse(await fs.readFile(entry.artifacts.receipt.path, "utf8"));
}

function latestVerdictMap(verdicts) {
  const map = new Map();
  for (const verdict of verdicts) map.set(verdict.renderReceiptSha256, verdict);
  return map;
}

function safeToastSummary(entry, receipt, latestVerdict) {
  const availability = structuredClone(entry.availability || {});
  return {
    receiptSha256: entry.receiptSha256,
    createdAt: entry.createdAt,
    title: entry.title,
    artist: entry.artist,
    visualIdentity: {
      ...(entry.visualIdentity || {}),
      topology: receipt.render?.visualCompiler?.topology || null,
    },
    features: extractReceiptFeatures(receipt),
    availability,
    availableArtifacts: Object.entries(availability)
      .filter(([, exists]) => exists === true)
      .map(([kind]) => kind)
      .sort(),
    latestVerdict: latestVerdict ? structuredClone(latestVerdict) : null,
  };
}

function createMemoryService({ rootProvider } = {}) {
  async function rootDir() {
    return resolvedRoot(rootProvider);
  }

  async function currentProjection() {
    const root = await rootDir();
    const [entries, verdicts, witnessEncounters] = await Promise.all([
      listArchivedRenders({ rootDir: root }),
      listHumanVerdicts({ rootDir: root }),
      listWitnessEncounters({ rootDir: root }),
    ]);
    const renders = [];
    for (const entry of entries) {
      renders.push({ ...entry, receipt: await receiptForEntry(entry) });
    }
    return buildMemoryProjection({ renders, verdicts, witnessEncounters });
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
    const toasts = [];
    for (const entry of entries) {
      const receipt = await receiptForEntry(entry);
      toasts.push(safeToastSummary(entry, receipt, latest.get(entry.receiptSha256)));
    }
    return toasts;
  }

  async function getPastToast(receiptSha256) {
    const root = await rootDir();
    const entry = await readArchivedRender({ rootDir: root, receiptSha256 });
    const [receipt, verdicts] = await Promise.all([
      receiptForEntry(entry),
      listHumanVerdicts({ rootDir: root, renderReceiptSha256: receiptSha256 }),
    ]);
    return safeToastSummary(entry, receipt, verdicts.at(-1) || null);
  }

  async function submitVerdict(config = {}) {
    return appendHumanVerdict({
      ...config,
      rootDir: await rootDir(),
    });
  }

  async function resolveReToastAncestor(receiptSha256) {
    const root = await rootDir();
    const artifact = await resolveArchivedArtifact({
      rootDir: root,
      receiptSha256,
      kind: "score",
    });
    if (!artifact.exists || !artifact.path) {
      throw new Error(`Re-toast ancestor ${receiptSha256} has no available VisualScore sidecar.`);
    }
    let source;
    try {
      source = JSON.parse(await fs.readFile(artifact.path, "utf8"));
    } catch {
      throw new Error(`Re-toast ancestor ${receiptSha256} has an unreadable VisualScore sidecar.`);
    }
    const parsed = primitiveFieldScore.parseVisualScore(source);
    if (!parsed.ok) {
      throw new Error(
        `Re-toast ancestor ${receiptSha256} has invalid VisualScore evidence: ${parsed.errors
          .map((item) => `${item.path}: ${item.message}`)
          .join("; ")}`,
      );
    }
    return {
      receiptSha256,
      scoreAddress: parsed.address,
      score: parsed.value,
    };
  }

  async function contextForGeneration({
    mediaAnalysis,
    constraints,
    explicitAncestorReceiptSha256 = null,
  }) {
    const projection = await currentProjection();
    const currentSongEvidence = summarizeCurrentSongEvidence(mediaAnalysis);
    const capsule = deriveMemoryCapsule({
      projection,
      currentSongEvidence,
      allowedFeatures: allowedFeatureUniverse(constraints),
      explicitAncestorReceiptSha256,
    });
    return {
      capsule,
      influencePlan: deriveGenerationPressure(capsule),
      witnessDisposition: deriveWitnessDisposition(capsule),
    };
  }

  async function recordWitnessEncounter({
    archiveEntry,
    renderReceipt,
    memoryContext,
    reToastAncestor = null,
    now,
    uuid,
  } = {}) {
    if (!archiveEntry?.receiptSha256) {
      throw new TypeError("Witness encounter requires an archived render entry.");
    }
    return appendWitnessEncounter({
      rootDir: await rootDir(),
      renderReceiptSha256: archiveEntry.receiptSha256,
      renderReceipt,
      memoryContext: {
        ...(memoryContext || {}),
        reToastAncestor: reToastAncestor || memoryContext?.reToastAncestor || null,
      },
      ...(now ? { now } : {}),
      ...(uuid ? { uuid } : {}),
    });
  }

  async function resolveArtifact({ receiptSha256, kind }) {
    return resolveArchivedArtifact({
      rootDir: await rootDir(),
      receiptSha256,
      kind,
    });
  }

  return Object.freeze({
    archiveSuccessfulRender: archiveRender,
    listPastToasts,
    getPastToast,
    submitVerdict,
    resolveReToastAncestor,
    contextForGeneration,
    recordWitnessEncounter,
    resolveArtifact,
    currentProjection,
  });
}

module.exports = {
  createMemoryService,
};
