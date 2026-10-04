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
    samplingPolicyId: "loop-source-clip-v1",
    ...overrides,
  };
}

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

test("Video Phrase Stamp names the full accepted digestion × timing coordinate after either axis changes", async () => {
  const dom = new JSDOM(`
    <div id="videoSourceMount"></div>
    <section id="videoPantryWindow">
      <strong id="videoPantryStatus"></strong>
      <button id="videoFolderImport" type="button">Import</button>
    </section>
  `);
  let current = binding();
  const api = {
    async listVideoPantry() { return { specimens: [] }; },
    async chooseVideo() { return { binding: current, pantryCount: null }; },
    async chooseVideoFolder() { return null; },
    async clearVideo() { current = null; return true; },
    async setVideoDigestOperator(digestOperatorId) {
      current = { ...current, digestOperatorId };
      return current;
    },
    async setVideoSamplingPolicy(samplingPolicyId) {
      current = { ...current, samplingPolicyId };
      return current;
    },
  };

  installVideoSourceControls({ document: dom.window.document, api });
  dom.window.document.querySelector("#videoDrop").click();
  await flush();

  const status = dom.window.document.querySelector("#videoPantryStatus");
  const timing = dom.window.document.querySelector("#videoSamplingPolicy");
  const digestion = dom.window.document.querySelector("#videoDigestOperator");

  timing.value = "play-source-once-v1";
  timing.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  await flush();
  assert.equal(
    status.textContent,
    "Video phrase · Motion mask × Play once → release · generate six again",
  );

  digestion.value = "clip-luma-texture-v1";
  digestion.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  await flush();
  assert.equal(
    status.textContent,
    "Video phrase · Texture × Play once → release · generate six again",
  );

  dom.window.close();
});
