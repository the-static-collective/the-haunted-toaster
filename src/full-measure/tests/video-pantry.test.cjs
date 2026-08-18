const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..', 'src');
const schemaPath = path.join(ROOT, 'video-pantry', 'schema.cjs');
const catalogPath = path.join(ROOT, 'video-pantry', 'catalog.cjs');
const admitPath = path.join(ROOT, 'video-pantry', 'admit.cjs');
const folderPath = path.join(ROOT, 'video-pantry', 'import-folder.cjs');
const frameReservoirPath = path.join(ROOT, 'video-pantry', 'frame-reservoir.cjs');

function requireFeature(filePath, label) {
  assert.equal(fs.existsSync(filePath), true, `${label} module must exist`);
  delete require.cache[require.resolve(filePath)];
  return require(filePath);
}

async function tempDir() {
  return fsp.mkdtemp(path.join(os.tmpdir(), 'toaster-vspantry-'));
}

function sha(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function fakeProbe(name = 'clip.mp4') {
  return {
    durationSeconds: 4,
    width: 1920,
    height: 1080,
    frameRate: '24/1',
    container: name.endsWith('.webm') ? 'matroska,webm' : 'mov,mp4,m4a,3gp,3g2,mj2',
    codec: name.endsWith('.webm') ? 'vp9' : 'h264',
    hasAudio: false,
  };
}

function fakeVideoBinding() {
  const sourceSha256 = 'a'.repeat(64);
  return {
    schema: 'haunted-toaster/video-source/v1',
    specimenId: `sha256:${sourceSha256}:1234`,
    sourceSha256,
    byteLength: 1234,
    filename: 'clip.mp4',
    probe: fakeProbe(),
    persisted: true,
  };
}

test('VSPantry content identity normalizes SHA and includes byte length', () => {
  const { canonicalSpecimenId } = requireFeature(schemaPath, 'schema');
  const hash = 'A'.repeat(64);
  assert.equal(canonicalSpecimenId({ sha256: hash, byteLength: 12 }), `sha256:${'a'.repeat(64)}:12`);
  assert.throws(() => canonicalSpecimenId({ sha256: 'bad', byteLength: 12 }), /SHA-256/i);
  assert.throws(() => canonicalSpecimenId({ sha256: 'a'.repeat(64), byteLength: -1 }), /byte length/i);
});

test('catalogue dedupes by specimen identity and canonicalizes order', async () => {
  const { canonicalSpecimenId } = requireFeature(schemaPath, 'schema');
  const { emptyCatalog, upsertSpecimen, canonicalizeCatalog } = requireFeature(catalogPath, 'catalog');
  const one = { specimenId: canonicalSpecimenId({ sha256: '1'.repeat(64), byteLength: 1 }), sourceSha256: '1'.repeat(64), byteLength: 1, paths: ['z.mp4'] };
  const two = { specimenId: canonicalSpecimenId({ sha256: '0'.repeat(64), byteLength: 2 }), sourceSha256: '0'.repeat(64), byteLength: 2, paths: ['a.mp4'] };
  let catalog = emptyCatalog();
  ({ catalog } = upsertSpecimen(catalog, one));
  ({ catalog } = upsertSpecimen(catalog, two));
  const duplicate = upsertSpecimen(catalog, { ...one, paths: ['other.mp4'] });
  assert.equal(duplicate.inserted, false);
  const normalized = canonicalizeCatalog(duplicate.catalog);
  assert.deepEqual(normalized.specimens.map((item) => item.specimenId), [two.specimenId, one.specimenId]);
  assert.deepEqual(normalized.specimens[1].paths, ['other.mp4', 'z.mp4']);
});

test('missing catalogue loads empty and save/load round-trips canonically', async () => {
  const { emptyCatalog, loadCatalog, saveCatalog } = requireFeature(catalogPath, 'catalog');
  const dir = await tempDir();
  const file = path.join(dir, 'catalog.json');
  assert.deepEqual(await loadCatalog(file), emptyCatalog());
  const saved = await saveCatalog(file, { schema: 'haunted-toaster/video-pantry-catalog/v1', specimens: [] });
  assert.deepEqual(await loadCatalog(file), saved);
});

test('admission persists supported video and identical bytes remain one specimen', async () => {
  const { admitVideo } = requireFeature(admitPath, 'admission');
  const { loadCatalog } = requireFeature(catalogPath, 'catalog');
  const dir = await tempDir();
  const catalogFile = path.join(dir, 'catalog.json');
  const first = path.join(dir, 'one.mp4');
  const second = path.join(dir, 'renamed.mp4');
  const bytes = Buffer.from('same-video-bytes');
  await fsp.writeFile(first, bytes);
  await fsp.writeFile(second, bytes);
  const probeVideoImpl = async (file) => fakeProbe(file);
  const a = await admitVideo(first, { catalogPath: catalogFile, probeVideoImpl });
  const b = await admitVideo(second, { catalogPath: catalogFile, probeVideoImpl });
  assert.equal(a.inserted, true);
  assert.equal(b.inserted, false);
  assert.equal(a.binding.specimenId, b.binding.specimenId);
  assert.equal(a.binding.sourceSha256, sha(bytes));
  const catalog = await loadCatalog(catalogFile);
  assert.equal(catalog.specimens.length, 1);
  assert.deepEqual(catalog.specimens[0].paths, [path.resolve(first), path.resolve(second)].sort());
});

test('ephemeral admission does not create a pantry catalogue', async () => {
  const { admitVideo } = requireFeature(admitPath, 'admission');
  const dir = await tempDir();
  const catalogFile = path.join(dir, 'catalog.json');
  const clip = path.join(dir, 'ephemeral.webm');
  await fsp.writeFile(clip, Buffer.from('ephemeral'));
  const result = await admitVideo(clip, { catalogPath: catalogFile, persist: false, probeVideoImpl: async (file) => fakeProbe(file) });
  assert.equal(result.binding.persisted, false);
  assert.equal(fs.existsSync(catalogFile), false);
});

test('unsupported video extension refuses before pantry mutation', async () => {
  const { admitVideo } = requireFeature(admitPath, 'admission');
  const dir = await tempDir();
  const catalogFile = path.join(dir, 'catalog.json');
  const clip = path.join(dir, 'clip.mov');
  await fsp.writeFile(clip, Buffer.from('nope'));
  await assert.rejects(() => admitVideo(clip, { catalogPath: catalogFile, probeVideoImpl: async () => fakeProbe('clip.mov') }), /MP4|WebM/i);
  assert.equal(fs.existsSync(catalogFile), false);
});

test('folder intake is flat, bounded, deduped, and canonical by identity', async () => {
  const { admitVideoFolder } = requireFeature(folderPath, 'folder intake');
  const dir = await tempDir();
  const catalogFile = path.join(dir, 'catalog.json');
  await fsp.writeFile(path.join(dir, 'b.mp4'), Buffer.from('bbb'));
  await fsp.writeFile(path.join(dir, 'a.webm'), Buffer.from('aaa'));
  await fsp.writeFile(path.join(dir, 'duplicate.mp4'), Buffer.from('aaa'));
  await fsp.writeFile(path.join(dir, 'notes.txt'), Buffer.from('ignore'));
  const nested = path.join(dir, 'nested');
  await fsp.mkdir(nested);
  await fsp.writeFile(path.join(nested, 'hidden.mp4'), Buffer.from('hidden'));
  const result = await admitVideoFolder(dir, { catalogPath: catalogFile, probeVideoImpl: async (file) => fakeProbe(file) });
  assert.equal(result.admitted, 2);
  assert.equal(result.duplicates, 1);
  assert.equal(result.refused.length, 0);
  assert.equal(result.catalogSize, 2);
  assert.deepEqual([...result.specimenIds].sort(), result.specimenIds);
});

test('folder intake reports one bad specimen without aborting good admissions', async () => {
  const { admitVideoFolder } = requireFeature(folderPath, 'folder intake');
  const dir = await tempDir();
  const catalogFile = path.join(dir, 'catalog.json');
  await fsp.writeFile(path.join(dir, 'good.mp4'), Buffer.from('good'));
  await fsp.writeFile(path.join(dir, 'bad.webm'), Buffer.from('bad'));
  const result = await admitVideoFolder(dir, {
    catalogPath: catalogFile,
    probeVideoImpl: async (file) => {
      if (path.basename(file) === 'bad.webm') throw new Error('bad probe');
      return fakeProbe(file);
    },
  });
  assert.equal(result.admitted, 1);
  assert.equal(result.refused.length, 1);
  assert.match(result.refused[0].error, /bad probe/);
});

test('Frame Reservoir exposes every source frame as an addressable latent still without materializing image bytes', () => {
  const { deriveFrameReservoir, addressFrame } = requireFeature(frameReservoirPath, 'Frame Reservoir');
  const binding = fakeVideoBinding();
  const reservoir = deriveFrameReservoir(binding, { representativeCount: 9 });

  assert.equal(reservoir.schema, 'haunted-toaster/frame-reservoir/v1');
  assert.equal(reservoir.policyVersion, 'frame-reservoir-v1');
  assert.equal(reservoir.specimenId, binding.specimenId);
  assert.equal(reservoir.frameCount, 96);
  assert.equal(reservoir.frameRate, '24/1');
  assert.equal(reservoir.representativeFrames.length, 9);
  assert.deepEqual(reservoir.representativeFrames.map((frame) => frame.ordinal), [0, 11, 23, 35, 47, 59, 71, 83, 95]);
  assert.deepEqual(addressFrame(binding, 95), {
    frameId: `${binding.specimenId}#frame:95`,
    ordinal: 95,
    atMillis: 3958,
  });
  assert.throws(() => addressFrame(binding, 96), /frame ordinal/i);
});

test('Frame Reservoir publishes transformation affordances without claiming renderer execution', () => {
  const { FRAME_MOTION_AFFORDANCES, deriveFrameReservoir } = requireFeature(frameReservoirPath, 'Frame Reservoir');
  const reservoir = deriveFrameReservoir(fakeVideoBinding());
  const ids = FRAME_MOTION_AFFORDANCES.map((item) => item.id);

  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, [
    'ken-burns-punch-v1',
    'ken-burns-traverse-v1',
    'mirror-x-v1',
    'mirror-y-v1',
    'rotate-quarter-v1',
    'rotate-half-v1',
    'quadrant-mirror-v1',
    'nested-crop-v1',
    'tunnel-fold-v1',
    'radial-echo-v1',
  ]);
  assert.equal(reservoir.affordanceVocabularyVersion, 'frame-motion-affordances-v1');
  assert.deepEqual(reservoir.affordanceIds, ids);
  assert.equal(Object.hasOwn(reservoir, 'renderPlan'), false);
  assert.equal(Object.hasOwn(reservoir, 'timeline'), false);
});

test('Frame Motion seed is stable by addressed still plus affordance and changes when either changes', () => {
  const { addressFrame, deriveFrameMotionSeed } = requireFeature(frameReservoirPath, 'Frame Reservoir');
  const binding = fakeVideoBinding();
  const frame0 = addressFrame(binding, 0);
  const frame1 = addressFrame(binding, 1);
  const a = deriveFrameMotionSeed({ frameId: frame0.frameId, affordanceId: 'mirror-x-v1' });
  const b = deriveFrameMotionSeed({ frameId: frame0.frameId, affordanceId: 'mirror-x-v1' });
  const c = deriveFrameMotionSeed({ frameId: frame1.frameId, affordanceId: 'mirror-x-v1' });
  const d = deriveFrameMotionSeed({ frameId: frame0.frameId, affordanceId: 'rotate-quarter-v1' });

  assert.match(a, /^[0-9a-f]{64}$/);
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.notEqual(a, d);
  assert.throws(() => deriveFrameMotionSeed({ frameId: frame0.frameId, affordanceId: 'unknown-v1' }), /affordance/i);
});

test('Frame Reservoir refuses malformed or non-video bindings instead of inventing frame geometry', () => {
  const { deriveFrameReservoir } = requireFeature(frameReservoirPath, 'Frame Reservoir');
  const missingProbe = { ...fakeVideoBinding() };
  delete missingProbe.probe;
  assert.throws(() => deriveFrameReservoir(missingProbe), /probe/i);
  assert.throws(() => deriveFrameReservoir({ ...fakeVideoBinding(), schema: 'something-else' }), /video source/i);
  assert.throws(() => deriveFrameReservoir({ ...fakeVideoBinding(), probe: { ...fakeProbe(), frameRate: '0/1' } }), /frame rate/i);
});
