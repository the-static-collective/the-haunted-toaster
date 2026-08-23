const crypto = require("node:crypto");
const path = require("node:path");
const { deriveFrameReservoir } = require("../video-pantry/frame-reservoir.cjs");

const FOREIGN_MATERIAL_SCHEMA = "haunted-toaster/foreign-material/v1";
const FOREIGN_MATERIAL_POLICY_VERSION = "foreign-material-v1";
const FOREIGN_MATERIAL_ANALYSIS_SCHEMA = "haunted-toaster/foreign-material-analysis/v1";
const FOREIGN_MATERIAL_OPERATOR_ID = "clip-luma-texture-v1";
const FOREIGN_MATERIAL_SAMPLING_POLICY = "loop-source-clip-v1";
const FOREIGN_MATERIAL_PLACEMENT_POLICY = "accepted-timeline-span-v1";
const FOREIGN_MATERIAL_COMPILER_EVIDENCE_SCHEMA = "haunted-toaster/foreign-material-compiler-evidence/v1";
const DEFAULT_BLEND_MODE = "softlight";
const DEFAULT_OPACITY = 0.28;

function hashJson(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

function normalizeResolvedTimeline(timeline) {
  if (!timeline || typeof timeline !== "object") {
    throw new TypeError("A resolved timeline is required to compile foreign material.");
  }
  const durationTicks = Number(timeline.durationTicks);
  const timebase = Number(timeline.timebase);
  if (!Number.isSafeInteger(durationTicks) || durationTicks <= 0) {
    throw new TypeError("Foreign material requires a positive resolved timeline durationTicks value.");
  }
  if (!Number.isSafeInteger(timebase) || timebase <= 0) {
    throw new TypeError("Foreign material requires a positive resolved timeline timebase value.");
  }
  return { durationTicks, timebase };
}

function normalizeRenderDuration({ timeline, analysisDurationSeconds = null } = {}) {
  const normalizedTimeline = normalizeResolvedTimeline(timeline);
  const fallbackSeconds = normalizedTimeline.durationTicks / normalizedTimeline.timebase;
  const duration =
    analysisDurationSeconds === null || analysisDurationSeconds === undefined
      ? fallbackSeconds
      : Number(analysisDurationSeconds);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new TypeError("Foreign material requires a positive render duration in seconds.");
  }
  return {
    ...normalizedTimeline,
    renderDurationSeconds: Number(duration.toFixed(6)),
  };
}

function createForeignMaterialPlan({ videoBinding, timeline, analysisDurationSeconds = null } = {}) {
  if (!videoBinding) return null;
  const reservoir = deriveFrameReservoir(videoBinding, { representativeCount: 9 });
  const normalizedTimeline = normalizeRenderDuration({ timeline, analysisDurationSeconds });
  const analysis = Object.freeze({
    schema: FOREIGN_MATERIAL_ANALYSIS_SCHEMA,
    policyVersion: reservoir.policyVersion,
    basis: "frame-reservoir-v1",
    representativeFrameCount: reservoir.representativeFrames.length,
    representativeFrameIds: reservoir.representativeFrames.map((frame) => frame.frameId),
    frameRate: reservoir.frameRate,
    frameCount: reservoir.frameCount,
  });
  const analysisHash = hashJson(analysis);
  const plan = {
    schema: FOREIGN_MATERIAL_SCHEMA,
    policyVersion: FOREIGN_MATERIAL_POLICY_VERSION,
    sourceSpecimenId: reservoir.specimenId,
    sourceSha256: reservoir.sourceSha256,
    sourceByteLength: Number(videoBinding.byteLength),
    sourceFilename: String(videoBinding.filename || path.basename(videoBinding.path || "")).trim() || null,
    sourcePath: String(videoBinding.path || "").trim() || null,
    sourceProbe: structuredClone(videoBinding.probe),
    clipAnalysisHash: analysisHash,
    clipAnalysis: analysis,
    frameReservoir: reservoir,
    placement: {
      policyVersion: FOREIGN_MATERIAL_PLACEMENT_POLICY,
      startTick: 0,
      endTick: normalizedTimeline.durationTicks,
      durationTicks: normalizedTimeline.durationTicks,
      timebase: normalizedTimeline.timebase,
      renderDurationSeconds: normalizedTimeline.renderDurationSeconds,
    },
    sampling: {
      policyVersion: FOREIGN_MATERIAL_SAMPLING_POLICY,
      mode: "stream-loop",
      sourceFrameRate: reservoir.frameRate,
      sourceFrameCount: reservoir.frameCount,
      extendsBeyondSourceDuration:
        normalizedTimeline.renderDurationSeconds > reservoir.durationSeconds,
    },
    assimilationPolicy: {
      operatorId: FOREIGN_MATERIAL_OPERATOR_ID,
      family: "texture-assimilation",
      blendMode: DEFAULT_BLEND_MODE,
      opacity: DEFAULT_OPACITY,
      prefilter: "luma-eq-boxblur-v1",
    },
  };
  return Object.freeze({
    ...plan,
    planHash: hashJson(plan),
  });
}

function ffmpegInputArgsForForeignMaterial(plan) {
  if (!plan) return [];
  if (!plan.sourcePath) {
    throw new TypeError("Foreign material plan requires a sourcePath for renderer input wiring.");
  }
  return ["-stream_loop", "-1", "-i", plan.sourcePath];
}

function replaceTerminalVout(graph, replacementLabel) {
  const replaced = String(graph || "").replace(/\[vout\](?![\s\S]*\[vout\])/, `[${replacementLabel}]`);
  if (replaced === graph) {
    throw new Error("Foreign material expected a terminal [vout] label in the shared render graph.");
  }
  return replaced;
}

function applyForeignMaterialToGraph({
  graph,
  foreignMaterialPlan = null,
  foreignMaterialInputIndex = null,
  width,
  height,
  fps,
} = {}) {
  if (!foreignMaterialPlan) {
    return { graph, evidence: null };
  }
  if (!Number.isSafeInteger(foreignMaterialInputIndex) || foreignMaterialInputIndex < 0) {
    throw new TypeError("Foreign material requires a non-negative video input index.");
  }
  const baseLabel = "foreignMaterialBase";
  const textureLabel = "foreignTexture";
  const nextGraph = replaceTerminalVout(graph, baseLabel);
  const renderDurationSeconds = Number(
    foreignMaterialPlan.placement?.renderDurationSeconds,
  );
  const clipDuration = Number.isFinite(renderDurationSeconds)
    ? renderDurationSeconds.toFixed(6)
    : "0";
  const blendMode =
    String(foreignMaterialPlan.assimilationPolicy?.blendMode || DEFAULT_BLEND_MODE).trim()
    || DEFAULT_BLEND_MODE;
  const opacity = Math.max(
    0,
    Math.min(1, Number(foreignMaterialPlan.assimilationPolicy?.opacity) || DEFAULT_OPACITY),
  );

  const filters = [
    `[${foreignMaterialInputIndex}:v]fps=${fps},scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},trim=duration=${clipDuration},setpts=PTS-STARTPTS,format=gray,eq=contrast=1.18:brightness=0.015,boxblur=2:1,format=rgba,colorchannelmixer=aa=${opacity.toFixed(
      2,
    )}[${textureLabel}]`,
    `[${baseLabel}][${textureLabel}]blend=all_mode=${blendMode}:all_opacity=1:shortest=1[vout]`,
  ];

  return {
    graph: `${nextGraph};\n${filters.join(";\n")}`,
    evidence: Object.freeze({
      schema: FOREIGN_MATERIAL_COMPILER_EVIDENCE_SCHEMA,
      policyVersion: FOREIGN_MATERIAL_POLICY_VERSION,
      planHash: foreignMaterialPlan.planHash,
      sourceSpecimenId: foreignMaterialPlan.sourceSpecimenId,
      clipAnalysisHash: foreignMaterialPlan.clipAnalysisHash,
      operatorId: foreignMaterialPlan.assimilationPolicy.operatorId,
      placementPolicy: foreignMaterialPlan.placement.policyVersion,
      samplingPolicy: foreignMaterialPlan.sampling.policyVersion,
      blendMode,
      opacity: Number(opacity.toFixed(2)),
      inputIndex: foreignMaterialInputIndex,
      renderDurationSeconds: Number(clipDuration),
    }),
  };
}

module.exports = {
  DEFAULT_BLEND_MODE,
  DEFAULT_OPACITY,
  FOREIGN_MATERIAL_ANALYSIS_SCHEMA,
  FOREIGN_MATERIAL_COMPILER_EVIDENCE_SCHEMA,
  FOREIGN_MATERIAL_OPERATOR_ID,
  FOREIGN_MATERIAL_PLACEMENT_POLICY,
  FOREIGN_MATERIAL_POLICY_VERSION,
  FOREIGN_MATERIAL_SAMPLING_POLICY,
  FOREIGN_MATERIAL_SCHEMA,
  applyForeignMaterialToGraph,
  createForeignMaterialPlan,
  ffmpegInputArgsForForeignMaterial,
};