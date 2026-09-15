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
const {
  buildDogramTraceSource,
  isTraceableVideoReceipt,
} = require("./dogram-trace.cjs");
const { promoteTopologyResponseEvidence } = require("./visual-compiler-evidence.cjs");

const CANDIDATE_GENEALOGY_SCHEMA = "haunted-toaster/candidate-genealogy/v1";
const HAUNTED_HAIKU_SCHEMA = "haunted-haiku/v1";
const HAUNTED_HAIKU_TAGS = Object.freeze([
  "#HauntedToaster",
  "#TheStaticCollective",
  "#ExperimentalVideo",
]);
const HAUNTED_HAIKU_LINES = Object.freeze([
  Object.freeze([
    "porch light under daylight",
    "static sleeping in the orchard",
    "rain waiting behind the glass",
    "one lamp awake at noon",
    "empty chairs facing weather",
    "dust moving through blue light",
    "the hallway keeps humming",
    "late snow on the antenna",
    "a window holding thunder",
    "soft wires under moonlight",
    "the kitchen after midnight",
    "one red light in the field",
    "old film breathing slowly",
    "the doorway full of morning",
    "a quiet screen in winter",
    "the room between stations",
  ]),
  Object.freeze([
    "the reflection leaves first",
    "one frame remembers rain",
    "the shadow stays lit",
    "the picture turns before us",
    "the silence misses a beat",
    "the floor keeps yesterday",
    "the signal answers sideways",
    "the second hand walks backward",
    "the curtain moves without wind",
    "the empty chair changes places",
    "the image blinks once",
    "the horizon arrives too early",
    "the echo takes another door",
    "the color refuses its name",
    "the wall keeps one warm spot",
    "the last light comes back",
  ]),
  Object.freeze([
    "the camera does not react",
    "nobody asks it to stop",
    "morning keeps its place",
    "the house keeps the receipt",
    "nothing else moves",
    "the song continues anyway",
    "the room refuses to explain",
    "we keep the frame",
    "the witness stays quiet",
    "the door remains open",
    "the field says nothing",
    "the tape keeps rolling",
    "no one turns around",
    "the light keeps count",
    "the weather passes through",
    "the frame is left intact",
  ]),
]);

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

function dogramPathFor(outputPath) {
  const parsed = path.parse(outputPath);
  return path.join(parsed.dir, `${parsed.name}.dogram.json`);
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

function cleanPublicationText(value, maxLength = 160) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function hauntedHaikuSeed(receipt) {
  const basis = [
    receipt?.schema,
    receipt?.source?.sha256,
    receipt?.canonicalExecution?.timelineHash,
    receipt?.output?.sha256,
    receipt?.treatment?.garment?.id,
    receipt?.treatment?.toastFeel?.id,
    receipt?.treatment?.title,
  ]
    .map((value) => String(value || ""))
    .join("\n");
  return crypto.createHash("sha256").update(basis, "utf8").digest("hex");
}

function pickHaikuLine(seedSha256, lineIndex) {
  const options = HAUNTED_HAIKU_LINES[lineIndex];
  const offset = (lineIndex * 14) % (seedSha256.length - 2);
  const sample = Number.parseInt(seedSha256.slice(offset, offset + 2), 16);
  return options[sample % options.length];
}

function decorateReceiptWithHauntedHaiku(receipt) {
  if (
    !receipt ||
    receipt.validation?.accepted !== true ||
    !receipt.output?.sha256
  ) {
    return null;
  }

  const seedSha256 = hauntedHaikuSeed(receipt);
  const lines = HAUNTED_HAIKU_LINES.map((_options, lineIndex) =>
    pickHaikuLine(seedSha256, lineIndex),
  );
  const title = cleanPublicationText(
    receipt.treatment?.title || path.parse(receipt.output.filename || "video").name,
  );
  const artist = cleanPublicationText(receipt.treatment?.artist);
  const provenance = [
    title,
    "Haunted Toaster specimen",
    artist || "The Static Collective",
  ].filter(Boolean);
  const youtubeDescription = [
    lines.join("\n"),
    provenance.join(" · "),
    HAUNTED_HAIKU_TAGS.join(" "),
  ].join("\n\n");
  const hauntedHaiku = {
    schema: HAUNTED_HAIKU_SCHEMA,
    authority: "descriptive-only",
    seedSha256,
    lines,
    provenance: provenance.join(" · "),
    hashtags: [...HAUNTED_HAIKU_TAGS],
    youtubeDescription,
  };

  receipt.publication = {
    ...(receipt.publication || {}),
    hauntedHaiku,
  };
  return hauntedHaiku;
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
  const expectedScopeKind = recipe.scope === "whole" ? "whole-layer" : recipe.scope;
  if (
    !mixPlan ||
    !execution ||
    binding.mixPlanHash !== mixPlan.planHash ||
    mixPlan.strategyId !== `post-walk-axis:${binding.recipeHash}` ||
    mixPlan.sends?.length !== 1 ||
    send?.response !== recipe.response ||
    send?.scope?.kind !== expectedScopeKind
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
  decorateReceiptWithHauntedHaiku(receipt);
  receipt.build = buildProvenance();
  const receiptPath = receiptPathFor(outputPath);
  const dogramPath = dogramPathFor(outputPath);

  if (!isTraceableVideoReceipt(receipt)) {
    await fsPromises.rm(dogramPath, { force: true }).catch(() => {});
    await fsPromises.writeFile(
      receiptPath,
      `${JSON.stringify(receipt, null, 2)}\n`,
      "utf8",
    );
    return receiptPath;
  }

  const dogramTrace = buildDogramTraceSource(receipt);
  await fsPromises.writeFile(
    dogramPath,
    `${JSON.stringify(dogramTrace, null, 2)}\n`,
    "utf8",
  );
  try {
    await fsPromises.writeFile(
      receiptPath,
      `${JSON.stringify(receipt, null, 2)}\n`,
      "utf8",
    );
  } catch (error) {
    await fsPromises.rm(dogramPath, { force: true }).catch(() => {});
    throw error;
  }
  return receiptPath;
}

module.exports = {
  HAUNTED_HAIKU_SCHEMA,
  buildProvenance,
  compactCandidateGenealogyEvidence,
  compactPostWalkAxisEvidence,
  compactTopologyEventEvidence,
  decorateReceiptWithHauntedHaiku,
  dogramPathFor,
  hashFile,
  hauntedHaikuSeed,
  promoteCandidateGenealogyInReceipt,
  promoteCanonicalTimelineEvidenceInReceipt,
  promoteLBranchInReceipt,
  promoteVisualCompilerInReceipt,
  receiptPathFor,
  writeReceipt,
};
