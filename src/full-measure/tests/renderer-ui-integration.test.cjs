const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "..");
const rendererRoot = path.join(root, "src", "renderer");
const html = fs.readFileSync(path.join(rendererRoot, "index.html"), "utf8");

function tick(milliseconds = 0) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function candidateFamily() {
  return {
    familyHash: "family-1",
    producedCount: 1,
    requestedCount: 6,
    shortfall: true,
    candidates: [
      {
        index: 0,
        role: "baseline",
        signature: "open-field-proof",
        scoreAddress: "sha256:renderer-ui-proof",
        thumbnailDataUrl: "data:image/png;base64,",
        changedAxes: [],
      },
    ],
  };
}

function buildRenderer(overrides = {}) {
  const calls = {
    candidates: [],
    renders: [],
    formats: [],
    saves: [],
  };
  const dom = new JSDOM(html, {
    runScripts: "outside-only",
    url: "file:///haunted-toaster/index.html",
  });
  const { window } = dom;

  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLMediaElement.prototype.pause = () => {};
  window.HTMLMediaElement.prototype.play = () => Promise.resolve();
  window.HTMLCanvasElement.prototype.getContext = () => ({
    clearRect() {},
    fillRect() {},
    createLinearGradient: () => ({ addColorStop() {} }),
    fillStyle: "",
    globalAlpha: 1,
  });

  const noopSubscription = () => () => {};
  window.fullMeasure = {
    chooseAudio: async () => "/music/specimen.wav",
    chooseImage: async () => null,
    chooseLyrics: async () => null,
    chooseOutput: async () => "/output/specimen.mp4",
    inspectAudio: async () => ({
      filename: "specimen.wav",
      sizeBytes: 2048,
      duration: 30,
      audio: { sampleRate: 48000, channels: 2, codec: "pcm_s16le" },
      sections: [{ start: 0, end: 30, energy: 0.5, label: "field" }],
      energySamples: [{ db: -12 }],
    }),
    fileUrl: async () => "file:///music/specimen.wav",
    inspectLyrics: async (value) => ({
      timed: /^\[\d/.test(value),
      cueCount: value.trim() ? value.trim().split(/\n+/).length : 0,
      sourceFormat: /^\[\d/.test(value) ? "lrc" : "plain",
    }),
    discoverLyricSidecar: async () => null,
    listenerStatus: async () => ({ ready: true, installSupported: true, downloadBytes: 0 }),
    autoSyncLyrics: async () => ({
      engine: { source: "local-listener" },
      cues: [
        { text: "placed", start: 1.25, end: 2.5, status: "high", confidence: 0.98 },
        { text: "unresolved", start: null, end: null, status: "unmatched", confidence: 0 },
      ],
    }),
    formatLrc: async (config) => {
      calls.formats.push(config);
      return "[00:01.25]placed";
    },
    saveLyricSidecar: async (...args) => {
      calls.saves.push(args);
      return { saved: true, path: "/music/specimen.lrc" };
    },
    generateCandidates: async (config) => {
      calls.candidates.push(config);
      return candidateFamily();
    },
    mutateCandidates: async () => candidateFamily(),
    selectCandidate: async () => ({}),
    clearCandidates: async () => {},
    clearCandidateImage: async () => {},
    startRender: async (config) => {
      calls.renders.push(config);
      return {
        outputPath: "/output/specimen.mp4",
        receipt: {
          output: { sizeBytes: 4096 },
          validation: { durationDeltaMilliseconds: 0 },
        },
      };
    },
    cancelRender: async () => {},
    cancelListenerInstall: async () => {},
    cancelLyricSync: async () => {},
    manualLyricTrack: async () => ({ cues: [], engine: { source: "human" } }),
    installListener: async () => ({ ready: true }),
    openFile() {},
    revealFile() {},
    getVersion: async () => "0.5.0-alpha.6",
    getBuildInfo: async () => ({
      version: "0.5.0-alpha.6",
      commit: "test",
      sourceMode: true,
      rendererProfileGeneration: "test",
      capabilities: [],
    }),
    onPhase: noopSubscription,
    onProgress: noopSubscription,
    onListenerInstallProgress: noopSubscription,
    onLyricSyncPhase: noopSubscription,
    onLyricSyncProgress: noopSubscription,
    ...overrides,
  };

  for (const script of [
    "starting-field-controller.js",
    "app.js",
    "candidate-ui.js",
    "lyric-foundry-ui.js",
    "sync-keyboard.js",
  ]) {
    window.eval(fs.readFileSync(path.join(rendererRoot, script), "utf8"));
  }

  return { dom, window, document: window.document, calls };
}

async function loadSong(document) {
  document.querySelector("#audioDrop").click();
  await tick();
  await tick();
}

test("composed DOM owns one starting field shared by six-up and render", async () => {
  const harness = buildRenderer();
  const { document, window, calls } = harness;
  try {
    assert.equal(window.startingField.getPresetId(), "openField");
    assert.equal(document.querySelectorAll('.garment-card[data-preset="openField"]').length, 0);
    assert.equal(document.querySelector("#slateGarment").textContent, "Open Field");

    const porchlight = document.querySelector('[data-preset="porchlight"]');
    porchlight.click();
    assert.equal(window.startingField.getPresetId(), "porchlight");
    assert.equal(porchlight.getAttribute("aria-checked"), "true");

    porchlight.click();
    assert.equal(window.startingField.getPresetId(), "openField");
    assert.equal(porchlight.getAttribute("aria-checked"), "false");

    await loadSong(document);
    document.querySelector(".candidate-launch").click();
    await tick();
    document.querySelector("#renderButton").click();
    await tick();

    assert.equal(calls.candidates.length, 1);
    assert.equal(calls.renders.length, 1);
    assert.equal(calls.candidates[0].presetId, "openField");
    assert.equal(calls.renders[0].presetId, calls.candidates[0].presetId);
  } finally {
    harness.dom.window.close();
  }
});

test("partial lyric acceptance is single-flight and admits finite cues once", async () => {
  const harness = buildRenderer({
    formatLrc: async (config) => {
      harness.calls.formats.push(config);
      await tick(25);
      return "[00:01.25]placed";
    },
  });
  const { document, window, calls } = harness;
  try {
    await loadSong(document);
    const lyrics = document.querySelector("#lyricsInput");
    lyrics.value = "placed\nunresolved";
    lyrics.dispatchEvent(new window.Event("input", { bubbles: true }));
    await tick(170);
    document.querySelector("#lyricsAutoSync").click();
    await tick();
    await tick();

    const accept = document.querySelector("#syncAccept");
    accept.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    accept.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await tick();
    assert.equal(calls.formats.length, 1);
    assert.equal(calls.formats[0].cues.length, 1);
    assert.equal(calls.formats[0].cues[0].text, "placed");

    await tick(35);
    assert.equal(calls.saves.length, 1);
    assert.equal(document.querySelector("#syncDialog").classList.contains("is-hidden"), true);
  } finally {
    harness.dom.window.close();
  }
});

for (const failurePoint of ["format", "save"]) {
  test(`${failurePoint} failure stays visible and keeps the Listener alive`, async () => {
    const overrides = failurePoint === "format"
      ? { formatLrc: async () => { throw new Error("format refused"); } }
      : { saveLyricSidecar: async () => { throw new Error("save refused"); } };
    const harness = buildRenderer(overrides);
    const { document, window } = harness;
    try {
      await loadSong(document);
      const lyrics = document.querySelector("#lyricsInput");
      lyrics.value = "placed\nunresolved";
      lyrics.dispatchEvent(new window.Event("input", { bubbles: true }));
      await tick(170);
      document.querySelector("#lyricsAutoSync").click();
      await tick();
      await tick();
      document.querySelector("#syncAccept").click();
      await tick();
      await tick();

      assert.equal(document.querySelector("#syncDialog").classList.contains("is-hidden"), false);
      assert.equal(document.querySelector("#errorCard").classList.contains("is-hidden"), false);
      assert.match(document.querySelector("#errorMessage").textContent, /still open so you can retry/);
      assert.equal(document.querySelector("#syncAccept").disabled, false);
    } finally {
      harness.dom.window.close();
    }
  });
}
