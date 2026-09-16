const {
  HYPERFOOD_SPEC_SCHEMA,
} = require("./schema.cjs");
const {
  semanticPayload,
  specimenId,
} = require("./identity.cjs");
const {
  buildLivingReceiptSpecInputs,
} = require("./receipt-bridge.cjs");

const FIRST_BETA_LIVING_RECEIPT_PROFILE = "frame-eat-frame-pulse/v0";

function normalizedSha(value) {
  return String(value || "").trim().toLowerCase();
}

function assertAcceptedSurfaceIdentity(surfaceAsset, evidence) {
  const surfaceSha256 = normalizedSha(surfaceAsset?.sha256);
  const outputSha256 = normalizedSha(evidence?.sourceReceipt?.outputSha256);
  if (!surfaceSha256 || !outputSha256 || surfaceSha256 !== outputSha256) {
    throw new TypeError(
      "Accepted video Surface sha256 must match accepted receipt output sha256 identity.",
    );
  }
}

function firstBetaGraph(surfaceAsset, frameParameters, pulseParameters) {
  return {
    nodes: [
      {
        id: "accepted-beta-video",
        op: "ASSET",
        version: "0.1.0",
        outputType: "Surface",
        assetId: surfaceAsset.id,
      },
      {
        id: "frame-eat-frame",
        op: "FRAME-EAT-FRAME",
        version: "0.1.0",
        parameters: frameParameters,
      },
      {
        id: "receipt-events",
        op: "EVENT-GRID",
        version: "0.1.0",
        field: "events",
      },
      {
        id: "pulse",
        op: "PULSE",
        version: "0.1.0",
        parameters: pulseParameters,
      },
    ],
    edges: [
      { from: "accepted-beta-video.surface", to: "frame-eat-frame.surface" },
      { from: "frame-eat-frame.surface", to: "pulse.surface" },
      { from: "receipt-events.events", to: "pulse.events" },
    ],
    output: "pulse.surface",
  };
}

function buildFirstBetaLivingReceiptSpecimen(input = {}) {
  const {
    receipt,
    surfaceAsset,
    target,
    seed,
    frameParameters,
    pulseParameters,
    timebase,
  } = input;

  const { timing, evidence } = buildLivingReceiptSpecInputs(receipt, { timebase });
  assertAcceptedSurfaceIdentity(surfaceAsset, evidence);

  const spec = semanticPayload({
    schema: HYPERFOOD_SPEC_SCHEMA,
    assets: [surfaceAsset],
    timing,
    seed,
    target,
    graph: firstBetaGraph(surfaceAsset, frameParameters, pulseParameters),
  });

  return {
    profile: FIRST_BETA_LIVING_RECEIPT_PROFILE,
    specimenId: specimenId(spec),
    spec,
    evidence,
  };
}

module.exports = {
  FIRST_BETA_LIVING_RECEIPT_PROFILE,
  buildFirstBetaLivingReceiptSpecimen,
};
