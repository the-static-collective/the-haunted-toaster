const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const {
  FOREIGN_MATERIAL_OPERATOR_ID,
  FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID,
  FOREIGN_MATERIAL_MOTION_OPERATOR_ID,
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
const candidateUiPath = path.join(root, "src", "renderer", "candidate-ui.js");
const videoSourceUiPath = path.join(root, "src", "renderer", "video-source-ui.js");

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

test("re-admitting the same clip with different timing or digest revokes KEEP", async () => {
  for (const changed of [
    { samplingPolicyId: "play-source-once-v1" },
    { digestOperatorId: FOREIGN_MATERIAL_MOTION_OPERATOR_ID },
  ]) {
    const session = createCandidateSession({
      async renderCandidateFamilyPreviews(_config, family) {
        return { familyHash: family.familyHash, candidates: family.candidates.map(({ index, scoreAddress, timelineHash }) => ({ index, scoreAddress, timelineHash })) };
      },
    });
    const audioPath = path.resolve("/tmp/video-phrasing.wav");
    session.noteAudio(audioPath, { duration: 3, sections: [{ start: 0, end: 3, energy: 0.5 }], energySamples: [] });
    session.noteVideo({ ...binding(), ...changed });
    const config = { presetId: "openField", toastFeelId: "low-and-slow", rootSeed: "video-re-admission", lyrics: "" };
    const view = await session.generate(config);
    session.keep({ familyHash: view.familyHash, index: 0 });
    const renderConfig = { ...config, audioPath, imagePath: null };
    assert.ok(session.executionForRender(renderConfig));
    session.noteVideo({ ...binding(), ...changed });
    assert.ok(session.executionForRender(renderConfig), "unchanged binding preserves KEEP");
    session.noteVideo(binding());
    assert.throws(() => session.executionForRender(renderConfig), { code: "CANDIDATE_RENDER_KEEP_REQUIRED" });
  }
});

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

test("Video IPC admits bounded digest roles and requires admitted Video", async () => {
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
  const motion = await setDigest({}, FOREIGN_MATERIAL_MOTION_OPERATOR_ID);
  assert.equal(motion.digestOperatorId, FOREIGN_MATERIAL_MOTION_OPERATOR_ID);

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

test("#250 digest role rides the existing Video binding through preview/final and visibly revokes stale six-up", () => {
  const candidateSource = read(candidateSessionPath);
  const previewSource = read(previewPath);
  const foreignSource = read(foreignMaterialPath);
  const ipcSource = read(electronIpcPath);
  const candidateUiSource = read(candidateUiPath);
  const videoSourceUiSource = read(videoSourceUiPath);

  assert.match(foreignSource, /videoBinding\.digestOperatorId/);
  assert.match(candidateSource, /video:\s*video \? structuredClone\(video\) : null/);
  assert.match(candidateSource, /foreignVisualMaterial:\s*createForeignMaterialPlan\(\{[\s\S]*videoBinding:\s*video \? structuredClone\(video\) : null/);
  assert.match(previewSource, /createForeignMaterialPlan\(\{[\s\S]*videoBinding:\s*config\.video \|\| null/);
  assert.match(ipcSource, /candidateSession\.clearVideo\(\)[\s\S]*candidateSession\.noteVideo\(/);
  assert.match(videoSourceUiSource, /video-digest-change/);
  assert.match(candidateUiSource, /window\.addEventListener\("video-digest-change"[\s\S]*clearUi\(\{ notifyMain: false \}\)/);
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

test("Video row reveals the three digest roles only after Video admission", async () => {
  const dom = new JSDOM(`
    <div id="videoSourceMount"></div>
    <section id="videoPantryWindow">
      <strong id="videoPantryStatus"></strong>
      <button id="videoFolderImport" type="button">Import</button>
    </section>
  `);
  const calls = [];
  const digestEvents = [];
  dom.window.addEventListener("video-digest-change", (event) => digestEvents.push(event.detail));
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
    [FOREIGN_MATERIAL_OPERATOR_ID, FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID, FOREIGN_MATERIAL_MOTION_OPERATOR_ID],
  );

  dom.window.document.querySelector("#videoDrop").click();
  await flush();
  assert.equal(selector.closest(".video-digest-control").classList.contains("is-hidden"), false);
  assert.equal(selector.value, FOREIGN_MATERIAL_OPERATOR_ID);

  selector.value = FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID;
  selector.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  await flush();
  assert.deepEqual(calls.at(-1), ["setVideoDigestOperator", FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID]);
  assert.deepEqual(digestEvents.at(-1), { operatorId: FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID });

  dom.window.document.querySelector("#removeVideo").click();
  await flush();
  assert.equal(selector.closest(".video-digest-control").classList.contains("is-hidden"), true);
  assert.equal(selector.value, FOREIGN_MATERIAL_OPERATOR_ID);
});

test("Video timing crosses real IPC, preserves the digest, and rolls back refused UI changes", async () => {
  const session = createCandidateSession();
  const ipcMain = fakeIpcMain();
  registerVideoPantryIpc({
    app: { getPath: () => "/tmp/toaster-user-data" },
    dialog: { showOpenDialog: async () => ({ canceled: true }) },
    ipcMain, candidateSession: session,
    loadCatalogImpl: async () => ({ specimens: [] }),
  });
  const setSampling = ipcMain.handlers.get("video:set-sampling-policy");
  assert.equal(typeof setSampling, "function");
  await assert.rejects(() => setSampling({}, "play-source-once-v1"), /admitted Video/i);
  const dom = new JSDOM('<div id="videoSourceMount"></div><section id="videoPantryWindow"><strong id="videoPantryStatus"></strong><button id="videoFolderImport">Import</button></section>');
  const events = [];
  dom.window.addEventListener("video-digest-change", (event) => events.push(event.detail));
  let refuse = false;
  installVideoSourceControls({ document: dom.window.document, api: {
    listVideoPantry: async () => ({ specimens: [] }),
    chooseVideo: async () => {
      session.noteVideo({ ...binding(), digestOperatorId: FOREIGN_MATERIAL_MOTION_OPERATOR_ID });
      return { binding: session.state().video };
    },
    clearVideo: () => ipcMain.handlers.get("video:clear")({}),
    setVideoSamplingPolicy: (id) => setSampling({}, refuse ? "mystery" : id),
  } });
  const selector = dom.window.document.querySelector("#videoSamplingPolicy");
  assert.ok(selector);
  assert.equal(selector.disabled, true);
  dom.window.document.querySelector("#videoDrop").click();
  await flush();
  assert.equal(selector.disabled, false);
  assert.equal(dom.window.document.querySelector("#videoDigestOperator").value, FOREIGN_MATERIAL_MOTION_OPERATOR_ID);
  selector.value = "play-source-once-v1";
  selector.dispatchEvent(new dom.window.Event("change"));
  await flush();
  assert.equal(session.state().video.samplingPolicyId, "play-source-once-v1");
  assert.equal(session.state().video.digestOperatorId, FOREIGN_MATERIAL_MOTION_OPERATOR_ID);
  assert.equal(events.length, 1, "accepted timing must invalidate displayed candidates");
  refuse = true;
  selector.value = "stretch-source-clip-v1";
  selector.dispatchEvent(new dom.window.Event("change"));
  await flush();
  assert.equal(selector.value, "play-source-once-v1");
  assert.equal(events.length, 1, "refusal must not publish an accepted timing");
  assert.equal(session.state().video.samplingPolicyId, "play-source-once-v1");
  dom.window.document.querySelector("#removeVideo").click();
  await flush();
  assert.equal(selector.disabled, true);
  assert.equal(selector.value, "loop-source-clip-v1");
  dom.window.close();
});
