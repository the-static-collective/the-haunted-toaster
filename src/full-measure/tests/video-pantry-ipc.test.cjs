const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const controllerPath = path.join(__dirname, '..', 'src', 'video-pantry', 'electron-ipc.cjs');

function fakeIpcMain() {
  const handlers = new Map();
  return {
    handlers,
    handle(channel, handler) {
      handlers.set(channel, handler);
    },
  };
}

test('Video/VSPantry IPC binds one chosen video with explicit persistence choice', async () => {
  const { registerVideoPantryIpc } = require(controllerPath);
  const ipcMain = fakeIpcMain();
  const noted = [];
  const calls = [];
  const binding = {
    schema: 'haunted-toaster/video-source/v1',
    specimenId: `sha256:${'a'.repeat(64)}:4`,
    sourceSha256: 'a'.repeat(64),
    byteLength: 4,
    path: path.resolve('/tmp/clip.mp4'),
    filename: 'clip.mp4',
    probe: {},
    persisted: false,
  };
  registerVideoPantryIpc({
    app: { getPath: () => '/tmp/toaster-user-data' },
    dialog: { showOpenDialog: async () => ({ canceled: false, filePaths: ['/tmp/clip.mp4'] }) },
    ipcMain,
    getMainWindow: () => null,
    candidateSession: { noteVideo: (value) => noted.push(value), clearVideo() {} },
    admitVideoImpl: async (filePath, options) => {
      calls.push({ filePath, options });
      return { binding, catalog: null, inserted: false };
    },
    admitVideoFolderImpl: async () => ({}),
    loadCatalogImpl: async () => ({ schema: 'haunted-toaster/video-pantry-catalog/v1', specimens: [] }),
  });
  const handler = ipcMain.handlers.get('dialog:choose-video');
  assert.equal(typeof handler, 'function');
  const result = await handler({}, { addToPantry: false });
  assert.equal(calls[0].options.persist, false);
  assert.deepEqual(noted, [binding]);
  assert.equal(result.binding.specimenId, binding.specimenId);
  assert.equal(result.pantryCount, null);
});

test('Video/VSPantry IPC exposes folder intake, list, and session clear', async () => {
  const { registerVideoPantryIpc } = require(controllerPath);
  const ipcMain = fakeIpcMain();
  let cleared = 0;
  registerVideoPantryIpc({
    app: { getPath: () => '/tmp/toaster-user-data' },
    dialog: { showOpenDialog: async (_window, options) => ({ canceled: false, filePaths: [options.properties.includes('openDirectory') ? '/tmp/clips' : '/tmp/clip.mp4'] }) },
    ipcMain,
    getMainWindow: () => null,
    candidateSession: { noteVideo() {}, clearVideo: () => { cleared += 1; } },
    admitVideoImpl: async () => ({ binding: {}, catalog: null, inserted: false }),
    admitVideoFolderImpl: async () => ({ admitted: 3, duplicates: 1, refused: [], catalogSize: 9, specimenIds: ['a', 'b', 'c'] }),
    loadCatalogImpl: async () => ({ schema: 'haunted-toaster/video-pantry-catalog/v1', specimens: [{ specimenId: 'a' }] }),
  });
  const folder = await ipcMain.handlers.get('dialog:choose-video-folder')({});
  assert.equal(folder.admitted, 3);
  const catalog = await ipcMain.handlers.get('video-pantry:list')({});
  assert.equal(catalog.specimens.length, 1);
  assert.equal(await ipcMain.handlers.get('video:clear')({}), true);
  assert.equal(cleared, 1);
});
