const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { probeVideo } = require(path.join(__dirname, '..', 'src', 'video-pantry', 'probe.cjs'));

test('video probe resolves ffprobe through the existing packaged-safe tooling seam', async () => {
  const calls = [];
  const result = await probeVideo('/tmp/specimen.mp4', {
    resolveFfprobeImpl: () => '/app.asar.unpacked/node_modules/ffprobe-static/bin/ffprobe',
    execFileImpl(command, args, options, callback) {
      calls.push({ command, args, options });
      callback(null, JSON.stringify({
        streams: [
          {
            codec_type: 'video',
            codec_name: 'h264',
            width: 1920,
            height: 1080,
            avg_frame_rate: '24/1',
          },
        ],
        format: {
          duration: '4.0',
          format_name: 'mov,mp4,m4a,3gp,3g2,mj2',
        },
      }), '');
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, '/app.asar.unpacked/node_modules/ffprobe-static/bin/ffprobe');
  assert.ok(calls[0].args.includes('/tmp/specimen.mp4'));
  assert.equal(result.durationSeconds, 4);
  assert.equal(result.frameRate, '24/1');
});
