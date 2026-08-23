const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const candidateSessionPath = path.join(root, 'src', 'candidate-session.cjs');
const preloadPath = path.join(root, 'src', 'preload.cjs');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('candidate session stores and clears a Video source binding', () => {
  const { createCandidateSession } = require(candidateSessionPath);
  const session = createCandidateSession();
  const binding = {
    schema: 'haunted-toaster/video-source/v1',
    specimenId: `sha256:${'a'.repeat(64)}:12`,
    sourceSha256: 'a'.repeat(64),
    byteLength: 12,
    path: path.resolve('clip.mp4'),
    filename: 'clip.mp4',
    probe: { durationSeconds: 4, width: 1920, height: 1080, frameRate: '24/1', container: 'mp4', codec: 'h264', hasAudio: false },
    persisted: true,
  };
  session.noteVideo(binding);
  assert.deepEqual(session.state().video, binding);
  session.clearVideo();
  assert.equal(session.state().video, null);
});

test('Slice D crosses Video into render only as a derived foreign-material plan', () => {
  const source = read(candidateSessionPath);
  const start = source.indexOf('function executionForRender');
  const end = source.indexOf('function registerIpc', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const executionSource = source.slice(start, end);
  assert.match(executionSource, /foreignVisualMaterial:\s*createForeignMaterialPlan\(\{/);
  assert.match(executionSource, /videoBinding:\s*video \? structuredClone\(video\) : null/);
  assert.doesNotMatch(executionSource, /\n\s+video:\s/);
  assert.doesNotMatch(executionSource, /\n\s+videoPath:\s/);
});

test('canonical candidate session owns the bounded Video/VSPantry integration seam', () => {
  const source = read(candidateSessionPath);
  assert.match(source, /registerVideoPantryIpc/);
  assert.match(source, /process\.versions\?\.electron/);
  assert.match(source, /ipcMain\.handle\("candidate:stomp"/);
  assert.match(source, /createLyricTrack/);
  assert.match(source, /const openField = require\("\.\.\/constraints\/open-field\.v3\.json"\)/);
});

test('preload exposes Video and VSPantry methods without filesystem authority', () => {
  const source = read(preloadPath);
  for (const method of ['chooseVideo', 'chooseVideoFolder', 'listVideoPantry', 'clearVideo']) {
    assert.match(source, new RegExp(`${method}\\s*:`));
  }
  assert.match(source, /dialog:choose-video/);
  assert.match(source, /dialog:choose-video-folder/);
  assert.match(source, /video-pantry:list/);
  assert.match(source, /video:clear/);
});
