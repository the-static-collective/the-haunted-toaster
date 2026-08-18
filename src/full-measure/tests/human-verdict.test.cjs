const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { archiveSuccessfulRender } = require('../src/memory/receipt-archive.cjs');
const { appendHumanVerdict, listHumanVerdicts } = require('../src/memory/human-verdict.cjs');

async function archivedFixture() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'toaster-verdict-'));
  const outputDir = path.join(rootDir, 'output');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'song.mp4');
  const receiptPath = path.join(outputDir, 'song.video-receipt.json');
  await fs.writeFile(outputPath, 'video');
  const receipt = {
    schema: 'full-measure.video-receipt.v1',
    createdAt: '2026-08-17T20:00:00.000Z',
    treatment: { title: 'Song', sections: [] },
    render: { witnessWindow: { policyVersion: 'witness-window-v1' } },
    output: { filename: 'song.mp4', sha256: 'abc', sizeBytes: 5 },
    validation: { accepted: true },
  };
  await fs.writeFile(receiptPath, JSON.stringify(receipt));
  const archived = await archiveSuccessfulRender({
    rootDir,
    renderResult: { outputPath, receiptPath, scorePath: null, timelinePath: null, srtPath: null, vttPath: null, receipt },
  });
  return { rootDir, receiptPath, archived };
}

test('changing a rating appends testimony and never edits the render receipt', async () => {
  const { rootDir, receiptPath, archived } = await archivedFixture();
  const before = await fs.readFile(receiptPath);
  const first = await appendHumanVerdict({
    rootDir,
    renderReceiptSha256: archived.receiptSha256,
    rating: 5,
    disposition: 'keep',
    wouldReToast: true,
    now: () => new Date('2026-08-17T20:10:00.000Z'),
    uuid: () => 'verdict-1',
  });
  const second = await appendHumanVerdict({
    rootDir,
    renderReceiptSha256: archived.receiptSha256,
    rating: 3,
    disposition: 'weird',
    wouldReToast: false,
    now: () => new Date('2026-08-17T20:11:00.000Z'),
    uuid: () => 'verdict-2',
  });
  assert.notEqual(first.verdictId, second.verdictId);
  const verdicts = await listHumanVerdicts({ rootDir, renderReceiptSha256: archived.receiptSha256 });
  assert.deepEqual(verdicts.map((item) => item.verdictId), ['verdict-1', 'verdict-2']);
  assert.deepEqual(await fs.readFile(receiptPath), before);
});

test('enforces rating, disposition, and known-receipt bounds', async () => {
  const { rootDir, archived } = await archivedFixture();
  for (const rating of [0, 6, 2.5]) {
    await assert.rejects(
      appendHumanVerdict({ rootDir, renderReceiptSha256: archived.receiptSha256, rating, disposition: null }),
      /integer from 1 through 5/i,
    );
  }
  await assert.rejects(
    appendHumanVerdict({ rootDir, renderReceiptSha256: archived.receiptSha256, rating: 4, disposition: 'favorite' }),
    /keep, weird, or compost/i,
  );
  await assert.rejects(
    appendHumanVerdict({ rootDir, renderReceiptSha256: 'f'.repeat(64), rating: 4, disposition: 'keep' }),
    /unknown render receipt/i,
  );
});

test('same verdict id cannot overwrite different testimony', async () => {
  const { rootDir, archived } = await archivedFixture();
  const base = {
    rootDir,
    renderReceiptSha256: archived.receiptSha256,
    rating: 4,
    disposition: 'keep',
    wouldReToast: false,
    now: () => new Date('2026-08-17T20:12:00.000Z'),
    uuid: () => 'same-id',
  };
  await appendHumanVerdict(base);
  await assert.rejects(
    appendHumanVerdict({ ...base, rating: 1 }),
    /immutable verdict id collision/i,
  );
});
