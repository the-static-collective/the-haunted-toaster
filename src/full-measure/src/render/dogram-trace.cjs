const { hashCanonical } = require("../generation/canonical.cjs");

const RECEIPT_SCHEMA = "full-measure.video-receipt.v1";
const BOUNDARY_ORDER = Object.freeze([
  "SOURCE",
  "ACCEPTED_SCORE",
  "RESOLVED_TIMELINE",
  "VISUAL_COMPILER",
  "TRANSPORT",
  "VIDEO_PROJECTION",
]);

function fail(message) {
  const error = new TypeError(message);
  error.code = "INVALID_DOGRAM_TRACE_RECEIPT";
  throw error;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must be a non-empty string`);
  }
  return value;
}

function requireVideoReceipt(receipt, label) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    fail(`${label} must be a receipt object`);
  }
  if (receipt.schema !== RECEIPT_SCHEMA) {
    fail(`${label} must use schema ${RECEIPT_SCHEMA}`);
  }
  requireString(receipt.source?.sha256, `${label}.source.sha256`);
  requireString(
    receipt.canonicalExecution?.scoreAddress,
    `${label}.canonicalExecution.scoreAddress`,
  );
  requireString(
    receipt.canonicalExecution?.timelineHash,
    `${label}.canonicalExecution.timelineHash`,
  );
  requireString(
    receipt.render?.visualCompiler?.graphSha256,
    `${label}.render.visualCompiler.graphSha256`,
  );
  if (!receipt.render?.transportEncoding || typeof receipt.render.transportEncoding !== "object") {
    fail(`${label}.render.transportEncoding must be an object`);
  }
  requireString(receipt.output?.sha256, `${label}.output.sha256`);
  return receipt;
}

function isTraceableVideoReceipt(receipt) {
  try {
    requireVideoReceipt(receipt, "receipt");
    return true;
  } catch (error) {
    if (error?.code === "INVALID_DOGRAM_TRACE_RECEIPT") return false;
    throw error;
  }
}

function opaque(value) {
  return Object.freeze({ kind: "opaque", value });
}

function trace(receipt) {
  return Object.freeze({
    SOURCE: opaque(receipt.source.sha256),
    ACCEPTED_SCORE: opaque(receipt.canonicalExecution.scoreAddress),
    RESOLVED_TIMELINE: opaque(receipt.canonicalExecution.timelineHash),
    VISUAL_COMPILER: opaque(receipt.render.visualCompiler.graphSha256),
    TRANSPORT: opaque(hashCanonical(receipt.render.transportEncoding)),
    VIDEO_PROJECTION: opaque(receipt.output.sha256),
  });
}

function buildDogramTraceSource(receipt) {
  const admitted = requireVideoReceipt(receipt, "receipt");
  return Object.freeze({
    schema: "dogram.trace-source/v0",
    source_schema: RECEIPT_SCHEMA,
    receipt_hash: hashCanonical(admitted),
    boundary_order: [...BOUNDARY_ORDER],
    trace: trace(admitted),
    authority_boundary: "comparison-only",
    note: "This sidecar preserves declared render identity for later comparison; it does not assert visual equivalence, causality, historical meaning, or artistic meaning.",
  });
}

function buildDogramDeltaSpecimen({ specimenId, leftReceipt, rightReceipt }) {
  requireString(specimenId, "specimenId");
  const left = requireVideoReceipt(leftReceipt, "leftReceipt");
  const right = requireVideoReceipt(rightReceipt, "rightReceipt");

  return Object.freeze({
    schema: "dogram.specimen/v0",
    specimen_id: specimenId,
    operator: "delta",
    operator_version: 1,
    inputs: Object.freeze({
      boundary_order: [...BOUNDARY_ORDER],
      left: trace(left),
      right: trace(right),
    }),
    assumptions: [],
    metadata: Object.freeze({
      mathal: "TOASTER-VIDEO-RECEIPT-TRACE-DELTA-001",
      source_schema: RECEIPT_SCHEMA,
      authority_boundary: "comparison-only",
      note: "Dogram may locate a declared trace difference; visual identity, causality, historical meaning, and artistic meaning remain external.",
    }),
  });
}

module.exports = {
  BOUNDARY_ORDER,
  buildDogramDeltaSpecimen,
  buildDogramTraceSource,
  isTraceableVideoReceipt,
};
