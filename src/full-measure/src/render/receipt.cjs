const crypto = require("node:crypto");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const path = require("node:path");
const { assertLBranchTimeline } = require("../generation/l-branch.cjs");
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

async function promoteLBranchInReceipt(receipt, outputPath) {
  const canonicalExecution = receipt?.canonicalExecution;
  if (!canonicalExecution?.timelineSidecar) return receipt;
  const sidecarName = String(canonicalExecution.timelineSidecar);
  if (path.basename(sidecarName) !== sidecarName) {
    throw new TypeError("Canonical timeline sidecar must be a sibling filename.");
  }
  const timelinePath = path.join(path.dirname(outputPath), sidecarName);
  const timeline = JSON.parse(await fsPromises.readFile(timelinePath, "utf8"));
  if (timeline.timelineHash !== canonicalExecution.timelineHash) {
    throw new TypeError("Canonical timeline sidecar identity mismatch.");
  }
  assertLBranchTimeline(timeline);
  if (!timeline.lBranch) return receipt;
  canonicalExecution.lBranch = {
    laneBankHash: timeline.lBranch.laneBankHash,
    mixPlanHash: timeline.lBranch.mixPlan.planHash,
    executionHash: timeline.lBranch.execution.executionHash,
    sourceTimelineHash: timeline.lBranch.mixPlan.sourceTimelineHash,
  };
  return receipt;
}

async function writeReceipt(receipt, outputPath) {
  promoteVisualCompilerInReceipt(receipt);
  await promoteLBranchInReceipt(receipt, outputPath);
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
  hashFile,
  promoteLBranchInReceipt,
  promoteVisualCompilerInReceipt,
  receiptPathFor,
  writeReceipt,
};
