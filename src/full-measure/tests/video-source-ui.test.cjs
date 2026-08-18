const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const uiPath = path.join(__dirname, '..', 'src', 'renderer', 'video-source-ui.js');

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

test('Video source controls install beside existing inputs with pantry default on', async () => {
  const { installVideoSourceControls } = require(uiPath);
  const dom = new JSDOM('<section class="inputs-panel"><div class="field-row" id="next"></div></section>');
  const calls = [];
  const api = {
    async listVideoPantry() { calls.push({ method: 'listVideoPantry' }); return { specimens: [] }; },
    async chooseVideo(payload) {
      calls.push({ method: 'chooseVideo', payload });
      return {
        binding: {
          filename: 'jubilee.mp4',
          persisted: payload.addToPantry,
          probe: { durationSeconds: 4, width: 1920, height: 1080 },
        },
        inserted: payload.addToPantry,
        pantryCount: payload.addToPantry ? 1 : null,
      };
    },
    async chooseVideoFolder() { return null; },
    async clearVideo() { return true; },
  };
  installVideoSourceControls({ document: dom.window.document, api });
  const checkbox = dom.window.document.querySelector('#addVideoToPantry');
  assert.ok(checkbox);
  assert.equal(checkbox.checked, true);
  assert.match(dom.window.document.querySelector('#videoSourceBlock').textContent, /Video/);
  assert.match(dom.window.document.querySelector('#videoSourceBlock').textContent, /Add to VSPantry/);
  dom.window.document.querySelector('#videoDrop').click();
  await flush();
  const choose = calls.find((call) => call.method === 'chooseVideo');
  assert.deepEqual(choose.payload, { addToPantry: true });
  assert.match(dom.window.document.querySelector('#videoDropTitle').textContent, /jubilee\.mp4/);
});

test('Video source checkbox permits ephemeral session-only admission', async () => {
  const { installVideoSourceControls } = require(uiPath);
  const dom = new JSDOM('<section class="inputs-panel"><div class="field-row"></div></section>');
  const calls = [];
  const api = {
    async listVideoPantry() { return { specimens: [] }; },
    async chooseVideo(payload) {
      calls.push({ method: 'chooseVideo', payload });
      return { binding: { filename: 'one.webm', persisted: false, probe: { durationSeconds: 4, width: 1024, height: 1024 } }, inserted: false, pantryCount: null };
    },
    async chooseVideoFolder() { return null; },
    async clearVideo() { return true; },
  };
  installVideoSourceControls({ document: dom.window.document, api });
  const checkbox = dom.window.document.querySelector('#addVideoToPantry');
  checkbox.checked = false;
  dom.window.document.querySelector('#videoDrop').click();
  await flush();
  const choose = calls.find((call) => call.method === 'chooseVideo');
  assert.deepEqual(choose.payload, { addToPantry: false });
  assert.match(dom.window.document.querySelector('#videoDropHint').textContent, /session only/i);
});
