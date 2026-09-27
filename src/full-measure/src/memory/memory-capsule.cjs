const { hashCanonical } = require('../generation/canonical.cjs');
const { songEnergyClass } = require('./memory-projection.cjs');

const CAPSULE_SCHEMA = 'haunted-toaster/memory-capsule/v1';
const CAPSULE_POLICY = 'toaster-memory-capsule-v1';
const INFLUENCE_POLICY = 'toaster-memory-influence-v1';
const MEMORY_PRISM_SCHEMA = 'haunted-toaster/memory-prism/v1';
const MEMORY_PRISM_POLICY = 'toaster-memory-prism-v1';
const MAX_PRESSURES = 12;
const MEMORY_PRISM_APERTURES = Object.freeze([
  Object.freeze({ seatIndex: 0, aperture: 'BODY', targetPrefix: 'topology' }),
  Object.freeze({ seatIndex: 1, aperture: 'BEHAVIOR', targetPrefix: 'motionGrammar' }),
  Object.freeze({ seatIndex: 2, aperture: 'SKIN', targetPrefix: 'materialTexture' }),
  Object.freeze({ seatIndex: 3, aperture: 'COLOR', targetPrefix: 'paletteLogic' }),
  Object.freeze({ seatIndex: 4, aperture: 'EYE', targetPrefix: 'cameraGrammar' }),
  Object.freeze({ seatIndex: 5, aperture: 'TIME', targetPrefix: 'temporalDensity' }),
]);

function summarizeCurrentSongEvidence(mediaAnalysis = {}) {
  const sections = (mediaAnalysis.sections || []).map((section) => ({
    start: Number(section.start ?? section.startSeconds ?? 0),
    end: Number(section.end ?? section.endSeconds ?? 0),
    energy: Number(section.energy ?? 0.5),
    label: String(section.label || ''),
  }));
  const bounded = {
    duration: Number(mediaAnalysis.duration ?? mediaAnalysis.durationSeconds ?? 0),
    sections,
  };
  return {
    energyClass: songEnergyClass(sections),
    evidenceHash: hashCanonical(bounded, 'HauntedToaster-CurrentSongEvidence-v1'),
  };
}

function allowedFeatureUniverse(constraints = {}) {
  const features = [];
  for (const value of constraints.topology?.allowed || []) features.push(`topology:${value}`);
  for (const value of constraints.motion?.grammar?.allowed || []) features.push(`motionGrammar:${value}`);
  for (const value of constraints.material?.texture?.allowed || []) features.push(`materialTexture:${value}`);
  for (const value of constraints.camera?.grammar?.allowed || []) features.push(`cameraGrammar:${value}`);
  for (const value of constraints.palette?.logic?.allowed || []) features.push(`paletteLogic:${value}`);
  return [...new Set(features.map(String))].sort();
}

function allowedPrismFeatureUniverse(constraints = {}) {
  const features = allowedFeatureUniverse(constraints);
  for (const value of constraints.temporalDensity?.allowed || []) {
    features.push(`temporalDensity:${value}`);
  }
  return [...new Set(features.map(String))].sort();
}

function evidenceRefsForProjection(projection, currentSongEvidence) {
  const refs = [
    `archive-cut:${projection.archiveCut}`,
    `song:${currentSongEvidence.evidenceHash}`,
  ];
  for (const verdict of Object.values(projection.latestVerdicts || {})) {
    if (verdict?.renderReceiptSha256) refs.push(`render:${verdict.renderReceiptSha256}`);
    if (verdict?.verdictId) refs.push(`verdict:${verdict.verdictId}`);
  }
  return [...new Set(refs)].sort();
}

function sameFeatureClass(left, right) {
  return String(left).split(':', 1)[0] === String(right).split(':', 1)[0];
}

function deriveMemoryCapsule({
  projection,
  currentSongEvidence,
  allowedFeatures = [],
  explicitAncestorReceiptSha256 = null,
}) {
  if (!projection?.archiveCut || !projection?.projectionSha256) {
    throw new TypeError('A deterministic memory projection is required.');
  }
  if (!currentSongEvidence?.energyClass || !currentSongEvidence?.evidenceHash) {
    throw new TypeError('Current song evidence is required.');
  }

  const allowed = [...new Set((allowedFeatures || []).map(String))].sort();
  const evidenceRefs = evidenceRefsForProjection(projection, currentSongEvidence);
  const pressures = [];

  if (allowed.length) {
    const counts = allowed.map((feature) => Number(projection.featureCounts?.[feature] || 0));
    const minimumCount = Math.min(...counts);
    for (const feature of allowed) {
      const count = Number(projection.featureCounts?.[feature] || 0);
      if (count !== minimumCount) continue;
      pressures.push({
        kind: 'coverage-explore',
        target: feature,
        weight: 1 / (1 + count),
        evidenceRefs: [`archive-cut:${projection.archiveCut}`, `song:${currentSongEvidence.evidenceHash}`],
      });
    }
  }

  const energyToken = `songEnergy:${currentSongEvidence.energyClass}`;
  for (const feature of allowed) {
    const weight = Number(projection.relationshipWeights?.[`${energyToken}|${feature}`] || 0);
    if (weight <= 0) continue;
    pressures.push({
      kind: 'relationship-favor',
      target: feature,
      weight,
      evidenceRefs,
    });
  }

  for (const saturated of allowed) {
    const recent = Number(projection.recentFeatureCounts?.[saturated] || 0);
    if (recent < 2) continue;
    const alternatives = allowed
      .filter((feature) => feature !== saturated && sameFeatureClass(feature, saturated))
      .sort((left, right) =>
        Number(projection.featureCounts?.[left] || 0) - Number(projection.featureCounts?.[right] || 0) ||
        left.localeCompare(right));
    const target = alternatives[0];
    if (!target) continue;
    pressures.push({
      kind: 'saturation-avoid',
      target,
      avoids: saturated,
      weight: recent,
      evidenceRefs: [`archive-cut:${projection.archiveCut}`, `song:${currentSongEvidence.evidenceHash}`],
    });
  }

  const unique = new Map();
  for (const pressure of pressures) {
    const key = `${pressure.kind}|${pressure.target}|${pressure.avoids || ''}`;
    if (!unique.has(key)) unique.set(key, pressure);
  }
  const ordered = [...unique.values()]
    .map((pressure) => ({
      ...pressure,
      evidenceRefs: [...new Set(pressure.evidenceRefs)].sort(),
    }))
    .sort((left, right) =>
      Math.abs(Number(right.weight)) - Math.abs(Number(left.weight)) ||
      left.target.localeCompare(right.target) ||
      left.kind.localeCompare(right.kind))
    .slice(0, MAX_PRESSURES);

  const core = {
    schema: CAPSULE_SCHEMA,
    policy: CAPSULE_POLICY,
    archiveCut: projection.archiveCut,
    projectionSha256: projection.projectionSha256,
    currentSongEvidenceHash: currentSongEvidence.evidenceHash,
    currentSongEnergyClass: currentSongEvidence.energyClass,
    explicitAncestorReceiptSha256: explicitAncestorReceiptSha256 || null,
    pressures: ordered,
  };
  return {
    ...core,
    capsuleSha256: hashCanonical(core, 'HauntedToaster-MemoryCapsule-v1'),
  };
}

function prismInfluenceForAperture({
  projection,
  currentSongEvidence,
  allowedFeatures,
  capsuleSha256,
  aperture,
}) {
  const prefix = `${aperture.targetPrefix}:`;
  const candidates = allowedFeatures.filter((feature) => feature.startsWith(prefix));
  if (!candidates.length) return null;

  const counts = candidates.map((feature) => Number(projection.featureCounts?.[feature] || 0));
  const minimum = Math.min(...counts);
  const maximum = Math.max(...counts);
  const archiveEvidence = [
    `archive-cut:${projection.archiveCut}`,
    `song:${currentSongEvidence.evidenceHash}`,
  ];

  let pressure;
  if (minimum < maximum) {
    const target = candidates
      .filter((feature) => Number(projection.featureCounts?.[feature] || 0) === minimum)
      .sort()[0];
    pressure = {
      kind: 'coverage-explore',
      target,
      weight: 1 / (1 + minimum),
      evidenceRefs: archiveEvidence,
    };
  } else {
    const energyToken = `songEnergy:${currentSongEvidence.energyClass}`;
    const favored = candidates
      .map((feature) => ({
        feature,
        weight: Number(projection.relationshipWeights?.[`${energyToken}|${feature}`] || 0),
      }))
      .filter((item) => item.weight > 0)
      .sort((left, right) => right.weight - left.weight || left.feature.localeCompare(right.feature))[0] || null;

    if (favored) {
      pressure = {
        kind: 'relationship-favor',
        target: favored.feature,
        weight: favored.weight,
        evidenceRefs: evidenceRefsForProjection(projection, currentSongEvidence),
      };
    } else {
      const saturated = candidates
        .map((feature) => ({
          feature,
          recent: Number(projection.recentFeatureCounts?.[feature] || 0),
        }))
        .filter((item) => item.recent >= 2)
        .sort((left, right) => right.recent - left.recent || left.feature.localeCompare(right.feature))[0] || null;
      const target = candidates.slice().sort()[0];
      if (saturated && candidates.length > 1) {
        const alternative = candidates
          .filter((feature) => feature !== saturated.feature)
          .sort((left, right) =>
            Number(projection.featureCounts?.[left] || 0) - Number(projection.featureCounts?.[right] || 0) ||
            left.localeCompare(right))[0];
        pressure = {
          kind: 'saturation-avoid',
          target: alternative,
          avoids: saturated.feature,
          weight: saturated.recent,
          evidenceRefs: archiveEvidence,
        };
      } else {
        pressure = {
          kind: 'coverage-explore',
          target,
          weight: 1 / (1 + minimum),
          evidenceRefs: archiveEvidence,
        };
      }
    }
  }

  return {
    policy: INFLUENCE_POLICY,
    capsuleSha256,
    target: pressure.target,
    reason: pressure.kind,
    weight: Number(pressure.weight),
    ...(pressure.avoids ? { avoids: pressure.avoids } : {}),
    evidenceRefs: [...new Set(pressure.evidenceRefs)].sort(),
  };
}

function deriveMemoryPrism({
  projection,
  currentSongEvidence,
  allowedFeatures = [],
  capsuleSha256,
} = {}) {
  if (!projection?.archiveCut || !projection?.projectionSha256) {
    throw new TypeError('A deterministic memory projection is required.');
  }
  if (!currentSongEvidence?.energyClass || !currentSongEvidence?.evidenceHash) {
    throw new TypeError('Current song evidence is required.');
  }
  if (!capsuleSha256) {
    throw new TypeError('Memory Prism requires its source MemoryCapsule identity.');
  }
  if (Number(projection.renderCount || 0) <= 0) return null;

  const allowed = [...new Set((allowedFeatures || []).map(String))].sort();
  const seats = MEMORY_PRISM_APERTURES.map((aperture) => ({
    ...aperture,
    influence: prismInfluenceForAperture({
      projection,
      currentSongEvidence,
      allowedFeatures: allowed,
      capsuleSha256,
      aperture,
    }),
  }));
  const core = {
    schema: MEMORY_PRISM_SCHEMA,
    policy: MEMORY_PRISM_POLICY,
    capsuleSha256,
    archiveCut: projection.archiveCut,
    projectionSha256: projection.projectionSha256,
    currentSongEvidenceHash: currentSongEvidence.evidenceHash,
    seats,
  };
  return {
    ...core,
    prismSha256: hashCanonical(core, 'HauntedToaster-MemoryPrism-v1'),
  };
}

function deriveGenerationPressure(capsule) {
  if (!capsule?.capsuleSha256 || !Array.isArray(capsule.pressures)) return null;
  const priority = ['coverage-explore', 'relationship-favor', 'saturation-avoid'];
  let selected = null;
  for (const kind of priority) {
    selected = capsule.pressures
      .filter((pressure) => pressure.kind === kind)
      .sort((left, right) =>
        Math.abs(Number(right.weight)) - Math.abs(Number(left.weight)) ||
        left.target.localeCompare(right.target))[0] || null;
    if (selected) break;
  }
  if (!selected) return null;
  return {
    policy: INFLUENCE_POLICY,
    capsuleSha256: capsule.capsuleSha256,
    target: selected.target,
    reason: selected.kind,
    evidenceRefs: [...selected.evidenceRefs],
  };
}

module.exports = {
  CAPSULE_POLICY,
  CAPSULE_SCHEMA,
  INFLUENCE_POLICY,
  MAX_PRESSURES,
  MEMORY_PRISM_APERTURES,
  MEMORY_PRISM_POLICY,
  MEMORY_PRISM_SCHEMA,
  allowedFeatureUniverse,
  allowedPrismFeatureUniverse,
  deriveGenerationPressure,
  deriveMemoryCapsule,
  deriveMemoryPrism,
  summarizeCurrentSongEvidence,
};
