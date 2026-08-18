const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const helperPath = path.join(__dirname, '..', 'src', 'video-source-preload.cjs');

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

test('Video source controls install beside existing inputs with pantry default on', async () => {
  const { installVideoSourceControls } = require(helperPath);
  const dom = new JSDOM('<section class="inputs-panel"><div class="field-row" id="next"></div></section>');
  const calls = [];
  const ipcRenderer = {
    async invoke(channel, payload) {
      calls.push({ channel, payload });
      if (channel === 'video-pantry:list') return { specimens: [] };
      if (channel === 'dialog:choose-video') {
        return {
          binding: {
            filename: 'jubilee.mp4',
            persisted: payload.addToPantry,
            probe: { durationSeconds: 4, width: 1920, height: 1080 },
          },
          inserted: payload.addToPantry,
          pantryCount: payload.addToPantry ? 1 : null,
        };
      }
      if (channel === 'video:clear') return true;
      return null;
    },
  };
  installVideoSourceControls({ document: dom.window.document, ipcRenderer });
  const checkbox = dom.window.document.querySelector('#addVideoToPantry');
  assert.ok(checkbox);
  assert.equal(checkbox.checked, true);
  assert.match(dom.window.document.querySelector('#videoSourceBlock').textContent, /Video/);
  assert.match(dom.window.document.querySelector('#videoSourceBlock').textContent, /Add to VSPantry/);
  dom.window.document.querySelector('#videoDrop').click();
  await flush();
  const choose = calls.find((call) => call.channel === 'dialog:choose-video');
  assert.deepEqual(choose.payload, { addToPantry: true });
  assert.match(dom.window.document.querySelector('#videoDropTitle').textContent, /jubilee\.mp4/);
});

test('Video source checkbox permits ephemeral session-only admission', async () => {
  const { installVideoSourceControls } = require(helperPath);
  const dom = new JSDOM('<section class="inputs-panel"><div class="field-row"></div></section>');
  const calls = [];
  const ipcRenderer = {
    async invoke(channel, payload) {
      calls.push({ channel, payload });
      if (channel === 'video-pantry:list') return { specimens: [] };
      if (channel === 'dialog:choose-video') return { binding: { filename: 'one.webm', persisted: false, probe: { durationSeconds: 4, width: 1024, height: 1024 } }, inserted: false, pantryCount: null };
      return true;
    },
  };
  installVideoSourceControls({ document: dom.window.document, ipcRenderer });
  const checkbox = dom.window.document.querySelector('#addVideoToPantry');
  checkbox.checked = false;
  dom.window.document.querySelector('#videoDrop').click();
  await flush();
  const choose = calls.find((call) => call.channel === 'dialog:choose-video');
  assert.deepEqual(choose.payload, { addToPantry: false });
  assert.match(dom.window.document.querySelector('#videoDropHint').textContent, /session only/i);
});
