const { hashCanonical } = require("../generation/canonical.cjs");
const {
  normalizeEventGrid,
  normalizeTextCues,
} = require("./schema.cjs");

const VIDEO_RECEIPT_SCHEMA = "full-measure.video-receipt.v1";
const LIVING_RECEIPT_BRIDGE_SCHEMA = "haunted-toaster/hyperfood-living-receipt-bridge/v0";
const LIVING_RECEIPT_BRIDGE_POLICY = "first-beta-receipt/v0";
const LIVING_RECEIPT_AUTHORITY = "descriptive-descendant-only";

const CONSUMED_PATHS = Object.freeze([
  "schema",
  "receiptId",
  "source.sha256",
  "source.durationSeconds",
  "canonicalExecution.scoreAddress",
  "canonicalExecution.timelineHash",
  "canonicalExecution.topologyEvents.policyVersion",
  "canonicalExecution.topologyEvents.planSha256",
  "canonicalExecution.topologyEvents.events[].id",
  "canonicalExecution.topologyEvents.events[].kind",
  "canonicalExecution.topologyEvents.events[].eventSha256",
  "canonicalExecution.topologyEvents.events[].strikeTick",
  "treatment.sections[]",
  "treatment.foreignVisualMaterial.placement.timebase",
  "output.sha256",
  "validation.accepted",
  "candidateGenealogy",
  "publication.hauntedHaiku",
  "build",
]);

const KNOWN_ROOT_KEYS = Object.freeze(new Set([
  "schema",
  "receiptId",
  "product",
  "artifact",
  "createdAt",
  "forcedWitness",
  "source",
  "canonicalExecution",
  "treatment",
  "render",
  "output",
  "validation",
  "candidateGenealogy",
  "publication",
  "build",
]));

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value;
}

function string(value, label) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${label} must be a non-empty string.`);
  return normalized;
}

function finite(value, label, { min = -Infinity } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min) {
    throw new TypeError(`${label} must be finite and >= ${min}.`);
  }
  return number;
}

function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new TypeError(`${label} must be a positive safe integer.`);
  }
  return number;
}

function canonicalDurationMs(receipt) {
  const seconds = finite(receipt.source?.durationSeconds, "Accepted receipt source duration", {
    min: Number.EPSILON,
  });
  const durationMs = Math.round(seconds * 1000);
  if (!Number.isSafeInteger(durationMs) || durationMs <= 0) {
    throw new TypeError("Accepted receipt source duration cannot resolve to integer milliseconds.");
  }
  return durationMs;
}

function resolveTimebase(receipt, options) {
  const declared = receipt.treatment?.foreignVisualMaterial?.placement?.timebase;
  const supplied = options?.timebase;
  if (declared === undefined && supplied === undefined) {
    throw new TypeError(
      "Living receipt bridge requires an explicit timeline timebase when the receipt does not declare one.",
    );
  }
  const declaredTimebase = declared === undefined
    ? null
    : positiveInteger(declared, "Accepted receipt timeline timebase");
  const suppliedTimebase = supplied === undefined
    ? null
    : positiveInteger(supplied, "Living receipt bridge timebase");
  if (
    declaredTimebase !== null
    && suppliedTimebase !== null
    && declaredTimebase !== suppliedTimebase
  ) {
    throw new TypeError(
      `Living receipt bridge timebase ${suppliedTimebase} disagrees with accepted receipt timebase ${declaredTimebase}.`,
    );
  }
  return suppliedTimebase ?? declaredTimebase;
}

function normalizeTopologyEvents(receipt, durationMs, timebase) {
  const plan = object(
    receipt.canonicalExecution?.topologyEvents,
    "Accepted receipt topology event evidence",
  );
  if (plan.refusal) {
    throw new TypeError("Living receipt bridge requires accepted topology events, not a refusal.");
  }
  if (!Array.isArray(plan.events) || plan.events.length === 0) {
    throw new TypeError("Living receipt bridge requires at least one accepted topology event.");
  }
  if (
    Number.isSafeInteger(plan.eventCount)
    && plan.eventCount !== plan.events.length
  ) {
    throw new TypeError("Accepted receipt topology event count does not match retained events.");
  }
  const events = plan.events.map((event, index) => {
    object(event, `Accepted topology event ${index}`);
    string(event.id, `Accepted topology event ${index} id`);
    string(event.kind, `Accepted topology event ${index} kind`);
    string(event.eventSha256, `Accepted topology event ${index} sha256`);
    const strikeTick = Number(event.strikeTick);
    if (!Number.isSafeInteger(strikeTick) || strikeTick < 0) {
      throw new TypeError(`Accepted topology event ${index} strikeTick must be a non-negative safe integer.`);
    }
    return {
      tMs: Math.round((strikeTick * 1000) / timebase),
      strength: 1,
    };
  });
  return normalizeEventGrid(events, durationMs);
}

function normalizeSectionCues(receipt, durationMs) {
  const sections = receipt.treatment?.sections;
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new TypeError("Living receipt bridge requires retained treatment sections.");
  }
  const cues = sections.map((section, index) => {
    object(section, `Accepted receipt section ${index}`);
    const text = string(section.label, `Accepted receipt section ${index} label`);
    const startSeconds = finite(
      section.startSeconds,
      `Accepted receipt section ${index} startSeconds`,
      { min: 0 },
    );
    const endSeconds = finite(
      section.endSeconds,
      `Accepted receipt section ${index} endSeconds`,
      { min: 0 },
    );
    return {
      text,
      startMs: Math.round(startSeconds * 1000),
      clearMs: Math.round(endSeconds * 1000),
    };
  });
  return normalizeTextCues(cues, durationMs);
}

function compactCandidateGenealogy(value) {
  if (value === undefined || value === null) return null;
  const genealogy = object(value, "Accepted receipt candidate genealogy");
  return {
    schema: string(genealogy.schema, "Candidate genealogy schema"),
    familyHash: string(genealogy.familyHash, "Candidate genealogy familyHash"),
    phase: string(genealogy.phase, "Candidate genealogy phase"),
    candidateIndex: Number.isSafeInteger(genealogy.candidateIndex)
      ? genealogy.candidateIndex
      : null,
    role: string(genealogy.role, "Candidate genealogy role"),
    scoreAddress: string(genealogy.scoreAddress, "Candidate genealogy scoreAddress"),
    timelineHash: string(genealogy.timelineHash, "Candidate genealogy timelineHash"),
    changedAxes: Array.isArray(genealogy.changedAxes)
      ? genealogy.changedAxes.map((axis) => string(axis, "Candidate genealogy changed axis"))
      : [],
  };
}

function compactHauntedHaiku(value) {
  if (value === undefined || value === null) return null;
  const haiku = object(value, "Accepted receipt Haunted Haiku");
  if (!Array.isArray(haiku.lines)) {
    throw new TypeError("Accepted receipt Haunted Haiku lines must be an array.");
  }
  return {
    schema: string(haiku.schema, "Haunted Haiku schema"),
    authority: string(haiku.authority, "Haunted Haiku authority"),
    seedSha256: string(haiku.seedSha256, "Haunted Haiku seedSha256"),
    lines: haiku.lines.map((line) => string(line, "Haunted Haiku line")),
    provenance: haiku.provenance ? string(haiku.provenance, "Haunted Haiku provenance") : null,
  };
}

function compactBuild(value) {
  if (value === undefined || value === null) return null;
  const build = object(value, "Accepted receipt build provenance");
  return {
    version: string(build.version, "Build version"),
    commit: string(build.commit, "Build commit"),
    dirty: Boolean(build.dirty),
    sourceMode: Boolean(build.sourceMode),
  };
}

function validateReceiptIdentity(receipt) {
  object(receipt, "Living receipt bridge input");
  if (receipt.schema !== VIDEO_RECEIPT_SCHEMA) {
    throw new TypeError(`Living receipt bridge requires ${VIDEO_RECEIPT_SCHEMA}.`);
  }
  if (receipt.validation?.accepted !== true) {
    throw new TypeError("Living receipt bridge requires an accepted receipt.");
  }
  return {
    schema: receipt.schema,
    receiptId: string(receipt.receiptId, "Accepted receipt id"),
    receiptSha256: hashCanonical(receipt),
    sourceSha256: string(receipt.source?.sha256, "Accepted receipt source sha256"),
    scoreAddress: string(
      receipt.canonicalExecution?.scoreAddress,
      "Accepted receipt scoreAddress",
    ),
    timelineHash: string(
      receipt.canonicalExecution?.timelineHash,
      "Accepted receipt timelineHash",
    ),
    outputSha256: string(receipt.output?.sha256, "Accepted receipt output sha256"),
  };
}

function buildLivingReceiptEvidence(receipt, options = {}) {
  const sourceReceipt = validateReceiptIdentity(receipt);
  const durationMs = canonicalDurationMs(receipt);
  const timebase = resolveTimebase(receipt, options);
  const events = normalizeTopologyEvents(receipt, durationMs, timebase);
  const cues = normalizeSectionCues(receipt, durationMs);
  const unconsumedRootKeys = Object.keys(receipt)
    .filter((key) => !KNOWN_ROOT_KEYS.has(key))
    .sort();

  return {
    schema: LIVING_RECEIPT_BRIDGE_SCHEMA,
    policyVersion: LIVING_RECEIPT_BRIDGE_POLICY,
    authority: LIVING_RECEIPT_AUTHORITY,
    sourceReceipt,
    timing: {
      durationMs,
      events,
      cues,
    },
    lineage: {
      topology: {
        policyVersion: string(
          receipt.canonicalExecution.topologyEvents.policyVersion,
          "Accepted topology policyVersion",
        ),
        planSha256: string(
          receipt.canonicalExecution.topologyEvents.planSha256,
          "Accepted topology planSha256",
        ),
        eventCount: receipt.canonicalExecution.topologyEvents.events.length,
      },
      candidateGenealogy: compactCandidateGenealogy(receipt.candidateGenealogy),
      hauntedHaiku: compactHauntedHaiku(receipt.publication?.hauntedHaiku),
      build: compactBuild(receipt.build),
    },
    derivation: {
      policyVersion: LIVING_RECEIPT_BRIDGE_POLICY,
      timebase,
      eventRule: "accepted-topology-strike -> unit-strength event",
      cueRule: "retained-section-interval -> text cue",
      consumedPaths: [...CONSUMED_PATHS],
      unconsumedRootKeys,
    },
  };
}

function buildLivingReceiptSpecInputs(receipt, options = {}) {
  const evidence = buildLivingReceiptEvidence(receipt, options);
  return {
    timing: structuredClone(evidence.timing),
    evidence,
  };
}

module.exports = {
  LIVING_RECEIPT_BRIDGE_POLICY,
  LIVING_RECEIPT_BRIDGE_SCHEMA,
  buildLivingReceiptEvidence,
  buildLivingReceiptSpecInputs,
};
