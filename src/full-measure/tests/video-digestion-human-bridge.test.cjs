const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const {
  FOREIGN_MATERIAL_OPERATOR_ID,
  FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID,
} = require("../src/render/foreign-material.cjs");
const { createCandidateSession } = require("../src/candidate-session.cjs");
const { installVideoSourceControls } = require("../src/renderer/video-source-ui.js");

const root = path.join(__dirname, "..");
const previewPath = path.join(root, "src", "render", "candidate-preview.cjs");
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
    probe: { durationSeconds: 2, width: 640, height: 360, frameRate: "30/1" },
    persisted: false,
  };
}

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

test("#250 human bridge defaults admitted Video to the exact legacy texture digest", () => {
  const session = createCandidateSession();
  session.noteVideo(binding());
  assert.equal(session.state().videoDigestOperatorId, FOREIGN_MATERIAL_OPERATOR_ID);
});

test("#250 human bridge admits only the two bounded digest roles and resets on Video clear", () => {
  const session = createCandidateSession();
  session.noteVideo(binding());
  assert.equal(
    session.setVideoDigestOperator(FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID),
    FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID,
  );
  assert.equal(session.state().videoDigestOperatorId, FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID);
  assert.throws(
    () => session.setVideoDigestOperator("clip-mystery-v99"),
    /Unsupported foreign-material digest operator/,
  );
  session.clearVideo();
  assert.equal(session.state().videoDigestOperatorId, FOREIGN_MATERIAL_OPERATOR_ID);
  assert.throws(
    () => session.setVideoDigestOperator(FOREIGN_MATERIAL_TOPOLOGY_OPERATOR_ID),
    /admitted Video/i,
  );
});

test("#250 human bridge binds one digest role through both preview and final render seams", () => {
  const candidateSource = read(path.join(root, "src", "candidate-session.cjs"));
  const previewSource = read(previewPath);
  assert.match(candidateSource, /videoDigestOperatorId/);
  assert.match(candidateSource, /foreignVisualMaterial:\s*createForeignMaterialPlan\(\{[\s\S]*operatorId:\s*videoDigestOperatorId/);
  assert.match(previewSource, /operatorId:\s*config\.videoDigestOperatorId/);
  assert.match(previewSource, /createForeignMaterialPlan\(\{[\s\S]*videoBinding:\s*config\.video \|\| null[\s\S]*operatorId:\s*config\.videoDigestOperatorId/);
});

test("#250 digest mode is a narrow sandbox IPC operation rather than renderer authority", () => {
  const candidateSource = read(path.join(root, "src", "candidate-session.cjs"));
  const preloadSource = read(preloadPath);
  assert.match(candidateSource, /ipcMain\.handle\("candidate:set-video-digest-operator"/);
  assert.match(preloadSource, /setVideoDigestOperator:\s*\(operatorId\)\s*=>\s*ipcRenderer\.invoke\("candidate:set-video-digest-operator", operatorId\)/);
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
      return operatorId;
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
