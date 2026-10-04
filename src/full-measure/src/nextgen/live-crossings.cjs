"use strict";

const {
  canonicalize,
  deepFreeze,
  hashCanonical,
  quantizeNumber,
} = require("../generation/canonical.cjs");
const { buildListeningEye } = require("../generation/listening-eye.cjs");
const { createVideoDigestionSix } = require("../render/video-digestion-six.cjs");

const NEXTGEN_LIVE_CROSSING_SCHEMA = "static-collective/nextgen-live-crossing/v0";
const NEXTGEN_LIVE_CROSSING_POLICY = "nextgen-live-crossings-003";
const PRESSURE_SCHEMA = "static-collective/franken-listening-eye-pressure/v0";
const MATERIAL_DERIVATION_SCHEMA = "static-collective/franken-video-digestion-material/v0";

function scoreLens(lens) {
  const p = lens?.pressures || {};
  return [
    p.motion,
    p.density,
    p.contrast,
    p.persistence,
    p.memory,
    p.foreshadow,
    p.arrival,
  ].reduce((sum, value) => sum + Number(value || 0), 0);
}

function dominantLens(listeningEye) {
  const lenses = Array.isArray(listeningEye?.lenses) ? listeningEye.lenses : [];
  if (!lenses.length) throw new TypeError("Listening Eye pressure requires lenses.");
  return [...lenses].sort((left, right) => {
    const delta = scoreLens(right) - scoreLens(left);
    return delta || Number(left.slotIndex) - Number(right.slotIndex);
  })[0];
}

function deriveFrankenPressure(listeningEye) {
  if (!listeningEye?.listeningEyeSha256) {
    throw new TypeError("Franken pressure requires a Listening Eye witness.");
  }
  const lens = dominantLens(listeningEye);
  const pressures = lens.pressures || {};
  const arrival = Number(pressures.arrival || 0);
  const foreshadow = Number(pressures.foreshadow || 0);
  const density = Number(pressures.density || 0);
  const contrast = Number(pressures.contrast || 0);
  const movingTakeSceneId =
    Math.abs(arrival - foreshadow) < 0.14
      ? "CROSS"
      : arrival > foreshadow
        ? "ASSEMBLE"
        : "ARRIVE";
  const seed = Number.parseInt(String(listeningEye.listeningEyeSha256).slice(0, 8), 16);
  const variation = Number.isFinite(seed) ? seed % 10 : 0;
  const core = {
    schema: PRESSURE_SCHEMA,
    policy: NEXTGEN_LIVE_CROSSING_POLICY,
    authority: "influence-only",
    sourceListeningEyeSha256: listeningEye.listeningEyeSha256,
    dominantLens: {
      id: lens.id,
      name: lens.name,
      slotIndex: lens.slotIndex,
      score: quantizeNumber(scoreLens(lens)),
    },
    edits: {
      movingTakeSceneId,
      transitions: {
        arriveCross: density >= 0.5 ? "radial-reveal" : "panel-wipe",
        crossAssemble: contrast >= 0.55 ? "radial-reveal" : "panel-wipe",
      },
      variation,
    },
    nonclaims: [
      "Listening Eye pressure is not placement authority.",
      "Human Franken edits override these defaults before freeze.",
      "Pressure does not KEEP, freeze, render, or publish.",
    ],
  };
  return deepFreeze({
    ...core,
    pressureHash: hashCanonical(core, "HauntedToaster-NextGenFrankenPressure-v0"),
  });
}

function buildNextGenLiveCrossing({
  analysis,
  rootSeed = "nextgen-003",
  albumContext = {},
  videoBinding = null,
  timeline = null,
  timelineHash = null,
  candidateIndex = null,
} = {}) {
  const listeningEye = buildListeningEye({ analysis, rootSeed, albumContext });
  const frankenPressure = deriveFrankenPressure(listeningEye);
  const videoDigestion =
    videoBinding && timeline
      ? createVideoDigestionSix({
          videoBinding,
          timeline,
          analysisDurationSeconds: Number(analysis.durationSeconds),
        })
      : null;
  const core = {
    schema: NEXTGEN_LIVE_CROSSING_SCHEMA,
    policy: NEXTGEN_LIVE_CROSSING_POLICY,
    authority: "proposal-pressure-and-material-reservoir-only",
    basis: {
      candidateIndex: Number.isInteger(candidateIndex) ? candidateIndex : null,
      timelineHash: timelineHash || null,
    },
    listeningEye: {
      schema: listeningEye.schema,
      authority: listeningEye.authority,
      listeningEyeSha256: listeningEye.listeningEyeSha256,
      analysisHash: listeningEye.analysisHash,
      album: listeningEye.album,
      summary: listeningEye.summary,
      lenses: listeningEye.lenses,
    },
    frankenPressure,
    videoDigestion: videoDigestion
      ? {
          schema: videoDigestion.schema,
          policyVersion: videoDigestion.policyVersion,
          authority: videoDigestion.authority,
          familyHash: videoDigestion.familyHash,
          sourceSpecimenId: videoDigestion.sourceSpecimenId,
          sourceSha256: videoDigestion.sourceSha256,
          clipAnalysisHash: videoDigestion.clipAnalysisHash,
          descendants: videoDigestion.descendants.map((descendant) => ({
            slot: descendant.slot,
            roleId: descendant.roleId,
            digestOperatorId: descendant.digestOperatorId,
            samplingPolicyId: descendant.samplingPolicyId,
            projectionClass: descendant.projectionClass,
            planHash: descendant.planHash,
          })),
        }
      : null,
  };
  const crossingIdentity = hashCanonical(core, "HauntedToaster-NextGenLiveCrossing-v0");
  return deepFreeze({
    ...core,
    crossingIdentity,
    _private: videoDigestion ? { videoDigestion } : null,
  });
}

function publicCrossingView(context) {
  if (!context || context.schema !== NEXTGEN_LIVE_CROSSING_SCHEMA) {
    throw new TypeError("Expected a NextGen live crossing.");
  }
  const { _private, ...publicValue } = context;
  return deepFreeze(canonicalize(publicValue));
}

function frankenVideoDigestionReservoir(context) {
  const family = context?._private?.videoDigestion;
  if (!family) return deepFreeze({ materials: [], bindings: {} });
  const materials = [];
  const bindings = {};
  for (const descendant of family.descendants) {
    const materialId = `video-digest:${descendant.roleId}:${descendant.planHash.slice(0, 12)}`;
    materials.push({
      materialId,
      kind: "video",
      sourceIdentity: `video-digestion:${family.familyHash}:${descendant.roleId}:${descendant.planHash}`,
      digest: descendant.sourceSha256,
      rightsBasis: "local-admitted-video-derived-proposal",
      admissionBasis: "video-digestion-six-proposal-only",
      derivation: {
        schema: MATERIAL_DERIVATION_SCHEMA,
        authority: "proposal-only",
        familyHash: family.familyHash,
        roleId: descendant.roleId,
        planHash: descendant.planHash,
        digestOperatorId: descendant.digestOperatorId,
        samplingPolicyId: descendant.samplingPolicyId,
        projectionClass: descendant.projectionClass,
      },
    });
    bindings[materialId] = descendant.plan.sourcePath;
  }
  return deepFreeze({
    materials: canonicalize(materials),
    bindings: canonicalize(bindings),
  });
}

module.exports = {
  MATERIAL_DERIVATION_SCHEMA,
  NEXTGEN_LIVE_CROSSING_POLICY,
  NEXTGEN_LIVE_CROSSING_SCHEMA,
  PRESSURE_SCHEMA,
  buildNextGenLiveCrossing,
  deriveFrankenPressure,
  frankenVideoDigestionReservoir,
  publicCrossingView,
};
