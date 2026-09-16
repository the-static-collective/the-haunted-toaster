const { buildCandidateCreativeContext } = require('./creative-context-providers.cjs');
const { buildCreativeContextTable } = require('./generation/creative-context-table.cjs');
const { buildInfluenceDiet } = require('./generation/influence-diet.cjs');
const { deepFreeze, hashCanonical } = require('./generation/canonical.cjs');

function buildArchaeologyContext({ analysis, responseWitness, constraints, family, material = null, videoPresent = false }) {
  const base = buildCandidateCreativeContext({ analysis, responseWitness, constraints });
  const entries = [...base.entries];
  if (videoPresent) {
    for (const [providerId, value, hashKey, authorityClass] of [
      ['pantry/toastpack-v1', material?.toastPack, 'manifestSha256', 'creative-material'],
      ['pantry/specimen-pulse-v1', material?.specimenPulse, 'witnessSha256', 'influence-only'],
    ]) {
      const available = value && value.status !== 'unavailable';
      entries.push({ providerId, policyVersion: value?.policyVersion || 'archaeology-material-v1',
        evidenceRef: value ? `sha256:${value[hashKey]}` : null, authorityClass, ancestryClass: 'none',
        required: false, allowedDecisions: [], availability: available ? 'available' : 'unavailable',
        payload: value || { status: 'unavailable', reason: 'material-analysis-unavailable' } });
    }
  }
  const table = buildCreativeContextTable({ entries });
  const diet = buildInfluenceDiet({ table });
  const core = { schema: 'haunted-toaster/archaeology-observation/v1', mode: 'observation-only',
    scope: 'song-garment-and-archaeology-only-not-complete-generation-diet', executionAuthority: 'none',
    familyHash: family.familyHash, table,
    candidates: family.candidates.map(c => ({ index: c.index, scoreAddress: c.scoreAddress, timelineHash: c.timelineHash, diet })),
  };
  return deepFreeze({ ...core, observationSha256: hashCanonical(core, 'HauntedToaster-ArchaeologyObservation-v1') });
}
module.exports = { buildArchaeologyContext };
