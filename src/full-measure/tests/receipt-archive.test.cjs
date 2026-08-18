const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  archiveSuccessfulRender,
  listArchivedRenders,
  readArchivedRender,
  resolveArchivedArtifact,
} = require('../src/memory/receipt-archive.cjs');

async function fixture() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'toaster-memory-'));
  const outputDir = path.join(rootDir, 'output');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'song.mp4');
  const receiptPath = path.join(outputDir, 'song.video-receipt.json');
  const scorePath = path.join(outputDir, 'song.score.json');
  const timelinePath = path.join(outputDir, 'song.timeline.json');
  const srtPath = path.join(outputDir, 'song.en.srt');
  await fs.writeFile(outputPath, 'video');
  await fs.writeFile(scorePath, JSON.stringify({ schema: 'haunted-toaster/visual-score/v1', seed: 'x' }));
  await fs.writeFile(timelinePath, JSON.stringify({ schema: 'haunted-toaster/resolved-timeline/v1' }));
  await fs.writeFile(srtPath, '1\n00:00:00,000 --> 00:00:01,000\nhello\n');
  const receipt = {
    schema: 'full-measure.video-receipt.v1',
    createdAt: '2026-08-17T20:00:00.000Z',
    canonicalExecution: { scoreSidecar: 'song.score.json', timelineSidecar: 'song.timeline.json' },
    treatment: { title: 'Song', artist: 'Static', garment: { id: 'openField' }, toastFeel: { id: 'wire-heat' }, sections: [] },
    render: { witnessWindow: { policyVersion: 'witness-window-v1' }, visualCompiler: {} },
    output: { filename: 'song.mp4', sha256: 'abc', sizeBytes: 5 },
    validation: { accepted: true },
  };
  const receiptBytes = JSON.stringify(receipt);
  await fs.writeFile(receiptPath, receiptBytes);
  return { rootDir, outputPath, receiptPath, scorePath, timelinePath, srtPath, receipt, receiptBytes };
}

test('archives identical successful render receipt idempotently and preserves evidence sidecars', async () => {
  const f = await fixture();
  const renderResult = { ...f, vttPath: null };
  const first = await archiveSuccessfulRender({ rootDir: f.rootDir, renderResult });
  const second = await archiveSuccessfulRender({ rootDir: f.rootDir, renderResult });
  assert.equal(first.receiptSha256, second.receiptSha256);
  assert.deepEqual(await listArchivedRenders({ rootDir: f.rootDir }), [first]);
  assert.equal(await fs.readFile(first.artifacts.receipt.path, 'utf8'), f.receiptBytes);
  assert.equal(first.availability.video, true);
  assert.equal(first.availability.score, true);
  assert.equal(first.availability.timeline, true);
  assert.equal(first.availability.srt, true);
});

test('missing original video preserves historical toast metadata', async () => {
  const f = await fixture();
  const archived = await archiveSuccessfulRender({ rootDir: f.rootDir, renderResult: { ...f, vttPath: null } });
  await fs.unlink(f.outputPath);
  const reread = await readArchivedRender({ rootDir: f.rootDir, receiptSha256: archived.receiptSha256 });
  assert.equal(reread.title, 'Song');
  assert.equal(reread.availability.video, false);
  assert.equal((await resolveArchivedArtifact({ rootDir: f.rootDir, receiptSha256: archived.receiptSha256, kind: 'receipt' })).exists, true);
  assert.equal((await resolveArchivedArtifact({ rootDir: f.rootDir, receiptSha256: archived.receiptSha256, kind: 'video' })).exists, false);
});

test('refuses non-accepted receipts and reports corrupt archive entries', async () => {
  const f = await fixture();
  f.receipt.validation.accepted = false;
  await fs.writeFile(f.receiptPath, JSON.stringify(f.receipt));
  await assert.rejects(
    archiveSuccessfulRender({ rootDir: f.rootDir, renderResult: { ...f, vttPath: null } }),
    /accepted successful render receipt/i,
  );
});
