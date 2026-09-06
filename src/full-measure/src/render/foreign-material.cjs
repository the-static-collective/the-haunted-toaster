const crypto = require("node:crypto");
const path = require("node:path");
const { deriveFrameReservoir } = require("../video-pantry/frame-reservoir.cjs");

const FOREIGN_MATERIAL_SCHEMA = "haunted-toaster/foreign-material/v1";
const FOREIGN_MATERIAL_POLICY_VERSION = "foreign-material-v1";
const FOREIGN_MATERIAL_ANALYSIS_SCHEMA = "haunted-toaster/foreign-material-analysis/v1";
const FOREIGN_MATERIAL_OPERATOR_ID = "clip-luma-texture-v1";
const FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID = "clip-luma-mask-v1";
const FOREIGN_MATERIAL_DIGEST_FAMILY_SCHEMA = "haunted-toaster/foreign-material-digest-family/v1";
const FOREIGN_MATERIAL_DIGEST_POLICY_VERSION = "video-digestion-v1";
const FOREIGN_MATERIAL_SAMPLING_POLICY = "loop-source-clip-v1";
const FOREIGN_MATERIAL_PLACEMENT_POLICY = "accepted-timeline-span-v1";
const FOREIGN_MATERIAL_COMPILER_EVIDENCE_SCHEMA = "haunted-toaster/foreign-material-compiler-evidence/v1";
const DEFAULT_BLEND_MODE = "softlight";
const DEFAULT_OPACITY = 0.28;
const SUPPORTED_DIGEST_OPERATORS = new Set([
  FOREIGN_MATERIAL_OPERATOR_ID,
  FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID,
]);

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

function assimilationPolicyForOperator(operatorId) {
  if (operatorId === FOREIGN_MATERIAL_OPERATOR_ID) {
    return {
      operatorId: FOREIGN_MATERIAL_OPERATOR_ID,
      family: "texture-assimilation",
      blendMode: DEFAULT_BLEND_MODE,
      opacity: DEFAULT_OPACITY,
      prefilter: "luma-eq-boxblur-v1",
    };
  }
  if (operatorId === FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID) {
    return {
      operatorId: FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID,
      family: "topology-mask-assimilation",
      sourceRole: "region-mask",
      literalSourcePixelsSurvive: false,
      nativeTreatment: "bounded-native-contrast-v1",
      prefilter: "luma-region-mask-v1",
    };
  }
  throw new TypeError(`Unsupported foreign-material digest operator: ${operatorId}.`);
}

function createForeignMaterialPlan({
  videoBinding,
  timeline,
  analysisDurationSeconds = null,
  operatorId = FOREIGN_MATERIAL_OPERATOR_ID,
} = {}) {
  if (!videoBinding) return null;
  const normalizedOperatorId = String(operatorId || "").trim();
  if (!SUPPORTED_DIGEST_OPERATORS.has(normalizedOperatorId)) {
    throw new TypeError(`Unsupported foreign-material digest operator: ${normalizedOperatorId || "(empty)"}.`);
  }
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
  const canonicalPlan = {
    schema: FOREIGN_MATERIAL_SCHEMA,
    policyVersion: FOREIGN_MATERIAL_POLICY_VERSION,
    sourceSpecimenId: reservoir.specimenId,
    sourceSha256: reservoir.sourceSha256,
    sourceByteLength: Number(videoBinding.byteLength),
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
    assimilationPolicy: assimilationPolicyForOperator(normalizedOperatorId),
  };
  return Object.freeze({
    ...canonicalPlan,
    sourceFilename: String(videoBinding.filename || path.basename(videoBinding.path || "")).trim() || null,
    sourcePath: String(videoBinding.path || "").trim() || null,
    planHash: hashJson(canonicalPlan),
  });
}

function createForeignMaterialDigestFamily({
  videoBinding,
  timeline,
  analysisDurationSeconds = null,
} = {}) {
  if (!videoBinding) return null;
  const texturePlan = createForeignMaterialPlan({
    videoBinding,
    timeline,
    analysisDurationSeconds,
  });
  const topologyPlan = createForeignMaterialPlan({
    videoBinding,
    timeline,
    analysisDurationSeconds,
    operatorId: FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID,
  });
  if (
    texturePlan.sourceSpecimenId !== topologyPlan.sourceSpecimenId ||
    texturePlan.clipAnalysisHash !== topologyPlan.clipAnalysisHash
  ) {
    throw new Error("Foreign-material digest descendants must retain common admitted ancestry.");
  }
  const canonicalFamily = {
    schema: FOREIGN_MATERIAL_DIGEST_FAMILY_SCHEMA,
    policyVersion: FOREIGN_MATERIAL_DIGEST_POLICY_VERSION,
    sourceSpecimenId: texturePlan.sourceSpecimenId,
    sourceSha256: texturePlan.sourceSha256,
    clipAnalysisHash: texturePlan.clipAnalysisHash,
    descendants: [texturePlan, topologyPlan].map((plan) => ({
      operatorId: plan.assimilationPolicy.operatorId,
      planHash: plan.planHash,
    })),
  };
  return Object.freeze({
    ...canonicalFamily,
    descendants: Object.freeze([texturePlan, topologyPlan]),
    familyHash: hashJson(canonicalFamily),
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

function compileTextureAssimilation({
  nextGraph,
  baseLabel,
  foreignMaterialPlan,
  foreignMaterialInputIndex,
  width,
  height,
  fps,
  clipDuration,
}) {
  const textureLabel = "foreignTexture";
  const blendMode =
    String(foreignMaterialPlan.assimilationPolicy?.blendMode || DEFAULT_BLEND_MODE).trim()
    || DEFAULT_BLEND_MODE;
  const opacity = Math.max(
    0,
    Math.min(1, Number(foreignMaterialPlan.assimilationPolicy?.opacity) || DEFAULT_OPACITY),
  );
  const filters = [
    `[${foreignMaterialInputIndex}:v]fps=${fps},scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},trim=duration=${clipDuration},setpts=PTS-STARTPTS,format=gray,eq=contrast=1.18:brightness=0.015,boxblur=2:1,format=rgba[${textureLabel}]`,
    `[${baseLabel}][${textureLabel}]blend=all_mode=${blendMode}:all_opacity=${opacity.toFixed(2)}:shortest=1[vout]`,
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

function compileTopologyMaskAssimilation({
  nextGraph,
  baseLabel,
  foreignMaterialPlan,
  foreignMaterialInputIndex,
  width,
  height,
  fps,
  clipDuration,
}) {
  const nativeBaseLabel = "foreignNativeBase";
  const nativeAltSourceLabel = "foreignNativeAltSource";
  const nativeAltLabel = "foreignNativeAlt";
  const maskLabel = "foreignRegionMask";
  const filters = [
    `[${baseLabel}]split=2[${nativeBaseLabel}][${nativeAltSourceLabel}]`,
    `[${nativeAltSourceLabel}]eq=contrast=1.16:saturation=0.78,unsharp=5:5:0.35:5:5:0[${nativeAltLabel}]`,
    `[${foreignMaterialInputIndex}:v]fps=${fps},scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},trim=duration=${clipDuration},setpts=PTS-STARTPTS,format=gray,eq=contrast=1.30:brightness=-0.04,boxblur=2:1[${maskLabel}]`,
    `[${nativeBaseLabel}][${nativeAltLabel}][${maskLabel}]maskedmerge[vout]`,
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
      sourceRole: "region-mask",
      literalSourcePixelsSurvive: false,
      nativeTreatment: foreignMaterialPlan.assimilationPolicy.nativeTreatment,
      inputIndex: foreignMaterialInputIndex,
      renderDurationSeconds: Number(clipDuration),
    }),
  };
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
  const operatorId = String(foreignMaterialPlan.assimilationPolicy?.operatorId || "").trim();
  if (!SUPPORTED_DIGEST_OPERATORS.has(operatorId)) {
    throw new TypeError(`Unsupported foreign-material digest operator: ${operatorId || "(empty)"}.`);
  }
  const baseLabel = "foreignMaterialBase";
  const nextGraph = replaceTerminalVout(graph, baseLabel);
  const renderDurationSeconds = Number(
    foreignMaterialPlan.placement?.renderDurationSeconds,
  );
  const clipDuration = Number.isFinite(renderDurationSeconds)
    ? renderDurationSeconds.toFixed(6)
    : "0";
  const compileArgs = {
    nextGraph,
    baseLabel,
    foreignMaterialPlan,
    foreignMaterialInputIndex,
    width,
    height,
    fps,
    clipDuration,
  };
  if (operatorId === FOREIGN_MATERIAL_OPERATOR_ID) {
    return compileTextureAssimilation(compileArgs);
  }
  return compileTopologyMaskAssimilation(compileArgs);
}

module.exports = {
  DEFAULT_BLEND_MODE,
  DEFAULT_OPACITY,
  FOREIGN_MATERIAL_ANALYSIS_SCHEMA,
  FOREIGN_MATERIAL_COMPILER_EVIDENCE_SCHEMA,
  FOREIGN_MATERIAL_DIGEST_FAMILY_SCHEMA,
  FOREIGN_MATERIAL_DIGEST_POLICY_VERSION,
  FOREIGN_MATERIAL_OPERATOR_ID,
  FOREIGN_MATERIAL_PLACEMENT_POLICY,
  FOREIGN_MATERIAL_POLICY_VERSION,
  FOREIGN_MATERIAL_SAMPLING_POLICY,
  FOREIGN_MATERIAL_SCHEMA,
  FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID,
  applyForeignMaterialToGraph,
  createForeignMaterialDigestFamily,
  createForeignMaterialPlan,
  ffmpegInputArgsForForeignMaterial,
};
