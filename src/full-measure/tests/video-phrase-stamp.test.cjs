const test = require("node:test");
const assert = require("node:assert/strict");
const { JSDOM } = require("jsdom");
const { installVideoSourceControls } = require("../src/renderer/video-source-ui.js");

function binding(overrides = {}) {
  return {
    schema: "haunted-toaster/video-source/v1",
    specimenId: `sha256:${"d".repeat(64)}:2048`,
    sourceSha256: "d".repeat(64),
    byteLength: 2048,
    path: "/tmp/phrase-stamp.mp4",
    filename: "phrase-stamp.mp4",
    probe: {
      durationSeconds: 2,
      width: 640,
      height: 360,
      frameRate: "30/1",
      frameCount: 60,
    },
    persisted: false,
    digestOperatorId: "clip-motion-mask-v1",
    samplingPolicyId: "play-source-once-v1",
    ...overrides,
  };
}

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

test("ordinary Video admission does not present legacy digest × timing coordinates as phrase authority", async () => {
  const dom = new JSDOM(`
    <div id="videoSourceMount"></div>
    <section id="videoPantryWindow">
      <strong id="videoPantryStatus"></strong>
      <button id="videoFolderImport" type="button">Import</button>
    </section>
  `);
  const api = {
    async listVideoPantry() { return { specimens: [] }; },
    async chooseVideo() { return { binding: binding(), pantryCount: null }; },
    async chooseVideoFolder() { return null; },
    async clearVideo() { return true; },
  };

  installVideoSourceControls({ document: dom.window.document, api });
  dom.window.document.querySelector("#videoDrop").click();
  await flush();

  const status = dom.window.document.querySelector("#videoPantryStatus");
  assert.equal(dom.window.document.querySelector("#videoSamplingPolicy"), null);
  assert.equal(dom.window.document.querySelector("#videoDigestOperator"), null);
  assert.equal(status.textContent, "Current video is session only · VSPantry unchanged");
  assert.doesNotMatch(status.textContent, /Video phrase|Motion mask|Play once|Texture/);

  dom.window.close();
});
