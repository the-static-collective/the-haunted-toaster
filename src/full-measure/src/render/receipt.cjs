const crypto = require("node:crypto");
const fs = require("node:fs");
const fsPromises = require("node:fs/promises");
const path = require("node:path");
const {
  POST_WALK_AXIS_TIMELINE_POLICY,
  POST_WALK_AXIS_TIMELINE_SCHEMA,
  buildPostWalkAxisRecipe,
} = require("../generation/post-walk-axis-grammar.cjs");
const { assertResolvedTimeline } = require("./timeline-execution.cjs");
const { promoteTopologyResponseEvidence } = require("./visual-compiler-evidence.cjs");

const CANDIDATE_GENEALOGY_SCHEMA = "haunted-toaster/candidate-genealogy/v1";

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

function compactCandidateGenealogyEvidence(candidateGenealogy, timeline) {
  if (!candidateGenealogy) return null;
  if (!candidateGenealogy || typeof candidateGenealogy !== "object" || Array.isArray(candidateGenealogy)) {
    throw new TypeError("Candidate genealogy must be an object.");
  }
  if (candidateGenealogy.schema !== CANDIDATE_GENEALOGY_SCHEMA) {
    throw new TypeError(`Candidate genealogy must use ${CANDIDATE_GENEALOGY_SCHEMA}.`);
  }
  if (!timeline || typeof timeline !== "object") {
    throw new TypeError("Candidate genealogy requires an accepted timeline.");
  }
  if (candidateGenealogy.scoreAddress !== timeline.scoreAddress) {
    throw new TypeError("Candidate genealogy scoreAddress does not match accepted timeline.");
  }
  if (candidateGenealogy.timelineHash !== timeline.timelineHash) {
    throw new TypeError("Candidate genealogy timelineHash does not match accepted timeline.");
  }
  if (
    Object.hasOwn(candidateGenealogy, "topologyEventAuthority") ||
    Object.hasOwn(candidateGenealogy, "authoritySha256")
  ) {
    throw new TypeError("Candidate genealogy must remain separate from topology-event authority.");
  }
  return structuredClone(candidateGenealogy);
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

function compactPostWalkAxisEvidence(timeline) {
  const binding = timeline?.postWalkAxis;
  if (!binding) return null;
  if (
    !binding ||
    typeof binding !== "object" ||
    Array.isArray(binding) ||
    binding.schema !== POST_WALK_AXIS_TIMELINE_SCHEMA ||
    binding.policyVersion !== POST_WALK_AXIS_TIMELINE_POLICY
  ) {
    throw new TypeError("Post-WALK axis timeline identity mismatch.");
  }

  let recipe;
  try {
    recipe = buildPostWalkAxisRecipe(binding.candidateIndex);
  } catch {
    throw new TypeError("Post-WALK axis recipe identity mismatch.");
  }
  if (binding.recipeHash !== recipe.recipeHash) {
    throw new TypeError("Post-WALK axis recipe identity mismatch.");
  }

  const topology = timeline.topologyEvents;
  const event = topology?.events?.[0];
  if (
    !topology ||
    topology.refusal ||
    topology.eventCount !== 1 ||
    topology.events?.length !== 1 ||
    event?.kind !== "grab" ||
    !topology.acceptedAuthoritySha256 ||
    !event.evidenceRefs?.includes(`axis-recipe:${binding.recipeHash}`)
  ) {
    throw new TypeError("Post-WALK axis topology evidence identity mismatch.");
  }
  if (binding.topologyPlanSha256 !== topology.planSha256) {
    throw new TypeError("Post-WALK axis topology plan identity mismatch.");
  }

  const mixPlan = timeline.lBranch?.mixPlan;
  const execution = timeline.lBranch?.execution;
  const send = mixPlan?.sends?.[0];
  if (
    !mixPlan ||
    !execution ||
    binding.mixPlanHash !== mixPlan.planHash ||
    mixPlan.strategyId !== `post-walk-axis:${binding.recipeHash}` ||
    mixPlan.sends?.length !== 1 ||
    send?.response !== recipe.response ||
    send?.scope?.kind !== recipe.scope
  ) {
    throw new TypeError("Post-WALK axis mix plan identity mismatch.");
  }
  if (recipe.scope === "grab" && send.scope.regionRef !== event.id) {
    throw new TypeError("Post-WALK axis GRAB scope identity mismatch.");
  }
  if (binding.mixExecutionHash !== execution.executionHash) {
    throw new TypeError("Post-WALK axis mix execution identity mismatch.");
  }

  return {
    policyVersion: binding.policyVersion,
    recipeHash: binding.recipeHash,
    candidateIndex: binding.candidateIndex,
    acceptedFamilyHash: topology.acceptedFamilyHash,
    acceptedAuthoritySha256: topology.acceptedAuthoritySha256,
    topologyPlanSha256: topology.planSha256,
    eventRefs: topology.events.map((acceptedEvent) => ({
      id: acceptedEvent.id,
      eventSha256: acceptedEvent.eventSha256,
    })),
    mixPlanHash: mixPlan.planHash,
    mixExecutionHash: execution.executionHash,
    finalTimelineHash: timeline.timelineHash,
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
  const postWalkAxis = compactPostWalkAxisEvidence(timeline);
  if (postWalkAxis) canonicalExecution.postWalkAxis = postWalkAxis;
  return receipt;
}

function promoteCandidateGenealogyInReceipt(receipt, timeline, candidateGenealogy) {
  const evidence = compactCandidateGenealogyEvidence(candidateGenealogy, timeline);
  if (evidence) receipt.candidateGenealogy = evidence;
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

async function promoteCanonicalTimelineEvidenceInReceipt(
  receipt,
  outputPath,
  { candidateGenealogy = null } = {},
) {
  const timeline = await readCanonicalTimelineSidecar(receipt, outputPath);
  promoteTimelineEvidenceInReceipt(receipt, timeline);
  promoteCandidateGenealogyInReceipt(receipt, timeline, candidateGenealogy);
  return receipt;
}

async function writeReceipt(receipt, outputPath, options = {}) {
  promoteVisualCompilerInReceipt(receipt);
  await promoteCanonicalTimelineEvidenceInReceipt(receipt, outputPath, options);
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
  compactCandidateGenealogyEvidence,
  compactPostWalkAxisEvidence,
  compactTopologyEventEvidence,
  hashFile,
  promoteCandidateGenealogyInReceipt,
  promoteCanonicalTimelineEvidenceInReceipt,
  promoteLBranchInReceipt,
  promoteVisualCompilerInReceipt,
  receiptPathFor,
  writeReceipt,
};
