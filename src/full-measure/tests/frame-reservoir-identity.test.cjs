const test = require('node:test');
const assert = require('node:assert/strict');

const { deriveFrameReservoir } = require('../src/video-pantry/frame-reservoir.cjs');

function canonicalBinding() {
  const sourceSha256 = 'a'.repeat(64);
  return {
    schema: 'haunted-toaster/video-source/v1',
    specimenId: `sha256:${sourceSha256}:1234`,
    sourceSha256,
    byteLength: 1234,
    filename: 'clip.mp4',
    probe: {
      durationSeconds: 4,
      width: 1920,
      height: 1080,
      frameRate: '24/1',
      container: 'mov,mp4,m4a,3gp,3g2,mj2',
      codec: 'h264',
      hasAudio: false,
    },
    persisted: true,
  };
}

test('Frame Reservoir refuses a specimen identity that disagrees with admitted content identity', () => {
  const binding = canonicalBinding();
  const forged = {
    ...binding,
    specimenId: `sha256:${'b'.repeat(64)}:${binding.byteLength}`,
  };

  assert.throws(() => deriveFrameReservoir(forged), /specimen identity/i);
});
