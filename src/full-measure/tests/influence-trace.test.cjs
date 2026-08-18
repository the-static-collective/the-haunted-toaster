const test = require('node:test');
const assert = require('node:assert/strict');
const { buildInfluenceTrace } = require('../src/memory/influence-trace.cjs');

function capsule() {
  return {
    schema: 'haunted-toaster/memory-capsule/v1',
    policy: 'toaster-memory-capsule-v1',
    archiveCut: 'a'.repeat(64),
    projectionSha256: 'b'.repeat(64),
    currentSongEvidenceHash: 'song-hash',
    explicitAncestorReceiptSha256: '1'.repeat(64),
    pressures: [
      { kind: 'coverage-explore', target: 'topology:split-horizon', weight: 1, evidenceRefs: [`archive-cut:${'a'.repeat(64)}`] },
      { kind: 'relationship-favor', target: 'materialTexture:photocopy', weight: 1.25, evidenceRefs: [`render:${'1'.repeat(64)}`, 'verdict:v1'] },
      { kind: 'saturation-avoid', target: 'topology:cathedral-fan', avoids: 'topology:echo-tunnel', weight: 4, evidenceRefs: [`archive-cut:${'a'.repeat(64)}`] },
    ],
    capsuleSha256: 'c'.repeat(64),
  };
}

test('trace is deterministic, bounded, and every durable edge carries evidence', () => {
  const input = {
    capsule: capsule(),
    familyHash: 'family-1',
    candidates: Array.from({ length: 6 }, (_, index) => ({ index, scoreAddress: `score-${index}` })),
  };
  const first = buildInfluenceTrace(input);
  const second = buildInfluenceTrace(structuredClone(input));
  assert.equal(first.schema, 'haunted-toaster/influence-trace/v1');
  assert.equal(first.traceSha256, second.traceSha256);
  assert.deepEqual(first, second);
  assert.ok(first.nodes.length <= 24);
  assert.ok(first.edges.length <= 36);
  for (const edge of first.edges) {
    assert.ok(edge.evidenceRefs.length > 0);
    assert.ok(['recalled', 'favored', 'inhibited', 'underexplored', 'saturated', 'inherited', 'counterexampled', 'witnessed'].includes(edge.relation));
  }
});

test('explicit re-toast ancestor produces inherited evidence edges', () => {
  const trace = buildInfluenceTrace({
    capsule: capsule(),
    familyHash: 'family-1',
    candidates: [{ index: 0, scoreAddress: 'score-0' }, { index: 1, scoreAddress: 'score-1' }],
  });
  const inherited = trace.edges.filter((edge) => edge.relation === 'inherited');
  assert.equal(inherited.length, 2);
  assert.ok(inherited.every((edge) => edge.evidenceRefs.includes(`render:${'1'.repeat(64)}`)));
});
