const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const {
  FOREIGN_MATERIAL_OPERATOR_ID,
  FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID,
  createForeignMaterialPlan,
} = require("../src/render/foreign-material.cjs");
const { createCandidateSession } = require("../src/candidate-session.cjs");
const { registerVideoPantryIpc } = require("../src/video-pantry/electron-ipc.cjs");
const { installVideoSourceControls } = require("../src/renderer/video-source-ui.js");

const root = path.join(__dirname, "..");
const candidateSessionPath = path.join(root, "src", "candidate-session.cjs");
const previewPath = path.join(root, "src", "render", "candidate-preview.cjs");
const foreignMaterialPath = path.join(root, "src", "render", "foreign-material.cjs");
const electronIpcPath = path.join(root, "src", "video-pantry", "electron-ipc.cjs");
const preloadPath = path.join(root, "src", "preload.cjs");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function binding() {
  return {
    schema: "haunted-toaster/video-source/v1",
    specimenId: `sha256:${"c".repeat(64)}:1024`,
    sourceSha256: "c".repeat(64),
    byteLength: 1024,
    path: path.resolve("digest-witness.mp4"),
    filename: "digest-witness.mp4",
    probe: {
      durationSeconds: 2,
      width: 640,
      height: 360,
      frameRate: "30/1",
      frameCount: 60,
    },
    persisted: false,
  };
}

function timeline() {
  return {
    durationTicks: 2000,
    timebase: 1000,
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

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

test("#250 human bridge defaults admitted Video to the exact legacy texture digest", () => {
  const session = createCandidateSession();
  session.noteVideo(binding());
  const plan = createForeignMaterialPlan({
    videoBinding: session.state().video,
    timeline: timeline(),
    analysisDurationSeconds: 2,
  });
  assert.equal(plan.assimilationPolicy.operatorId, FOREIGN_MATERIAL_OPERATOR_ID);
});

test("#250 Video IPC admits only the two bounded digest roles and requires admitted Video", async () => {
  const session = createCandidateSession();
  const ipcMain = fakeIpcMain();
  registerVideoPantryIpc({
    app: { getPath: () => "/tmp/toaster-user-data" },
    dialog: { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) },
    ipcMain,
    candidateSession: session,
    admitVideoImpl: async () => ({ binding: binding(), catalog: null, inserted: false }),
    admitVideoFolderImpl: async () => ({}),
    loadCatalogImpl: async () => ({ schema: "haunted-toaster/video-pantry-catalog/v1", specimens: [] }),
  });

  session.noteVideo(binding());
  const setDigest = ipcMain.handlers.get("video:set-digest-operator");
  assert.equal(typeof setDigest, "function");
  const selected = await setDigest({}, FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID);
  assert.equal(selected.digestOperatorId, FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID);
  assert.equal(session.state().video.digestOperatorId, FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID);

  await assert.rejects(
    () => setDigest({}, "clip-mystery-v99"),
    /Unsupported foreign-material digest operator/,
  );

  await ipcMain.handlers.get("video:clear")({});
  assert.equal(session.state().video, null);
  await assert.rejects(
    () => setDigest({}, FOREIGN_MATERIAL_OPERATOR_ID),
    /admitted Video/i,
  );
});

test("#250 digest role rides the existing Video binding through preview and final render", () => {
  const candidateSource = read(candidateSessionPath);
  const previewSource = read(previewPath);
  const foreignSource = read(foreignMaterialPath);
  const ipcSource = read(electronIpcPath);

  assert.match(foreignSource, /videoBinding\.digestOperatorId/);
  assert.match(candidateSource, /video:\s*video \? structuredClone\(video\) : null/);
  assert.match(candidateSource, /foreignVisualMaterial:\s*createForeignMaterialPlan\(\{[\s\S]*videoBinding:\s*video \? structuredClone\(video\) : null/);
  assert.match(previewSource, /createForeignMaterialPlan\(\{[\s\S]*videoBinding:\s*config\.video \|\| null/);
  assert.match(ipcSource, /candidateSession\.clearVideo\(\)[\s\S]*candidateSession\.noteVideo\(/);
  assert.doesNotMatch(candidateSource, /let videoDigestOperatorId/);
});

test("#250 digest mode is a narrow sandbox Video IPC operation rather than renderer authority", () => {
  const preloadSource = read(preloadPath);
  assert.match(
    preloadSource,
    /setVideoDigestOperator:\s*\(operatorId\)\s*=>\s*ipcRenderer\.invoke\("video:set-digest-operator", operatorId\)/,
  );
  assert.doesNotMatch(preloadSource, /foreignMaterialPlan/);
});

test("#250 Video row reveals exactly two digest choices only after Video admission", async () => {
  const dom = new JSDOM(`
    <div id="videoSourceMount"></div>
    <section id="videoPantryWindow">
      <strong id="videoPantryStatus"></strong>
      <button id="videoFolderImport" type="button">Import</button>
    </section>
  `);
  const calls = [];
  const api = {
    async listVideoPantry() { return { specimens: [] }; },
    async chooseVideo() { return { binding: binding(), pantryCount: null }; },
    async chooseVideoFolder() { return null; },
    async clearVideo() { calls.push(["clearVideo"]); return true; },
    async setVideoDigestOperator(operatorId) {
      calls.push(["setVideoDigestOperator", operatorId]);
      return { ...binding(), digestOperatorId: operatorId };
    },
  };

  installVideoSourceControls({ document: dom.window.document, api });
  const selector = dom.window.document.querySelector("#videoDigestOperator");
  assert.ok(selector);
  assert.equal(selector.closest(".video-digest-control").classList.contains("is-hidden"), true);
  assert.deepEqual(
    [...selector.options].map((option) => option.value),
    [FOREIGN_MATERIAL_OPERATOR_ID, FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID],
  );

  dom.window.document.querySelector("#videoDrop").click();
  await flush();
  assert.equal(selector.closest(".video-digest-control").classList.contains("is-hidden"), false);
  assert.equal(selector.value, FOREIGN_MATERIAL_OPERATOR_ID);

  selector.value = FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID;
  selector.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  await flush();
  assert.deepEqual(calls.at(-1), ["setVideoDigestOperator", FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID]);

  dom.window.document.querySelector("#removeVideo").click();
  await flush();
  assert.equal(selector.closest(".video-digest-control").classList.contains("is-hidden"), true);
  assert.equal(selector.value, FOREIGN_MATERIAL_OPERATOR_ID);
});
