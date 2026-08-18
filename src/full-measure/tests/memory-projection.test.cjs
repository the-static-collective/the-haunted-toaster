const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildMemoryProjection,
  extractReceiptFeatures,
  verdictWeight,
} = require('../src/memory/memory-projection.cjs');

function render(receiptSha256, createdAt, energy, topology = 'echo-tunnel') {
  return {
    receiptSha256,
    createdAt,
    receipt: {
      schema: 'full-measure.video-receipt.v1',
      createdAt,
      treatment: {
        title: `Song ${receiptSha256.slice(0, 2)}`,
        garment: { id: 'openField' },
        toastFeel: { id: 'wire-heat' },
        nativeColor: { relationship: 'warm-return' },
        sections: [{ energy }, { energy }],
      },
      render: {
        witnessWindow: { policyVersion: 'witness-window-v1' },
        visualCompiler: { topology, operators: ['fracture', { kind: 'photocopy', amount: 0.8 }] },
      },
      validation: { accepted: true },
    },
  };
}

function verdict(renderReceiptSha256, verdictId, createdAt, rating, disposition = 'keep', wouldReToast = false) {
  return { schema: 'haunted-toaster/human-verdict/v1', renderReceiptSha256, verdictId, createdAt, rating, disposition, wouldReToast };
}

test('projection is deterministic across input order and selects latest verdict', () => {
  const a = render('a'.repeat(64), '2026-08-17T20:00:00.000Z', 0.8);
  const b = render('b'.repeat(64), '2026-08-17T20:01:00.000Z', 0.2, 'split-horizon');
  const older = verdict(a.receiptSha256, 'v1', '2026-08-17T20:10:00.000Z', 2, 'compost');
  const newer = verdict(a.receiptSha256, 'v2', '2026-08-17T20:11:00.000Z', 5, 'keep', true);
  const first = buildMemoryProjection({ renders: [a, b], verdicts: [older, newer] });
  const second = buildMemoryProjection({ renders: [b, a], verdicts: [newer, older] });
  assert.equal(first.projectionSha256, second.projectionSha256);
  assert.deepEqual(first, second);
  assert.equal(first.latestVerdicts[a.receiptSha256].rating, 5);
  assert.equal(first.renderCount, 2);
});

test('high rating strengthens an attributable relation while repetition remains saturation evidence', () => {
  const renders = Array.from({ length: 4 }, (_, index) =>
    render(String(index + 1).repeat(64), `2026-08-17T20:0${index}:00.000Z`, 0.9, 'echo-tunnel'));
  const verdicts = renders.map((item, index) =>
    verdict(item.receiptSha256, `v${index}`, `2026-08-17T21:0${index}:00.000Z`, 5, 'keep', true));
  const projection = buildMemoryProjection({ renders, verdicts });
  assert.ok(projection.relationshipWeights['songEnergy:dense|topology:echo-tunnel'] > 0);
  assert.equal(projection.recentFeatureCounts['topology:echo-tunnel'], 4);
  assert.equal(projection.featureCounts['topology:echo-tunnel'], 4);
});

test('feature extraction only derives stable receipt-backed tokens', () => {
  const features = extractReceiptFeatures(render('c'.repeat(64), '2026-08-17T20:00:00.000Z', 0.5).receipt);
  assert.ok(features.includes('songEnergy:mixed'));
  assert.ok(features.includes('garment:openField'));
  assert.ok(features.includes('toastFeel:wire-heat'));
  assert.ok(features.includes('nativeColor:warm-return'));
  assert.ok(features.includes('topology:echo-tunnel'));
  assert.ok(features.includes('operator:fracture'));
  assert.ok(features.some((feature) => /^operator:hash-[a-f0-9]{12}$/.test(feature)));
  assert.ok(features.includes('witnessWindow:witness-window-v1'));
  assert.equal(new Set(features).size, features.length);
});

test('verdict weight keeps human affection separate from repetition', () => {
  assert.equal(verdictWeight({ rating: 5, disposition: 'keep', wouldReToast: true }), 1.75);
  assert.equal(verdictWeight({ rating: 1, disposition: 'compost', wouldReToast: false }), -1.5);
  assert.equal(verdictWeight(null), 0);
});
