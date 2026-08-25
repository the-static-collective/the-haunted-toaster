const crypto = require("node:crypto");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const path = require("node:path");
const { assertResolvedTimeline } = require("./timeline-execution.cjs");
const { promoteTopologyResponseEvidence } = require("./visual-compiler-evidence.cjs");

async function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function receiptPathFor(outputPath) {
  const parsed = path.parse(outputPath);
  return path.join(parsed.dir, `${parsed.name}.video-receipt.json`);
}

function buildProvenance() {
  const buildInfo = require("../build-info.cjs");
  return Object.freeze({
    version: buildInfo.version,
    commit: buildInfo.commit,
    dirty: Boolean(buildInfo.dirty),
    builtAt: buildInfo.builtAt || null,
    sourceMode: Boolean(buildInfo.sourceMode),
  });
}

function promoteVisualCompilerInReceipt(receipt) {
  if (!receipt?.render?.visualCompiler) return receipt;
  receipt.render.visualCompiler = promoteTopologyResponseEvidence(
    receipt.render.visualCompiler,
  );
  return receipt;
}

async function readCanonicalTimelineSidecar(receipt, outputPath) {
  const canonicalExecution = receipt?.canonicalExecution;
  if (!canonicalExecution?.timelineSidecar) return null;
  const sidecarName = String(canonicalExecution.timelineSidecar);
  if (path.basename(sidecarName) !== sidecarName) {
    throw new TypeError("Canonical timeline sidecar must be a sibling filename.");
  }
  const timelinePath = path.join(path.dirname(outputPath), sidecarName);
  const timeline = JSON.parse(await fsPromises.readFile(timelinePath, "utf8"));
  if (timeline.timelineHash !== canonicalExecution.timelineHash) {
    throw new TypeError("Canonical timeline sidecar identity mismatch.");
  }
  assertResolvedTimeline(timeline);
  return timeline;
}

function compactTopologyEventEvidence(timeline) {
  const plan = timeline?.topologyEvents;
  if (!plan) return null;
  const grabLBranchBindings = (timeline.lBranch?.mixPlan?.sends || [])
    .map((send, index) => ({ send, index }))
    .filter(({ send }) => send.scope?.kind === "grab")
    .map(({ send, index }) => ({
      sourceLaneId: send.sourceLaneId,
      target: send.target,
      regionRef: send.scope.regionRef,
      startTick: send.scope.startTick,
      endTick: send.scope.endTick,
      executionIndex: index,
    }));
  return {
    policyVersion: plan.policyVersion,
    planSha256: plan.planSha256,
    acceptedFamilyHash: plan.acceptedFamilyHash,
    acceptedAuthoritySha256: plan.acceptedAuthoritySha256 || null,
    acceptedScoreAddress: plan.acceptedScoreAddress,
    sourceTimelineHash: plan.sourceTimelineHash,
    sourceTopology: plan.sourceTopology,
    eventCount: plan.eventCount,
    refusal: plan.refusal ? { reason: plan.refusal.reason } : null,
    events: plan.events.map((event) => ({
      id: event.id,
      kind: event.kind,
      eventSha256: event.eventSha256,
      prepareTick: event.prepareTick,
      strikeTick: event.strikeTick,
      releaseTick: event.releaseTick,
      residueUntilTick: event.residueUntilTick,
    })),
    grabLBranchBindings,
  };
}

function promoteTimelineEvidenceInReceipt(receipt, timeline) {
  if (!timeline) return receipt;
  const canonicalExecution = receipt.canonicalExecution;
  const topologyEvents = compactTopologyEventEvidence(timeline);
  if (topologyEvents) canonicalExecution.topologyEvents = topologyEvents;
  if (timeline.lBranch) {
    canonicalExecution.lBranch = {
      laneBankHash: timeline.lBranch.laneBankHash,
      mixPlanHash: timeline.lBranch.mixPlan.planHash,
      executionHash: timeline.lBranch.execution.executionHash,
      sourceTimelineHash: timeline.lBranch.mixPlan.sourceTimelineHash,
    };
  }
  return receipt;
}

async function promoteLBranchInReceipt(receipt, outputPath) {
  const timeline = await readCanonicalTimelineSidecar(receipt, outputPath);
  if (!timeline?.lBranch) return receipt;
  const canonicalExecution = receipt.canonicalExecution;
  canonicalExecution.lBranch = {
    laneBankHash: timeline.lBranch.laneBankHash,
    mixPlanHash: timeline.lBranch.mixPlan.planHash,
    executionHash: timeline.lBranch.execution.executionHash,
    sourceTimelineHash: timeline.lBranch.mixPlan.sourceTimelineHash,
  };
  return receipt;
}

async function promoteCanonicalTimelineEvidenceInReceipt(receipt, outputPath) {
  const timeline = await readCanonicalTimelineSidecar(receipt, outputPath);
  return promoteTimelineEvidenceInReceipt(receipt, timeline);
}

async function writeReceipt(receipt, outputPath) {
  promoteVisualCompilerInReceipt(receipt);
  await promoteCanonicalTimelineEvidenceInReceipt(receipt, outputPath);
  receipt.build = buildProvenance();
  const receiptPath = receiptPathFor(outputPath);
  await fsPromises.writeFile(
    receiptPath,
    `${JSON.stringify(receipt, null, 2)}\n`,
    "utf8",
  );
  return receiptPath;
}

module.exports = {
  buildProvenance,
  compactTopologyEventEvidence,
  hashFile,
  promoteCanonicalTimelineEvidenceInReceipt,
  promoteLBranchInReceipt,
  promoteVisualCompilerInReceipt,
  receiptPathFor,
  writeReceipt,
};
