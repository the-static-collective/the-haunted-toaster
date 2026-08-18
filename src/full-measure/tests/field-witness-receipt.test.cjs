const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { archiveSuccessfulRender } = require('../src/memory/receipt-archive.cjs');
const {
  FIELD_WITNESS_CLAIM_KEYS,
  FIELD_WITNESS_SCHEMA,
  appendFieldWitnessReceipt,
} = require('../src/memory/field-witness-receipt.cjs');

async function acceptedRenderFixture() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'toaster-field-witness-'));
  const outputDir = path.join(rootDir, 'output');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'song.mp4');
  const receiptPath = path.join(outputDir, 'song.video-receipt.json');
  const scorePath = path.join(outputDir, 'song.score.json');
  const timelinePath = path.join(outputDir, 'song.timeline.json');
  await fs.writeFile(outputPath, 'video');
  await fs.writeFile(scorePath, '{}');
  await fs.writeFile(timelinePath, '{}');
  const receipt = {
    schema: 'full-measure.video-receipt.v1',
    createdAt: '2026-08-18T07:00:00.000Z',
    treatment: {
      title: 'Field Song',
      artist: 'Static',
      garment: { id: 'openField' },
      toastFeel: { id: 'low-and-slow' },
    },
    render: { witnessWindow: { policyVersion: 'witness-window-v1' } },
    output: { filename: 'song.mp4', sha256: 'abc', sizeBytes: 5 },
    validation: { accepted: true },
  };
  await fs.writeFile(receiptPath, JSON.stringify(receipt));
  const archived = await archiveSuccessfulRender({
    rootDir,
    renderResult: { outputPath, receiptPath, scorePath, timelinePath, srtPath: null, vttPath: null },
  });
  return { rootDir, archived };
}

function passingClaims() {
  return {
    aggressiveRenderCompleted: true,
    lowAndSlowExpressiveReachPreserved: true,
    listenerDraftPreserved: true,
    relistenHumanAnchorsPreserved: true,
  };
}

test('writes an immutable field witness bound to the archived accepted render and exact build head', async () => {
  const { rootDir, archived } = await acceptedRenderFixture();
  const claims = passingClaims();
  const witness = await appendFieldWitnessReceipt({
    rootDir,
    renderReceiptSha256: archived.receiptSha256,
    buildHeadSha: 'a'.repeat(40),
    claims,
    note: 'Dense guitar retained internal structure.',
    now: () => new Date('2026-08-18T07:30:00.000Z'),
    uuid: () => 'field-1',
  });

  assert.equal(witness.schema, FIELD_WITNESS_SCHEMA);
  assert.deepEqual(FIELD_WITNESS_CLAIM_KEYS, [
    'aggressiveRenderCompleted',
    'lowAndSlowExpressiveReachPreserved',
    'listenerDraftPreserved',
    'relistenHumanAnchorsPreserved',
  ]);
  assert.equal(witness.renderReceiptSha256, archived.receiptSha256);
  assert.equal(witness.buildHeadSha, 'a'.repeat(40));
  assert.equal(witness.laneId, 'low-and-slow');
  assert.deepEqual(witness.claims, claims);
  assert.equal(witness.passed, true);
  assert.equal(witness.note, 'Dense guitar retained internal structure.');

  const filePath = path.join(rootDir, 'Receipts', 'field-witness', 'field-1.json');
  assert.deepEqual(JSON.parse(await fs.readFile(filePath, 'utf8')), witness);

  const repeated = await appendFieldWitnessReceipt({
    rootDir,
    renderReceiptSha256: archived.receiptSha256,
    buildHeadSha: 'a'.repeat(40),
    claims,
    note: 'Dense guitar retained internal structure.',
    now: () => new Date('2026-08-18T07:30:00.000Z'),
    uuid: () => 'field-1',
  });
  assert.deepEqual(repeated, witness);
});

test('records a failed gate without rewriting the accepted render', async () => {
  const { rootDir, archived } = await acceptedRenderFixture();
  const claims = { ...passingClaims(), aggressiveRenderCompleted: false };
  const witness = await appendFieldWitnessReceipt({
    rootDir,
    renderReceiptSha256: archived.receiptSha256,
    buildHeadSha: 'b'.repeat(40),
    claims,
    uuid: () => 'field-fail',
  });
  assert.equal(witness.passed, false);
  assert.equal(witness.claims.aggressiveRenderCompleted, false);
});

test('refuses unknown renders, malformed build identity, and incomplete claims', async () => {
  const { rootDir, archived } = await acceptedRenderFixture();
  await assert.rejects(
    appendFieldWitnessReceipt({
      rootDir,
      renderReceiptSha256: 'f'.repeat(64),
      buildHeadSha: 'a'.repeat(40),
      claims: passingClaims(),
    }),
    /unknown render receipt/i,
  );
  await assert.rejects(
    appendFieldWitnessReceipt({
      rootDir,
      renderReceiptSha256: archived.receiptSha256,
      buildHeadSha: 'unknown',
      claims: passingClaims(),
    }),
    /build head/i,
  );
  const incomplete = passingClaims();
  delete incomplete.listenerDraftPreserved;
  await assert.rejects(
    appendFieldWitnessReceipt({
      rootDir,
      renderReceiptSha256: archived.receiptSha256,
      buildHeadSha: 'a'.repeat(40),
      claims: incomplete,
    }),
    /field witness claim/i,
  );
});

test('immutable witness ids refuse conflicting evidence', async () => {
  const { rootDir, archived } = await acceptedRenderFixture();
  await appendFieldWitnessReceipt({
    rootDir,
    renderReceiptSha256: archived.receiptSha256,
    buildHeadSha: 'a'.repeat(40),
    claims: passingClaims(),
    uuid: () => 'field-collision',
    now: () => new Date('2026-08-18T07:30:00.000Z'),
  });
  await assert.rejects(
    appendFieldWitnessReceipt({
      rootDir,
      renderReceiptSha256: archived.receiptSha256,
      buildHeadSha: 'a'.repeat(40),
      claims: { ...passingClaims(), relistenHumanAnchorsPreserved: false },
      uuid: () => 'field-collision',
      now: () => new Date('2026-08-18T07:30:00.000Z'),
    }),
    /immutable field witness id collision/i,
  );
});
