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

test("re-admitting the same clip with legacy timing or digest preserves kept phrase authority", async () => {
  for (const changed of [
    { samplingPolicyId: "play-source-once-v1" },
    { digestOperatorId: FOREIGN_MATERIAL_MOTION_OPERATOR_ID },
  ]) {
    const session = createCandidateSession({
      async renderCandidateFamilyPreviews(_config, family) {
        return {
          familyHash: family.familyHash,
          candidates: family.candidates.map(({ index, scoreAddress, timelineHash }) => ({
            index,
            scoreAddress,
            timelineHash,
          })),
        };
      },
    });
    const audioPath = path.resolve("/tmp/video-phrasing.wav");
    session.noteAudio(audioPath, {
      duration: 3,
      sections: [{ start: 0, end: 3, energy: 0.5 }],
      energySamples: [],
    });
    session.noteVideo(binding());
    const config = {
      presetId: "openField",
      toastFeelId: "low-and-slow",
      rootSeed: "video-re-admission",
      lyrics: "",
    };
    const view = await session.generate(config);
    const kept = session.keep({ familyHash: view.familyHash, index: 0 });
    const renderConfig = { ...config, audioPath, imagePath: null };
    const before = session.executionForRender(renderConfig);
    assert.ok(kept.videoPhrasePlanHash);
    assert.equal(before.foreignVisualMaterial.videoPhrasePlanHash, kept.videoPhrasePlanHash);

    session.noteVideo({ ...binding(), ...changed });
    const after = session.executionForRender(renderConfig);
    assert.equal(
      after.foreignVisualMaterial.videoPhrasePlanHash,
      kept.videoPhrasePlanHash,
      "legacy knob changes on identical admitted bytes cannot rewrite kept phrase authority",
    );
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

test("#250 legacy machinery remains ancestry while phrase plans own preview and final authority", () => {
  const candidateSource = read(candidateSessionPath);
  const previewSource = read(previewPath);
  const foreignSource = read(foreignMaterialPath);
  const ipcSource = read(electronIpcPath);
  const preloadSource = read(preloadPath);
  const videoSourceUiSource = read(videoSourceUiPath);

  assert.match(foreignSource, /videoBinding\.digestOperatorId/);
  assert.match(candidateSource, /createForeignMaterialPhrasePlan\(\{[\s\S]*videoPhrasePlan:\s*keptSelection\.videoPhrasePlan/);
  assert.match(previewSource, /createForeignMaterialPhrasePlan\(\{[\s\S]*videoPhrasePlan:\s*candidate\.videoPhrasePlan/);
  assert.match(candidateSource, /createForeignMaterialPlan\(\{/);
  assert.match(previewSource, /createForeignMaterialPlan\(\{/);
  assert.match(ipcSource, /ipcMain\.handle\("video:set-digest-operator"/);
  assert.match(ipcSource, /ipcMain\.handle\("video:set-sampling-policy"/);
  assert.doesNotMatch(preloadSource, /setVideoDigestOperator\s*:/);
  assert.doesNotMatch(preloadSource, /setVideoSamplingPolicy\s*:/);
  assert.doesNotMatch(videoSourceUiSource, /video-digest-change/);
  assert.doesNotMatch(videoSourceUiSource, /id="videoDigestOperator"/);
  assert.doesNotMatch(videoSourceUiSource, /id="videoSamplingPolicy"/);
  assert.doesNotMatch(candidateSource, /let videoDigestOperatorId/);
});

test("#250 digest and timing IPC remain internal ancestry below ordinary preload authority", () => {
  const ipcSource = read(electronIpcPath);
  const preloadSource = read(preloadPath);

  assert.match(ipcSource, /"video:set-digest-operator"/);
  assert.match(ipcSource, /normalizeDigestOperatorId/);
  assert.match(ipcSource, /"video:set-sampling-policy"/);
  assert.match(ipcSource, /normalizeSamplingPolicyId/);
  assert.doesNotMatch(preloadSource, /setVideoDigestOperator\s*:/);
  assert.doesNotMatch(preloadSource, /setVideoSamplingPolicy\s*:/);
  assert.doesNotMatch(preloadSource, /foreignMaterialPlan/);
});

test("ordinary Video row stays admission-only when admitted material carries legacy digest metadata", async () => {
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
    async chooseVideo() {
      return {
        binding: { ...binding(), digestOperatorId: FOREIGN_MATERIAL_MOTION_OPERATOR_ID },
        pantryCount: null,
      };
    },
    async chooseVideoFolder() { return null; },
    async clearVideo() { calls.push(["clearVideo"]); return true; },
    async setVideoDigestOperator(operatorId) {
      calls.push(["setVideoDigestOperator", operatorId]);
      return { ...binding(), digestOperatorId: operatorId };
    },
  };

  installVideoSourceControls({ document: dom.window.document, api });
  assert.equal(dom.window.document.querySelector("#videoDigestOperator"), null);
  assert.equal(dom.window.document.querySelector("#videoSamplingPolicy"), null);

  dom.window.document.querySelector("#videoDrop").click();
  await flush();
  assert.equal(dom.window.document.querySelector("#videoDropTitle").textContent, "digest-witness.mp4");
  assert.equal(calls.some(([name]) => name === "setVideoDigestOperator"), false);

  dom.window.document.querySelector("#removeVideo").click();
  await flush();
  assert.deepEqual(calls.at(-1), ["clearVideo"]);
  dom.window.close();
});

test("legacy timing IPC remains bounded ancestry after ordinary UI timing authority is removed", async () => {
  const session = createCandidateSession();
  const ipcMain = fakeIpcMain();
  registerVideoPantryIpc({
    app: { getPath: () => "/tmp/toaster-user-data" },
    dialog: { showOpenDialog: async () => ({ canceled: true }) },
    ipcMain,
    candidateSession: session,
    loadCatalogImpl: async () => ({ specimens: [] }),
  });

  const setSampling = ipcMain.handlers.get("video:set-sampling-policy");
  assert.equal(typeof setSampling, "function");
  await assert.rejects(() => setSampling({}, "play-source-once-v1"), /admitted Video/i);

  session.noteVideo({ ...binding(), digestOperatorId: FOREIGN_MATERIAL_MOTION_OPERATOR_ID });
  const selected = await setSampling({}, "play-source-once-v1");
  assert.equal(selected.samplingPolicyId, "play-source-once-v1");
  assert.equal(selected.digestOperatorId, FOREIGN_MATERIAL_MOTION_OPERATOR_ID);
  assert.equal(session.state().video.samplingPolicyId, "play-source-once-v1");
  assert.equal(session.state().video.digestOperatorId, FOREIGN_MATERIAL_MOTION_OPERATOR_ID);
  await assert.rejects(() => setSampling({}, "mystery"), /Unsupported foreign-material sampling policy/);

  const dom = new JSDOM('<div id="videoSourceMount"></div><section id="videoPantryWindow"><strong id="videoPantryStatus"></strong><button id="videoFolderImport">Import</button></section>');
  installVideoSourceControls({ document: dom.window.document, api: {
    listVideoPantry: async () => ({ specimens: [] }),
    chooseVideo: async () => ({ binding: session.state().video }),
    clearVideo: () => ipcMain.handlers.get("video:clear")({}),
  } });
  assert.equal(dom.window.document.querySelector("#videoSamplingPolicy"), null);
  assert.equal(dom.window.document.querySelector("#videoDigestOperator"), null);
  dom.window.close();
});
