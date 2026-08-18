const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const baseCandidateSessionPath = path.join(root, 'src', 'candidate-session.cjs');
const videoCandidateSessionPath = path.join(root, 'src', 'video-candidate-session.cjs');
const mainPath = path.join(root, 'src', 'main.cjs');
const preloadPath = path.join(root, 'src', 'preload.cjs');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('candidate session wrapper stores and clears a Video source binding', () => {
  assert.equal(fs.existsSync(videoCandidateSessionPath), true, 'video candidate-session wrapper must exist');
  const { createCandidateSession } = require(videoCandidateSessionPath);
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

test('Slice A does not put Video into base render execution authority', () => {
  const source = read(baseCandidateSessionPath);
  const start = source.indexOf('function executionForRender');
  const end = source.indexOf('function registerIpc', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const executionSource = source.slice(start, end);
  assert.doesNotMatch(executionSource, /videoBinding|videoPath|foreignVisual|specimenId/);
});

test('main process installs the bounded Video/VSPantry IPC controller', () => {
  const source = read(mainPath);
  assert.match(source, /registerVideoPantryIpc/);
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
