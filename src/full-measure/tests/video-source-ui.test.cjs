const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const uiPath = path.join(__dirname, '..', 'src', 'renderer', 'video-source-ui.js');

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

function makeDom() {
  return new JSDOM(`
    <section class="inputs-panel">
      <button class="image-drop" id="imageDrop"></button>
      <div id="videoSourceMount"></div>
      <div class="field-row" id="next"></div>
      <section id="videoPantryWindow">
        <strong id="videoPantryStatus">Reading local catalogue…</strong>
        <button id="videoFolderImport" type="button">Import video folder</button>
      </section>
    </section>
  `);
}

test('Video source mounts as one compact row with pantry default on', async () => {
  const { installVideoSourceControls } = require(uiPath);
  const dom = makeDom();
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

  assert.equal(installVideoSourceControls({ document: dom.window.document, api }), true);
  const sourceMount = dom.window.document.querySelector('#videoSourceMount');
  const checkbox = sourceMount.querySelector('#addVideoToPantry');
  assert.ok(sourceMount.querySelector('#videoDrop'));
  assert.ok(checkbox);
  assert.equal(checkbox.checked, true);
  assert.match(sourceMount.textContent, /Add one video/);
  assert.match(sourceMount.textContent, /Add to VSPantry/);
  assert.equal(sourceMount.querySelector('#videoFolderImport'), null);
  assert.ok(dom.window.document.querySelector('#videoPantryWindow #videoFolderImport'));

  sourceMount.querySelector('#videoDrop').click();
  await flush();
  const choose = calls.find((call) => call.method === 'chooseVideo');
  assert.deepEqual(choose.payload, { addToPantry: true });
  assert.match(sourceMount.querySelector('#videoDropTitle').textContent, /jubilee\.mp4/);
  assert.match(dom.window.document.querySelector('#videoPantryStatus').textContent, /1 specimen/);
});

test('Video source checkbox permits ephemeral session-only admission', async () => {
  const { installVideoSourceControls } = require(uiPath);
  const dom = makeDom();
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
  assert.match(dom.window.document.querySelector('#videoPantryStatus').textContent, /unchanged/i);
});

test('Video source install is idempotent and pantry folder action belongs to the pantry window', async () => {
  const { installVideoSourceControls } = require(uiPath);
  const dom = makeDom();
  let imports = 0;
  const api = {
    async listVideoPantry() { return { specimens: [{ specimenId: 'a' }, { specimenId: 'b' }] }; },
    async chooseVideo() { return null; },
    async chooseVideoFolder() {
      imports += 1;
      return { catalogSize: 4, admitted: 2, duplicates: 1, refused: [] };
    },
    async clearVideo() { return true; },
  };

  assert.equal(installVideoSourceControls({ document: dom.window.document, api }), true);
  assert.equal(installVideoSourceControls({ document: dom.window.document, api }), false);
  await flush();
  assert.match(dom.window.document.querySelector('#videoPantryStatus').textContent, /2 specimens/);

  dom.window.document.querySelector('#videoFolderImport').click();
  await flush();
  assert.equal(imports, 1);
  assert.match(dom.window.document.querySelector('#videoPantryStatus').textContent, /4 total/);
  assert.equal(dom.window.document.querySelectorAll('#videoDrop').length, 1);
});
