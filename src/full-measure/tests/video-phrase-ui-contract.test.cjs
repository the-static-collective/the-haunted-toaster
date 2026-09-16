const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");
const { installVideoSourceControls } = require("../src/renderer/video-source-ui.js");
const { candidatePreviewPlan } = require("../src/render/candidate-preview.cjs");

const root = path.join(__dirname, "..");

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function candidateWithPhrasePlan() {
  const timeline = {
    schema: "haunted-toaster/resolved-timeline/v1",
    scoreAddress: "score-video-phrase-ui",
    durationTicks: 4000,
    timebase: 1000,
    patches: [],
  };
  return {
    index: 0,
    role: "baseline",
    scoreAddress: "score-video-phrase-ui",
    timelineHash: "timeline-video-phrase-ui",
    timeline,
    scoreArtifact: {
      score: {
        topology: "linear",
        motion: { grammar: "drift" },
        palette: { logic: "native" },
        material: { texture: "grain" },
      },
    },
    changedAxes: [],
    videoPhrasePlanHash: "phrase-plan-ui-hash",
    videoPhrasePlan: {
      planHash: "phrase-plan-ui-hash",
      phrases: [
        {
          id: "phrase-1",
          timeMap: { traversal: "reverse" },
          spatial: { mirrorX: true, mirrorY: false, rotateDeg: 0, cropZoom: 1 },
          digestion: [{ operatorId: "clip-luma-texture-v1" }],
        },
        {
          id: "phrase-2",
          timeMap: { traversal: "ping-pong" },
          spatial: { mirrorX: false, mirrorY: false, rotateDeg: 90, cropZoom: 1.1 },
          digestion: [{ operatorId: "clip-motion-mask-v1" }],
        },
      ],
    },
  };
}

test("ordinary Video UI admits material without digestion or timing authority", () => {
  const dom = new JSDOM(`
    <div id="videoSourceMount"></div>
    <section id="videoPantryWindow">
      <strong id="videoPantryStatus"></strong>
      <button id="videoFolderImport" type="button">Import</button>
    </section>
  `);
  const api = {
    async listVideoPantry() { return { specimens: [] }; },
    async chooseVideo() { return null; },
    async chooseVideoFolder() { return null; },
    async clearVideo() { return true; },
  };

  installVideoSourceControls({ document: dom.window.document, api });
  assert.equal(dom.window.document.querySelector("#videoDigestOperator"), null);
  assert.equal(dom.window.document.querySelector("#videoSamplingPolicy"), null);
  assert.ok(dom.window.document.querySelector("#videoDrop"));
  assert.ok(dom.window.document.querySelector("#removeVideo"));
  dom.window.close();
});

test("ordinary preload exposes no legacy Video phrase mutation controls", () => {
  const preload = source("src/preload.cjs");
  assert.doesNotMatch(preload, /setVideoDigestOperator\s*:/);
  assert.doesNotMatch(preload, /setVideoSamplingPolicy\s*:/);
});

test("accepted candidate preview carries an observational candidate-owned phrase summary", () => {
  const candidate = candidateWithPhrasePlan();
  const plan = candidatePreviewPlan(candidate);
  assert.deepEqual(plan.videoPhraseSummary, {
    planHash: "phrase-plan-ui-hash",
    phraseCount: 2,
    digestion: ["texture", "motion"],
    traversals: ["reverse", "ping-pong"],
    transforms: ["mirror", "rotate", "crop/zoom"],
    candidateOwned: true,
  });
});
