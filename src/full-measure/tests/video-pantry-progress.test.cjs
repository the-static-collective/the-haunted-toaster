const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const importerPath = path.join(root, 'src', 'video-pantry', 'import-folder.cjs');
const controllerPath = path.join(root, 'src', 'video-pantry', 'electron-ipc.cjs');
const preloadPath = path.join(root, 'src', 'preload.cjs');
const uiPath = path.join(root, 'src', 'renderer', 'video-source-ui.js');

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

async function tempDir() {
  return fsp.mkdtemp(path.join(os.tmpdir(), 'toaster-vspantry-progress-'));
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

function fakeIpcMain() {
  const handlers = new Map();
  return {
    handlers,
    handle(channel, handler) {
      handlers.set(channel, handler);
    },
  };
}

function makeDom() {
  return new JSDOM(`
    <section class="inputs-panel">
      <div id="videoSourceMount"></div>
      <section id="videoPantryWindow">
        <strong id="videoPantryStatus">Reading local catalogue…</strong>
        <button id="videoFolderImport" type="button">Import video folder</button>
      </section>
    </section>
  `);
}

test('folder intake emits truthful completed-count progress while processing serially', async () => {
  const { admitVideoFolder } = require(importerPath);
  const dir = await tempDir();
  const catalogFile = path.join(dir, 'catalog.json');
  await fsp.writeFile(path.join(dir, 'b.webm'), Buffer.from('bbb'));
  await fsp.writeFile(path.join(dir, 'a.mp4'), Buffer.from('aaa'));
  const progress = [];

  try {
    const result = await admitVideoFolder(dir, {
      catalogPath: catalogFile,
      probeVideoImpl: async (file) => fakeProbe(file),
      onProgress: (event) => progress.push(event),
    });

    assert.equal(result.admitted, 2);
    assert.equal(progress[0].phase, 'discovered');
    assert.deepEqual(
      { total: progress[0].total, index: progress[0].index, admitted: progress[0].admitted, duplicates: progress[0].duplicates, refused: progress[0].refused },
      { total: 2, index: 0, admitted: 0, duplicates: 0, refused: 0 },
    );

    const firstStart = progress.find((event) => event.phase === 'processing' && event.index === 1);
    assert.equal(firstStart.filename, 'a.mp4');
    assert.equal(firstStart.admitted, 0);

    const firstDone = progress.find((event) => event.phase === 'processed' && event.index === 1);
    assert.equal(firstDone.admitted, 1);
    assert.equal(firstDone.duplicates, 0);
    assert.equal(firstDone.refused, 0);

    const secondStart = progress.find((event) => event.phase === 'processing' && event.index === 2);
    assert.equal(secondStart.filename, 'b.webm');
    assert.equal(secondStart.admitted, 1);

    const terminal = progress.at(-1);
    assert.equal(terminal.phase, 'complete');
    assert.deepEqual(
      { total: terminal.total, index: terminal.index, admitted: terminal.admitted, duplicates: terminal.duplicates, refused: terminal.refused, catalogSize: terminal.catalogSize },
      { total: 2, index: 2, admitted: 2, duplicates: 0, refused: 0, catalogSize: 2 },
    );
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
});

test('folder IPC relays importer progress only to the invoking renderer', async () => {
  const { registerVideoPantryIpc } = require(controllerPath);
  const ipcMain = fakeIpcMain();
  const sent = [];

  registerVideoPantryIpc({
    app: { getPath: () => '/tmp/toaster-user-data' },
    dialog: { showOpenDialog: async () => ({ canceled: false, filePaths: ['/tmp/clips'] }) },
    ipcMain,
    getMainWindow: () => null,
    candidateSession: { noteVideo() {}, clearVideo() {} },
    admitVideoImpl: async () => ({ binding: {}, catalog: null, inserted: false }),
    admitVideoFolderImpl: async (_folderPath, options) => {
      options.onProgress({ phase: 'processing', total: 3, index: 2, filename: 'ghost.mp4', admitted: 1, duplicates: 0, refused: 0 });
      return { admitted: 2, duplicates: 0, refused: [], catalogSize: 2, specimenIds: ['a', 'b'] };
    },
    loadCatalogImpl: async () => ({ schema: 'haunted-toaster/video-pantry-catalog/v1', specimens: [] }),
  });

  const result = await ipcMain.handlers.get('dialog:choose-video-folder')({
    sender: { send: (channel, payload) => sent.push({ channel, payload }) },
  });

  assert.equal(result.admitted, 2);
  assert.deepEqual(sent, [{
    channel: 'video-pantry:import-progress',
    payload: { phase: 'processing', total: 3, index: 2, filename: 'ghost.mp4', admitted: 1, duplicates: 0, refused: 0 },
  }]);
});

test('preload exposes a bounded VSPantry import-progress subscription', () => {
  const source = fs.readFileSync(preloadPath, 'utf8');
  assert.match(source, /onVideoPantryImportProgress\s*:/);
  assert.match(source, /subscribe\("video-pantry:import-progress"/);
});

test('VSPantry UI shows live progress and keeps the import action busy until terminal truth arrives', async () => {
  const { installVideoSourceControls } = require(uiPath);
  const dom = makeDom();
  let progressHandler = null;
  let resolveImport = null;
  const api = {
    async listVideoPantry() { return { specimens: [] }; },
    async chooseVideo() { return null; },
    chooseVideoFolder() {
      return new Promise((resolve) => { resolveImport = resolve; });
    },
    async clearVideo() { return true; },
    onVideoPantryImportProgress(callback) {
      progressHandler = callback;
      return () => { progressHandler = null; };
    },
  };

  assert.equal(installVideoSourceControls({ document: dom.window.document, api }), true);
  await flush();
  assert.equal(typeof progressHandler, 'function');

  const button = dom.window.document.querySelector('#videoFolderImport');
  const status = dom.window.document.querySelector('#videoPantryStatus');
  const pantry = dom.window.document.querySelector('#videoPantryWindow');
  button.click();
  await flush();

  assert.equal(button.disabled, true);
  assert.equal(button.getAttribute('aria-busy'), 'true');
  assert.equal(pantry.dataset.pantryState, 'importing');

  progressHandler({ phase: 'processing', total: 123, index: 37, filename: 'video-1787036262252.mp4', admitted: 36, duplicates: 1, refused: 0 });
  assert.match(status.textContent, /Importing VSPantry/);
  assert.match(status.textContent, /37 \/ 123/);
  assert.match(status.textContent, /video-1787036262252\.mp4/);
  assert.match(status.textContent, /36 admitted/);
  assert.match(status.textContent, /1 duplicate/);
  assert.match(status.textContent, /0 refused/);

  resolveImport({ catalogSize: 123, admitted: 122, duplicates: 1, refused: [] });
  await flush();
  assert.equal(button.disabled, false);
  assert.equal(button.getAttribute('aria-busy'), null);
  assert.match(status.textContent, /123 total/);
  assert.match(status.textContent, /122 admitted/);
  assert.match(status.textContent, /1 duplicate/);
});
