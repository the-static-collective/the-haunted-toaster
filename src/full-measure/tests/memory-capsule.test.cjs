const test = require('node:test');
const assert = require('node:assert/strict');
const {
  allowedFeatureUniverse,
  deriveGenerationPressure,
  deriveMemoryCapsule,
  summarizeCurrentSongEvidence,
} = require('../src/memory/memory-capsule.cjs');
const { deriveWitnessDisposition } = require('../src/memory/witness-disposition.cjs');

const constraints = {
  topology: { allowed: ['echo-tunnel', 'split-horizon', 'cathedral-fan'] },
  motion: { grammar: { allowed: ['drift', 'fracture'] } },
  material: { texture: { allowed: ['clean', 'photocopy'] } },
  camera: { grammar: { allowed: ['locked', 'push'] } },
  palette: { logic: { allowed: ['garment', 'duotone'] } },
};

function projection(overrides = {}) {
  return {
    schema: 'haunted-toaster/memory-projection/v1',
    policy: 'receipt-memory-projection-v1',
    archiveCut: 'a'.repeat(64),
    projectionSha256: 'b'.repeat(64),
    renderCount: 4,
    featureCounts: {
      'topology:echo-tunnel': 4,
      'topology:split-horizon': 0,
      'materialTexture:clean': 2,
      'materialTexture:photocopy': 0,
    },
    recentFeatureCounts: {
      'topology:echo-tunnel': 4,
      'materialTexture:clean': 2,
    },
    relationshipWeights: {
      'songEnergy:dense|topology:echo-tunnel': 3.5,
      'songEnergy:dense|materialTexture:photocopy': 1.25,
    },
    latestVerdicts: {
      ['1'.repeat(64)]: {
        verdictId: 'v1',
        renderReceiptSha256: '1'.repeat(64),
        createdAt: '2026-08-17T21:00:00.000Z',
        rating: 5,
        disposition: 'keep',
        wouldReToast: true,
      },
    },
    ...overrides,
  };
}

test('allowed feature universe maps only legal candidate axes', () => {
  assert.deepEqual(allowedFeatureUniverse(constraints), [
    'cameraGrammar:locked',
    'cameraGrammar:push',
    'materialTexture:clean',
    'materialTexture:photocopy',
    'motionGrammar:drift',
    'motionGrammar:fracture',
    'paletteLogic:duotone',
    'paletteLogic:garment',
    'topology:cathedral-fan',
    'topology:echo-tunnel',
    'topology:split-horizon',
  ]);
});

test('capsule is deterministic, bounded, and carries explicit evidence refs', () => {
  const currentSongEvidence = { energyClass: 'dense', evidenceHash: 'song-hash' };
  const allowedFeatures = allowedFeatureUniverse(constraints);
  const first = deriveMemoryCapsule({
    projection: projection(),
    currentSongEvidence,
    allowedFeatures,
    explicitAncestorReceiptSha256: null,
  });
  const reordered = projection({
    featureCounts: Object.fromEntries(Object.entries(projection().featureCounts).reverse()),
    relationshipWeights: Object.fromEntries(Object.entries(projection().relationshipWeights).reverse()),
  });
  const second = deriveMemoryCapsule({
    projection: reordered,
    currentSongEvidence,
    allowedFeatures: allowedFeatures.slice().reverse(),
    explicitAncestorReceiptSha256: null,
  });
  assert.equal(first.schema, 'haunted-toaster/memory-capsule/v1');
  assert.equal(first.capsuleSha256, second.capsuleSha256);
  assert.ok(first.pressures.length <= 12);
  assert.ok(first.pressures.length > 0);
  assert.ok(first.pressures.every((pressure) => pressure.evidenceRefs.length > 0));
  assert.ok(first.pressures.every((pressure) => allowedFeatures.includes(pressure.target)));
  assert.match(first.capsuleSha256, /^[a-f0-9]{64}$/);
});

test('generation pressure chooses coverage before relationship and saturation', () => {
  const capsule = deriveMemoryCapsule({
    projection: projection(),
    currentSongEvidence: { energyClass: 'dense', evidenceHash: 'song-hash' },
    allowedFeatures: allowedFeatureUniverse(constraints),
    explicitAncestorReceiptSha256: null,
  });
  const plan = deriveGenerationPressure(capsule);
  assert.equal(plan.policy, 'toaster-memory-influence-v1');
  assert.equal(plan.reason, 'coverage-explore');
  assert.ok(allowedFeatureUniverse(constraints).includes(plan.target));
  assert.ok(plan.evidenceRefs.length > 0);
});

test('witness disposition stays small and non-sovereign', () => {
  const capsule = deriveMemoryCapsule({
    projection: projection(),
    currentSongEvidence: { energyClass: 'dense', evidenceHash: 'song-hash' },
    allowedFeatures: allowedFeatureUniverse(constraints),
    explicitAncestorReceiptSha256: null,
  });
  const disposition = deriveWitnessDisposition(capsule);
  assert.equal(disposition.policy, 'toaster-witness-disposition-v1');
  assert.ok(disposition.dispositions.length <= 3);
  assert.ok(disposition.dispositions.every((item) => item.evidenceRefs.length > 0));
  const serialized = JSON.stringify(disposition);
  assert.equal(serialized.includes('pixelFormat'), false);
  assert.equal(serialized.includes('width'), false);
  assert.equal(serialized.includes('height'), false);
});

test('current song evidence is deterministic from bounded analysis facts', () => {
  const analysis = {
    duration: 120,
    sections: [
      { start: 0, end: 60, energy: 0.8, label: 'a' },
      { start: 60, end: 120, energy: 0.7, label: 'b' },
    ],
  };
  const first = summarizeCurrentSongEvidence(analysis);
  const second = summarizeCurrentSongEvidence(structuredClone(analysis));
  assert.equal(first.energyClass, 'dense');
  assert.equal(first.evidenceHash, second.evidenceHash);
});
